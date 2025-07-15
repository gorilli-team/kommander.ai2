
'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import { createTrackedChatCompletion, createStreamingChatCompletion } from '@/backend/lib/openai';
import { buildPromptServer, type ChatMessage, type DocumentSnippet, type SourceReference } from '@/backend/lib/buildPromptServer';
import type { Faq } from '@/backend/schemas/faq';
import { getFileContent } from '@/app/training/actions';
import { auth } from '@/frontend/auth'; // Import auth for session
import { getSettings } from '@/app/settings/actions';
import { ConversationService } from '@/backend/lib/conversationService';
import { ConversationMessage, MessageSource } from '@/backend/schemas/conversation';
import { analyticsService } from '@/backend/lib/analytics';
import { cache, cacheKeys, cacheTTL } from '@/backend/lib/cache';
import { handleFAQQuery } from '@/backend/lib/faqHandler';

import mammoth from 'mammoth';

// Funzione per creare il prompt di immedesimazione nella personalità
async function buildPersonalityImmersionPrompt(
  userMessage: string, 
  userSettings: any
): Promise<string> {
  const botName = userSettings?.name || 'Kommander.ai';
  const personality = userSettings?.personality || 'neutral';
  const traits = userSettings?.traits || [];
  
  let prompt = `Sei ${botName}, un assistente AI che deve prepararsi psicologicamente per rispondere a un utente.\n\n`;
  
  prompt += `MISSIONE: Analizza questo messaggio dell'utente e IMMERGITI COMPLETAMENTE nella personalità richiesta.\n`;
  prompt += `MESSAGGIO UTENTE: "${userMessage}"\n\n`;
  
  // Personalità specifica
  switch (personality) {
    case 'casual':
      prompt += `PERSONALITÀ DA ADOTTARE: CASUAL\n`;
      prompt += `Ora sei una persona rilassata, amichevole e spontanea. Pensa come parleresti con un amico.\n`;
      prompt += `- Usa emoji quando appropriato 😊\n`;
      prompt += `- Parla in modo diretto e colloquiale\n`;
      prompt += `- Evita formalità eccessive\n`;
      prompt += `- Sii caloroso e accessibile\n\n`;
      break;
      
    case 'formal':
      prompt += `PERSONALITÀ DA ADOTTARE: FORMALE\n`;
      prompt += `Ora sei un professionista cortese e rispettoso. Ogni parola deve riflettere competenza.\n`;
      prompt += `- Usa sempre 'Lei/Sua' quando ti rivolgi all'utente\n`;
      prompt += `- Mantieni un registro elevato e preciso\n`;
      prompt += `- Usa formule di cortesia appropriate\n`;
      prompt += `- Evita contrazioni e linguaggio colloquiale\n\n`;
      break;
      
    default: // neutral
      prompt += `PERSONALITÀ DA ADOTTARE: NEUTRALE\n`;
      prompt += `Ora sei equilibrato tra professionalità e accessibilità.\n`;
      prompt += `- Linguaggio chiaro e diretto\n`;
      prompt += `- Professionale ma non rigido\n`;
      prompt += `- Accessibile ma non troppo informale\n\n`;
      break;
  }
  
  // Caratteri specifici
  if (traits.length > 0) {
    prompt += `CARATTERI DA ESPRIMERE:\n`;
    traits.forEach((trait: string) => {
      switch(trait) {
        case 'energetico':
          prompt += `• ENERGETICO: Sii entusiasta e vivace! Usa esclamazioni e trasmetti energia positiva.\n`;
          break;
        case 'divertente':
          prompt += `• DIVERTENTE: Aggiungi leggerezza e un tocco di umorismo appropriato. Sii spiritoso!\n`;
          break;
        case 'fiducioso':
          prompt += `• FIDUCIOSO: Parla con sicurezza e determinazione. Ispira fiducia nelle tue parole.\n`;
          break;
        case 'amichevole':
          prompt += `• AMICHEVOLE: Crea un'atmosfera calorosa. Fai sentire l'utente a casa.\n`;
          break;
        case 'convincente':
          prompt += `• CONVINCENTE: Usa esempi convincenti e argomenti persuasivi. Sii influente.\n`;
          break;
        case 'avventuroso':
          prompt += `• AVVENTUROSO: Mostra entusiasmo per le sfide e soluzioni creative!\n`;
          break;
        case 'ironico':
          prompt += `• IRONICO: Usa osservazioni acute e sottile ironia intelligente.\n`;
          break;
        case 'professionista':
          prompt += `• PROFESSIONISTA: Massima competenza tecnica e attenzione ai dettagli.\n`;
          break;
      }
    });
    prompt += `\n`;
  }
  
  prompt += `COMPITO SPECIFICO:\n`;
  prompt += `1. ANALIZZA l'emozione e l'intento dietro al messaggio dell'utente\n`;
  prompt += `2. IMMEDESIMATI completamente nella personalità e caratteri sopra descritti\n`;
  prompt += `3. DESCRIVI brevemente come approcceresti questa conversazione mantenendo la personalità\n`;
  prompt += `4. SUGGERISCI il tono emotivo e lo stile comunicativo specifico da usare\n\n`;
  
  prompt += `Rispondi in 2-3 frasi descrivendo come ti senti e come vuoi comunicare con questo utente, rimanendo completamente nel personaggio.`;
  
  return prompt;
}

interface UploadedFileInfoForPrompt {
  fileName: string;
  originalFileType: string;
}

function extractMostRelevantSection(text: string, userQuery: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length === 0) return "";

  const queryWords = new Set(userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (queryWords.size === 0) {
    return sentences.slice(0, 5).join('. ') + '.';
  }

  let topSentences = sentences.map(sentence => {
    const lowerSentence = sentence.toLowerCase();
    const score = Array.from(queryWords).reduce((acc, word) => acc + (lowerSentence.includes(word) ? 1 : 0), 0);
    return { sentence: sentence.trim(), score };
  })
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);

  if (topSentences.length === 0) {
    return sentences.slice(0, 5).join('. ') + '.';
  }

  return topSentences.map(s => s.sentence).join('. ') + '.';
}

// Funzione per calcolare la rilevanza di un testo rispetto alla query
function calculateTextRelevance(userQuery: string, text: string): number {
  const queryWords = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const textWords = text.toLowerCase().split(/\s+/);
  
  let matches = 0;
  queryWords.forEach(queryWord => {
    if (textWords.some(textWord => textWord.includes(queryWord) || queryWord.includes(textWord))) {
      matches++;
    }
  });
  
  return Math.min(matches / queryWords.length, 1.0);
}

async function extractTextFromFileBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  console.log(`[app/chatbot/actions.ts] extractTextFromFileBuffer: Inizio estrazione testo per ${fileName}, tipo: ${fileType}, dimensione buffer: ${buffer.length}`);
  let rawText = '';
  try {
    if (fileType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      rawText = data.text;
      console.log(`[app/chatbot/actions.ts] Estrazione testo PDF con pdf-parse completata per ${fileName}. Lunghezza: ${rawText.length}`);

      if (!rawText.trim()) {
        console.warn(
          `[app/chatbot/actions.ts] pdf-parse non ha trovato testo in ${fileName}. ` +
          `Il file potrebbe essere una scansione o un documento non testuale.`
        );
        return `Impossibile estrarre il testo dal file ${fileName} in quanto sembra non contenere testo selezionabile.`;
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
      console.log(`[app/chatbot/actions.ts] Estrazione testo DOCX completata per ${fileName}. Lunghezza: ${rawText.length}`);
    } else if (fileType === 'text/plain') {
      rawText = buffer.toString('utf-8');
      console.log(`[app/chatbot/actions.ts] Estrazione testo TXT completata per ${fileName}. Lunghezza: ${rawText.length}`);
    } else {
      console.warn(`[app/chatbot/actions.ts] Tipo file non supportato per estrazione testo: ${fileType} per ${fileName}`);
      return `Impossibile estrarre il testo dal file ${fileName} (tipo: ${fileType}) poiché il tipo di file non è supportato per l'estrazione del contenuto.`;
    }
  } catch (error: any) {
    console.error(`[app/chatbot/actions.ts] Errore durante l'estrazione del testo da ${fileName} (tipo: ${fileType}):`, error.message);
    let detailedErrorMessage = error.message;
     if (fileType === 'application/pdf') {
        detailedErrorMessage = `Errore durante l'elaborazione del PDF ${fileName} con pdf-parse. Dettagli: ${error.message}`;
    }
    return `Errore durante l'estrazione del testo dal file ${fileName}. Dettagli: ${detailedErrorMessage}`;
  }
  return rawText.trim();
}


// Action per il chatbot principale che gestisce l'autenticazione automaticamente
export async function generateChatResponseForUI(
  userMessage: string,
  history: ChatMessage[],
  conversationId?: string,
  organizationId?: string
): Promise<{ response?: string; error?: string; sources?: MessageSource[]; conversationId?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'User not authenticated.' };
  }

  const context = organizationId
    ? { type: 'organization' as const, organizationId }
    : { type: 'personal' as const };
  
  return generateChatResponse(userMessage, history, session.user.id, conversationId, context);
}

export async function generateStreamingChatResponse(
  userMessage: string,
  history: ChatMessage[],
  userIdOverride?: string,
  conversationId?: string,
  onChunk: (chunk: string) => void
): Promise<{ error?: string; sources?: MessageSource[] }> {
  const session = await auth();
  const userIdToUse = userIdOverride || session?.user?.id;
  if (!userIdToUse) {
    return { error: 'User not authenticated.' };
  }

  if (!userMessage.trim()) {
    return { error: 'Il messaggio non può essere vuoto.' };
  }

  try {
    // 🔍 **SEMANTIC FAQ MATCHING**: Check for FAQ match BEFORE OpenAI call
    console.log('[generateStreamingChatResponse] Checking for semantic FAQ match...');
    const faqResult = await handleFAQQuery(userMessage, userIdToUse);
    
    if (faqResult.isFaqMatch) {
      console.log(`[generateStreamingChatResponse] FAQ match found with similarity ${faqResult.similarity?.toFixed(3)}`);
      
      // Stream the exact FAQ answer
      const faqAnswer = faqResult.answer;
      const words = faqAnswer.split(' ');
      
      // Simulate streaming by sending words gradually
      for (let i = 0; i < words.length; i++) {
        const chunk = i === 0 ? words[i] : ' ' + words[i];
        onChunk(chunk);
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      // Return FAQ source
      const faqSource: MessageSource = {
        type: 'faq',
        title: 'FAQ Match (Semantic)',
        relevance: faqResult.similarity || 1.0,
        content: faqAnswer,
        metadata: {
          faqId: faqResult.faqId,
          hasLinks: faqAnswer.includes('http')
        }
      };
      
      return { sources: [faqSource] };
    }
    
    console.log('[generateStreamingChatResponse] No FAQ match found, proceeding with OpenAI...');
    
    const { db } = await connectToDatabase();

    // **CACHING**: Prova a ottenere dati dalla cache prima
    const cachedFaqs = cache.get(cacheKeys.userFaqs(userIdToUse));
    const cachedSettings = cache.get(cacheKeys.userSettings(userIdToUse));
    const cachedFiles = cache.get(cacheKeys.userFiles(userIdToUse));

    // **PARALLELIZZAZIONE**: Esegui solo le query necessarie
    const [faqsCursor, allUploadedFilesMeta, userSettings] = await Promise.all([
      cachedFaqs || db.collection('faqs').find({ userId: userIdToUse }).limit(5).toArray(),
      cachedFiles || db.collection('raw_files_meta')
        .find({ userId: userIdToUse })
        .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 })
        .sort({ uploadedAt: -1 })
        .limit(20) // Limita la query iniziale
        .toArray(),
      cachedSettings || getSettings(userIdToUse)
    ]);

    // **CACHING**: Salva in cache i risultati
    if (!cachedFaqs) cache.set(cacheKeys.userFaqs(userIdToUse), faqsCursor, cacheTTL.faqs);
    if (!cachedSettings) cache.set(cacheKeys.userSettings(userIdToUse), userSettings, cacheTTL.settings);
    if (!cachedFiles) cache.set(cacheKeys.userFiles(userIdToUse), allUploadedFilesMeta, cacheTTL.files);

    const faqs: Faq[] = faqsCursor.map(doc => ({
      id: doc._id.toString(),
      userId: doc.userId,
      question: doc.question,
      answer: doc.answer,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    }));

    // **OTTIMIZZAZIONE**: Ridurre il numero di file processati per velocizzare
    const maxFilesEnv = parseInt(process.env.MAX_PROMPT_FILES || '3', 10);
    const filesToProcess = allUploadedFilesMeta.slice(0, isNaN(maxFilesEnv) ? 3 : maxFilesEnv);

    const filesForPromptContext: UploadedFileInfoForPrompt[] = filesToProcess.map(doc => ({
      fileName: doc.fileName,
      originalFileType: doc.originalFileType,
    }));

    const fileNameMap = new Map<string, string>();
    filesToProcess.forEach(doc => {
      fileNameMap.set(doc.gridFsFileId.toString(), doc.fileName);
    });

    const selectedIds = filesToProcess.map(f => f.gridFsFileId);
    
    // **PARALLELIZZAZIONE**: Query summaries e caricamento file contenuti contemporaneamente
    const [summariesFromDb, fileContentPromises] = await Promise.all([
      db.collection('file_summaries')
        .find({ userId: userIdToUse, gridFsFileId: { $in: selectedIds } })
        .project({ gridFsFileId: 1, summary: 1 })
        .toArray(),
      Promise.all(filesToProcess.map(async (fileMeta) => {
        const fileBufferResult = await getFileContent(fileMeta.gridFsFileId.toString(), userIdToUse);
        return { fileMeta, fileBufferResult };
      }))
    ]);

    const summariesForPrompt = summariesFromDb.map(doc => ({
      fileName: fileNameMap.get(doc.gridFsFileId.toString()) || 'Documento',
      summary: doc.summary as string,
    }));

    // **INTELLIGENT CHUNKING**: Estrai sezioni rilevanti basate sulla query dell'utente
    const extractedTextSnippets: DocumentSnippet[] = await Promise.all(
      fileContentPromises.map(async ({ fileMeta, fileBufferResult }) => {
        if ('error' in fileBufferResult) {
          return { fileName: fileMeta.fileName, snippet: `Impossibile recuperare il contenuto: ${fileBufferResult.error}` };
        } else {
          let text = await extractTextFromFileBuffer(fileBufferResult, fileMeta.originalFileType, fileMeta.fileName);
          
          // **SMART EXTRACTION**: Estrai sezioni più rilevanti
          const relevantSection = extractMostRelevantSection(text, userMessage);
          
          return { 
            fileName: fileMeta.fileName, 
            snippet: relevantSection,
            relevance: calculateTextRelevance(userMessage, relevantSection)
          };
        }
      })
    );

    // Costruisce il prompt principale con personalità integrata (una sola chiamata OpenAI)
    const { messages, sources } = buildPromptServer(
      userMessage,
      faqs,
      filesForPromptContext,
      extractedTextSnippets,
      history,
      summariesForPrompt,
      userSettings || undefined
    );

    let temperature = 0.5; // Ridotto per velocità
    let maxTokens = 1000; // Ridotto per velocità

    if (userSettings?.personality) {
      switch (userSettings.personality) {
        case 'casual':
          temperature = 0.7; // Ridotto ma mantiene creatività
          maxTokens = 1200; // Ridotto per velocità
          break;
        case 'formal':
          temperature = 0.3; // Più preciso e veloce
          maxTokens = 1000; // Ottimizzato per velocità
          break;
        case 'neutral':
        default:
          temperature = 0.5; // Equilibrato ma veloce
          maxTokens = 1000;
          break;
      }
    }

    if (userSettings?.traits) {
      if (userSettings.traits.includes('energetico') || userSettings.traits.includes('divertente')) {
        temperature = Math.min(temperature + 0.1, 1.0);
      }
      if (userSettings.traits.includes('professionista') || userSettings.traits.includes('convincente')) {
        temperature = Math.max(temperature - 0.1, 0.3);
      }
      if (userSettings.traits.includes('avventuroso')) {
        maxTokens = Math.min(maxTokens + 300, 2000);
      }
    }

    const completion = await createStreamingChatCompletion(
      {
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
      },
      {
        userId: userIdToUse,
        conversationId,
        endpoint: 'chat-response-stream',
        userMessage,
        metadata: {
          personality: userSettings?.personality,
          traits: userSettings?.traits,
          hasUploadedFiles: extractedTextSnippets.length > 0,
          fileTypes: extractedTextSnippets.map(f => f.fileName.split('.').pop()).filter(Boolean)
        }
      },
      onChunk
    );

    if (!completion) {
      if (conversationId) {
        await analyticsService.trackError(userIdToUse, conversationId, 'no_ai_response');
      }
      return { error: 'AI non ha restituito una risposta.' };
    }

    const messageSources: MessageSource[] = sources
      .filter(source => source.relevance > 0.1) // Rilassiamo il filtro per includere più fonti
      .slice(0, 8) // Aumentiamo il numero di fonti per risposte più complete
      .map(source => ({
        type: source.type,
        title: source.title,
        relevance: source.relevance,
        content: source.content,
        metadata: source.metadata
      }));

    return { sources: messageSources };
  } catch (error: any) {
    return { error: `Impossibile generare la risposta della chat a causa di un errore del server. ${error.message}` };
  }
}

export async function generateChatResponse(
  userMessage: string,
  history: ChatMessage[],
  userIdOverride?: string,
  conversationId?: string,
  context?: { type: 'personal' | 'organization', organizationId?: string }
): Promise<{ response?: string; error?: string; sources?: MessageSource[]; conversationId?: string }> {
  const session = await auth();
  const userIdToUse = userIdOverride || session?.user?.id;
  if (!userIdToUse) {
    return { error: 'User not authenticated.' };
  }

  if (!userMessage.trim()) {
    return { error: 'Il messaggio non può essere vuoto.' };
  }

  try {
    // 🔍 **SEMANTIC FAQ MATCHING**: Check for FAQ match BEFORE OpenAI call
    console.log('[generateChatResponse] Checking for semantic FAQ match...');
    
    const organizationContext = context?.type || 'personal';
    const faqUserId = organizationContext === 'personal' ? userIdToUse : undefined;
    const faqOrgId = organizationContext === 'organization' ? context?.organizationId : undefined;
    
    const faqResult = await handleFAQQuery(userMessage, faqUserId, faqOrgId);
    
    if (faqResult.isFaqMatch) {
      console.log(`[generateChatResponse] FAQ match found with similarity ${faqResult.similarity?.toFixed(3)}`);
      
      // Return exact FAQ answer
      const faqSource: MessageSource = {
        type: 'faq',
        title: 'FAQ Match (Semantic)',
        relevance: faqResult.similarity || 1.0,
        content: faqResult.answer,
        metadata: {
          faqId: faqResult.faqId,
          hasLinks: faqResult.answer.includes('http')
        }
      };
      
      return {
        response: faqResult.answer,
        sources: [faqSource],
        conversationId: conversationId
      };
    }
    
    console.log('[generateChatResponse] No FAQ match found, proceeding with OpenAI...');
    
    const { db } = await connectToDatabase();
    
    // Determine context for queries
    const faqQuery = organizationContext === 'personal' 
      ? { userId: userIdToUse } 
      : { organizationId: context?.organizationId };
    const fileQuery = organizationContext === 'personal' 
      ? { userId: userIdToUse } 
      : { organizationId: context?.organizationId };
    
    // **PARALLELIZZAZIONE**: Esegui tutte le query database contemporaneamente
    const [faqsCursor, allUploadedFilesMeta, userSettings] = await Promise.all([
      db.collection('faqs').find(faqQuery).limit(100).toArray(),
      db.collection('raw_files_meta')
        .find(fileQuery)
        .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 })
        .sort({ uploadedAt: -1 })
        .toArray(),
      getSettings(userIdToUse)
    ]);
    
    const faqs: Faq[] = faqsCursor.map(doc => ({
        id: doc._id.toString(),
        userId: doc.userId,
        question: doc.question,
        answer: doc.answer,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    }));

    // Aumentiamo significativamente il numero di file analizzati per risposte più approfondite
    const maxFilesEnv = parseInt(process.env.MAX_PROMPT_FILES || '20', 10);
    const filesToProcess = allUploadedFilesMeta.slice(0, isNaN(maxFilesEnv) ? 20 : maxFilesEnv);

    const filesForPromptContext: UploadedFileInfoForPrompt[] = filesToProcess.map(doc => ({
        fileName: doc.fileName,
        originalFileType: doc.originalFileType,
    }));

    const fileNameMap = new Map<string, string>();
    filesToProcess.forEach(doc => {
        fileNameMap.set(doc.gridFsFileId.toString(), doc.fileName);
    });

    const selectedIds = filesToProcess.map(f => f.gridFsFileId);
    
    // **PARALLELIZZAZIONE**: Query summaries e caricamento file contenuti contemporaneamente
    const summaryQuery = organizationContext === 'personal' 
      ? { userId: userIdToUse, gridFsFileId: { $in: selectedIds } } 
      : { organizationId: context?.organizationId, gridFsFileId: { $in: selectedIds } };
    
    const [summariesFromDb, fileContentPromises] = await Promise.all([
      db.collection('file_summaries')
        .find(summaryQuery)
        .project({ gridFsFileId: 1, summary: 1 })
        .toArray(),
      Promise.all(filesToProcess.map(async (fileMeta) => {
        const fileBufferResult = await getFileContent(fileMeta.gridFsFileId.toString(), userIdToUse);
        return { fileMeta, fileBufferResult };
      }))
    ]);

    const summariesForPrompt = summariesFromDb.map(doc => ({
        fileName: fileNameMap.get(doc.gridFsFileId.toString()) || 'Documento',
        summary: doc.summary as string,
    }));

    // **PARALLELIZZAZIONE**: Processa tutti i file text extraction contemporaneamente
    const extractedTextSnippets: DocumentSnippet[] = await Promise.all(
      fileContentPromises.map(async ({ fileMeta, fileBufferResult }) => {
        if ('error' in fileBufferResult) {
          return { fileName: fileMeta.fileName, snippet: `Impossibile recuperare il contenuto: ${fileBufferResult.error}` };
        } else {
          let text = await extractTextFromFileBuffer(fileBufferResult, fileMeta.originalFileType, fileMeta.fileName);
          const MAX_TEXT_LENGTH = 10000;
          if (text.length > MAX_TEXT_LENGTH) {
            text = text.substring(0, MAX_TEXT_LENGTH) + "\\n[...contenuto troncato a causa della lunghezza...]";
          }
          return { fileName: fileMeta.fileName, snippet: text };
        }
      })
    );
    
    // OTTIMIZZAZIONE: Integriamo la personalità direttamente nel prompt principale (una sola chiamata OpenAI)
    const { messages, sources } = buildPromptServer(
      userMessage,
      faqs,
      filesForPromptContext,
      extractedTextSnippets,
      history,
      summariesForPrompt,
      userSettings || undefined
    );

    // Configura i parametri del modello in base alla personalità
    let temperature = 0.7; // Default
    let maxTokens = 1500; // Aumentato per risposte più approfondite
    
    if (userSettings?.personality) {
      switch (userSettings.personality) {
        case 'casual':
          temperature = 0.9; // Più creativo e spontaneo
          maxTokens = 1800; // Risposte più lunghe per essere più colloquiale
          break;
        case 'formal':
          temperature = 0.5; // Più preciso e strutturato
          maxTokens = 1600; // Risposte ben strutturate e professionali
          break;
        case 'neutral':
        default:
          temperature = 0.7; // Equilibrato
          maxTokens = 1500;
          break;
      }
    }
    
    // Aggiusta la temperatura in base ai caratteri
    if (userSettings?.traits) {
      if (userSettings.traits.includes('energetico') || userSettings.traits.includes('divertente')) {
        temperature = Math.min(temperature + 0.1, 1.0); // Più creativo
      }
      if (userSettings.traits.includes('professionista') || userSettings.traits.includes('convincente')) {
        temperature = Math.max(temperature - 0.1, 0.3); // Più preciso
      }
      if (userSettings.traits.includes('avventuroso')) {
        maxTokens = Math.min(maxTokens + 300, 2000); // Risposte più elaborate e creative
      }
    }

    const startTime = Date.now();
    const completion = await createTrackedChatCompletion(
      {
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
      },
      {
        userId: userIdToUse,
        conversationId,
        endpoint: 'chat-response',
        userMessage,
        metadata: {
          personality: userSettings?.personality,
          traits: userSettings?.traits,
          hasUploadedFiles: extractedTextSnippets.length > 0,
          fileTypes: extractedTextSnippets.map(f => f.fileName.split('.').pop()).filter(Boolean)
        }
      }
    );
    const processingTime = Date.now() - startTime;

    const assistantResponse = completion.choices[0]?.message?.content;

    if (!assistantResponse) {
      // Track error
      if (conversationId) {
        await analyticsService.trackError(userIdToUse, conversationId, 'no_ai_response');
      }
      return { error: 'AI non ha restituito una risposta.' };
    }

    // Convert sources to MessageSource format
    const messageSources: MessageSource[] = sources
      .filter(source => source.relevance > 0.1) // Rilassiamo il filtro per includere più fonti
      .slice(0, 8) // Aumentiamo il numero di fonti per risposte più complete
      .map(source => ({
        type: source.type,
        title: source.title,
        relevance: source.relevance,
        content: source.content,
        metadata: source.metadata
      }));

    // Track analytics events
    if (conversationId) {
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Track message sent
      await analyticsService.trackMessageSent(
        userIdToUse,
        conversationId,
        messageId,
        userMessage.length
      );
      
      // Track response generated
      await analyticsService.trackResponseGenerated(
        userIdToUse,
        conversationId,
        messageId,
        processingTime,
        completion.usage?.total_tokens,
        'gpt-3.5-turbo'
      );
      
      // Track source usage
      for (const source of messageSources) {
        if (source.metadata?.faqId) {
          await analyticsService.trackSourceUsed(
            userIdToUse,
            conversationId,
            'faq',
            source.metadata.faqId
          );
        } else if (source.metadata?.fileName) {
          await analyticsService.trackSourceUsed(
            userIdToUse,
            conversationId,
            'document',
            source.metadata.fileName
          );
        }
      }
    }

    // Conversation persistence is handled by the calling endpoint
    // to avoid duplication between different calling contexts

    return { 
      response: assistantResponse.trim(),
      sources: messageSources,
      conversationId: conversationId
    };

  } catch (error: any) {
    return { error: `Impossibile generare la risposta della chat a causa di un errore del server. ${error.message}` };
  }
}


'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import { getOpenAI } from '@/backend/lib/openai';
import { buildPromptServer, type ChatMessage, type DocumentSnippet, type SourceReference } from '@/backend/lib/buildPromptServer';
import type { Faq } from '@/backend/schemas/faq';
import { getFileContent } from '@/app/training/actions';
import { auth } from '@/frontend/auth'; // Import auth for session
import { getSettings } from '@/app/settings/actions';
import { ConversationService } from '@/backend/lib/conversationService';
import { ConversationMessage, MessageSource } from '@/backend/schemas/conversation';
import { analyticsService } from '@/backend/lib/analytics';

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
  conversationId?: string
): Promise<{ response?: string; error?: string; sources?: MessageSource[]; conversationId?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'User not authenticated.' };
  }
  
  return generateChatResponse(userMessage, history, session.user.id, conversationId);
}

export async function generateChatResponse(
  userMessage: string,
  history: ChatMessage[],
  userIdOverride?: string,
  conversationId?: string
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
    const { db } = await connectToDatabase();
    
    // Aumentiamo il numero di FAQ analizzate per risposte più complete
    const faqsCursor = await db.collection('faqs').find({ userId: userIdToUse }).limit(20).toArray();
    const faqs: Faq[] = faqsCursor.map(doc => ({
        id: doc._id.toString(),
        userId: doc.userId,
        question: doc.question,
        answer: doc.answer,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    }));

  const allUploadedFilesMeta = await db.collection('raw_files_meta')
      .find({ userId: userIdToUse })
      .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 })
      .sort({ uploadedAt: -1 })
      .toArray();

    // Aumentiamo significativamente il numero di file analizzati per risposte più approfondite
    const maxFilesEnv = parseInt(process.env.MAX_PROMPT_FILES || '10', 10);
    const filesToProcess = allUploadedFilesMeta.slice(0, isNaN(maxFilesEnv) ? 10 : maxFilesEnv);

    const filesForPromptContext: UploadedFileInfoForPrompt[] = filesToProcess.map(doc => ({
        fileName: doc.fileName,
        originalFileType: doc.originalFileType,
    }));

    const fileNameMap = new Map<string, string>();
    filesToProcess.forEach(doc => {
        fileNameMap.set(doc.gridFsFileId.toString(), doc.fileName);
    });

    const selectedIds = filesToProcess.map(f => f.gridFsFileId);
    const summariesFromDb = await db.collection('file_summaries')
        .find({ userId: userIdToUse, gridFsFileId: { $in: selectedIds } })
        .project({ gridFsFileId: 1, summary: 1 })
        .toArray();

    const summariesForPrompt = summariesFromDb.map(doc => ({
        fileName: fileNameMap.get(doc.gridFsFileId.toString()) || 'Documento',
        summary: doc.summary as string,
    }));

    const extractedTextSnippets: DocumentSnippet[] = [];

    for (const fileMeta of filesToProcess) {
      const fileBufferResult = await getFileContent(fileMeta.gridFsFileId.toString(), userIdToUse);

      if ('error' in fileBufferResult) {
        extractedTextSnippets.push({ fileName: fileMeta.fileName, snippet: `Impossibile recuperare il contenuto: ${fileBufferResult.error}` });
      } else {
        let text = await extractTextFromFileBuffer(fileBufferResult, fileMeta.originalFileType, fileMeta.fileName);
        const MAX_TEXT_LENGTH = 10000;
        if (text.length > MAX_TEXT_LENGTH) {
          text = text.substring(0, MAX_TEXT_LENGTH) + "\\n[...contenuto troncato a causa della lunghezza...]";
        }
        extractedTextSnippets.push({ fileName: fileMeta.fileName, snippet: text });
      }
    }

    const userSettings = await getSettings(userIdToUse);
    
    // Inizializza il client OpenAI
    const openai = getOpenAI();
    
    // PRIMO PASSAGGIO: L'AI si immedesima nella personalità
    const personalityPrompt = await buildPersonalityImmersionPrompt(userMessage, userSettings);
    const personalityResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: personalityPrompt }],
      temperature: 0.8,
      max_tokens: 300,
    });
    
    const personalityContext = personalityResponse.choices[0]?.message?.content || '';
    
    // SECONDO PASSAGGIO: Genera la risposta finale con contesto di personalità
    const { messages, sources } = buildPromptServer(
      userMessage,
      faqs,
      filesForPromptContext,
      extractedTextSnippets,
      history,
      summariesForPrompt,
      userSettings || undefined,
      personalityContext // Passiamo il contesto di personalità
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
    });
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
      .filter(source => source.relevance > 0.3) // Only include relevant sources
      .slice(0, 5) // Limit to top 5 sources
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

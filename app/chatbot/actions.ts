
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

import mammoth from 'mammoth';

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
    
    const faqsCursor = await db.collection('faqs').find({ userId: userIdToUse }).limit(10).toArray();
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

    const userSettings = await getSettings();
    const { messages, sources } = buildPromptServer(
      userMessage,
      faqs,
      filesForPromptContext,
      extractedTextSnippets,
      history,
      summariesForPrompt,
      userSettings || undefined,
    );

    // Configura i parametri del modello in base alla personalità
    let temperature = 0.7; // Default
    let maxTokens = 1000;
    
    if (userSettings?.personality) {
      switch (userSettings.personality) {
        case 'casual':
          temperature = 0.9; // Più creativo e spontaneo
          maxTokens = 1200; // Risposte più lunghe per essere più colloquiale
          break;
        case 'formal':
          temperature = 0.5; // Più preciso e strutturato
          maxTokens = 1000; // Risposte concise e professionali
          break;
        case 'neutral':
        default:
          temperature = 0.7; // Equilibrato
          maxTokens = 1000;
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
        maxTokens = Math.min(maxTokens + 200, 1500); // Risposte più elaborate
      }
    }

    const startTime = Date.now();
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
    });
    const processingTime = Date.now() - startTime;

    const assistantResponse = completion.choices[0]?.message?.content;

    if (!assistantResponse) {
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

    // Handle conversation persistence
    const conversationService = new ConversationService();
    let finalConversationId = conversationId;

    try {
      // Create conversation if it doesn't exist
      if (!finalConversationId) {
        const newConversationId = await conversationService.createConversation(
          userIdToUse,
          `Chat ${new Date().toLocaleDateString()}`
        );
        finalConversationId = newConversationId.toString();
      }

      // Add user message
      const userMsg: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      };
      await conversationService.addMessage(finalConversationId, userMsg);

      // Add assistant response
      const assistantMsg: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantResponse.trim(),
        timestamp: new Date(),
        sources: messageSources,
        metadata: {
          processingTime,
          model: 'gpt-3.5-turbo',
          tokenCount: completion.usage?.total_tokens
        }
      };
      await conversationService.addMessage(finalConversationId, assistantMsg);

    } catch (convError) {
      console.error('Error saving conversation:', convError);
      // Don't fail the response if conversation saving fails
    }

    return { 
      response: assistantResponse.trim(),
      sources: messageSources,
      conversationId: finalConversationId
    };

  } catch (error: any) {
    return { error: `Impossibile generare la risposta della chat a causa di un errore del server. ${error.message}` };
  }
}

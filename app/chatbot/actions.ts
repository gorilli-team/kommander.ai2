
'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import openai from '@/backend/lib/openai';
import { buildPromptServer, type ChatMessage } from '@/backend/lib/buildPromptServer';
import type { Faq } from '@/backend/schemas/faq';
import { getFileContent } from '@/app/training/actions';
import { auth } from '@/frontend/auth'; // Import auth for session

import mammoth from 'mammoth';
import pdf from 'pdf-parse'; // Import pdf-parse

interface UploadedFileInfoForPrompt {
  fileName: string;
  originalFileType: string;
}

async function extractTextFromFileBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  console.log(`[app/chatbot/actions.ts] extractTextFromFileBuffer: Inizio estrazione testo per ${fileName}, tipo: ${fileType}, dimensione buffer: ${buffer.length}`);
  let rawText = '';
  try {
    if (fileType === 'application/pdf') {
      const data = await pdf(buffer);
      rawText = data.text;
      console.log(`[app/chatbot/actions.ts] Estrazione testo PDF con pdf-parse completata per ${fileName}. Lunghezza: ${rawText.length}`);
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
  chatbotOwnerId?: string // Optional: ID of the customer/owner of the chatbot data
): Promise<{ response?: string; error?: string }> {
  console.log('[app/chatbot/actions.ts] generateChatResponse: Messaggio ricevuto:', userMessage, 'Lunghezza cronologia:', history.length, 'ChatbotOwnerId:', chatbotOwnerId);
  
  let userIdToUse: string | undefined = chatbotOwnerId;

  if (!userIdToUse) { // Fallback to session if chatbotOwnerId is not provided
    const session = await auth();
    if (!session?.user?.id) {
      console.error('[app/chatbot/actions.ts] generateChatResponse: User not authenticated and no chatbotOwnerId provided.');
      return { error: 'User not authenticated or chatbot owner ID missing. Please log in or provide a valid chatbot ID.' };
    }
    userIdToUse = session.user.id;
    console.log('[app/chatbot/actions.ts] generateChatResponse: User authenticated from session:', userIdToUse);
  } else {
    console.log('[app/chatbot/actions.ts] generateChatResponse: Using provided chatbotOwnerId:', userIdToUse);
  }

  if (!userMessage.trim()) {
    return { error: 'Il messaggio non può essere vuoto.' };
  }

  if (!userIdToUse) { 
    console.error('[app/chatbot/actions.ts] generateChatResponse: userIdToUse is still undefined.');
    return { error: 'Unable to determine user/owner for data retrieval.' };
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
    console.log(`[app/chatbot/actions.ts] generateChatResponse: Recuperate ${faqs.length} FAQ per user/owner ${userIdToUse}.`);

    const allUploadedFilesMeta = await db.collection('raw_files_meta')
      .find({ userId: userIdToUse }) 
      .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 })
      .sort({ uploadedAt: -1 })
      .toArray();
    
    console.log(`[app/chatbot/actions.ts] generateChatResponse: Recuperati metadati per ${allUploadedFilesMeta.length} file caricati da 'raw_files_meta' per user/owner ${userIdToUse}.`);

    const filesForPromptContext: UploadedFileInfoForPrompt[] = allUploadedFilesMeta.map(doc => ({
        fileName: doc.fileName,
        originalFileType: doc.originalFileType,
    }));
    
    let extractedTextContentForPrompt: string | undefined = undefined;

    if (allUploadedFilesMeta.length > 0) {
      const mostRecentFileMeta = allUploadedFilesMeta[0];
      console.log(`[app/chatbot/actions.ts] Tentativo di elaborazione del file più recente per user/owner ${userIdToUse}: ${mostRecentFileMeta.fileName} (GridFS ID: ${mostRecentFileMeta.gridFsFileId.toString()})`);
      
      const fileBufferResult = await getFileContent(mostRecentFileMeta.gridFsFileId.toString(), userIdToUse);

      if ('error' in fileBufferResult) {
        console.error(`[app/chatbot/actions.ts] Errore nel recupero del contenuto per il file ${mostRecentFileMeta.fileName}, user/owner ${userIdToUse}: ${fileBufferResult.error}`);
        extractedTextContentForPrompt = `Impossibile recuperare il contenuto per il file: ${mostRecentFileMeta.fileName}. Errore: ${fileBufferResult.error}`;
      } else {
        extractedTextContentForPrompt = await extractTextFromFileBuffer(fileBufferResult, mostRecentFileMeta.originalFileType, mostRecentFileMeta.fileName);
        
        const MAX_TEXT_LENGTH = 10000; 
        if (extractedTextContentForPrompt.length > MAX_TEXT_LENGTH) {
          extractedTextContentForPrompt = extractedTextContentForPrompt.substring(0, MAX_TEXT_LENGTH) + "\\n[...contenuto troncato a causa della lunghezza...]";
        }
      }
    } else {
        console.log(`[app/chatbot/actions.ts] Nessun file caricato trovato per user/owner ${userIdToUse} per fornire contesto aggiuntivo.`);
    }

    const messages = buildPromptServer(userMessage, faqs, filesForPromptContext, extractedTextContentForPrompt, history);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', 
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantResponse = completion.choices[0]?.message?.content;

    if (!assistantResponse) {
      return { error: 'AI non ha restituito una risposta.' };
    }

    return { response: assistantResponse.trim() };

  } catch (error: any) {
    console.error('[app/chatbot/actions.ts] generateChatResponse: Errore durante la generazione della risposta della chat per user/owner', userIdToUse, ':', error);
    return { error: `Impossibile generare la risposta della chat a causa di un errore del server. ${error.message}` };
  }
}

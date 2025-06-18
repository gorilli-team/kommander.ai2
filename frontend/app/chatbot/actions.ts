
'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import openai from '@/backend/lib/openai';
import { buildPromptServer, type ChatMessage } from '@/backend/lib/buildPromptServer';
import type { Faq } from '@/backend/schemas/faq';
import { getFileContent } from '@/app/training/actions';
import { auth } from '@/frontend/auth'; // Import auth for session

import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist/legacy/build/pdf.js';
import mammoth from 'mammoth';

const PDF_JS_WORKER_SRC = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
if (GlobalWorkerOptions.workerSrc !== PDF_JS_WORKER_SRC) {
    GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_SRC;
}


interface UploadedFileInfoForPrompt {
  fileName: string;
  originalFileType: string;
}

async function extractTextFromFileBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  console.log(`[frontend/app/chatbot/actions.ts] extractTextFromFileBuffer: Inizio estrazione testo per ${fileName}, tipo: ${fileType}, dimensione buffer: ${buffer.length}`);
  let rawText = '';
  try {
    if (fileType === 'application/pdf') {
      const data = new Uint8Array(buffer);
      const pdfDoc = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        rawText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else if (fileType === 'text/plain') {
      rawText = buffer.toString('utf-8');
    } else {
      return `Impossibile estrarre il testo dal file ${fileName} (tipo: ${fileType}) poiché il tipo di file non è supportato per l'estrazione del contenuto.`;
    }
  } catch (error: any) {
    let detailedErrorMessage = error.message;
    if (fileType === 'application/pdf' && error.message && (error.message.toLowerCase().includes("cannot find module './pdf.worker.js'") || error.message.toLowerCase().includes("setting up fake worker failed") || error.message.toLowerCase().includes("libuuid"))) {
        detailedErrorMessage = "Si è verificato un problema con l'inizializzazione del componente di elaborazione PDF. L'estrazione del testo potrebbe non riuscire.";
    }
    return `Errore durante l'estrazione del testo dal file ${fileName}. Dettagli: ${detailedErrorMessage}`;
  }
  return rawText.trim();
}


export async function generateChatResponse(
  userMessage: string,
  history: ChatMessage[]
): Promise<{ response?: string; error?: string }> {
  console.log('[frontend/app/chatbot/actions.ts] generateChatResponse: Messaggio ricevuto:', userMessage, 'Lunghezza cronologia:', history.length);
  
  const session = await auth();
  if (!session?.user?.id) {
    console.error('[frontend/app/chatbot/actions.ts] generateChatResponse: User not authenticated.');
    return { error: 'User not authenticated. Please log in to use the chatbot.' };
  }
  const userId = session.user.id;
  console.log('[frontend/app/chatbot/actions.ts] generateChatResponse: User authenticated:', userId);

  if (!userMessage.trim()) {
    return { error: 'Il messaggio non può essere vuoto.' };
  }

  try {
    const { db } = await connectToDatabase();
    
    // Fetch FAQs specific to the user
    const faqsCursor = await db.collection('faqs').find({ userId: userId }).limit(10).toArray(); 
    const faqs: Faq[] = faqsCursor.map(doc => ({
        id: doc._id.toString(),
        userId: doc.userId,
        question: doc.question,
        answer: doc.answer,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    }));
    console.log(`[frontend/app/chatbot/actions.ts] generateChatResponse: Recuperate ${faqs.length} FAQ per user ${userId}.`);

    // Fetch file metadata specific to the user
    const allUploadedFilesMeta = await db.collection('raw_files_meta')
      .find({ userId: userId }) // Filter by userId
      .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 })
      .sort({ uploadedAt: -1 })
      .toArray();
    
    console.log(`[frontend/app/chatbot/actions.ts] generateChatResponse: Recuperati metadati per ${allUploadedFilesMeta.length} file caricati da 'raw_files_meta' per user ${userId}.`);

    const filesForPromptContext: UploadedFileInfoForPrompt[] = allUploadedFilesMeta.map(doc => ({
        fileName: doc.fileName,
        originalFileType: doc.originalFileType,
    }));
    
    let extractedTextContentForPrompt: string | undefined = undefined;

    if (allUploadedFilesMeta.length > 0) {
      const mostRecentFileMeta = allUploadedFilesMeta[0];
      console.log(`[frontend/app/chatbot/actions.ts] Tentativo di elaborazione del file più recente per user ${userId}: ${mostRecentFileMeta.fileName} (GridFS ID: ${mostRecentFileMeta.gridFsFileId.toString()})`);
      
      // Pass userId to getFileContent for authorization
      const fileBufferResult = await getFileContent(mostRecentFileMeta.gridFsFileId.toString(), userId);

      if ('error' in fileBufferResult) {
        console.error(`[frontend/app/chatbot/actions.ts] Errore nel recupero del contenuto per il file ${mostRecentFileMeta.fileName}, user ${userId}: ${fileBufferResult.error}`);
        extractedTextContentForPrompt = `Impossibile recuperare il contenuto per il file: ${mostRecentFileMeta.fileName}. Errore: ${fileBufferResult.error}`;
      } else {
        extractedTextContentForPrompt = await extractTextFromFileBuffer(fileBufferResult, mostRecentFileMeta.originalFileType, mostRecentFileMeta.fileName);
        
        const MAX_TEXT_LENGTH = 10000; 
        if (extractedTextContentForPrompt.length > MAX_TEXT_LENGTH) {
          extractedTextContentForPrompt = extractedTextContentForPrompt.substring(0, MAX_TEXT_LENGTH) + "\n[...contenuto troncato a causa della lunghezza...]";
        }
      }
    } else {
        console.log(`[frontend/app/chatbot/actions.ts] Nessun file caricato trovato per user ${userId} per fornire contesto aggiuntivo.`);
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
    console.error('[frontend/app/chatbot/actions.ts] generateChatResponse: Errore durante la generazione della risposta della chat per user', userId, ':', error);
    return { error: `Impossibile generare la risposta della chat a causa di un errore del server. ${error.message}` };
  }
}


'use server';

import { connectToDatabase } from '@/backend/lib/mongodb'; // Alias dovrebbe puntare a backend/lib/mongodb.ts
import openai from '@/backend/lib/openai'; // Alias dovrebbe puntare a backend/lib/openai.ts
import { buildPromptServer, type ChatMessage } from '@/backend/lib/buildPromptServer'; // Alias
import type { Faq } from '@/backend/schemas/faq'; // Alias
import { getFileContent } from '@/app/training/actions'; // Alias dovrebbe puntare a app/training/actions.ts

// Importa le librerie per l'estrazione del testo
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist/legacy/build/pdf.js';
import mammoth from 'mammoth';

// Configurazione di pdfjs-dist per l'ambiente server
// È spesso meglio NON impostare workerSrc per la build legacy in Node.js
// se (typeof window === 'undefined') {
//   GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
// }
console.log(`[app/chatbot/actions.ts] Initialized. pdfjs-dist version: ${pdfjsVersion}`);

interface UploadedFileInfoForPrompt {
  fileName: string;
  originalFileType: string;
}

async function extractTextFromFileBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  console.log(`[app/chatbot/actions.ts] extractTextFromFileBuffer: Starting text extraction for ${fileName}, type: ${fileType}, buffer size: ${buffer.length}`);
  let rawText = '';
  try {
    if (fileType === 'application/pdf') {
      const data = new Uint8Array(buffer);
      // Opzioni raccomandate per ambienti Node.js/non-browser ristretti
      const pdfDoc = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
      console.log(`[app/chatbot/actions.ts] PDF document loaded for ${fileName} with ${pdfDoc.numPages} pages.`);
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        rawText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
      }
      console.log(`[app/chatbot/actions.ts] PDF text extraction successful for ${fileName}. Length: ${rawText.length}`);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
      console.log(`[app/chatbot/actions.ts] DOCX text extraction successful for ${fileName}. Length: ${rawText.length}`);
    } else if (fileType === 'text/plain') {
      rawText = buffer.toString('utf-8');
      console.log(`[app/chatbot/actions.ts] TXT text extraction successful for ${fileName}. Length: ${rawText.length}`);
    } else {
      console.warn(`[app/chatbot/actions.ts] Unsupported file type for text extraction: ${fileType} for ${fileName}`);
      return `Cannot extract text from file ${fileName} (type: ${fileType}) as file type is not supported for content extraction.`;
    }
  } catch (error: any) {
    console.error(`[app/chatbot/actions.ts] Error during text extraction from ${fileName} (type: ${fileType}):`, error.message);
    console.error(`[app/chatbot/actions.ts] Extraction error stack:`, error.stack);
    return `Error extracting text from file ${fileName}. Details: ${error.message}`;
  }
  return rawText.trim();
}


export async function generateChatResponse(
  userMessage: string,
  history: ChatMessage[]
): Promise<{ response?: string; error?: string }> {
  console.log('[app/chatbot/actions.ts] generateChatResponse: Received message:', userMessage, 'History length:', history.length);
  if (!userMessage.trim()) {
    return { error: 'Message cannot be empty.' };
  }

  try {
    const { db } = await connectToDatabase();
    console.log('[app/chatbot/actions.ts] generateChatResponse: Connected to database.');
    
    const faqsCursor = await db.collection('faqs').find({}).limit(10).toArray();
    const faqs: Faq[] = faqsCursor.map(doc => ({
        id: doc._id.toString(),
        question: doc.question,
        answer: doc.answer,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    }));
    console.log(`[app/chatbot/actions.ts] generateChatResponse: Fetched ${faqs.length} FAQs.`);

    // Recupera metadati di TUTTI i file, ordinati per data di caricamento decrescente
    const allUploadedFilesMeta = await db.collection('raw_files_meta')
      .find({})
      .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 })
      .sort({ uploadedAt: -1 })
      .toArray();
    
    console.log(`[app/chatbot/actions.ts] generateChatResponse: Fetched metadata for ${allUploadedFilesMeta.length} uploaded files from 'raw_files_meta'.`);

    // Queste sono le informazioni di base su tutti i file da passare al prompt builder
    const filesForPromptContext: UploadedFileInfoForPrompt[] = allUploadedFilesMeta.map(doc => ({
        fileName: doc.fileName,
        originalFileType: doc.originalFileType,
    }));
    
    let extractedTextContentForPrompt: string | undefined = undefined;

    if (allUploadedFilesMeta.length > 0) {
      const mostRecentFileMeta = allUploadedFilesMeta[0]; // Prende il file più recente
      console.log(`[app/chatbot/actions.ts] Attempting to process most recent file: ${mostRecentFileMeta.fileName} (GridFS ID: ${mostRecentFileMeta.gridFsFileId.toString()})`);
      
      console.log(`[app/chatbot/actions.ts] Calling getFileContent for GridFS ID: ${mostRecentFileMeta.gridFsFileId.toString()}`);
      const fileBufferResult = await getFileContent(mostRecentFileMeta.gridFsFileId.toString());

      if ('error' in fileBufferResult) {
        console.error(`[app/chatbot/actions.ts] Error retrieving content for file ${mostRecentFileMeta.fileName}: ${fileBufferResult.error}`);
        extractedTextContentForPrompt = `Could not retrieve content for file: ${mostRecentFileMeta.fileName}. Error: ${fileBufferResult.error}`;
      } else {
        console.log(`[app/chatbot/actions.ts] File buffer for ${mostRecentFileMeta.fileName} retrieved successfully. Size: ${fileBufferResult.length}. Starting text extraction.`);
        extractedTextContentForPrompt = await extractTextFromFileBuffer(fileBufferResult, mostRecentFileMeta.originalFileType, mostRecentFileMeta.fileName);
        
        const MAX_TEXT_LENGTH = 10000; // Limita la lunghezza del testo per il prompt
        if (extractedTextContentForPrompt.length > MAX_TEXT_LENGTH) {
          extractedTextContentForPrompt = extractedTextContentForPrompt.substring(0, MAX_TEXT_LENGTH) + "\n[...content truncated due to length...]";
          console.log(`[app/chatbot/actions.ts] Extracted text for ${mostRecentFileMeta.fileName} truncated to ${MAX_TEXT_LENGTH} characters.`);
        }
        console.log(`[app/chatbot/actions.ts] Extracted text from ${mostRecentFileMeta.fileName} for prompt. Final length: ${extractedTextContentForPrompt.length}`);
        if (extractedTextContentForPrompt.startsWith("Error extracting text") || extractedTextContentForPrompt.startsWith("Cannot extract text")) {
            console.warn(`[app/chatbot/actions.ts] Text extraction for ${mostRecentFileMeta.fileName} returned an error message: ${extractedTextContentForPrompt}`);
        }
      }
    } else {
        console.log('[app/chatbot/actions.ts] No uploaded files found to provide additional context.');
    }

    // Passa il testo estratto (o il messaggio di errore dell'estrazione) a buildPromptServer
    const messages = buildPromptServer(userMessage, faqs, filesForPromptContext, extractedTextContentForPrompt, history);
    console.log('[app/chatbot/actions.ts] generateChatResponse: Prompt built for OpenAI.');
    // Per debug: console.log('Prompt Messages:', JSON.stringify(messages, null, 2));
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', 
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000, // Potrebbe essere necessario aumentarlo se le risposte sono troncate
    });
    console.log('[app/chatbot/actions.ts] generateChatResponse: OpenAI completion received.');

    const assistantResponse = completion.choices[0]?.message?.content;

    if (!assistantResponse) {
      console.error('[app/chatbot/actions.ts] generateChatResponse: AI did not return a response.');
      return { error: 'AI did not return a response.' };
    }

    console.log('[app/chatbot/actions.ts] generateChatResponse: Success, returning AI response.');
    return { response: assistantResponse.trim() };

  } catch (error: any) {
    console.error('[app/chatbot/actions.ts] generateChatResponse: Error generating chat response:', error);
    console.error('[app/chatbot/actions.ts] generateChatResponse: Error name:', error.name);
    console.error('[app/chatbot/actions.ts] generateChatResponse: Error message:', error.message);
    console.error('[app/chatbot/actions.ts] generateChatResponse: Error stack:', error.stack);
    return { error: `Failed to generate chat response due to a server error. ${error.message}` };
  }
}

    
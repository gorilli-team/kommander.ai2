
'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import openai from '@/backend/lib/openai';
import { buildPromptServer, type ChatMessage } from '@/backend/lib/buildPromptServer';
import type { Faq } from '@/backend/schemas/faq';
import { getFileContent, type DocumentDisplayItem } from '@/app/training/actions'; // Assuming getFileContent is exported and DocumentDisplayItem includes gridFsFileId

// Import text extraction libraries
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist/legacy/build/pdf.js';
import mammoth from 'mammoth';

// For server-side (Node.js) execution of pdfjs-dist, it's often best to not set workerSrc
// and let the legacy build use its 'fake worker' or internal stream processing.
// If issues arise, we might need:
// if (typeof window === 'undefined') {
//   GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
// }
console.log(`[chatbot/actions.ts] pdfjs-dist version: ${pdfjsVersion}`);


interface UploadedFileInfoForPrompt {
  fileName: string;
  originalFileType: string;
  extractedText?: string; // To hold the extracted text
}

async function extractTextFromFileBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  console.log(`[chatbot/actions.ts] extractTextFromFileBuffer: Starting text extraction for ${fileName}, type: ${fileType}`);
  let rawText = '';
  try {
    if (fileType === 'application/pdf') {
      const data = new Uint8Array(buffer);
      const pdfDoc = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
      console.log(`[chatbot/actions.ts] PDF document loaded for ${fileName} with ${pdfDoc.numPages} pages.`);
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        rawText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
      }
      console.log(`[chatbot/actions.ts] Successfully extracted text from PDF ${fileName}. Length: ${rawText.length}`);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
      console.log(`[chatbot/actions.ts] Successfully extracted text from DOCX ${fileName}. Length: ${rawText.length}`);
    } else if (fileType === 'text/plain') {
      rawText = buffer.toString('utf-8');
      console.log(`[chatbot/actions.ts] Successfully extracted text from TXT ${fileName}. Length: ${rawText.length}`);
    } else {
      console.warn(`[chatbot/actions.ts] Unsupported file type for text extraction: ${fileType} for ${fileName}`);
      return `Content of file ${fileName} (type: ${fileType}) is not directly viewable in this chat.`;
    }
  } catch (error: any) {
    console.error(`[chatbot/actions.ts] Error extracting text from ${fileName} (type: ${fileType}):`, error.message, error.stack);
    return `Error extracting text from file ${fileName}.`;
  }
  return rawText.trim();
}


export async function generateChatResponse(
  userMessage: string,
  history: ChatMessage[]
): Promise<{ response?: string; error?: string }> {
  console.log('[src/app/chatbot/actions.ts] generateChatResponse: Received message:', userMessage, 'History length:', history.length);
  if (!userMessage.trim()) {
    return { error: 'Message cannot be empty.' };
  }

  try {
    const { db } = await connectToDatabase();
    console.log('[src/app/chatbot/actions.ts] generateChatResponse: Connected to database.');
    
    const faqsCursor = await db.collection('faqs').find({}).limit(10).toArray(); 
    const faqs: Faq[] = faqsCursor.map(doc => ({
        id: doc._id.toString(),
        question: doc.question,
        answer: doc.answer,
        // createdAt and updatedAt might not be present or could be strings if not properly deserialized,
        // ensure Faq type and mapping handle this. For the prompt, only Q&A are vital.
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    }));
    console.log(`[src/app/chatbot/actions.ts] generateChatResponse: Fetched ${faqs.length} FAQs.`);

    // Fetch metadata for all uploaded files, sorted by most recent
    const allUploadedFilesMeta = await db.collection('raw_files_meta')
      .find({})
      .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 }) // Ensure gridFsFileId is fetched
      .sort({ uploadedAt: -1 })
      .toArray();
    
    console.log(`[src/app/chatbot/actions.ts] generateChatResponse: Fetched metadata for ${allUploadedFilesMeta.length} uploaded files from 'raw_files_meta'.`);

    const filesForPrompt: UploadedFileInfoForPrompt[] = [];
    let extractedTextContent = '';

    if (allUploadedFilesMeta.length > 0) {
      // For now, let's try to "read" the most recently uploaded file.
      const mostRecentFileMeta = allUploadedFilesMeta[0]; // The list is sorted by uploadedAt descending
      
      console.log(`[src/app/chatbot/actions.ts] Processing most recent file: ${mostRecentFileMeta.fileName} (GridFS ID: ${mostRecentFileMeta.gridFsFileId})`);
      
      const fileBufferResult = await getFileContent(mostRecentFileMeta.gridFsFileId.toString());

      if ('error' in fileBufferResult) {
        console.error(`[src/app/chatbot/actions.ts] Error getting content for file ${mostRecentFileMeta.fileName}: ${fileBufferResult.error}`);
        extractedTextContent = `Could not retrieve content for file: ${mostRecentFileMeta.fileName}. Error: ${fileBufferResult.error}`;
      } else {
        extractedTextContent = await extractTextFromFileBuffer(fileBufferResult, mostRecentFileMeta.originalFileType, mostRecentFileMeta.fileName);
         // Truncate if too long to avoid excessive prompt length, adjust limit as needed
        const MAX_TEXT_LENGTH = 10000; // Example limit, can be adjusted
        if (extractedTextContent.length > MAX_TEXT_LENGTH) {
          extractedTextContent = extractedTextContent.substring(0, MAX_TEXT_LENGTH) + "\n[...content truncated due to length...]";
          console.log(`[src/app/chatbot/actions.ts] Extracted text for ${mostRecentFileMeta.fileName} was truncated.`);
        }
      }
      // Add all files to the prompt context (even if only one is read for now, AI knows about others)
       allUploadedFilesMeta.forEach(doc => {
        filesForPrompt.push({
            fileName: doc.fileName,
            originalFileType: doc.originalFileType,
        });
      });
    }


    const messages = buildPromptServer(userMessage, faqs, filesForPrompt, extractedTextContent, history);
    console.log('[src/app/chatbot/actions.ts] generateChatResponse: Prompt built for OpenAI.');
    // console.log('Prompt Messages:', JSON.stringify(messages, null, 2)); // For debugging the prompt
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', 
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000, // Increased max_tokens slightly to accommodate potentially larger context
    });
    console.log('[src/app/chatbot/actions.ts] generateChatResponse: OpenAI completion received.');

    const assistantResponse = completion.choices[0]?.message?.content;

    if (!assistantResponse) {
      console.error('[src/app/chatbot/actions.ts] generateChatResponse: AI did not return a response.');
      return { error: 'AI did not return a response.' };
    }

    console.log('[src/app/chatbot/actions.ts] generateChatResponse: Success, returning AI response.');
    return { response: assistantResponse.trim() };

  } catch (error: any) {
    console.error('[src/app/chatbot/actions.ts] generateChatResponse: Error generating chat response:', error);
    console.error('[src/app/chatbot/actions.ts] generateChatResponse: Error name:', error.name);
    console.error('[src/app/chatbot/actions.ts] generateChatResponse: Error message:', error.message);
    console.error('[src/app/chatbot/actions.ts] generateChatResponse: Error stack:', error.stack);
    return { error: `Failed to generate chat response due to a server error. ${error.message}` };
  }
}

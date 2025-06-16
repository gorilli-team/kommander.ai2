
'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import openai from '@/backend/lib/openai';
import { buildPromptServer, type ChatMessage } from '@/backend/lib/buildPromptServer';
import type { Faq } from '@/backend/schemas/faq';
import { getFileContent } from '@/app/training/actions'; // DocumentDisplayItem non è necessario qui

// Import text extraction libraries
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist/legacy/build/pdf.js';
import mammoth from 'mammoth';

// Per l'utilizzo lato server (Node.js) di pdfjs-dist, è spesso meglio non impostare workerSrc
// e lasciare che la build legacy usi il suo 'fake worker' o l'elaborazione interna del flusso.
console.log(`[src/app/chatbot/actions.ts] pdfjs-dist version: ${pdfjsVersion}`);


interface UploadedFileInfoForPrompt {
  fileName: string;
  originalFileType: string;
  // extractedText è passato separatamente a buildPromptServer
}

async function extractTextFromFileBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  console.log(`[src/app/chatbot/actions.ts] extractTextFromFileBuffer: Inizio estrazione testo per ${fileName}, tipo: ${fileType}, dimensione buffer: ${buffer.length}`);
  let rawText = '';
  try {
    if (fileType === 'application/pdf') {
      // Converti Buffer Node.js in Uint8Array per pdfjs-dist
      const data = new Uint8Array(buffer);
      // useWorkerFetch: false e isEvalSupported: false sono raccomandati per ambienti non browser/Node.js ristretti
      const pdfDoc = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
      console.log(`[src/app/chatbot/actions.ts] Documento PDF caricato per ${fileName} con ${pdfDoc.numPages} pagine.`);
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        rawText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
      }
      console.log(`[src/app/chatbot/actions.ts] Estrazione testo PDF completata con successo per ${fileName}. Lunghezza: ${rawText.length}`);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
      console.log(`[src/app/chatbot/actions.ts] Estrazione testo DOCX completata con successo per ${fileName}. Lunghezza: ${rawText.length}`);
    } else if (fileType === 'text/plain') {
      rawText = buffer.toString('utf-8');
      console.log(`[src/app/chatbot/actions.ts] Estrazione testo TXT completata con successo per ${fileName}. Lunghezza: ${rawText.length}`);
    } else {
      console.warn(`[src/app/chatbot/actions.ts] Tipo file non supportato per estrazione testo: ${fileType} per ${fileName}`);
      return `Impossibile estrarre il testo dal file ${fileName} (tipo: ${fileType}) poiché il tipo di file non è supportato per l'estrazione del contenuto.`;
    }
  } catch (error: any) {
    console.error(`[src/app/chatbot/actions.ts] Errore durante l'estrazione del testo da ${fileName} (tipo: ${fileType}):`, error.message);
    console.error(`[src/app/chatbot/actions.ts] Stack trace errore estrazione:`, error.stack);
    let detailedErrorMessage = error.message;
    if (fileType === 'application/pdf' && error.message && (error.message.toLowerCase().includes("cannot find module './pdf.worker.js'") || error.message.toLowerCase().includes("libuuid.so.1") || error.message.toLowerCase().includes("setting up fake worker failed"))) {
        detailedErrorMessage = "Spiacenti, l'elaborazione dei file PDF è temporaneamente non disponibile a causa di limitazioni dell'ambiente server. Prova con un file TXT o DOCX, oppure contatta il supporto se il problema persiste.";
        console.warn(`[src/app/chatbot/actions.ts] Specific PDF processing environment error for ${fileName}: ${error.message}`);
    }
    return `Errore durante l'estrazione del testo dal file ${fileName}. Dettagli: ${detailedErrorMessage}`;
  }
  return rawText.trim();
}


export async function generateChatResponse(
  userMessage: string,
  history: ChatMessage[]
): Promise<{ response?: string; error?: string }> {
  console.log('[src/app/chatbot/actions.ts] generateChatResponse: Messaggio ricevuto:', userMessage, 'Lunghezza cronologia:', history.length);
  if (!userMessage.trim()) {
    return { error: 'Il messaggio non può essere vuoto.' };
  }

  try {
    const { db } = await connectToDatabase();
    console.log('[src/app/chatbot/actions.ts] generateChatResponse: Connesso al database.');
    
    const faqsCursor = await db.collection('faqs').find({}).limit(10).toArray(); 
    const faqs: Faq[] = faqsCursor.map(doc => ({
        id: doc._id.toString(),
        question: doc.question,
        answer: doc.answer,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    }));
    console.log(`[src/app/chatbot/actions.ts] generateChatResponse: Recuperate ${faqs.length} FAQ.`);

    const allUploadedFilesMeta = await db.collection('raw_files_meta')
      .find({})
      .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 })
      .sort({ uploadedAt: -1 })
      .toArray();
    
    console.log(`[src/app/chatbot/actions.ts] generateChatResponse: Recuperati metadati per ${allUploadedFilesMeta.length} file caricati da 'raw_files_meta'.`);

    const filesForPromptContext: UploadedFileInfoForPrompt[] = allUploadedFilesMeta.map(doc => ({
        fileName: doc.fileName,
        originalFileType: doc.originalFileType,
    }));
    
    let extractedTextContentForPrompt: string | undefined = undefined;

    if (allUploadedFilesMeta.length > 0) {
      const mostRecentFileMeta = allUploadedFilesMeta[0];
      console.log(`[src/app/chatbot/actions.ts] Tentativo di elaborazione del file più recente: ${mostRecentFileMeta.fileName} (GridFS ID: ${mostRecentFileMeta.gridFsFileId.toString()})`);
      
      const fileBufferResult = await getFileContent(mostRecentFileMeta.gridFsFileId.toString());

      if ('error' in fileBufferResult) {
        console.error(`[src/app/chatbot/actions.ts] Errore nel recupero del contenuto per il file ${mostRecentFileMeta.fileName}: ${fileBufferResult.error}`);
        extractedTextContentForPrompt = `Impossibile recuperare il contenuto per il file: ${mostRecentFileMeta.fileName}. Errore: ${fileBufferResult.error}`;
      } else {
        console.log(`[src/app/chatbot/actions.ts] Buffer del file ${mostRecentFileMeta.fileName} recuperato con successo. Dimensione: ${fileBufferResult.length}. Inizio estrazione testo.`);
        extractedTextContentForPrompt = await extractTextFromFileBuffer(fileBufferResult, mostRecentFileMeta.originalFileType, mostRecentFileMeta.fileName);
        
        const MAX_TEXT_LENGTH = 10000; 
        if (extractedTextContentForPrompt.length > MAX_TEXT_LENGTH) {
          extractedTextContentForPrompt = extractedTextContentForPrompt.substring(0, MAX_TEXT_LENGTH) + "\n[...contenuto troncato a causa della lunghezza...]";
          console.log(`[src/app/chatbot/actions.ts] Testo estratto per ${mostRecentFileMeta.fileName} troncato a ${MAX_TEXT_LENGTH} caratteri.`);
        }
        console.log(`[src/app/chatbot/actions.ts] Testo estratto da ${mostRecentFileMeta.fileName} per il prompt. Lunghezza: ${extractedTextContentForPrompt.length}`);
        if (extractedTextContentForPrompt.startsWith("Errore durante l'estrazione") || extractedTextContentForPrompt.startsWith("Impossibile estrarre il testo") || extractedTextContentForPrompt.startsWith("Spiacenti, l'elaborazione dei file PDF")) {
            console.warn(`[src/app/chatbot/actions.ts] Estrazione testo per ${mostRecentFileMeta.fileName} ha restituito un messaggio di errore/avviso: ${extractedTextContentForPrompt}`);
        }
      }
    } else {
        console.log('[src/app/chatbot/actions.ts] Nessun file caricato trovato per fornire contesto aggiuntivo.');
    }

    const messages = buildPromptServer(userMessage, faqs, filesForPromptContext, extractedTextContentForPrompt, history);
    console.log('[src/app/chatbot/actions.ts] generateChatResponse: Prompt costruito per OpenAI.');
    // console.log('Prompt Messages:', JSON.stringify(messages, null, 2)); // Decommenta per debug dettagliato del prompt
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', 
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });
    console.log('[src/app/chatbot/actions.ts] generateChatResponse: Completamento OpenAI ricevuto.');

    const assistantResponse = completion.choices[0]?.message?.content;

    if (!assistantResponse) {
      console.error('[src/app/chatbot/actions.ts] generateChatResponse: AI non ha restituito una risposta.');
      return { error: 'AI non ha restituito una risposta.' };
    }

    console.log('[src/app/chatbot/actions.ts] generateChatResponse: Successo, restituzione risposta AI.');
    return { response: assistantResponse.trim() };

  } catch (error: any) {
    console.error('[src/app/chatbot/actions.ts] generateChatResponse: Errore durante la generazione della risposta della chat:', error);
    console.error('[src/app/chatbot/actions.ts] generateChatResponse: Nome errore:', error.name);
    console.error('[src/app/chatbot/actions.ts] generateChatResponse: Messaggio errore:', error.message);
    console.error('[src/app/chatbot/actions.ts] generateChatResponse: Stack errore:', error.stack);
    return { error: `Impossibile generare la risposta della chat a causa di un errore del server. ${error.message}` };
  }
}

    

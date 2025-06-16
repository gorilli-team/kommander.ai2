
'use server';

import { connectToDatabase } from '@/backend/lib/mongodb'; // Alias dovrebbe puntare a backend/lib/mongodb.ts
import openai from '@/backend/lib/openai'; // Alias dovrebbe puntare a backend/lib/openai.ts
import { buildPromptServer, type ChatMessage } from '@/backend/lib/buildPromptServer'; // Alias
import type { Faq } from '@/backend/schemas/faq'; // Alias
import { getFileContent } from '@/app/training/actions'; // Alias dovrebbe puntare a app/training/actions.ts

// Importa le librerie per l'estrazione del testo
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist/legacy/build/pdf.js';
import mammoth from 'mammoth';

// Configura pdf.js worker. Questo deve essere fatto una volta.
// require.resolve dovrebbe fornire il percorso assoluto al file del worker in node_modules.
// Questo dice a pdf.js da dove caricare lo script del worker, anche per la sua configurazione "fake worker".
try {
    const workerSrcPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
    if (GlobalWorkerOptions.workerSrc !== workerSrcPath) { // Evita di reimpostare se già impostato
        GlobalWorkerOptions.workerSrc = workerSrcPath;
        console.log(`[app/chatbot/actions.ts] pdfjs-dist GlobalWorkerOptions.workerSrc configurato a: ${workerSrcPath}`);
    }
} catch (error) {
    console.error('[app/chatbot/actions.ts] CRITICO: Impossibile risolvere il percorso di pdf.worker.js. L elaborazione dei PDF probabilmente fallirà.', error);
}
console.log(`[app/chatbot/actions.ts] Inizializzato. versione pdfjs-dist: ${pdfjsVersion}`);


interface UploadedFileInfoForPrompt {
  fileName: string;
  originalFileType: string;
}

async function extractTextFromFileBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  console.log(`[app/chatbot/actions.ts] extractTextFromFileBuffer: Inizio estrazione testo per ${fileName}, tipo: ${fileType}, dimensione buffer: ${buffer.length}`);
  let rawText = '';
  try {
    if (fileType === 'application/pdf') {
      const data = new Uint8Array(buffer);
      // Opzioni raccomandate per ambienti Node.js/non-browser ristretti
      const pdfDoc = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
      console.log(`[app/chatbot/actions.ts] Documento PDF caricato per ${fileName} con ${pdfDoc.numPages} pagine.`);
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        rawText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
      }
      console.log(`[app/chatbot/actions.ts] Estrazione testo PDF completata con successo per ${fileName}. Lunghezza: ${rawText.length}`);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
      console.log(`[app/chatbot/actions.ts] Estrazione testo DOCX completata con successo per ${fileName}. Lunghezza: ${rawText.length}`);
    } else if (fileType === 'text/plain') {
      rawText = buffer.toString('utf-8');
      console.log(`[app/chatbot/actions.ts] Estrazione testo TXT completata con successo per ${fileName}. Lunghezza: ${rawText.length}`);
    } else {
      console.warn(`[app/chatbot/actions.ts] Tipo file non supportato per estrazione testo: ${fileType} per ${fileName}`);
      return `Impossibile estrarre il testo dal file ${fileName} (tipo: ${fileType}) poiché il tipo di file non è supportato per l'estrazione del contenuto.`;
    }
  } catch (error: any) {
    console.error(`[app/chatbot/actions.ts] Errore durante l'estrazione del testo da ${fileName} (tipo: ${fileType}):`, error.message);
    console.error(`[app/chatbot/actions.ts] Stack trace errore estrazione:`, error.stack);
    let detailedErrorMessage = error.message;
    if (fileType === 'application/pdf' && error.message && (error.message.toLowerCase().includes("cannot find module './pdf.worker.js'") || error.message.toLowerCase().includes("setting up fake worker failed") || error.message.toLowerCase().includes("libuuid"))) {
        detailedErrorMessage = "Si è verificato un problema con l'inizializzazione del componente di elaborazione PDF. L'estrazione del testo potrebbe non riuscire. Prova con un file TXT o DOCX, o contatta il supporto se il problema persiste con i PDF.";
         console.warn(`[app/chatbot/actions.ts] Errore inizializzazione componente elaborazione PDF per ${fileName}: ${error.message}`);
    }
    return `Errore durante l'estrazione del testo dal file ${fileName}. Dettagli: ${detailedErrorMessage}`;
  }
  return rawText.trim();
}


export async function generateChatResponse(
  userMessage: string,
  history: ChatMessage[]
): Promise<{ response?: string; error?: string }> {
  console.log('[app/chatbot/actions.ts] generateChatResponse: Messaggio ricevuto:', userMessage, 'Lunghezza cronologia:', history.length);
  if (!userMessage.trim()) {
    return { error: 'Il messaggio non può essere vuoto.' };
  }

  try {
    const { db } = await connectToDatabase();
    console.log('[app/chatbot/actions.ts] generateChatResponse: Connesso al database.');
    
    const faqsCursor = await db.collection('faqs').find({}).limit(10).toArray();
    const faqs: Faq[] = faqsCursor.map(doc => ({
        id: doc._id.toString(),
        question: doc.question,
        answer: doc.answer,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
    }));
    console.log(`[app/chatbot/actions.ts] generateChatResponse: Recuperate ${faqs.length} FAQ.`);

    // Recupera metadati di TUTTI i file, ordinati per data di caricamento decrescente
    const allUploadedFilesMeta = await db.collection('raw_files_meta')
      .find({})
      .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 })
      .sort({ uploadedAt: -1 })
      .toArray();
    
    console.log(`[app/chatbot/actions.ts] generateChatResponse: Recuperati metadati per ${allUploadedFilesMeta.length} file caricati da 'raw_files_meta'.`);

    // Queste sono le informazioni di base su tutti i file da passare al prompt builder
    const filesForPromptContext: UploadedFileInfoForPrompt[] = allUploadedFilesMeta.map(doc => ({
        fileName: doc.fileName,
        originalFileType: doc.originalFileType,
    }));
    
    let extractedTextContentForPrompt: string | undefined = undefined;

    if (allUploadedFilesMeta.length > 0) {
      const mostRecentFileMeta = allUploadedFilesMeta[0]; // Prende il file più recente
      console.log(`[app/chatbot/actions.ts] Tentativo di elaborazione del file più recente: ${mostRecentFileMeta.fileName} (GridFS ID: ${mostRecentFileMeta.gridFsFileId.toString()})`);
      
      console.log(`[app/chatbot/actions.ts] Chiamata a getFileContent per GridFS ID: ${mostRecentFileMeta.gridFsFileId.toString()}`);
      const fileBufferResult = await getFileContent(mostRecentFileMeta.gridFsFileId.toString());

      if ('error' in fileBufferResult) {
        console.error(`[app/chatbot/actions.ts] Errore nel recupero del contenuto per il file ${mostRecentFileMeta.fileName}: ${fileBufferResult.error}`);
        extractedTextContentForPrompt = `Impossibile recuperare il contenuto per il file: ${mostRecentFileMeta.fileName}. Errore: ${fileBufferResult.error}`;
      } else {
        console.log(`[app/chatbot/actions.ts] Buffer del file ${mostRecentFileMeta.fileName} recuperato con successo. Dimensione: ${fileBufferResult.length}. Inizio estrazione testo.`);
        extractedTextContentForPrompt = await extractTextFromFileBuffer(fileBufferResult, mostRecentFileMeta.originalFileType, mostRecentFileMeta.fileName);
        
        const MAX_TEXT_LENGTH = 10000; // Limita la lunghezza del testo per il prompt
        if (extractedTextContentForPrompt.length > MAX_TEXT_LENGTH) {
          extractedTextContentForPrompt = extractedTextContentForPrompt.substring(0, MAX_TEXT_LENGTH) + "\n[...contenuto troncato a causa della lunghezza...]";
          console.log(`[app/chatbot/actions.ts] Testo estratto per ${mostRecentFileMeta.fileName} troncato a ${MAX_TEXT_LENGTH} caratteri.`);
        }
        console.log(`[app/chatbot/actions.ts] Testo estratto da ${mostRecentFileMeta.fileName} per il prompt. Lunghezza finale: ${extractedTextContentForPrompt.length}`);
        if (extractedTextContentForPrompt.startsWith("Errore durante l'estrazione") || extractedTextContentForPrompt.startsWith("Impossibile estrarre il testo") || extractedTextContentForPrompt.startsWith("Spiacenti, l'elaborazione dei file PDF")) {
            console.warn(`[app/chatbot/actions.ts] L'estrazione del testo per ${mostRecentFileMeta.fileName} ha restituito un messaggio di errore/avviso: ${extractedTextContentForPrompt}`);
        }
      }
    } else {
        console.log('[app/chatbot/actions.ts] Nessun file caricato trovato per fornire contesto aggiuntivo.');
    }

    // Passa il testo estratto (o il messaggio di errore dell'estrazione) a buildPromptServer
    const messages = buildPromptServer(userMessage, faqs, filesForPromptContext, extractedTextContentForPrompt, history);
    console.log('[app/chatbot/actions.ts] generateChatResponse: Prompt costruito per OpenAI.');
    // Per debug: console.log('Prompt Messages:', JSON.stringify(messages, null, 2));
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', 
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000, // Potrebbe essere necessario aumentarlo se le risposte sono troncate
    });
    console.log('[app/chatbot/actions.ts] generateChatResponse: Completamento OpenAI ricevuto.');

    const assistantResponse = completion.choices[0]?.message?.content;

    if (!assistantResponse) {
      console.error('[app/chatbot/actions.ts] generateChatResponse: AI non ha restituito una risposta.');
      return { error: 'L AI non ha restituito una risposta.' };
    }

    console.log('[app/chatbot/actions.ts] generateChatResponse: Successo, restituzione risposta AI.');
    return { response: assistantResponse.trim() };

  } catch (error: any) {
    console.error('[app/chatbot/actions.ts] generateChatResponse: Errore durante la generazione della risposta della chat:', error);
    console.error('[app/chatbot/actions.ts] generateChatResponse: Nome errore:', error.name);
    console.error('[app/chatbot/actions.ts] generateChatResponse: Messaggio errore:', error.message);
    console.error('[app/chatbot/actions.ts] generateChatResponse: Stack errore:', error.stack);
    return { error: `Impossibile generare la risposta della chat a causa di un errore del server. ${error.message}` };
  }
}
    

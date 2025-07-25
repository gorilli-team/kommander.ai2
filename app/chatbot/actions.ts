
'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import { getOpenAI } from '@/backend/lib/openai';
import { buildPromptServer, type ChatMessage, type DocumentSnippet } from '@/backend/lib/buildPromptServer';
import type { Faq } from '@/backend/schemas/faq';
import { getFileContent } from '@/app/training/actions';
import { auth } from '@/frontend/auth'; // Import auth for session
import { getSettings } from '@/app/settings/actions';
import { getSemanticFaqs } from '@/backend/lib/semanticFaqSearch';

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
): Promise<{ response?: string; error?: string }> {
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
    
    // Usa il sistema di ricerca semantica
    const faqs: Faq[] = await getSemanticFaqs(userIdToUse, userMessage, 10);

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
    const messages = buildPromptServer(
      userMessage,
      faqs,
      filesForPromptContext,
      extractedTextSnippets,
      history,
      summariesForPrompt,
      userSettings || undefined,
    );

    const openai = getOpenAI();
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
    return { error: `Impossibile generare la risposta della chat a causa di un errore del server. ${error.message}` };
  }
}

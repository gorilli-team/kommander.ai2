
'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import { getOpenAI } from '@/backend/lib/openai';
import { buildPromptServer, type ChatMessage, type DocumentSnippet } from '@/backend/lib/buildPromptServer';
import type { Faq } from '@/backend/schemas/faq';
import { getFileContent } from '@/app/training/actions';
import { auth } from '@/frontend/auth'; // Import auth for session
import { getSettings } from '@/app/settings/actions';
import { getSemanticFaqs } from '@/backend/lib/semanticFaqSearch';
import { getSmartFiles, buildFileContext } from '@/backend/lib/smartFileManager';

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
    console.log(`[generateChatResponse] Elaborazione query per utente ${userIdToUse}`);

    // Heuristics for deterministic CSV answers via DB
    try {
      const { findCsvDatasetForQuery, countRows, getRow } = await import('@/backend/lib/csvResolver');
      const dataset = await findCsvDatasetForQuery(userIdToUse, userMessage);
      if (dataset?._id) {
        // Count requests: "quante/quanti/numero/count ... offerte/righe/record"
        const countMatch = /(quante|quanti|numero|count)\s+.*(offerte|righe|record|entries)/i.test(userMessage);
        if (countMatch) {
          const total = await countRows(dataset._id);
          return { response: `Sono presenti ${total} offerte (righe dati) nel dataset "${dataset.fileName}".` };
        }
        // Row N requests: riga/row/linea N
        const rowMatch = userMessage.match(/\b(?:riga|row|linea)\s*(\d{1,6})\b/i);
        if (rowMatch) {
          const n = parseInt(rowMatch[1], 10);
          if (Number.isFinite(n) && n > 0) {
            const data = await getRow(dataset._id, n);
            if (data) {
              const pairs = Object.entries(data).map(([k, v]) => `${k}: ${String(v ?? '').trim()}`).join(' | ');
              return { response: `Riga ${n} (${dataset.fileName}): ${pairs}` };
            } else {
              return { response: `La riga ${n} non esiste nel dataset (righe disponibili: ${dataset.rowCount}).` };
            }
          }
        }
      }
    } catch (csvErr) {
      console.warn('[generateChatResponse] CSV deterministic handler failed:', (csvErr as any)?.message || csvErr);
    }
    
    // Usa il sistema di ricerca semantica per le FAQ
    const faqs: Faq[] = await getSemanticFaqs(userIdToUse, userMessage, 10);
    console.log(`[generateChatResponse] Recuperate ${faqs.length} FAQ rilevanti`);

    // Usa il nuovo SmartFileManager per file intelligenti
    const maxFiles = parseInt(process.env.MAX_PROMPT_FILES || '8', 10);
    const smartFiles = await getSmartFiles(userIdToUse, {
      maxFiles: isNaN(maxFiles) ? 8 : maxFiles,
      includeContent: true,
      includeSummaries: true,
      semanticMatching: true,
      prioritizeRecent: true,
      userQuery: userMessage
    });
    
    console.log(`[generateChatResponse] Recuperati ${smartFiles.length} file intelligenti`);
    
    // Genera contesto dai file
    const smartFileContext = buildFileContext(smartFiles);
    
    const userSettings = await getSettings();
    const messages = buildPromptServer(
      userMessage,
      faqs,
      [], // uploadedFilesInfo vuoto (usiamo smartFileContext)
      [], // extractedTextSnippets vuoto (usiamo smartFileContext)
      history,
      [], // fileSummaries vuoto (incluso in smartFileContext)
      userSettings || undefined,
      smartFileContext // Nuovo parametro con contesto intelligente
    );

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
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

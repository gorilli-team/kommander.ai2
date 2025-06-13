
import openai from '@/backend/lib/openai';
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist/legacy/build/pdf.js';
import mammoth from 'mammoth';

console.log(`[parseDocs.ts] Initializing. pdfjs-dist version: ${pdfjsVersion}`);
// Per l'utilizzo lato server (Node.js) di pdfjs-dist,
// si raccomanda generalmente di NON impostare GlobalWorkerOptions.workerSrc su una CDN.
// La libreria dovrebbe tentare di utilizzare il suo "fake worker" o meccanismi interni.

const CHUNK_SIZE = 1500; // Caratteri per chunk, approssimativamente
const CHUNK_OVERLAP = 200; // Sovrapposizione di caratteri tra i chunk

async function summarizeText(text: string, partName: string): Promise<string> {
  console.log(`[parseDocs.ts] summarizeText: Inizio riassunto per ${partName}. Lunghezza testo: ${text.length}`);
  if (!text.trim()) {
    console.log(`[parseDocs.ts] summarizeText: Testo vuoto per ${partName}, restituisco riassunto vuoto.`);
    return "";
  }
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert summarizer. Provide a concise summary of the following text.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      max_tokens: 150,
    });
    const summary = response.choices[0]?.message?.content?.trim() || '';
    console.log(`[parseDocs.ts] summarizeText: Riassunto ${partName} completato. Lunghezza riassunto: ${summary.length}`);
    return summary;
  } catch (error: any) {
    console.error(`[parseDocs.ts] summarizeText: Errore OpenAI durante il riassunto di ${partName}:`, error);
    console.error('[parseDocs.ts] summarizeText: OpenAI Error Name:', error.name);
    console.error('[parseDocs.ts] summarizeText: OpenAI Error Message:', error.message);
    console.error('[parseDocs.ts] summarizeText: OpenAI Error Stack:', error.stack);
    throw new Error(`OpenAI summarization failed for ${partName}: ${error.message || 'Unknown OpenAI error'}`);
  }
}

export async function parseDocument(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string
): Promise<{ chunks?: Array<{ text: string; summary: string }>; fullSummary?: string; error?: string }> {
  console.log(`[parseDocs.ts] parseDocument: Inizio per file: ${fileName}, tipo: ${fileType}, dimensione buffer: ${fileBuffer.length}`);
  let rawText = '';

  try {
    console.log(`[parseDocs.ts] parseDocument: Estrazione testo per ${fileName}`);
    if (fileType === 'application/pdf') {
      console.log('[parseDocs.ts] parseDocument: Processamento PDF...');
      const data = new Uint8Array(fileBuffer);
      const pdfDoc = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
      console.log(`[parseDocs.ts] parseDocument: PDF caricato con ${pdfDoc.numPages} pagine per ${fileName}.`);
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        console.log(`[parseDocs.ts] parseDocument: Processamento pagina PDF ${i} per ${fileName}`);
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        rawText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
      }
      console.log(`[parseDocs.ts] parseDocument: Estrazione testo PDF completata per ${fileName}. Lunghezza testo grezzo: ${rawText.length}`);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log(`[parseDocs.ts] parseDocument: Processamento DOCX per ${fileName}`);
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      rawText = result.value;
      console.log(`[parseDocs.ts] parseDocument: Estrazione testo DOCX completata per ${fileName}. Lunghezza testo grezzo: ${rawText.length}`);
    } else if (fileType === 'text/plain') {
      console.log(`[parseDocs.ts] parseDocument: Processamento TXT per ${fileName}`);
      rawText = fileBuffer.toString('utf-8');
      console.log(`[parseDocs.ts] parseDocument: Estrazione testo TXT completata per ${fileName}. Lunghezza testo grezzo: ${rawText.length}`);
    } else {
      console.error(`[parseDocs.ts] parseDocument: Tipo file non supportato: ${fileType} per ${fileName}`);
      return { error: `Unsupported file type: ${fileType}` };
    }
  } catch (err: any) {
    console.error(`[parseDocs.ts] parseDocument: Errore durante estrazione testo da ${fileName}:`, err);
    console.error('[parseDocs.ts] parseDocument: Text Extraction Error Name:', err.name);
    console.error('[parseDocs.ts] parseDocument: Text Extraction Error Message:', err.message);
    console.error('[parseDocs.ts] parseDocument: Text Extraction Error Stack:', err.stack);
    return { error: `Text extraction failed for file ${fileName}: ${err.message || 'Unknown extraction error'}` };
  }

  if (!rawText.trim()) {
    console.warn(`[parseDocs.ts] parseDocument: Nessun contenuto testuale trovato in ${fileName}.`);
    return { error: `No text content found in ${fileName}.` };
  }
  console.log(`[parseDocs.ts] parseDocument: Testo grezzo estratto per ${fileName}. Lunghezza: ${rawText.length}. Inizio chunking...`);

  try {
    const textChunks: string[] = [];
    for (let i = 0; i < rawText.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
      textChunks.push(rawText.substring(i, i + CHUNK_SIZE));
    }
    console.log(`[parseDocs.ts] parseDocument: Testo diviso in ${textChunks.length} chunk per ${fileName}. Inizio riassunto chunks...`);

    const summarizedChunks: Array<{ text: string; summary: string }> = [];
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      console.log(`[parseDocs.ts] parseDocument: Riassunto chunk ${i + 1}/${textChunks.length} per ${fileName}. Lunghezza chunk: ${chunk.length}`);
      const summary = await summarizeText(chunk, `chunk ${i+1} of ${fileName}`);
      summarizedChunks.push({ text: chunk, summary });
    }
    console.log(`[parseDocs.ts] parseDocument: Tutti i chunk riassunti per ${fileName}. Generazione riassunto completo...`);

    let fullSummary = '';
    if (summarizedChunks.length > 0) {
        const allSummaries = summarizedChunks.map(s => s.summary).join('\n\n');
        if (allSummaries.length > CHUNK_SIZE * 1.5) { 
            console.log(`[parseDocs.ts] parseDocument: Riassunti combinati lunghezza (${allSummaries.length}) > ${CHUNK_SIZE * 1.5}. Ri-riassumo per ${fileName}.`);
            fullSummary = await summarizeText(allSummaries, `full summary of ${fileName}`);
        } else {
            console.log(`[parseDocs.ts] parseDocument: Riassunti combinati lunghezza (${allSummaries.length}) gestibile. Uso riassunti combinati come riassunto completo per ${fileName}.`);
            fullSummary = allSummaries;
        }
    }
    console.log(`[parseDocs.ts] parseDocument: Riassunto completo generato per ${fileName}. Lunghezza: ${fullSummary.length}. Processo completato con successo.`);
    return { chunks: summarizedChunks, fullSummary };
  } catch (summarizationError: any) {
    console.error(`[parseDocs.ts] parseDocument: Errore durante fase di riassunto per ${fileName}:`, summarizationError);
    console.error('[parseDocs.ts] parseDocument: Summarization Error Name:', summarizationError.name);
    console.error('[parseDocs.ts] parseDocument: Summarization Error Message:', summarizationError.message);
    console.error('[parseDocs.ts] parseDocument: Summarization Error Stack:', summarizationError.stack);
    return { error: `Summarization phase failed for file ${fileName}: ${summarizationError.message || 'Unknown summarization error'}` };
  }
}

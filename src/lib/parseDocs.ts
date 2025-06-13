
import openai from './openai';
// Corrected import for pdfjs-dist
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set the worker source for pdfjs-dist. This is crucial for it to work correctly,
// especially in web/Node.js environments that Next.js uses.
// It ensures that PDF.js can load its worker script, which is necessary for offloading parsing tasks.
// Using a CDN link is a common approach and should match the imported pdfjsVersion.
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;


const CHUNK_SIZE = 1500; // Characters per chunk, roughly
const CHUNK_OVERLAP = 200; // Characters overlap between chunks

async function summarizeText(text: string): Promise<string> {
  if (!text.trim()) return "";
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Or your preferred model
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
      max_tokens: 150, // Adjust as needed
    });
    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Error summarizing text with OpenAI:', error);
    if (error instanceof Error) {
        throw new Error(`OpenAI summarization failed: ${error.message}`);
    }
    throw new Error('OpenAI summarization failed with an unknown error.');
  }
}

export async function parseDocument(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string
): Promise<{ chunks?: Array<{ text: string; summary: string }>; fullSummary?: string; error?: string }> {
  let rawText = '';

  try {
    // Step 1: Extract raw text based on file type
    if (fileType === 'application/pdf') {
      const data = new Uint8Array(fileBuffer);
      const pdf = await getDocument({ data }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        rawText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      rawText = result.value;
    } else if (fileType === 'text/plain') {
      rawText = fileBuffer.toString('utf-8');
    } else {
      return { error: `Unsupported file type: ${fileType}` };
    }
  } catch (err) {
    // Catches errors from raw text extraction
    console.error(`Error processing document content for ${fileName}:`, err);
    let errorMessage = `Failed to parse content from file ${fileName}.`;
    if (err instanceof Error) {
        errorMessage = `Failed to parse content from file ${fileName}: ${err.message}`;
    }
    return { error: errorMessage };
  }

  if (!rawText.trim()) {
    return { error: `No text content found in ${fileName}.` };
  }

  // Step 2: Chunking and Summarization
  try {
    const textChunks: string[] = [];
    for (let i = 0; i < rawText.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
      textChunks.push(rawText.substring(i, i + CHUNK_SIZE));
    }

    const summarizedChunks: Array<{ text: string; summary: string }> = [];
    for (const chunk of textChunks) {
      const summary = await summarizeText(chunk); // summarizeText can throw
      summarizedChunks.push({ text: chunk, summary });
    }

    let fullSummary = '';
    if (summarizedChunks.length > 0) {
        const allSummaries = summarizedChunks.map(s => s.summary).join('\n\n');
        // Only re-summarize if the combined summaries are potentially too long for a single prompt or context
        if (allSummaries.length > CHUNK_SIZE * 1.5) { 
            fullSummary = await summarizeText(`Summarize the following collection of summaries cohesively:\n${allSummaries}`); // summarizeText can throw
        } else {
            fullSummary = allSummaries;
        }
    }
    return { chunks: summarizedChunks, fullSummary }; // Success
  } catch (summarizationError) {
    // Catches errors specifically from the summarization phase (e.g., OpenAI API key issue)
    console.error(`Error during summarization for ${fileName}:`, summarizationError);
    let errorMessage = `Failed during summarization for file ${fileName}.`;
    if (summarizationError instanceof Error) {
      // This will propagate OpenAI specific errors like API key issues more clearly
      errorMessage = `Summarization error for ${fileName}: ${summarizationError.message}`;
    }
    return { error: errorMessage }; // Return structured error
  }
}

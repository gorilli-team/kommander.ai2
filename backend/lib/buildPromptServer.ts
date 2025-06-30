
import type { Faq } from '@/backend/schemas/faq';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UploadedFileInfoForPromptContext {
  fileName: string;
  originalFileType: string;
}

interface FileSummaryForPrompt {
  fileName: string;
  summary: string;
}

export interface DocumentSnippet {
  fileName: string;
  snippet: string;
  relevance?: number;
  pageNumber?: number;
  section?: string;
}

export interface SourceReference {
  type: 'faq' | 'document';
  title: string;
  relevance: number;
  content?: string;
  metadata?: {
    fileName?: string;
    pageNumber?: number;
    section?: string;
    faqId?: string;
  };
}

export function buildPromptServer(
  userMessage: string,
  faqs: Faq[],
  uploadedFilesInfo: UploadedFileInfoForPromptContext[],
  extractedTextSnippets: DocumentSnippet[] = [],
  history: ChatMessage[] = [],
  fileSummaries: FileSummaryForPrompt[] = [],
  settings?: { name?: string; personality?: string; traits?: string[] }
): { messages: ChatMessage[]; sources: SourceReference[] } {
  
  const botName = settings?.name || 'Kommander.ai';
  let context = `Sei ${botName}, un assistente AI utile.`;
  if (settings?.personality) {
    context += ` Stile comunicativo: ${settings.personality}.`;
  }
  if (settings?.traits && settings.traits.length) {
    context += ` Carattere: ${settings.traits.join(', ')}.`;
  }
  context += " Usa le seguenti informazioni per rispondere alla query dell'utente.\n\n";

  if (faqs.length > 0) {
    context += "FAQ Rilevanti:\n";
    faqs.forEach(faq => {
      context += `- D: ${faq.question}\n  R: ${faq.answer}\n`;
    });
    context += "\n";
  }

  if (uploadedFilesInfo.length > 0) {
    context += "L'utente ha caricato i seguenti file a cui puoi fare riferimento per nome, se pertinente:\n";
    uploadedFilesInfo.forEach(file => {
      context += `- Nome File: "${file.fileName}", Tipo: ${file.originalFileType}\n`;
    });
    context += "\n";

    if (fileSummaries.length > 0) {
      context += "Riassunti dei file caricati:\n";
      fileSummaries.forEach(fs => {
        context += `- ${fs.fileName}: ${fs.summary}\n`;
      });
      context += "\n";
    }

    extractedTextSnippets.forEach(snippet => {
      if (snippet.snippet.startsWith("Errore durante l'estrazione") || snippet.snippet.startsWith("Impossibile estrarre il testo") || snippet.snippet.startsWith("Impossibile recuperare il contenuto")) {
        context += `Nota: Si è verificato un problema durante il tentativo di leggere il contenuto del file ${snippet.fileName}: "${snippet.snippet}". Non puoi visualizzare il suo contenuto testuale, ma sii consapevole della sua esistenza.\n\n`;
      } else {
        context += `Contenuto dal file "${snippet.fileName}":\n"""\n${snippet.snippet}\n"""\n\n`;
      }
    });

    if (uploadedFilesInfo.length > 0 && extractedTextSnippets.length === 0) {
      const recentFileName = uploadedFilesInfo[0]?.fileName || "un file caricato di recente";
      context += `Nota: Non è stato possibile estrarre o non è stato trovato alcun contenuto testuale nel file (${recentFileName}), ma sii consapevole che esiste.\n\n`;
    }
  }


  if (context === "Sei Kommander.ai, un assistente AI utile. Usa le seguenti informazioni per rispondere alla query dell'utente.\n\n") {
    context = "Sei Kommander.ai, un assistente AI utile. Rispondi alla query dell'utente.\n\n"
  }
  
  // Track sources used in the response
  const sources: SourceReference[] = [];
  
  // Add FAQ sources
  faqs.forEach(faq => {
    sources.push({
      type: 'faq',
      title: faq.question,
      relevance: calculateRelevance(userMessage, faq.question + ' ' + faq.answer),
      content: faq.answer,
      metadata: {
        faqId: faq._id?.toString()
      }
    });
  });
  
  // Add document sources
  extractedTextSnippets.forEach(snippet => {
    sources.push({
      type: 'document',
      title: snippet.fileName,
      relevance: snippet.relevance || calculateRelevance(userMessage, snippet.snippet),
      content: snippet.snippet.substring(0, 200) + (snippet.snippet.length > 200 ? '...' : ''),
      metadata: {
        fileName: snippet.fileName,
        pageNumber: snippet.pageNumber,
        section: snippet.section
      }
    });
  });
  
  // Sort sources by relevance
  sources.sort((a, b) => b.relevance - a.relevance);
  
  const messages: ChatMessage[] = [{ role: 'system', content: context.trim() }];

  history.forEach(msg => messages.push(msg));
  
  messages.push({ role: 'user', content: userMessage });

  return { messages, sources };
}

// Simple relevance calculation based on keyword matching
function calculateRelevance(query: string, content: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const contentWords = content.toLowerCase().split(/\s+/);
  
  let matches = 0;
  queryWords.forEach(queryWord => {
    if (contentWords.some(contentWord => contentWord.includes(queryWord) || queryWord.includes(contentWord))) {
      matches++;
    }
  });
  
  return Math.min(matches / queryWords.length, 1.0);
}
}

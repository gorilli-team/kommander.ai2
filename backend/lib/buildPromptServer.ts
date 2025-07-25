
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
}

export function buildPromptServer(
  userMessage: string,
  faqs: Faq[],
  uploadedFilesInfo: UploadedFileInfoForPromptContext[],
  extractedTextSnippets: DocumentSnippet[] = [],
  history: ChatMessage[] = [],
  fileSummaries: FileSummaryForPrompt[] = [],
  settings?: { name?: string; personality?: string; traits?: string[] },
  smartFileContext?: string // Nuovo parametro per il contesto dei file intelligenti
): ChatMessage[] {
  
  const botName = settings?.name || 'Kommander.ai';
  let context = `Sei ${botName}, un assistente AI utile e preciso.`;
  if (settings?.personality) {
    context += ` Stile comunicativo: ${settings.personality}.`;
  }
  if (settings?.traits && settings.traits.length) {
    context += ` Carattere: ${settings.traits.join(', ')}.`;
  }
  context += " Usa le seguenti informazioni per rispondere alla query dell'utente in modo accurato e dettagliato.\n\n";

  // Priorità alle FAQ
  if (faqs.length > 0) {
    context += "FAQ RILEVANTI:\n";
    faqs.forEach((faq, index) => {
      context += `${index + 1}. D: ${faq.question}\n   R: ${faq.answer}\n\n`;
    });
  }

  // Usa il nuovo sistema di file intelligenti se disponibile
  if (smartFileContext) {
    context += smartFileContext;
  } else if (uploadedFilesInfo.length > 0) {
    // Fallback al sistema vecchio
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
  
  const messages: ChatMessage[] = [{ role: 'system', content: context.trim() }];

  history.forEach(msg => messages.push(msg));
  
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

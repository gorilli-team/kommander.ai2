
import type { Faq } from '@/backend/schemas/faq';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UploadedFileInfoForPromptContext {
  fileName: string;
  originalFileType: string;
}

export interface DocumentSnippet {
  fileName: string;
  snippet: string;
}

export function buildPromptServer(
  userMessage: string,
  faqs: Faq[],
  uploadedFilesInfo: UploadedFileInfoForPromptContext[],
  documentSnippets: DocumentSnippet[],
  history: ChatMessage[] = [],
): ChatMessage[] {
  
  let context = "Sei Kommander.ai, un assistente AI utile. Usa le seguenti informazioni per rispondere alla query dell'utente.\n\n";

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
  }

  if (documentSnippets.length > 0) {
    documentSnippets.forEach(doc => {
      if (doc.snippet.startsWith("Errore") || doc.snippet.startsWith("Impossibile")) {
        context += `Nota: Si è verificato un problema durante il tentativo di leggere il contenuto del file \"${doc.fileName}\": \"${doc.snippet}\". Non puoi visualizzare il suo contenuto testuale, ma sii consapevole della sua esistenza.\n\n`;
      } else {
        context += `Contenuto dal file \"${doc.fileName}\":\n"""\n${doc.snippet}\n"""\n\n`;
      }
    });
  }


  if (context === "Sei Kommander.ai, un assistente AI utile. Usa le seguenti informazioni per rispondere alla query dell'utente.\n\n") {
    context = "Sei Kommander.ai, un assistente AI utile. Rispondi alla query dell'utente.\n\n"
  }
  
  const messages: ChatMessage[] = [{ role: 'system', content: context.trim() }];

  history.forEach(msg => messages.push(msg));
  
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

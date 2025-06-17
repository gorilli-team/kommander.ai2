
import type { Faq } from '@/backend/schemas/faq';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UploadedFileInfoForPromptContext {
  fileName: string;
  originalFileType: string;
}

export function buildPromptServer(
  userMessage: string,
  faqs: Faq[],
  uploadedFilesInfo: UploadedFileInfoForPromptContext[],
  extractedTextFromRecentFile: string | undefined,
  history: ChatMessage[] = [] 
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

    if (extractedTextFromRecentFile && extractedTextFromRecentFile.trim() !== '') {
      const recentFileName = uploadedFilesInfo[0]?.fileName || "un file caricato di recente";
      if (extractedTextFromRecentFile.startsWith("Errore durante l'estrazione") || extractedTextFromRecentFile.startsWith("Impossibile estrarre il testo") || extractedTextFromRecentFile.startsWith("Impossibile recuperare il contenuto")) {
        context += `Nota: Si è verificato un problema durante il tentativo di leggere il contenuto del file più recente (${recentFileName}): "${extractedTextFromRecentFile}". Non puoi visualizzare il suo contenuto testuale, ma sii consapevole della sua esistenza.\n\n`;
      } else {
        context += `Contenuto dal file più recente, "${recentFileName}":\n"""\n${extractedTextFromRecentFile}\n"""\n\n`;
      }
    } else if (uploadedFilesInfo.length > 0 && (!extractedTextFromRecentFile || extractedTextFromRecentFile.trim() === '')) {
       const recentFileName = uploadedFilesInfo[0]?.fileName || "un file caricato di recente";
      context += `Nota: Non è stato possibile estrarre o non è stato trovato alcun contenuto testuale nel file più recente (${recentFileName}), ma sii consapevole che esiste.\n\n`;
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

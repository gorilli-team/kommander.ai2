
import type { Faq } from '@/backend/schemas/faq'; // Assicurati che questo percorso sia corretto per la tua struttura

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Questa interfaccia descrive le informazioni sui file che passiamo per costruire il contesto del prompt
interface UploadedFileInfoForPromptContext {
  fileName: string;
  originalFileType: string;
}

export function buildPromptServer(
  userMessage: string,
  faqs: Faq[],
  uploadedFilesInfo: UploadedFileInfoForPromptContext[], // Array di metadati di TUTTI i file
  extractedTextFromRecentFile: string | undefined,    // Testo estratto SOLO dal file più recente (o un messaggio di errore se l'estrazione fallisce)
  history: ChatMessage[] = [] 
): ChatMessage[] {
  
  let context = "You are Kommander.ai, a helpful AI assistant. Use the following information to answer the user's query.\n\n";

  if (faqs.length > 0) {
    context += "Relevant FAQs:\n";
    faqs.forEach(faq => {
      context += `- Q: ${faq.question}\n  A: ${faq.answer}\n`;
    });
    context += "\n";
  }

  if (uploadedFilesInfo.length > 0) {
    context += "The user has uploaded the following files which you can refer to by name if relevant:\n";
    uploadedFilesInfo.forEach(file => {
      context += `- File Name: "${file.fileName}", Type: ${file.originalFileType}\n`;
    });
    context += "\n";

    // Se è stato fornito del testo estratto (dal file più recente)
    if (extractedTextFromRecentFile && extractedTextFromRecentFile.trim() !== '') {
      const recentFileName = uploadedFilesInfo[0]?.fileName || "a recently uploaded file"; // Nome del file più recente (supponendo che uploadedFilesInfo sia ordinato o che il primo sia il più recente)
      
      // Controlla se il testo estratto è un messaggio di errore dall'estrazione
      if (extractedTextFromRecentFile.startsWith("Error extracting text") || extractedTextFromRecentFile.startsWith("Cannot extract text") || extractedTextFromRecentFile.startsWith("Could not retrieve content")) {
        context += `Note: There was an issue trying to read the content of the most recent file (${recentFileName}): "${extractedTextFromRecentFile}". You cannot view its text content, but be aware of its existence.\n\n`;
      } else {
        context += `Content from the most recent file, "${recentFileName}":\n"""\n${extractedTextFromRecentFile}\n"""\n\n`;
      }
    } else if (uploadedFilesInfo.length > 0 && (!extractedTextFromRecentFile || extractedTextFromRecentFile.trim() === '')) {
      // Se non c'è testo estratto ma ci sono file, informa l'AI
      const recentFileName = uploadedFilesInfo[0]?.fileName || "a recently uploaded file";
      context += `Note: No text content could be extracted or found in the most recent file (${recentFileName}), but be aware that it exists.\n\n`;
    }
  }


  if (context === "You are Kommander.ai, a helpful AI assistant. Use the following information to answer the user's query.\n\n") {
    // Se non ci sono FAQ né file, fornisci un contesto predefinito più semplice
    context = "You are Kommander.ai, a helpful AI assistant. Answer the user's query.\n\n"
  }
  
  const messages: ChatMessage[] = [{ role: 'system', content: context.trim() }];

  history.forEach(msg => messages.push(msg));
  
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

    
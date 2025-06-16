
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

    // Se è stato fornito del testo estratto (dal file più recente)
    if (extractedTextFromRecentFile && extractedTextFromRecentFile.trim() !== '') {
      const recentFileName = uploadedFilesInfo[0]?.fileName || "un file caricato di recente"; // Nome del file più recente
      if (extractedTextFromRecentFile.startsWith("Errore durante l'estrazione") || extractedTextFromRecentFile.startsWith("Impossibile estrarre il testo")) {
        // Se l'estrazione è fallita, informa l'AI dell'errore invece di inviare il messaggio di errore come contenuto
        context += `Nota: Si è verificato un problema durante il tentativo di leggere il contenuto del file più recente (${recentFileName}): "${extractedTextFromRecentFile}". Non puoi visualizzare il suo contenuto testuale, ma sii consapevole della sua esistenza.\n\n`;
      } else {
        context += `Contenuto dal file più recente, "${recentFileName}":\n"""\n${extractedTextFromRecentFile}\n"""\n\n`;
      }
    } else if (uploadedFilesInfo.length > 0 && (!extractedTextFromRecentFile || extractedTextFromRecentFile.trim() === '')) {
      // Se non c'è testo estratto ma ci sono file, informa l'AI
       const recentFileName = uploadedFilesInfo[0]?.fileName || "un file caricato di recente";
      context += `Nota: Non è stato possibile estrarre o non è stato trovato alcun contenuto testuale nel file più recente (${recentFileName}), ma sii consapevole che esiste.\n\n`;
    }
  }


  if (context === "Sei Kommander.ai, un assistente AI utile. Usa le seguenti informazioni per rispondere alla query dell'utente.\n\n") {
    // Se non ci sono FAQ né file, fornisci un contesto predefinito più semplice
    context = "Sei Kommander.ai, un assistente AI utile. Rispondi alla query dell'utente.\n\n"
  }
  
  const messages: ChatMessage[] = [{ role: 'system', content: context.trim() }];

  history.forEach(msg => messages.push(msg));
  
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

    
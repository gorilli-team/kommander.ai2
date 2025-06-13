
import type { Faq } from '@/backend/schemas/faq';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Updated to reflect raw file info, not summaries
interface UploadedFileInfo {
  fileName: string;
  originalFileType: string;
}

export function buildPromptServer(
  userMessage: string,
  faqs: Faq[],
  uploadedFiles: UploadedFileInfo[], // Changed from docSummaries
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

  // Updated to list uploaded files
  if (uploadedFiles.length > 0) {
    context += "The user has uploaded the following files which you can refer to by name if relevant:\n";
    uploadedFiles.forEach(file => {
      context += `- File Name: "${file.fileName}", Type: ${file.originalFileType}\n`;
    });
    context += "\n";
  }

  if (context === "You are Kommander.ai, a helpful AI assistant. Use the following information to answer the user's query.\n\n") {
    context = "You are Kommander.ai, a helpful AI assistant. Answer the user's query.\n\n"
  }
  
  const messages: ChatMessage[] = [{ role: 'system', content: context.trim() }];

  history.forEach(msg => messages.push(msg));
  
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

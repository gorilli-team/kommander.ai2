
import type { Faq } from '@/backend/schemas/faq';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UploadedFileInfoForPromptContext {
  fileName: string;
  originalFileType: string;
  // extractedText is now passed as a separate argument to buildPromptServer
}

export function buildPromptServer(
  userMessage: string,
  faqs: Faq[],
  uploadedFilesInfo: UploadedFileInfoForPromptContext[],
  extractedTextFromRecentFile: string | undefined, // New parameter
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
    context += "The user has uploaded the following files:\n";
    uploadedFilesInfo.forEach(file => {
      context += `- File Name: "${file.fileName}", Type: ${file.originalFileType}\n`;
    });
    context += "\n";

    if (extractedTextFromRecentFile && extractedTextFromRecentFile.trim() !== '') {
      // Assuming extractedTextFromRecentFile is for the most recent file for now
      const recentFileName = uploadedFilesInfo[0]?.fileName || "a recently uploaded file";
      context += `Content from ${recentFileName}:\n"""\n${extractedTextFromRecentFile}\n"""\n\n`;
    } else if (uploadedFilesInfo.length > 0 && (!extractedTextFromRecentFile || extractedTextFromRecentFile.trim() === '')) {
      context += `Note: Could not extract or no text content found in the most recent file, but be aware it exists.\n\n`;
    }
  }


  if (context === "You are Kommander.ai, a helpful AI assistant. Use the following information to answer the user's query.\n\n") {
    // If no FAQs and no files, provide a simpler default context
    context = "You are Kommander.ai, a helpful AI assistant. Answer the user's query.\n\n"
  }
  
  const messages: ChatMessage[] = [{ role: 'system', content: context.trim() }];

  history.forEach(msg => messages.push(msg));
  
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

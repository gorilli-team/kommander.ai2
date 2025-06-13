import type { Faq } from '@/lib/schemas/faq';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface DocumentSummary {
  fileName: string;
  chunks: Array<{ text: string; summary: string }>;
  fullSummary?: string;
}

export function buildPromptServer(
  userMessage: string,
  faqs: Faq[],
  docSummaries: DocumentSummary[],
  history: ChatMessage[] = [] // Past conversation messages
): ChatMessage[] {
  
  let context = "You are Kommander.ai, a helpful AI assistant. Use the following information to answer the user's query.\n\n";

  if (faqs.length > 0) {
    context += "Relevant FAQs:\n";
    faqs.forEach(faq => {
      context += `- Q: ${faq.question}\n  A: ${faq.answer}\n`;
    });
    context += "\n";
  }

  if (docSummaries.length > 0) {
    context += "Relevant Document Summaries:\n";
    docSummaries.forEach(doc => {
      context += `From document "${doc.fileName}":\n`;
      if (doc.fullSummary) {
        context += `${doc.fullSummary}\n`;
      } else {
        doc.chunks.forEach((chunk, index) => {
          context += `  - Summary of part ${index + 1}: ${chunk.summary}\n`;
        });
      }
      context += "\n";
    });
  }

  if (context === "You are Kommander.ai, a helpful AI assistant. Use the following information to answer the user's query.\n\n") {
    context = "You are Kommander.ai, a helpful AI assistant. Answer the user's query.\n\n"
  }
  
  const messages: ChatMessage[] = [{ role: 'system', content: context.trim() }];

  // Add history
  history.forEach(msg => messages.push(msg));
  
  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

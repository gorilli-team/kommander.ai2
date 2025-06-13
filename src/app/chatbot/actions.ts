
'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import openai from '@/backend/lib/openai';
import { buildPromptServer, type ChatMessage } from '@/backend/lib/buildPromptServer';
import type { Faq } from '@/backend/schemas/faq';

// Interface for file information to pass to the prompt builder
interface UploadedFileInfoForPrompt {
  fileName: string;
  originalFileType: string;
}


export async function generateChatResponse(
  userMessage: string,
  history: ChatMessage[]
): Promise<{ response?: string; error?: string }> {
  console.log('[src/app/chatbot/actions.ts] generateChatResponse: Received message:', userMessage, 'History length:', history.length);
  if (!userMessage.trim()) {
    return { error: 'Message cannot be empty.' };
  }

  try {
    const { db } = await connectToDatabase();
    console.log('[src/app/chatbot/actions.ts] generateChatResponse: Connected to database.');
    
    const faqsCursor = await db.collection('faqs').find({}).limit(10).toArray(); 
    const faqs: Faq[] = faqsCursor.map(doc => ({
        id: doc._id.toString(),
        question: doc.question,
        answer: doc.answer,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    }));
    console.log(`[src/app/chatbot/actions.ts] generateChatResponse: Fetched ${faqs.length} FAQs.`);

    const uploadedFilesMetaCursor = await db.collection('raw_files_meta').find({}).project({ fileName: 1, originalFileType: 1 }).sort({ uploadedAt: -1 }).limit(5).toArray();
    const uploadedFilesInfo: UploadedFileInfoForPrompt[] = uploadedFilesMetaCursor.map(doc => ({
        fileName: doc.fileName,
        originalFileType: doc.originalFileType,
    }));
    console.log(`[src/app/chatbot/actions.ts] generateChatResponse: Fetched metadata for ${uploadedFilesInfo.length} uploaded files from 'raw_files_meta'.`);

    const messages = buildPromptServer(userMessage, faqs, uploadedFilesInfo, history);
    console.log('[src/app/chatbot/actions.ts] generateChatResponse: Prompt built for OpenAI.');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', 
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });
    console.log('[src/app/chatbot/actions.ts] generateChatResponse: OpenAI completion received.');

    const assistantResponse = completion.choices[0]?.message?.content;

    if (!assistantResponse) {
      console.error('[src/app/chatbot/actions.ts] generateChatResponse: AI did not return a response.');
      return { error: 'AI did not return a response.' };
    }

    console.log('[src/app/chatbot/actions.ts] generateChatResponse: Success, returning AI response.');
    return { response: assistantResponse.trim() };

  } catch (error: any) {
    console.error('[src/app/chatbot/actions.ts] generateChatResponse: Error generating chat response:', error);
    console.error('[src/app/chatbot/actions.ts] generateChatResponse: Error name:', error.name);
    console.error('[src/app/chatbot/actions.ts] generateChatResponse: Error message:', error.message);
    console.error('[src/app/chatbot/actions.ts] generateChatResponse: Error stack:', error.stack);
    return { error: `Failed to generate chat response due to a server error. ${error.message}` };
  }
}

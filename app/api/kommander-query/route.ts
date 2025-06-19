import { NextResponse } from 'next/server';
import { generateChatResponse } from '@/app/chatbot/actions';
import type { ChatMessage } from '@/backend/lib/buildPromptServer';

export async function POST(request: Request) {
  try {
    const { userId, message, history } = await request.json();
    if (!userId || !message) {
      return NextResponse.json({ error: 'Missing userId or message.' }, { status: 400 });
    }
    const chatHistory: ChatMessage[] = Array.isArray(history) ? history : [];
    const result = await generateChatResponse(message, chatHistory, userId);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ reply: result.response });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { generateChatResponse } from '@/app/chatbot/actions';
import type { ChatMessage } from '@/backend/lib/buildPromptServer';
import { appendMessages } from '@/app/conversations/actions';
import { ObjectId } from 'mongodb';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { userId, message, history, conversationId, site } = await request.json();

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'Missing userId or message.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const chatHistory: ChatMessage[] = Array.isArray(history) ? history : [];
    const result = await generateChatResponse(message, chatHistory, userId);
    const convId = conversationId || new ObjectId().toString();

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: corsHeaders }
      );
    }

    await appendMessages(userId, convId, [
      { role: 'user', text: message, timestamp: new Date().toISOString() },
      { role: 'assistant', text: result.response as string, timestamp: new Date().toISOString() },
    ], site);

    return NextResponse.json(
      { reply: result.response, conversationId: convId },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Server error.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

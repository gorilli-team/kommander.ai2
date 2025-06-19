import { NextResponse } from 'next/server';
import { generateChatResponse } from '@/app/chatbot/actions';
import type { ChatMessage } from '@/backend/lib/buildPromptServer';

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
    const { userId, message, history } = await request.json();
    if (!userId || !message) {
      return NextResponse.json(
        { error: 'Missing userId or message.' },
        { status: 400, headers: corsHeaders }
      );
    }
    const chatHistory: ChatMessage[] = Array.isArray(history) ? history : [];
    const result = await generateChatResponse(message, chatHistory, userId);
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: corsHeaders }
      );
    }
    return NextResponse.json(
      { reply: result.response },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Server error.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

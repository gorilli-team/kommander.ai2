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
    const { userId, testMessage = "Ciao! Mi puoi spiegare come funziona questo servizio?" } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const chatHistory: ChatMessage[] = [];
    
    // Test con un messaggio standardizzato per vedere le differenze di personalità
    const result = await generateChatResponse(testMessage, chatHistory, userId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { 
        testMessage,
        response: result.response,
        message: "Questa risposta dovrebbe riflettere la personalità e i caratteri configurati nelle impostazioni."
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Server error.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

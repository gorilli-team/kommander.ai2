import { connectToDatabase } from '@/backend/lib/mongodb';
import { NextResponse } from 'next/server';
import { generateChatResponse } from '@/app/chatbot/actions';
import type { ChatMessage } from '@/backend/lib/buildPromptServer';

export async function POST(request: Request) {
  try {
    const { clientId, apiKey, message, history } = await request.json();
    if (!clientId || !apiKey || !message) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const client = await db.collection('widget_clients').findOne({ clientId, apiKey });
    if (!client) {
      return NextResponse.json({ error: 'Invalid client credentials.' }, { status: 401 });
    }

    const userId = client.userId as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Client not linked to user.' }, { status: 500 });
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

import { NextResponse } from 'next/server';
import { generateChatResponse } from '@/app/chatbot/actions';

export async function POST(req: Request) {
  try {
    const { message, history = [], clientId, apiKey } = await req.json();

    if (!message || !clientId || !apiKey) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // TODO: validate apiKey when authentication system is implemented
    const result = await generateChatResponse(message, history, clientId);
    return NextResponse.json(result);
  } catch (err) {
    console.error('widget-chat route error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

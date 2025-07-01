import { NextResponse } from 'next/server';
import { generateChatResponse } from '@/app/chatbot/actions';
import type { ChatMessage } from '@/backend/lib/buildPromptServer';
import { appendMessages, getConversation } from '@/app/conversations/actions';
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
    const convId = conversationId || new ObjectId().toString();
    const existing = conversationId ? await getConversation(userId, convId) : null;
    const handledBy = existing?.handledBy || 'bot';

    // Check if user is requesting human operator
    const isHumanRequest = message.toLowerCase().includes('operatore umano');
    
    if (handledBy === 'agent') {
      await appendMessages(
        userId,
        convId,
        [{ role: 'user', text: message, timestamp: new Date().toISOString() }],
        site,
      );
      return NextResponse.json({ conversationId: convId, handledBy }, { headers: corsHeaders });
    }
    
    // If user requests human operator, add system message to conversation
    if (isHumanRequest) {
      await appendMessages(
        userId,
        convId,
        [
          { role: 'user', text: message, timestamp: new Date().toISOString() },
          { role: 'system', text: '🔄 L\'utente ha richiesto l\'intervento di un operatore umano', timestamp: new Date().toISOString() }
        ],
        site,
      );
      return NextResponse.json({ 
        reply: 'Certamente! Ti metto subito in contatto con uno specialista. Nel frattempo, se vuoi, puoi continuare a farmi domande: potrei già aiutarti a trovare una soluzione mentre attendi la risposta di un operatore.',
        conversationId: convId, 
        handledBy 
      }, { headers: corsHeaders });
    }

    const result = await generateChatResponse(message, chatHistory, userId, convId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: corsHeaders }
      );
    }

    // Salva i messaggi nella conversazione
    await appendMessages(
      userId,
      convId,
      [
        { role: 'user', text: message, timestamp: new Date().toISOString() },
        { role: 'assistant', text: result.response as string, timestamp: new Date().toISOString() },
      ],
      site
    );

    return NextResponse.json(
      { reply: result.response, conversationId: convId, handledBy },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Server error.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
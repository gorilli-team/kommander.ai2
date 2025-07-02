import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/backend/database';
import { WidgetConversation } from '@/backend/schemas/widgetClient';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await connect();
    
    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId è richiesto' }, { status: 400 });
    }

    // Recupera tutte le conversazioni per questo utente, ordinate per data di ultimo messaggio
    const conversations = await WidgetConversation.find({ userId })
      .sort({ updatedAt: -1 })
      .select('_id messages updatedAt createdAt')
      .lean();

    // Mappa le conversazioni per includere informazioni utili
    const formattedConversations = conversations.map(conv => {
      // Trova il primo messaggio dell'utente per usarlo come preview
      const firstUserMessage = conv.messages?.find((msg: any) => msg.role === 'user');
      const lastMessage = conv.messages?.[conv.messages.length - 1];
      
      return {
        id: conv._id.toString(),
        preview: firstUserMessage?.text?.substring(0, 50) || 'Conversazione senza titolo',
        lastMessage: lastMessage?.timestamp || conv.updatedAt,
        messagesCount: conv.messages?.length || 0,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    });

    return NextResponse.json({ 
      conversations: formattedConversations,
      total: formattedConversations.length 
    });

  } catch (error) {
    console.error('Errore nel recupero delle conversazioni:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// Abilita CORS per il widget
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

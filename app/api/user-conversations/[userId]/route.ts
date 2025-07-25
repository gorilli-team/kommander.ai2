import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/backend/lib/mongodb';
import type { ConversationDocument } from '@/backend/schemas/conversation';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const endUserId = searchParams.get('endUserId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId è richiesto' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const { db } = await connectToDatabase();
    
    // Se abbiamo endUserId, filtriamo le conversazioni per quello specifico browser
    // Altrimenti prendiamo tutte le conversazioni dell'userId (per retrocompatibilità)
    let query: any = { userId };
    
    if (endUserId) {
      // Filtriamo per conversazioni che hanno l'endUserId specifico
      query = {
        userId,
        endUserId: endUserId,
        // Le conversazioni del widget iniziano con "konv-" 
        conversationId: { $regex: `^konv-` }
      };
    }
    
    console.log(`[API] Searching conversations for userId: ${userId}, endUserId: ${endUserId}`);
    
    // Recupera tutte le conversazioni per questo utente, ordinate per data di ultimo messaggio
    const conversations = await db
      .collection<ConversationDocument>('conversations')
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();
      
    console.log(`[API] Found ${conversations.length} conversations`);

    // Mappa le conversazioni per includere informazioni utili
    const formattedConversations = conversations.map(conv => {
      // Trova il primo messaggio dell'utente per usarlo come preview
      const firstUserMessage = conv.messages?.find((msg: any) => msg.role === 'user');
      const lastMessage = conv.messages?.[conv.messages.length - 1];
      
      // Support both 'text' and 'content' fields for backward compatibility
      const messageText = firstUserMessage?.text || firstUserMessage?.content || 'Conversazione senza titolo';
      
      return {
        id: conv.conversationId,
        preview: messageText.substring(0, 50),
        lastMessage: lastMessage?.timestamp || conv.updatedAt,
        messagesCount: conv.messages?.length || 0,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    });

    return NextResponse.json({ 
      conversations: formattedConversations,
      total: formattedConversations.length 
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('Errore nel recupero delle conversazioni:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
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

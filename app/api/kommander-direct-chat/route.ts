import { NextResponse } from 'next/server';
import { generateChatResponse } from '@/app/chatbot/actions';
import type { ChatMessage } from '@/backend/lib/buildPromptServer';
import { appendMessages, getConversation } from '@/app/conversations/actions';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { sendConversationNotificationEmail } from '@/backend/lib/email';
import type { ChatbotSettingsDocument } from '@/backend/schemas/settings';
import { getWsHub } from '@/backend/lib/wsHub';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  // Ensure WS hub is started early (so clients can connect before first broadcast)
  try { getWsHub().start(); } catch {}
  try {
    const { userId, message, history, conversationId, site, endUserId } = await request.json();

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'Missing userId or message.' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[kommander-direct-chat] POST chiamato per userId: ${userId}, conversationId: ${conversationId}`);

    const chatHistory: ChatMessage[] = Array.isArray(history) ? history : [];
    const convId = conversationId || new ObjectId().toString();
    const existing = conversationId ? await getConversation(userId, convId) : null;
    const handledBy = existing?.handledBy || 'bot';

    if (handledBy === 'agent') {
      // Ensure WS hub is started for dev/Node runtime
      try { getWsHub().start(); } catch {}
      await appendMessages(
        userId,
        convId,
        [{ role: 'user', text: message, timestamp: new Date().toISOString() }],
        site,
      );
      
      const stream = new ReadableStream({
        start(controller) {
          const data = JSON.stringify({
            type: 'complete',
            conversationId: convId,
            handledBy: 'agent'
          });
          controller.enqueue(`data: ${data}\n\n`);
          controller.close();
        }
      });

      // Broadcast handledBy change via WS (no messages payload needed)
      try {
        getWsHub().broadcast(convId, { type: 'update', conversationId: convId, handledBy: 'agent', messages: [] });
      } catch {}

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Usa ESATTAMENTE la stessa logica di generateChatResponse della pagina /chatbot
    console.log(`[kommander-direct-chat] Chiamando generateChatResponse con storia di ${chatHistory.length} messaggi`);
    
    const result = await generateChatResponse(message, chatHistory, userId);
    
    if (result.error) {
      const stream = new ReadableStream({
        start(controller) {
          const errorData = JSON.stringify({
            type: 'error',
            error: result.error
          });
          controller.enqueue(`data: ${errorData}\n\n`);
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Controllo se è una nuova conversazione (non esisteva prima)
    const isNewConversation = !existing;
    
    // Salva solo il messaggio utente all'inizio
    await appendMessages(
      userId,
      convId,
      [
        { role: 'user', text: message, timestamp: new Date().toISOString() },
      ],
      site
    );
    
    // Invia notifica email per nuova conversazione
    if (isNewConversation) {
      console.log(`[kommander-direct-chat] Nuova conversazione rilevata, invio notifica email per userId: ${userId}`);
      
      // Recupera le impostazioni del chatbot per ottenere l'email di notifica
      try {
        const { db } = await connectToDatabase();
        const settings = await db
          .collection<ChatbotSettingsDocument>('chatbot_settings')
          .findOne({ userId });
        
        if (settings?.notificationEmail) {
          console.log(`[kommander-direct-chat] Invio email di notifica a: ${settings.notificationEmail}`);
          
          // Prepara i dati per l'email
          const chatbotName = settings.name || 'Kommander.ai';
          const siteDomain = site || 'sito web sconosciuto';
          
          // Invia l'email di notifica in modo asincrono (non bloccare la risposta)
          setImmediate(async () => {
            try {
              const emailResult = await sendConversationNotificationEmail(
                settings.notificationEmail!,
                chatbotName,
                message,
                siteDomain,
                convId
              );
              
              if (emailResult.success) {
                console.log(`[kommander-direct-chat] Email di notifica inviata con successo per conversazione: ${convId}`);
              } else {
                console.error(`[kommander-direct-chat] Errore nell'invio email di notifica:`, emailResult.error);
              }
            } catch (emailError) {
              console.error(`[kommander-direct-chat] Eccezione durante l'invio email:`, emailError);
            }
          });
        } else {
          console.log(`[kommander-direct-chat] Nessun email di notifica configurata per userId: ${userId}`);
        }
      } catch (settingsError) {
        console.error(`[kommander-direct-chat] Errore nel recupero impostazioni per notifica email:`, settingsError);
      }
    }

    // Simula lo streaming della risposta completa per compatibilità con il widget
    const stream = new ReadableStream({
      start(controller) {
        const response = result.response as string;
        
        // Simula lo streaming dividendo la risposta in chunks
        const chunkSize = 10; // Caratteri per chunk per simulare streaming
        let currentIndex = 0;
        
        const sendChunk = async () => {
          if (currentIndex < response.length) {
            const chunk = response.substring(currentIndex, currentIndex + chunkSize);
            currentIndex += chunkSize;
            
            const data = JSON.stringify({
              type: 'chunk',
              content: chunk,
              conversationId: convId
            });
            controller.enqueue(`data: ${data}\n\n`);
            
            // Continua con il prossimo chunk dopo un piccolo delay
            setTimeout(sendChunk, 20); // 20ms delay tra chunks
          } else {
            // Salva il messaggio assistant solo alla fine dello streaming
            try {
              await appendMessages(
                userId,
                convId,
                [
                  { role: 'assistant', text: response, timestamp: new Date().toISOString() },
                ],
                site
              );
              // Broadcast update to WS subscribers
              try {
                getWsHub().start();
                getWsHub().broadcast(convId, {
                  type: 'update',
                  conversationId: convId,
                  handledBy: 'bot',
                  messages: [
                    { role: 'assistant', text: response, timestamp: new Date().toISOString() }
                  ]
                });
              } catch {}
            } catch (saveError) {
              console.error('Error saving assistant message:', saveError);
            }
            
            // Invia evento di completamento
            const completeData = JSON.stringify({
              type: 'complete',
              conversationId: convId,
              handledBy: 'bot'
            });
            controller.enqueue(`data: ${completeData}\n\n`);
            controller.close();
          }
        };
        
        // Inizia l'invio dei chunks
        sendChunk();
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: any) {
    console.error('Direct chat endpoint error:', err);
    
    const stream = new ReadableStream({
      start(controller) {
        const errorData = JSON.stringify({
          type: 'error',
          error: err.message || 'Server error.'
        });
        controller.enqueue(`data: ${errorData}\n\n`);
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}

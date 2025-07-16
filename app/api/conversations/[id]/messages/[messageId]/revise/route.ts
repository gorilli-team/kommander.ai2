import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { ConversationService } from '@/backend/lib/conversationService';
import { reviewedResponseService } from '@/backend/lib/reviewedResponseService';
import { z } from 'zod';

const ReviseMessageSchema = z.object({
  revisedContent: z.string().min(1, 'Il contenuto revisionato non può essere vuoto'),
  revisionReason: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    console.log('[API] Starting revision process...');
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log('[API] User not authenticated');
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    console.log('[API] User authenticated:', session.user.id);

    const { id: conversationId, messageId } = params;
    console.log('[API] Conversation ID:', conversationId, 'Message ID:', messageId);
    
    const body = await request.json();
    console.log('[API] Request body:', JSON.stringify(body, null, 2));
    
    // Valida i dati in input
    const validatedData = ReviseMessageSchema.parse(body);
    console.log('[API] Data validated successfully');
    
    const conversationService = new ConversationService();
    
    // Verifica che la conversazione appartenga all'utente
    console.log('[API] Fetching conversation...');
    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation) {
      console.log('[API] Conversation not found');
      return NextResponse.json({ error: 'Conversazione non trovata' }, { status: 404 });
    }
    console.log('[API] Conversation found. User ID:', conversation.userId, 'Messages count:', conversation.messages.length);
    
    if (conversation.userId !== session.user.id) {
      console.log('[API] Conversation does not belong to user');
      return NextResponse.json({ error: 'Conversazione non trovata' }, { status: 404 });
    }

    // Converti messageId (che è l'indice) in numero
    const messageIndex = parseInt(messageId);
    console.log('[API] Message index:', messageIndex);
    
    if (isNaN(messageIndex) || messageIndex < 0 || messageIndex >= conversation.messages.length) {
      console.log('[API] Invalid message index');
      return NextResponse.json({ error: 'Indice messaggio non valido' }, { status: 400 });
    }

    // Trova il messaggio da revisionare usando l'indice
    const message = conversation.messages[messageIndex];
    if (!message) {
      console.log('[API] Message not found at index');
      return NextResponse.json({ error: 'Messaggio non trovato' }, { status: 404 });
    }
    console.log('[API] Message found. Role:', message.role, 'Content length:', message.content?.length);

    // Verifica che sia un messaggio dell'assistente
    if (message.role !== 'assistant') {
      console.log('[API] Message is not from assistant');
      return NextResponse.json({ error: 'Solo i messaggi dell\'assistente possono essere revisionati' }, { status: 400 });
    }

    // Trova il messaggio utente precedente per creare la knowledge base
    const userMessage = conversation.messages[messageIndex - 1];
    console.log('[API] User message:', userMessage?.role, userMessage?.content?.length);
    
    if (!userMessage || userMessage.role !== 'user') {
      console.log('[API] Previous user message not found');
      return NextResponse.json({ error: 'Impossibile trovare la domanda dell\'utente' }, { status: 400 });
    }

    // Usa l'ID del messaggio per i servizi, genera uno se non esiste
    const actualMessageId = message.id || `msg-${messageIndex}-${Date.now()}`;
    console.log('[API] Actual message ID:', actualMessageId);
    
    // Revisiona il messaggio
    console.log('[API] Calling reviseMessage...');
    try {
      await conversationService.reviseMessage(
        conversationId,
        actualMessageId,
        validatedData.revisedContent,
        session.user.id,
        validatedData.revisionReason
      );
      console.log('[API] Message revised successfully');
    } catch (error) {
      console.error('[API] Error in reviseMessage:', error);
      throw new Error('Failed to revise message: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Crea una nuova risposta revisionata nella knowledge base
    console.log('[API] Creating reviewed response...');
    let reviewedResponseId;
    try {
      reviewedResponseId = await reviewedResponseService.createReviewedResponse(
        {
          originalQuestion: userMessage.content,
          originalAnswer: message.content,
          revisedAnswer: validatedData.revisedContent,
          revisionReason: validatedData.revisionReason,
          conversationId,
          messageId: actualMessageId,
          category: validatedData.category,
          tags: validatedData.tags,
          priority: validatedData.priority,
        },
        session.user.id,
        session.user.id
      );
      console.log('[API] Reviewed response created:', reviewedResponseId);
    } catch (error) {
      console.error('[API] Error in createReviewedResponse:', error);
      throw new Error('Failed to create reviewed response: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Aggiorna il messaggio con il link alla knowledge base
    console.log('[API] Marking as learned response...');
    try {
      await conversationService.markAsLearnedResponse(
        conversationId,
        actualMessageId,
        reviewedResponseId,
        1.0 // Perfect match since it's the exact revision
      );
      console.log('[API] Marked as learned response successfully');
    } catch (error) {
      console.error('[API] Error in markAsLearnedResponse:', error);
      throw new Error('Failed to mark as learned response: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    return NextResponse.json({
      success: true,
      message: 'Messaggio revisionato con successo',
      reviewedResponseId,
      data: {
        messageId,
        revisedContent: validatedData.revisedContent,
        revisionReason: validatedData.revisionReason,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('[API] Error revising message:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Dati non validi', 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 });
  }
}

// GET endpoint per ottenere lo stato della revisione
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id: conversationId, messageId } = params;
    
    const conversationService = new ConversationService();
    const conversation = await conversationService.getConversation(conversationId);
    
    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Conversazione non trovata' }, { status: 404 });
    }

    const message = conversation.messages.find(msg => msg.id === messageId);
    if (!message) {
      return NextResponse.json({ error: 'Messaggio non trovato' }, { status: 404 });
    }

    return NextResponse.json({
      messageId,
      isRevised: message.isRevised || false,
      revisedBy: message.revisedBy,
      revisionTimestamp: message.revisionTimestamp,
      revisionReason: message.revisionReason,
      approvalStatus: message.approvalStatus || 'pending',
      originalContent: message.originalContent,
      currentContent: message.content,
      isLearnedResponse: message.isLearnedResponse || false,
      reviewedResponseId: message.reviewedResponseId,
      usageCount: message.usageCount || 0,
      effectiveness: message.effectiveness || 0,
    });

  } catch (error) {
    console.error('[API] Error getting revision status:', error);
    return NextResponse.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 });
  }
}

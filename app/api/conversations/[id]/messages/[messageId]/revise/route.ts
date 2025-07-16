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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id: conversationId, messageId } = params;
    const body = await request.json();
    
    // Valida i dati in input
    const validatedData = ReviseMessageSchema.parse(body);
    
    const conversationService = new ConversationService();
    
    // Verifica che la conversazione appartenga all'utente
    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Conversazione non trovata' }, { status: 404 });
    }

    // Trova il messaggio da revisionare
    const message = conversation.messages.find(msg => msg.id === messageId);
    if (!message) {
      return NextResponse.json({ error: 'Messaggio non trovato' }, { status: 404 });
    }

    // Verifica che sia un messaggio dell'assistente
    if (message.role !== 'assistant') {
      return NextResponse.json({ error: 'Solo i messaggi dell\'assistente possono essere revisionati' }, { status: 400 });
    }

    // Trova il messaggio utente precedente per creare la knowledge base
    const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
    const userMessage = conversation.messages[messageIndex - 1];
    
    if (!userMessage || userMessage.role !== 'user') {
      return NextResponse.json({ error: 'Impossibile trovare la domanda dell\'utente' }, { status: 400 });
    }

    // Revisiona il messaggio
    await conversationService.reviseMessage(
      conversationId,
      messageId,
      validatedData.revisedContent,
      session.user.id,
      validatedData.revisionReason
    );

    // Crea una nuova risposta revisionata nella knowledge base
    const reviewedResponseId = await reviewedResponseService.createReviewedResponse(
      {
        originalQuestion: userMessage.content,
        originalAnswer: message.content,
        revisedAnswer: validatedData.revisedContent,
        revisionReason: validatedData.revisionReason,
        conversationId,
        messageId,
        category: validatedData.category,
        tags: validatedData.tags,
        priority: validatedData.priority,
      },
      session.user.id,
      session.user.id
    );

    // Aggiorna il messaggio con il link alla knowledge base
    await conversationService.markAsLearnedResponse(
      conversationId,
      messageId,
      reviewedResponseId,
      1.0 // Perfect match since it's the exact revision
    );

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

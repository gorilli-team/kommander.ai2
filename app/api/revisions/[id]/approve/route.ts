import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { reviewedResponseService } from '@/backend/lib/reviewedResponseService';
import { ConversationService } from '@/backend/lib/conversationService';
import { z } from 'zod';

const ApproveRevisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reason: z.string().optional(),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id: reviewedResponseId } = params;
    const body = await request.json();
    
    // Valida i dati in input
    const validatedData = ApproveRevisionSchema.parse(body);
    
    // Verifica che la risposta revisionata esista e appartenga all'utente
    const reviewedResponse = await reviewedResponseService.getReviewedResponse(reviewedResponseId);
    if (!reviewedResponse || reviewedResponse.userId !== session.user.id) {
      return NextResponse.json({ error: 'Risposta revisionata non trovata' }, { status: 404 });
    }

    // Aggiorna lo status di approvazione
    await reviewedResponseService.updateApprovalStatus(
      reviewedResponseId,
      validatedData.status,
      session.user.id
    );

    // Se è presente conversationId e messageId, aggiorna anche il messaggio
    if (validatedData.conversationId && validatedData.messageId) {
      const conversationService = new ConversationService();
      
      try {
        await conversationService.approveRevision(
          validatedData.conversationId,
          validatedData.messageId,
          validatedData.status,
          session.user.id
        );
      } catch (error) {
        console.warn('[API] Could not update conversation message approval:', error);
        // Non bloccare l'operazione se fallisce l'aggiornamento del messaggio
      }
    }

    // Ottieni la risposta aggiornata
    const updatedResponse = await reviewedResponseService.getReviewedResponse(reviewedResponseId);

    return NextResponse.json({
      success: true,
      message: `Revisione ${validatedData.status === 'approved' ? 'approvata' : 'rifiutata'} con successo`,
      data: {
        reviewedResponseId,
        status: validatedData.status,
        approvedBy: session.user.id,
        approvalTimestamp: new Date().toISOString(),
        reason: validatedData.reason,
        isActive: updatedResponse?.isActive,
        usageCount: updatedResponse?.usageCount,
        effectiveness: updatedResponse?.effectiveness,
      }
    });

  } catch (error) {
    console.error('[API] Error approving revision:', error);
    
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

// GET endpoint per ottenere lo stato di approvazione
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id: reviewedResponseId } = params;
    
    const reviewedResponse = await reviewedResponseService.getReviewedResponse(reviewedResponseId);
    if (!reviewedResponse || reviewedResponse.userId !== session.user.id) {
      return NextResponse.json({ error: 'Risposta revisionata non trovata' }, { status: 404 });
    }

    return NextResponse.json({
      reviewedResponseId,
      approvalStatus: reviewedResponse.approvalStatus,
      approvedBy: reviewedResponse.approvedBy,
      approvalTimestamp: reviewedResponse.approvalTimestamp,
      isActive: reviewedResponse.isActive,
      usageCount: reviewedResponse.usageCount,
      effectiveness: reviewedResponse.effectiveness,
      qualityScore: reviewedResponse.qualityScore,
      category: reviewedResponse.category,
      tags: reviewedResponse.tags,
      priority: reviewedResponse.priority,
      createdAt: reviewedResponse.createdAt,
      updatedAt: reviewedResponse.updatedAt,
    });

  } catch (error) {
    console.error('[API] Error getting approval status:', error);
    return NextResponse.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 });
  }
}

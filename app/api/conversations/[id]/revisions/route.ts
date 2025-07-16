import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { ConversationService } from '@/backend/lib/conversationService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id: conversationId } = params;
    const { searchParams } = new URL(request.url);
    
    // Parametri opzionali per filtrare
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    
    const conversationService = new ConversationService();
    
    // Verifica che la conversazione appartenga all'utente
    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Conversazione non trovata' }, { status: 404 });
    }

    // Ottieni cronologia revisioni
    const revisionHistory = await conversationService.getRevisionHistory(conversationId);
    
    // Filtra per status se specificato
    let filteredRevisions = revisionHistory;
    if (status) {
      filteredRevisions = revisionHistory.filter(msg => msg.approvalStatus === status);
    }
    
    // Applica paginazione
    const paginatedRevisions = filteredRevisions
      .sort((a, b) => new Date(b.revisionTimestamp || 0).getTime() - new Date(a.revisionTimestamp || 0).getTime())
      .slice(skip, skip + limit);

    // Formato la risposta
    const formattedRevisions = paginatedRevisions.map(message => ({
      messageId: message.id,
      originalContent: message.originalContent,
      revisedContent: message.content,
      revisionReason: message.revisionReason,
      revisedBy: message.revisedBy,
      revisionTimestamp: message.revisionTimestamp,
      approvalStatus: message.approvalStatus || 'pending',
      isLearnedResponse: message.isLearnedResponse || false,
      reviewedResponseId: message.reviewedResponseId,
      usageCount: message.usageCount || 0,
      effectiveness: message.effectiveness || 0,
      metadata: {
        processingTime: message.metadata?.processingTime,
        model: message.metadata?.model,
        similarityScore: message.metadata?.similarityScore,
        matchedQuestionId: message.metadata?.matchedQuestionId,
        revisionQuality: message.metadata?.revisionQuality,
      }
    }));

    return NextResponse.json({
      conversationId,
      revisions: formattedRevisions,
      pagination: {
        total: filteredRevisions.length,
        limit,
        skip,
        hasMore: skip + limit < filteredRevisions.length
      },
      summary: {
        totalRevisions: revisionHistory.length,
        pendingRevisions: revisionHistory.filter(msg => msg.approvalStatus === 'pending').length,
        approvedRevisions: revisionHistory.filter(msg => msg.approvalStatus === 'approved').length,
        rejectedRevisions: revisionHistory.filter(msg => msg.approvalStatus === 'rejected').length,
        learnedResponses: revisionHistory.filter(msg => msg.isLearnedResponse).length,
      }
    });

  } catch (error) {
    console.error('[API] Error getting revision history:', error);
    return NextResponse.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 });
  }
}

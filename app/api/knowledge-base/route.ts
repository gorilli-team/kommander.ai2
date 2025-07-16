import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { reviewedResponseService } from '@/backend/lib/reviewedResponseService';
import { z } from 'zod';

const SearchKnowledgeBaseSchema = z.object({
  query: z.string().min(1, 'La query non può essere vuota'),
  threshold: z.number().min(0).max(1).optional().default(0.7),
  limit: z.number().min(1).max(50).optional().default(10),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

const ListKnowledgeBaseSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  skip: z.number().min(0).optional().default(0),
  sortBy: z.enum(['createdAt', 'usageCount', 'effectiveness']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  category: z.string().optional(),
});

// GET - Lista risposte nella knowledge base
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    // Converti stringhe in numeri/tipi appropriati
    const queryParams = {
      ...params,
      limit: params.limit ? parseInt(params.limit) : undefined,
      skip: params.skip ? parseInt(params.skip) : undefined,
    };

    // Valida i parametri
    const validatedParams = ListKnowledgeBaseSchema.parse(queryParams);
    
    // Ottieni le risposte dalla knowledge base
    const responses = await reviewedResponseService.listReviewedResponses(
      session.user.id,
      validatedParams
    );

    // Ottieni statistiche
    const analytics = await reviewedResponseService.getRevisionAnalytics(session.user.id);

    return NextResponse.json({
      data: responses.map(response => ({
        id: response._id?.toString(),
        originalQuestion: response.originalQuestion,
        originalAnswer: response.originalAnswer,
        revisedAnswer: response.revisedAnswer,
        category: response.category,
        tags: response.tags,
        priority: response.priority,
        approvalStatus: response.approvalStatus,
        usageCount: response.usageCount,
        effectiveness: response.effectiveness,
        qualityScore: response.qualityScore,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        revisedBy: response.revisedBy,
        revisionTimestamp: response.revisionTimestamp,
        lastUsed: response.lastUsed,
        isActive: response.isActive,
      })),
      pagination: {
        limit: validatedParams.limit,
        skip: validatedParams.skip,
        total: analytics.totalRevisions,
        hasMore: validatedParams.skip + validatedParams.limit < analytics.totalRevisions,
      },
      analytics: {
        totalRevisions: analytics.totalRevisions,
        approvedRevisions: analytics.approvedRevisions,
        pendingRevisions: analytics.pendingRevisions,
        rejectedRevisions: analytics.rejectedRevisions,
        averageQualityScore: analytics.averageQualityScore,
        averageEffectiveness: analytics.averageEffectiveness,
        totalUsage: analytics.totalUsage,
        topCategories: analytics.topCategories,
        topKeywords: analytics.topKeywords,
      }
    });

  } catch (error) {
    console.error('[API] Error getting knowledge base:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Parametri non validi', 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Errore interno del server' 
    }, { status: 500 });
  }
}

// POST - Cerca nella knowledge base
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = SearchKnowledgeBaseSchema.parse(body);
    
    // Cerca risposte simili
    const similarResponse = await reviewedResponseService.findSimilarResponse(
      validatedData.query,
      session.user.id,
      {
        similarityThreshold: validatedData.threshold,
        maxResults: validatedData.limit,
      }
    );

    if (!similarResponse) {
      return NextResponse.json({
        found: false,
        message: 'Nessuna risposta simile trovata',
        query: validatedData.query,
        threshold: validatedData.threshold,
      });
    }

    return NextResponse.json({
      found: true,
      data: {
        id: similarResponse.reviewedResponse._id?.toString(),
        originalQuestion: similarResponse.reviewedResponse.originalQuestion,
        originalAnswer: similarResponse.reviewedResponse.originalAnswer,
        revisedAnswer: similarResponse.reviewedResponse.revisedAnswer,
        category: similarResponse.reviewedResponse.category,
        tags: similarResponse.reviewedResponse.tags,
        priority: similarResponse.reviewedResponse.priority,
        approvalStatus: similarResponse.reviewedResponse.approvalStatus,
        usageCount: similarResponse.reviewedResponse.usageCount,
        effectiveness: similarResponse.reviewedResponse.effectiveness,
        qualityScore: similarResponse.reviewedResponse.qualityScore,
        createdAt: similarResponse.reviewedResponse.createdAt,
        lastUsed: similarResponse.reviewedResponse.lastUsed,
        isActive: similarResponse.reviewedResponse.isActive,
      },
      matching: {
        similarityScore: similarResponse.similarityScore,
        matchType: similarResponse.matchType,
        confidence: similarResponse.confidence,
        explanation: similarResponse.explanation,
      },
      query: validatedData.query,
      threshold: validatedData.threshold,
    });

  } catch (error) {
    console.error('[API] Error searching knowledge base:', error);
    
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

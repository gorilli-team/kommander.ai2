import { MongoClient, Db, ObjectId } from 'mongodb';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { 
  ReviewedResponse, 
  RevisionAnalytics, 
  MatchResult,
  CreateReviewedResponseRequest,
  UpdateReviewedResponseRequest,
  ReviewedResponseSchema
} from '@/backend/schemas/reviewedResponse';
import { questionMatchingService, MatchingOptions } from '@/backend/lib/questionMatchingService';

export class ReviewedResponseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect() {
    if (!this.db) {
      const { client, db } = await connectToDatabase();
      this.client = client;
      this.db = db;
    }
    return this.db!;
  }

  /**
   * Crea una nuova risposta revisionata
   */
  async createReviewedResponse(
    data: CreateReviewedResponseRequest, 
    userId: string,
    revisedBy: string
  ): Promise<string> {
    const db = await this.connect();
    const now = new Date();

    try {
      // Genera hash della domanda
      const questionHash = questionMatchingService.generateQuestionHash(data.originalQuestion);
      
      // Genera embedding della domanda
      const questionEmbedding = await questionMatchingService.generateQuestionEmbedding(data.originalQuestion);
      
      // Estrae keywords
      const keywords = questionMatchingService.extractKeywords(data.originalQuestion);
      
      // Categorizza automaticamente se non specificato
      const category = data.category || await this.categorizeQuestion(data.originalQuestion);
      
      const reviewedResponse: Omit<ReviewedResponse, '_id'> = {
        userId,
        originalQuestion: data.originalQuestion,
        originalAnswer: data.originalAnswer,
        revisedAnswer: data.revisedAnswer,
        
        // Matching data
        questionEmbedding,
        keywords,
        questionHash,
        
        // Revision info
        revisedBy,
        revisionReason: data.revisionReason || 'Manual revision',
        revisionTimestamp: now,
        
        // Quality control
        approvalStatus: 'pending',
        qualityScore: await this.calculateInitialQualityScore(data.revisedAnswer),
        
        // Usage stats
        usageCount: 0,
        effectiveness: 0,
        userFeedback: [],
        
        // Organization
        category,
        tags: data.tags || [],
        priority: data.priority || 'medium',
        
        // System metadata
        createdAt: now,
        updatedAt: now,
        isActive: true,
        version: 1,
        
        // Links
        conversationId: data.conversationId,
        messageId: data.messageId,
      };

      // Valida il schema
      const validatedResponse = ReviewedResponseSchema.parse(reviewedResponse);
      
      const result = await db.collection('reviewed_responses').insertOne(validatedResponse);
      
      console.log(`[ReviewedResponseService] Created reviewed response: ${result.insertedId}`);
      
      // Crea indici se non esistono
      await this.ensureIndexes();
      
      return result.insertedId.toString();
    } catch (error) {
      console.error('[ReviewedResponseService] Error creating reviewed response:', error);
      throw new Error('Failed to create reviewed response');
    }
  }

  /**
   * Trova la risposta simile più rilevante per una domanda
   */
  async findSimilarResponse(
    question: string, 
    userId: string,
    options: MatchingOptions = {}
  ): Promise<MatchResult | null> {
    const db = await this.connect();

    try {
      // Genera embedding e keywords per la domanda
      const questionEmbedding = await questionMatchingService.generateQuestionEmbedding(question);
      const questionKeywords = questionMatchingService.extractKeywords(question);
      const questionHash = questionMatchingService.generateQuestionHash(question);

      // Prima cerca match esatto per hash
      const exactMatch = await db.collection('reviewed_responses').findOne({
        userId,
        questionHash,
        isActive: true,
        approvalStatus: 'approved'
      });

      if (exactMatch) {
        console.log('[ReviewedResponseService] Found exact hash match');
        return {
          reviewedResponse: exactMatch as ReviewedResponse,
          similarityScore: 1.0,
          matchType: 'hash',
          confidence: 1.0,
          explanation: 'Exact question match'
        };
      }

      // Cerca match simili
      const candidates = await db.collection('reviewed_responses')
        .find({
          userId,
          isActive: true,
          approvalStatus: 'approved'
        })
        .toArray();

      if (candidates.length === 0) {
        return null;
      }

      // Prepara candidati per matching
      const candidateQuestions = candidates.map(candidate => ({
        id: candidate._id.toString(),
        embedding: candidate.questionEmbedding,
        keywords: candidate.keywords || [],
        question: candidate.originalQuestion,
        candidate: candidate as ReviewedResponse
      }));

      // Trova domande simili
      const similarQuestions = questionMatchingService.findSimilarQuestions(
        questionEmbedding,
        questionKeywords,
        candidateQuestions,
        options
      );

      if (similarQuestions.length === 0) {
        return null;
      }

      // Prendi la migliore
      const bestMatch = similarQuestions[0];
      const bestCandidate = candidateQuestions.find(c => c.id === bestMatch.id)!;
      
      // Calcola confidence
      const confidence = questionMatchingService.calculateConfidence(
        bestMatch.similarity.score,
        bestCandidate.candidate.usageCount,
        bestCandidate.candidate.effectiveness,
        bestCandidate.candidate.approvalStatus
      );

      console.log(`[ReviewedResponseService] Found similar response with score: ${bestMatch.similarity.score}`);

      return {
        reviewedResponse: bestCandidate.candidate,
        similarityScore: bestMatch.similarity.score,
        matchType: bestMatch.similarity.type,
        confidence,
        explanation: bestMatch.similarity.explanation
      };
    } catch (error) {
      console.error('[ReviewedResponseService] Error finding similar response:', error);
      return null;
    }
  }

  /**
   * Aggiorna statistiche di utilizzo
   */
  async updateUsageStats(responseId: string, effectiveness?: number): Promise<void> {
    const db = await this.connect();

    try {
      const update: any = {
        $inc: { usageCount: 1 },
        $set: { 
          lastUsed: new Date(),
          updatedAt: new Date()
        }
      };

      if (effectiveness !== undefined) {
        // Calcola nuova effectiveness media
        const current = await db.collection('reviewed_responses').findOne({ _id: new ObjectId(responseId) });
        if (current) {
          const newEffectiveness = (current.effectiveness * current.usageCount + effectiveness) / (current.usageCount + 1);
          update.$set.effectiveness = newEffectiveness;
        }
      }

      await db.collection('reviewed_responses').updateOne(
        { _id: new ObjectId(responseId) },
        update
      );

      console.log(`[ReviewedResponseService] Updated usage stats for response: ${responseId}`);
    } catch (error) {
      console.error('[ReviewedResponseService] Error updating usage stats:', error);
    }
  }

  /**
   * Aggiorna status di approvazione
   */
  async updateApprovalStatus(
    responseId: string, 
    status: 'approved' | 'rejected', 
    approvedBy: string
  ): Promise<void> {
    const db = await this.connect();

    try {
      await db.collection('reviewed_responses').updateOne(
        { _id: new ObjectId(responseId) },
        {
          $set: {
            approvalStatus: status,
            approvedBy,
            approvalTimestamp: new Date(),
            updatedAt: new Date()
          }
        }
      );

      console.log(`[ReviewedResponseService] Updated approval status to ${status} for response: ${responseId}`);
    } catch (error) {
      console.error('[ReviewedResponseService] Error updating approval status:', error);
      throw error;
    }
  }

  /**
   * Aggiorna risposta revisionata
   */
  async updateReviewedResponse(
    responseId: string, 
    updates: UpdateReviewedResponseRequest
  ): Promise<void> {
    const db = await this.connect();

    try {
      const updateData: any = {
        updatedAt: new Date(),
        version: { $inc: 1 }
      };

      // Aggiorna campi se presenti
      if (updates.revisedAnswer) {
        updateData.revisedAnswer = updates.revisedAnswer;
        updateData.qualityScore = await this.calculateInitialQualityScore(updates.revisedAnswer);
      }
      
      if (updates.revisionReason) updateData.revisionReason = updates.revisionReason;
      if (updates.category) updateData.category = updates.category;
      if (updates.tags) updateData.tags = updates.tags;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
      if (updates.matchingSettings) updateData.matchingSettings = updates.matchingSettings;

      await db.collection('reviewed_responses').updateOne(
        { _id: new ObjectId(responseId) },
        { $set: updateData }
      );

      console.log(`[ReviewedResponseService] Updated reviewed response: ${responseId}`);
    } catch (error) {
      console.error('[ReviewedResponseService] Error updating reviewed response:', error);
      throw error;
    }
  }

  /**
   * Ottieni risposta revisionata per ID
   */
  async getReviewedResponse(responseId: string): Promise<ReviewedResponse | null> {
    const db = await this.connect();

    try {
      const response = await db.collection('reviewed_responses')
        .findOne({ _id: new ObjectId(responseId) });

      return response as ReviewedResponse | null;
    } catch (error) {
      console.error('[ReviewedResponseService] Error getting reviewed response:', error);
      return null;
    }
  }

  /**
   * Lista risposte revisionate per utente
   */
  async listReviewedResponses(
    userId: string,
    options: {
      limit?: number;
      skip?: number;
      status?: 'pending' | 'approved' | 'rejected';
      category?: string;
      sortBy?: 'createdAt' | 'usageCount' | 'effectiveness';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<ReviewedResponse[]> {
    const db = await this.connect();

    try {
      const {
        limit = 20,
        skip = 0,
        status,
        category,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const filter: any = { userId };
      if (status) filter.approvalStatus = status;
      if (category) filter.category = category;

      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const responses = await db.collection('reviewed_responses')
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();

      return responses as ReviewedResponse[];
    } catch (error) {
      console.error('[ReviewedResponseService] Error listing reviewed responses:', error);
      return [];
    }
  }

  /**
   * Ottieni analytics delle revisioni
   */
  async getRevisionAnalytics(userId: string): Promise<RevisionAnalytics> {
    const db = await this.connect();

    try {
      const pipeline = [
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalRevisions: { $sum: 1 },
            approvedRevisions: { 
              $sum: { $cond: [{ $eq: ['$approvalStatus', 'approved'] }, 1, 0] }
            },
            rejectedRevisions: { 
              $sum: { $cond: [{ $eq: ['$approvalStatus', 'rejected'] }, 1, 0] }
            },
            pendingRevisions: { 
              $sum: { $cond: [{ $eq: ['$approvalStatus', 'pending'] }, 1, 0] }
            },
            averageQualityScore: { $avg: '$qualityScore' },
            averageEffectiveness: { $avg: '$effectiveness' },
            totalUsage: { $sum: '$usageCount' }
          }
        }
      ];

      const result = await db.collection('reviewed_responses').aggregate(pipeline).toArray();
      const stats = result[0] || {
        totalRevisions: 0,
        approvedRevisions: 0,
        rejectedRevisions: 0,
        pendingRevisions: 0,
        averageQualityScore: 0,
        averageEffectiveness: 0,
        totalUsage: 0
      };

      // Ottieni top categories
      const topCategories = await db.collection('reviewed_responses')
        .aggregate([
          { $match: { userId } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { category: '$_id', count: 1, _id: 0 } }
        ])
        .toArray();

      // Ottieni top keywords
      const topKeywords = await db.collection('reviewed_responses')
        .aggregate([
          { $match: { userId } },
          { $unwind: '$keywords' },
          { $group: { _id: '$keywords', frequency: { $sum: 1 } } },
          { $sort: { frequency: -1 } },
          { $limit: 20 },
          { $project: { keyword: '$_id', frequency: 1, _id: 0 } }
        ])
        .toArray();

      return {
        ...stats,
        topCategories,
        topKeywords,
        revisionTrends: [] // TODO: Implementare trends temporali
      };
    } catch (error) {
      console.error('[ReviewedResponseService] Error getting revision analytics:', error);
      return {
        totalRevisions: 0,
        approvedRevisions: 0,
        rejectedRevisions: 0,
        pendingRevisions: 0,
        averageQualityScore: 0,
        averageEffectiveness: 0,
        totalUsage: 0,
        topCategories: [],
        topKeywords: [],
        revisionTrends: []
      };
    }
  }

  /**
   * Elimina risposta revisionata
   */
  async deleteReviewedResponse(responseId: string): Promise<void> {
    const db = await this.connect();

    try {
      await db.collection('reviewed_responses').deleteOne({ _id: new ObjectId(responseId) });
      console.log(`[ReviewedResponseService] Deleted reviewed response: ${responseId}`);
    } catch (error) {
      console.error('[ReviewedResponseService] Error deleting reviewed response:', error);
      throw error;
    }
  }

  /**
   * Categorizza automaticamente una domanda
   */
  private async categorizeQuestion(question: string): Promise<string> {
    // Semplice categorizzazione basata su keywords
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('prezzo') || lowerQuestion.includes('costo') || lowerQuestion.includes('pagamento')) {
      return 'pricing';
    }
    if (lowerQuestion.includes('supporto') || lowerQuestion.includes('aiuto') || lowerQuestion.includes('assistenza')) {
      return 'support';
    }
    if (lowerQuestion.includes('prodotto') || lowerQuestion.includes('servizio') || lowerQuestion.includes('funzionalità')) {
      return 'product';
    }
    if (lowerQuestion.includes('account') || lowerQuestion.includes('login') || lowerQuestion.includes('registrazione')) {
      return 'account';
    }
    if (lowerQuestion.includes('spedizione') || lowerQuestion.includes('consegna') || lowerQuestion.includes('ordine')) {
      return 'shipping';
    }
    
    return 'general';
  }

  /**
   * Calcola quality score iniziale
   */
  private async calculateInitialQualityScore(answer: string): Promise<number> {
    // Semplice scoring basato su lunghezza e completezza
    let score = 0.5; // Base score
    
    // Boost per lunghezza appropriata
    const wordCount = answer.split(/\s+/).length;
    if (wordCount >= 10 && wordCount <= 200) {
      score += 0.2;
    }
    
    // Boost per punteggiatura
    if (answer.includes('.') || answer.includes('!') || answer.includes('?')) {
      score += 0.1;
    }
    
    // Boost per struttura
    if (answer.includes('\n') || answer.includes('•') || answer.includes('-')) {
      score += 0.1;
    }
    
    // Boost per cortesia
    if (answer.toLowerCase().includes('grazie') || answer.toLowerCase().includes('prego')) {
      score += 0.1;
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Crea indici per performance
   */
  private async ensureIndexes(): Promise<void> {
    const db = await this.connect();

    try {
      await db.collection('reviewed_responses').createIndex({ userId: 1, isActive: 1 });
      await db.collection('reviewed_responses').createIndex({ userId: 1, approvalStatus: 1 });
      await db.collection('reviewed_responses').createIndex({ questionHash: 1 });
      await db.collection('reviewed_responses').createIndex({ keywords: 1 });
      await db.collection('reviewed_responses').createIndex({ category: 1 });
      await db.collection('reviewed_responses').createIndex({ usageCount: -1 });
      await db.collection('reviewed_responses').createIndex({ effectiveness: -1 });
      await db.collection('reviewed_responses').createIndex({ createdAt: -1 });
    } catch (error) {
      console.error('[ReviewedResponseService] Error creating indexes:', error);
    }
  }
}

// Singleton instance
export const reviewedResponseService = new ReviewedResponseService();

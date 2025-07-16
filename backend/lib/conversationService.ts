import { MongoClient, Db, ObjectId } from 'mongodb';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { 
  Conversation, 
  ConversationMessage, 
  ConversationSummary,
  MessageSource 
} from '@/backend/schemas/conversation';

export class ConversationService {
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

  async createConversation(userId: string, title?: string): Promise<ObjectId> {
    const db = await this.connect();
    const now = new Date();
    
    const conversation: Omit<Conversation, '_id'> = {
      userId,
      title: title || `Chat ${now.toLocaleDateString()}`,
      messages: [],
      createdAt: now,
      updatedAt: now,
      metadata: {
        totalMessages: 0,
        lastActivity: now,
        isArchived: false,
      }
    };

    const result = await db.collection('conversations').insertOne(conversation);
    return result.insertedId;
  }

  async addMessage(
    conversationId: string, 
    message: ConversationMessage
  ): Promise<void> {
    const db = await this.connect();
    const now = new Date();

    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $push: { messages: message },
        $set: { 
          updatedAt: now,
          'metadata.lastActivity': now
        },
        $inc: { 'metadata.totalMessages': 1 }
      }
    );

    // Update analytics if it's an assistant message with sources
    if (message.role === 'assistant' && message.sources) {
      await this.updateAnalytics(conversationId, message);
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const db = await this.connect();
    
    const conversation = await db.collection('conversations')
      .findOne({ _id: new ObjectId(conversationId) });
    
    return conversation as Conversation | null;
  }

  async getUserConversations(
    userId: string, 
    options: {
      limit?: number;
      skip?: number;
      includeArchived?: boolean;
      sortBy?: 'lastActivity' | 'createdAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<ConversationSummary[]> {
    const db = await this.connect();
    
    const {
      limit = 20,
      skip = 0,
      includeArchived = false,
      sortBy = 'lastActivity',
      sortOrder = 'desc'
    } = options;

    const filter: any = { userId };
    if (!includeArchived) {
      filter['metadata.isArchived'] = { $ne: true };
    }

    const sort: any = {};
    sort[`metadata.${sortBy}`] = sortOrder === 'desc' ? -1 : 1;

    const conversations = await db.collection('conversations')
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .project({
        _id: 1,
        userId: 1,
        title: 1,
        'metadata.lastActivity': 1,
        'metadata.totalMessages': 1,
        'metadata.isArchived': 1,
        'metadata.tags': 1,
        'metadata.rating': 1,
        messages: { $slice: -1 } // Get last message
      })
      .toArray();

    return conversations.map(conv => ({
      _id: conv._id,
      userId: conv.userId,
      title: conv.title,
      lastMessage: conv.messages[0]?.content || '',
      lastActivity: conv.metadata.lastActivity,
      messageCount: conv.metadata.totalMessages,
      isArchived: conv.metadata.isArchived || false,
      tags: conv.metadata.tags,
      rating: conv.metadata.rating
    }));
  }

  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const db = await this.connect();
    
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          title,
          updatedAt: new Date()
        }
      }
    );
  }

  async archiveConversation(conversationId: string, archive = true): Promise<void> {
    const db = await this.connect();
    
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          'metadata.isArchived': archive,
          updatedAt: new Date()
        }
      }
    );
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const db = await this.connect();
    
    await db.collection('conversations').deleteOne({
      _id: new ObjectId(conversationId)
    });
  }

  async rateConversation(conversationId: string, rating: number): Promise<void> {
    const db = await this.connect();
    
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          'metadata.rating': Math.max(1, Math.min(5, rating)),
          updatedAt: new Date()
        }
      }
    );
  }

  async addTagsToConversation(conversationId: string, tags: string[]): Promise<void> {
    const db = await this.connect();
    
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $addToSet: { 'metadata.tags': { $each: tags } },
        $set: { updatedAt: new Date() }
      }
    );
  }

  async removeTagsFromConversation(conversationId: string, tags: string[]): Promise<void> {
    const db = await this.connect();
    
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $pull: { 'metadata.tags': { $in: tags } },
        $set: { updatedAt: new Date() }
      }
    );
  }

  async searchConversations(
    userId: string,
    query: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<ConversationSummary[]> {
    const db = await this.connect();
    const { limit = 10, skip = 0 } = options;

    // Simple text search - could be enhanced with full-text search
    const conversations = await db.collection('conversations')
      .find({
        userId,
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { 'messages.content': { $regex: query, $options: 'i' } }
        ]
      })
      .sort({ 'metadata.lastActivity': -1 })
      .skip(skip)
      .limit(limit)
      .project({
        _id: 1,
        userId: 1,
        title: 1,
        'metadata.lastActivity': 1,
        'metadata.totalMessages': 1,
        'metadata.isArchived': 1,
        messages: { $slice: -1 }
      })
      .toArray();

    return conversations.map(conv => ({
      _id: conv._id,
      userId: conv.userId,
      title: conv.title,
      lastMessage: conv.messages[0]?.content || '',
      lastActivity: conv.metadata.lastActivity,
      messageCount: conv.metadata.totalMessages,
      isArchived: conv.metadata.isArchived || false
    }));
  }

  private async updateAnalytics(conversationId: string, message: ConversationMessage): Promise<void> {
    const db = await this.connect();
    
    if (!message.sources || message.sources.length === 0) return;

    const sourceCounts = message.sources.reduce((acc, source) => {
      acc[source.type] = (acc[source.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const processingTime = message.metadata?.processingTime || 0;

    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $inc: {
          'analytics.sourceTypes.faq': sourceCounts.faq || 0,
          'analytics.sourceTypes.document': sourceCounts.document || 0,
        },
        $set: {
          'analytics.avgResponseTime': processingTime // Simplified - should calculate actual average
        }
      }
    );
  }

  async getAnalyticsSummary(userId: string, timeframe: 'day' | 'week' | 'month' = 'week') {
    const db = await this.connect();
    
    const startDate = new Date();
    switch (timeframe) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const pipeline = [
      {
        $match: {
          userId,
          'metadata.lastActivity': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          totalMessages: { $sum: '$metadata.totalMessages' },
          avgMessagesPerConversation: { $avg: '$metadata.totalMessages' },
          avgRating: { $avg: '$metadata.rating' },
          faqSources: { $sum: '$analytics.sourceTypes.faq' },
          documentSources: { $sum: '$analytics.sourceTypes.document' }
        }
      }
    ];

    const result = await db.collection('conversations').aggregate(pipeline).toArray();
    return result[0] || {
      totalConversations: 0,
      totalMessages: 0,
      avgMessagesPerConversation: 0,
      avgRating: 0,
      faqSources: 0,
      documentSources: 0
    };
  }

  /**
   * Revisiona un messaggio specifico in una conversazione
   */
  async reviseMessage(
    conversationId: string, 
    messageId: string, 
    revisedContent: string,
    revisedBy: string,
    revisionReason?: string
  ): Promise<void> {
    const db = await this.connect();
    const now = new Date();

    try {
      // Prima ottieni il messaggio originale
      const conversation = await db.collection('conversations').findOne(
        { _id: new ObjectId(conversationId) },
        { projection: { messages: 1 } }
      );

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Trova il messaggio per ID se esiste, altrimenti prova a generarlo
      let messageIndex = conversation.messages.findIndex((msg: any) => msg.id === messageId);
      
      // Se non trova il messaggio per ID, potrebbe essere che l'ID sia stato generato
      if (messageIndex === -1) {
        // Estrai l'indice dall'ID generato se ha il formato msg-{index}-{timestamp}
        const match = messageId.match(/^msg-(\d+)-\d+$/);
        if (match) {
          const index = parseInt(match[1]);
          if (index >= 0 && index < conversation.messages.length) {
            messageIndex = index;
          }
        }
      }
      
      if (messageIndex === -1) {
        throw new Error('Message not found');
      }

      const message = conversation.messages[messageIndex];
      
      // Se il messaggio non ha un ID, assegnagli quello generato
      if (!message.id) {
        await db.collection('conversations').updateOne(
          { _id: new ObjectId(conversationId) },
          {
            $set: {
              [`messages.${messageIndex}.id`]: messageId
            }
          }
        );
      }

      // Aggiorna il messaggio con la revisione
      await db.collection('conversations').updateOne(
        { 
          _id: new ObjectId(conversationId)
        },
        {
          $set: {
            [`messages.${messageIndex}.originalContent`]: message.originalContent || message.content,
            [`messages.${messageIndex}.content`]: revisedContent,
            [`messages.${messageIndex}.isRevised`]: true,
            [`messages.${messageIndex}.revisedBy`]: revisedBy,
            [`messages.${messageIndex}.revisionTimestamp`]: now,
            [`messages.${messageIndex}.revisionReason`]: revisionReason || 'Manual revision',
            [`messages.${messageIndex}.approvalStatus`]: 'pending',
            [`messages.${messageIndex}.id`]: messageId,
            updatedAt: now
          }
        }
      );

      console.log(`[ConversationService] Revised message ${messageId} in conversation ${conversationId}`);
    } catch (error) {
      console.error('[ConversationService] Error revising message:', error);
      throw error;
    }
  }

  /**
   * Ottieni cronologia delle revisioni per una conversazione
   */
  async getRevisionHistory(conversationId: string): Promise<ConversationMessage[]> {
    const db = await this.connect();

    try {
      const conversation = await db.collection('conversations').findOne(
        { _id: new ObjectId(conversationId) },
        { projection: { messages: 1 } }
      );

      if (!conversation) {
        return [];
      }

      // Filtra solo i messaggi revisionati
      const revisedMessages = conversation.messages.filter(
        (msg: any) => msg.isRevised === true
      );

      return revisedMessages as ConversationMessage[];
    } catch (error) {
      console.error('[ConversationService] Error getting revision history:', error);
      return [];
    }
  }

  /**
   * Approva o rifiuta una revisione
   */
  async approveRevision(
    conversationId: string,
    messageId: string,
    status: 'approved' | 'rejected',
    approvedBy: string
  ): Promise<void> {
    const db = await this.connect();
    const now = new Date();

    try {
      await db.collection('conversations').updateOne(
        { 
          _id: new ObjectId(conversationId),
          'messages.id': messageId
        },
        {
          $set: {
            'messages.$.approvalStatus': status,
            'messages.$.metadata.approvedBy': approvedBy,
            'messages.$.metadata.approvalTimestamp': now,
            updatedAt: now
          }
        }
      );

      console.log(`[ConversationService] ${status} revision for message ${messageId}`);
    } catch (error) {
      console.error('[ConversationService] Error approving revision:', error);
      throw error;
    }
  }

  /**
   * Segna un messaggio come risposta appresa
   */
  async markAsLearnedResponse(
    conversationId: string,
    messageId: string,
    reviewedResponseId: string,
    similarityScore: number
  ): Promise<void> {
    const db = await this.connect();
    const now = new Date();

    try {
      // Prima prova con il query normale
      const result = await db.collection('conversations').updateOne(
        { 
          _id: new ObjectId(conversationId),
          'messages.id': messageId
        },
        {
          $set: {
            'messages.$.isLearnedResponse': true,
            'messages.$.reviewedResponseId': reviewedResponseId,
            'messages.$.metadata.similarityScore': similarityScore,
            'messages.$.metadata.matchedQuestionId': reviewedResponseId,
            updatedAt: now
          },
          $inc: {
            'messages.$.usageCount': 1
          }
        }
      );

      // Se non ha trovato nulla, prova con l'indice del messaggio generato
      if (result.matchedCount === 0) {
        const match = messageId.match(/^msg-(\d+)-\d+$/);
        if (match) {
          const messageIndex = parseInt(match[1]);
          await db.collection('conversations').updateOne(
            { _id: new ObjectId(conversationId) },
            {
              $set: {
                [`messages.${messageIndex}.isLearnedResponse`]: true,
                [`messages.${messageIndex}.reviewedResponseId`]: reviewedResponseId,
                [`messages.${messageIndex}.metadata.similarityScore`]: similarityScore,
                [`messages.${messageIndex}.metadata.matchedQuestionId`]: reviewedResponseId,
                [`messages.${messageIndex}.id`]: messageId,
                updatedAt: now
              },
              $inc: {
                [`messages.${messageIndex}.usageCount`]: 1
              }
            }
          );
        }
      }

      console.log(`[ConversationService] Marked message ${messageId} as learned response`);
    } catch (error) {
      console.error('[ConversationService] Error marking as learned response:', error);
      throw error;
    }
  }

  /**
   * Ottieni statistiche delle revisioni per un utente
   */
  async getRevisionStats(userId: string): Promise<{
    totalRevisions: number;
    approvedRevisions: number;
    pendingRevisions: number;
    rejectedRevisions: number;
    learnedResponses: number;
    averageRevisionTime: number;
  }> {
    const db = await this.connect();

    try {
      const pipeline = [
        { $match: { userId } },
        { $unwind: '$messages' },
        { $match: { 'messages.isRevised': true } },
        {
          $group: {
            _id: null,
            totalRevisions: { $sum: 1 },
            approvedRevisions: { 
              $sum: { $cond: [{ $eq: ['$messages.approvalStatus', 'approved'] }, 1, 0] }
            },
            pendingRevisions: { 
              $sum: { $cond: [{ $eq: ['$messages.approvalStatus', 'pending'] }, 1, 0] }
            },
            rejectedRevisions: { 
              $sum: { $cond: [{ $eq: ['$messages.approvalStatus', 'rejected'] }, 1, 0] }
            },
            learnedResponses: { 
              $sum: { $cond: [{ $eq: ['$messages.isLearnedResponse', true] }, 1, 0] }
            }
          }
        }
      ];

      const result = await db.collection('conversations').aggregate(pipeline).toArray();
      
      return result[0] || {
        totalRevisions: 0,
        approvedRevisions: 0,
        pendingRevisions: 0,
        rejectedRevisions: 0,
        learnedResponses: 0,
        averageRevisionTime: 0
      };
    } catch (error) {
      console.error('[ConversationService] Error getting revision stats:', error);
      return {
        totalRevisions: 0,
        approvedRevisions: 0,
        pendingRevisions: 0,
        rejectedRevisions: 0,
        learnedResponses: 0,
        averageRevisionTime: 0
      };
    }
  }

  /**
   * Cerca conversazioni con messaggi revisionati
   */
  async searchRevisedConversations(
    userId: string,
    options: {
      status?: 'pending' | 'approved' | 'rejected';
      revisedBy?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<ConversationSummary[]> {
    const db = await this.connect();
    const { status, revisedBy, dateFrom, dateTo, limit = 20, skip = 0 } = options;

    try {
      const matchStage: any = {
        userId,
        'messages.isRevised': true
      };

      if (status) {
        matchStage['messages.approvalStatus'] = status;
      }

      if (revisedBy) {
        matchStage['messages.revisedBy'] = revisedBy;
      }

      if (dateFrom || dateTo) {
        matchStage['messages.revisionTimestamp'] = {};
        if (dateFrom) matchStage['messages.revisionTimestamp'].$gte = dateFrom;
        if (dateTo) matchStage['messages.revisionTimestamp'].$lte = dateTo;
      }

      const pipeline = [
        { $match: matchStage },
        { 
          $project: {
            _id: 1,
            userId: 1,
            title: 1,
            'metadata.lastActivity': 1,
            'metadata.totalMessages': 1,
            'metadata.isArchived': 1,
            revisedMessages: {
              $filter: {
                input: '$messages',
                cond: { $eq: ['$$this.isRevised', true] }
              }
            }
          }
        },
        { $sort: { 'metadata.lastActivity': -1 } },
        { $skip: skip },
        { $limit: limit }
      ];

      const conversations = await db.collection('conversations').aggregate(pipeline).toArray();

      return conversations.map(conv => ({
        _id: conv._id,
        userId: conv.userId,
        title: conv.title,
        lastMessage: conv.revisedMessages[0]?.content || '',
        lastActivity: conv.metadata.lastActivity,
        messageCount: conv.metadata.totalMessages,
        isArchived: conv.metadata.isArchived || false
      }));
    } catch (error) {
      console.error('[ConversationService] Error searching revised conversations:', error);
      return [];
    }
  }
}

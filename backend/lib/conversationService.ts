import { MongoClient, Db, ObjectId } from 'mongodb';
import { connectMongoDB } from '@/backend/lib/mongodb';
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
    if (!this.client) {
      this.client = await connectMongoDB();
      this.db = this.client.db();
    }
    return this.db;
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
}

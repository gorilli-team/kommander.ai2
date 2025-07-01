import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

export interface AnalyticsEvent {
  userId: string;
  type: 'conversation_started' | 'message_sent' | 'response_generated' | 'source_used' | 'error_occurred' | 'conversation_rated';
  timestamp: Date;
  metadata: {
    conversationId?: string;
    messageId?: string;
    responseTime?: number;
    sourceType?: 'faq' | 'document';
    sourceId?: string;
    errorType?: string;
    rating?: number;
    messageLength?: number;
    tokensUsed?: number;
    model?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

export interface AnalyticsSummary {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  avgResponseTime: number;
  avgRating: number;
  faqSources: number;
  documentSources: number;
  activeUsers: number;
  successRate: number;
  errorRate: number;
  topTopics: Array<{ topic: string; count: number; trend: 'up' | 'down' | 'stable' }>;
  responseTimeDistribution: {
    fast: number; // <2s
    medium: number; // 2-5s
    slow: number; // >5s
  };
  hourlyDistribution: Array<{ hour: number; count: number }>;
  dailyDistribution: Array<{ date: string; count: number }>;
}

export class AnalyticsService {
  private db: any;

  constructor() {
    this.initializeDb();
  }

  private async initializeDb() {
    const { db } = await connectToDatabase();
    this.db = db;
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.db) await this.initializeDb();
    
    try {
      await this.db.collection('analytics_events').insertOne({
        ...event,
        _id: new ObjectId(),
        timestamp: new Date(event.timestamp)
      });
    } catch (error) {
      console.error('Failed to track analytics event:', error);
      // Don't throw - analytics shouldn't break the main flow
    }
  }

  async getAnalyticsSummary(userId: string, timeframe: 'day' | 'week' | 'month' = 'week'): Promise<AnalyticsSummary> {
    if (!this.db) await this.initializeDb();

    const endDate = new Date();
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

    const [
      conversationStats,
      messageStats,
      responseTimeStats,
      sourceStats,
      ratingStats,
      errorStats,
      topicStats,
      hourlyStats,
      dailyStats
    ] = await Promise.all([
      this.getConversationStats(userId, startDate, endDate),
      this.getMessageStats(userId, startDate, endDate),
      this.getResponseTimeStats(userId, startDate, endDate),
      this.getSourceStats(userId, startDate, endDate),
      this.getRatingStats(userId, startDate, endDate),
      this.getErrorStats(userId, startDate, endDate),
      this.getTopicStats(userId, startDate, endDate),
      this.getHourlyDistribution(userId, startDate, endDate),
      this.getDailyDistribution(userId, startDate, endDate)
    ]);

    return {
      totalConversations: conversationStats.total,
      totalMessages: messageStats.total,
      avgMessagesPerConversation: conversationStats.total > 0 ? messageStats.total / conversationStats.total : 0,
      avgResponseTime: responseTimeStats.average,
      avgRating: ratingStats.average,
      faqSources: sourceStats.faq,
      documentSources: sourceStats.document,
      activeUsers: conversationStats.uniqueUsers,
      successRate: messageStats.total > 0 ? ((messageStats.total - errorStats.total) / messageStats.total) * 100 : 100,
      errorRate: messageStats.total > 0 ? (errorStats.total / messageStats.total) * 100 : 0,
      topTopics: topicStats,
      responseTimeDistribution: responseTimeStats.distribution,
      hourlyDistribution: hourlyStats,
      dailyDistribution: dailyStats
    };
  }

  private async getConversationStats(userId: string, startDate: Date, endDate: Date) {
    const pipeline = [
      {
        $match: {
          userId,
          type: 'conversation_started',
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      }
    ];

    const result = await this.db.collection('analytics_events').aggregate(pipeline).toArray();
    const stats = result[0];
    
    return {
      total: stats?.total || 0,
      uniqueUsers: stats?.uniqueUsers?.length || 0
    };
  }

  private async getMessageStats(userId: string, startDate: Date, endDate: Date) {
    const pipeline = [
      {
        $match: {
          userId,
          type: { $in: ['message_sent', 'response_generated'] },
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 }
        }
      }
    ];

    const result = await this.db.collection('analytics_events').aggregate(pipeline).toArray();
    return { total: result[0]?.total || 0 };
  }

  private async getResponseTimeStats(userId: string, startDate: Date, endDate: Date) {
    const pipeline = [
      {
        $match: {
          userId,
          type: 'response_generated',
          timestamp: { $gte: startDate, $lte: endDate },
          'metadata.responseTime': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$metadata.responseTime' },
          fast: {
            $sum: {
              $cond: [{ $lt: ['$metadata.responseTime', 2000] }, 1, 0]
            }
          },
          medium: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$metadata.responseTime', 2000] },
                    { $lt: ['$metadata.responseTime', 5000] }
                  ]
                },
                1,
                0
              ]
            }
          },
          slow: {
            $sum: {
              $cond: [{ $gte: ['$metadata.responseTime', 5000] }, 1, 0]
            }
          }
        }
      }
    ];

    const result = await this.db.collection('analytics_events').aggregate(pipeline).toArray();
    const stats = result[0];
    
    return {
      average: stats ? Math.round(stats.avgTime / 1000 * 100) / 100 : 0, // Convert to seconds
      distribution: {
        fast: stats?.fast || 0,
        medium: stats?.medium || 0,
        slow: stats?.slow || 0
      }
    };
  }

  private async getSourceStats(userId: string, startDate: Date, endDate: Date) {
    const pipeline = [
      {
        $match: {
          userId,
          type: 'source_used',
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$metadata.sourceType',
          count: { $sum: 1 }
        }
      }
    ];

    const result = await this.db.collection('analytics_events').aggregate(pipeline).toArray();
    const stats = result.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as any);
    
    return {
      faq: stats.faq || 0,
      document: stats.document || 0
    };
  }

  private async getRatingStats(userId: string, startDate: Date, endDate: Date) {
    const pipeline = [
      {
        $match: {
          userId,
          type: 'conversation_rated',
          timestamp: { $gte: startDate, $lte: endDate },
          'metadata.rating': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$metadata.rating' },
          count: { $sum: 1 }
        }
      }
    ];

    const result = await this.db.collection('analytics_events').aggregate(pipeline).toArray();
    const stats = result[0];
    
    return {
      average: stats ? Math.round(stats.avgRating * 100) / 100 : 4.2,
      count: stats?.count || 0
    };
  }

  private async getErrorStats(userId: string, startDate: Date, endDate: Date) {
    const pipeline = [
      {
        $match: {
          userId,
          type: 'error_occurred',
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 }
        }
      }
    ];

    const result = await this.db.collection('analytics_events').aggregate(pipeline).toArray();
    return { total: result[0]?.total || 0 };
  }

  private async getTopicStats(userId: string, startDate: Date, endDate: Date) {
    // This would ideally use NLP to extract topics from conversations
    // For now, we'll extract from FAQ usage and common terms
    const pipeline = [
      {
        $match: {
          userId,
          type: 'source_used',
          timestamp: { $gte: startDate, $lte: endDate },
          'metadata.sourceType': 'faq'
        }
      },
      {
        $lookup: {
          from: 'faqs',
          localField: 'metadata.sourceId',
          foreignField: '_id',
          as: 'faq'
        }
      },
      {
        $unwind: '$faq'
      },
      {
        $group: {
          _id: '$faq.question',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ];

    const result = await this.db.collection('analytics_events').aggregate(pipeline).toArray();
    return result.map(item => ({
      topic: item._id.split(' ').slice(0, 3).join(' '), // First 3 words as topic
      count: item.count,
      trend: 'stable' as const // Would need historical comparison for real trends
    }));
  }

  private async getHourlyDistribution(userId: string, startDate: Date, endDate: Date) {
    const pipeline = [
      {
        $match: {
          userId,
          type: 'message_sent',
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ];

    const result = await this.db.collection('analytics_events').aggregate(pipeline).toArray();
    
    // Fill in missing hours with 0
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const found = result.find(item => item._id === hour);
      return {
        hour,
        count: found?.count || 0
      };
    });

    return hourlyData;
  }

  private async getDailyDistribution(userId: string, startDate: Date, endDate: Date) {
    const pipeline = [
      {
        $match: {
          userId,
          type: 'message_sent',
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$timestamp'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ];

    const result = await this.db.collection('analytics_events').aggregate(pipeline).toArray();
    return result.map(item => ({
      date: item._id,
      count: item.count
    }));
  }

  // Utility method to track conversation events easily
  async trackConversationStarted(userId: string, conversationId: string, userAgent?: string, ipAddress?: string): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'conversation_started',
      timestamp: new Date(),
      metadata: {
        conversationId,
        userAgent,
        ipAddress
      }
    });
  }

  async trackMessageSent(userId: string, conversationId: string, messageId: string, messageLength: number): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'message_sent',
      timestamp: new Date(),
      metadata: {
        conversationId,
        messageId,
        messageLength
      }
    });
  }

  async trackResponseGenerated(
    userId: string, 
    conversationId: string, 
    messageId: string, 
    responseTime: number, 
    tokensUsed?: number, 
    model?: string
  ): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'response_generated',
      timestamp: new Date(),
      metadata: {
        conversationId,
        messageId,
        responseTime,
        tokensUsed,
        model
      }
    });
  }

  async trackSourceUsed(userId: string, conversationId: string, sourceType: 'faq' | 'document', sourceId: string): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'source_used',
      timestamp: new Date(),
      metadata: {
        conversationId,
        sourceType,
        sourceId
      }
    });
  }

  async trackError(userId: string, conversationId: string, errorType: string): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'error_occurred',
      timestamp: new Date(),
      metadata: {
        conversationId,
        errorType
      }
    });
  }

  async trackConversationRated(userId: string, conversationId: string, rating: number): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'conversation_rated',
      timestamp: new Date(),
      metadata: {
        conversationId,
        rating
      }
    });
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();

import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

export interface AnalyticsEvent {
  userId: string;
  type: 'conversation_started' | 'message_sent' | 'response_generated' | 'source_used' | 'error_occurred' | 'conversation_rated' | 'widget_opened' | 'widget_closed' | 'settings_changed' | 'template_applied' | 'lead_generated' | 'conversion' | 'feedback_submitted' | 'user_registered' | 'api_call' | 'quota_exceeded';
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
    page?: string;
    referrer?: string;
    sessionId?: string;
    templateId?: string;
    settingsChanged?: string[];
    leadScore?: number;
    conversionValue?: number;
    feedbackText?: string;
    apiEndpoint?: string;
    quotaType?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    browser?: string;
    country?: string;
    language?: string;
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
  // New metrics
  conversionRate: number;
  leadsGenerated: number;
  templatesUsed: number;
  customerSatisfactionScore: number;
  uptime: number;
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  topPages: Array<{ page: string; views: number; avgTime: number }>;
  userRetention: { daily: number; weekly: number; monthly: number };
  peakUsageHours: Array<{ hour: number; activity: number }>;
  errorBreakdown: Array<{ type: string; count: number; trend: 'up' | 'down' | 'stable' }>;
  geographicDistribution: Array<{ country: string; users: number; percentage: number }>;
  languageDistribution: Array<{ language: string; users: number; percentage: number }>;
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
      dailyDistribution: dailyStats,
      // Fill optional advanced fields with defaults
      conversionRate: 0,
      leadsGenerated: 0,
      templatesUsed: 0,
      customerSatisfactionScore: 0,
      uptime: 100,
      deviceBreakdown: { mobile: 0, desktop: 100, tablet: 0 },
      topPages: [],
      userRetention: { daily: 0, weekly: 0, monthly: 0 },
      peakUsageHours: [],
      errorBreakdown: [],
      geographicDistribution: [],
      languageDistribution: []
    };
  }

  async getDashboardData(startDate: Date, endDate: Date, userId: string): Promise<any> {
    if (!this.db) await this.initializeDb();

    const [summary, hourly, daily] = await Promise.all([
      this.getAnalyticsSummary(userId, 'week'),
      this.getHourlyDistribution(userId, startDate, endDate),
      this.getDailyDistribution(userId, startDate, endDate)
    ]);

    const overview = {
      totalUsers: summary.activeUsers || 0,
      totalConversations: summary.totalConversations,
      totalMessages: summary.totalMessages,
      averageResponseTime: summary.avgResponseTime,
    };

    const charts = {
      conversationsOverTime: daily.map((d: any) => ({ date: d.date, count: d.count })),
      messagesOverTime: daily.map((d: any) => ({ date: d.date, count: Math.round(d.count * 1.5) })),
      responseTimeOverTime: daily.map((d: any) => ({ date: d.date, averageTime: Math.round(summary.avgResponseTime * 1000) })),
      topPages: summary.topPages || [],
      userEngagement: hourly.map((h: any) => ({ hour: h.hour, interactions: h.count })),
    };

    const insights = {
      peakHours: (summary.peakUsageHours || []).map((h: any) => ({ hour: h.hour, activity: h.activity })),
      popularTemplates: (summary.topTopics || []).slice(0, 5).map((t: any, i: number) => ({ templateId: `tpl-${i + 1}`, usageCount: t.count })),
      commonErrors: (summary.errorBreakdown || []).map((e: any) => ({ error: e.type, count: e.count })),
      userJourney: [
        { step: 'Widget Opened', completionRate: 1 },
        { step: 'Conversation Started', completionRate: 0.7 },
        { step: 'Messages Sent', completionRate: 0.5 },
      ],
    };

    return { overview, charts, insights };
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
    const stats: any = result[0];
    
    return {
      average: stats ? Math.round((stats.avgTime as number) / 1000 * 100) / 100 : 0, // Convert to seconds
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
    const stats = result.reduce((acc: any, item: any) => {
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
    const stats: any = result[0];
    
    return {
      average: stats ? Math.round((stats.avgRating as number) * 100) / 100 : 4.2,
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
    return result.map((item: any) => ({
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
    const hourlyData = Array.from({ length: 24 }, (_: any, hour: number) => {
      const found: any = result.find((item: any) => item._id === hour);
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
    return result.map((item: any) => ({
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

  // New tracking methods
  async trackWidgetOpened(userId: string, sessionId: string, page: string, userAgent?: string): Promise<void> {
    const deviceInfo = this.parseUserAgent(userAgent);
    await this.trackEvent({
      userId,
      type: 'widget_opened',
      timestamp: new Date(),
      metadata: {
        sessionId,
        page,
        userAgent,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser
      }
    });
  }

  async trackWidgetClosed(userId: string, sessionId: string, duration: number): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'widget_closed',
      timestamp: new Date(),
      metadata: {
        sessionId,
        responseTime: duration
      }
    });
  }

  async trackTemplateApplied(userId: string, templateId: string, sessionId?: string): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'template_applied',
      timestamp: new Date(),
      metadata: {
        templateId,
        sessionId
      }
    });
  }

  async trackSettingsChanged(userId: string, settingsChanged: string[], sessionId?: string): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'settings_changed',
      timestamp: new Date(),
      metadata: {
        settingsChanged,
        sessionId
      }
    });
  }

  async trackLeadGenerated(userId: string, conversationId: string, leadScore: number, sessionId?: string): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'lead_generated',
      timestamp: new Date(),
      metadata: {
        conversationId,
        leadScore,
        sessionId
      }
    });
  }

  async trackConversion(userId: string, conversationId: string, conversionValue: number, sessionId?: string): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'conversion',
      timestamp: new Date(),
      metadata: {
        conversationId,
        conversionValue,
        sessionId
      }
    });
  }

  async trackFeedbackSubmitted(userId: string, conversationId: string, rating: number, feedbackText?: string): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'feedback_submitted',
      timestamp: new Date(),
      metadata: {
        conversationId,
        rating,
        feedbackText
      }
    });
  }

  async trackAPICall(userId: string, apiEndpoint: string, responseTime: number, success: boolean): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'api_call',
      timestamp: new Date(),
      metadata: {
        apiEndpoint,
        responseTime,
        errorType: success ? undefined : 'api_error'
      }
    });
  }

  async trackQuotaExceeded(userId: string, quotaType: string): Promise<void> {
    await this.trackEvent({
      userId,
      type: 'quota_exceeded',
      timestamp: new Date(),
      metadata: {
        quotaType
      }
    });
  }

  // Utility method for parsing user agent
  private parseUserAgent(userAgent?: string) {
    if (!userAgent) return { deviceType: 'desktop' as const, browser: 'unknown' };
    
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent);
    
    let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';
    
    let browser = 'unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    return { deviceType, browser };
  }

  // Advanced analytics methods
  async getConversionFunnel(userId: string, startDate: Date, endDate: Date) {
    const pipeline = [
      {
        $match: {
          userId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ];

    const result = await this.db.collection('analytics_events').aggregate(pipeline).toArray();
    const stats = result.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as any);

    const widgetOpened = stats.widget_opened || 0;
    const conversationStarted = stats.conversation_started || 0;
    const messagesSent = stats.message_sent || 0;
    const leadsGenerated = stats.lead_generated || 0;
    const conversions = stats.conversion || 0;

    return {
      steps: [
        { name: 'Widget Opened', count: widgetOpened, percentage: 100 },
        { name: 'Conversation Started', count: conversationStarted, percentage: widgetOpened ? (conversationStarted / widgetOpened) * 100 : 0 },
        { name: 'Messages Sent', count: messagesSent, percentage: widgetOpened ? (messagesSent / widgetOpened) * 100 : 0 },
        { name: 'Leads Generated', count: leadsGenerated, percentage: widgetOpened ? (leadsGenerated / widgetOpened) * 100 : 0 },
        { name: 'Conversions', count: conversions, percentage: widgetOpened ? (conversions / widgetOpened) * 100 : 0 }
      ],
      conversionRate: widgetOpened ? (conversions / widgetOpened) * 100 : 0
    };
  }

  async getUserSegments(userId: string, startDate: Date, endDate: Date) {
    // Segmenta utenti basato su comportamento
    const pipeline = [
      {
        $match: {
          userId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            sessionId: '$metadata.sessionId',
            deviceType: '$metadata.deviceType'
          },
          events: { $sum: 1 },
          types: { $addToSet: '$type' },
          firstEvent: { $min: '$timestamp' },
          lastEvent: { $max: '$timestamp' }
        }
      },
      {
        $addFields: {
          sessionDuration: {
            $divide: [
              { $subtract: ['$lastEvent', '$firstEvent'] },
              1000 * 60 // Convert to minutes
            ]
          },
          engagement: {
            $cond: [
              { $gte: ['$events', 10] },
              'high',
              {
                $cond: [
                  { $gte: ['$events', 5] },
                  'medium',
                  'low'
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            deviceType: '$_id.deviceType',
            engagement: '$engagement'
          },
          count: { $sum: 1 },
          avgDuration: { $avg: '$sessionDuration' },
          avgEvents: { $avg: '$events' }
        }
      }
    ];

    const result = await this.db.collection('analytics_events').aggregate(pipeline).toArray();
    return result.map((item: any) => ({
      deviceType: item._id.deviceType || 'unknown',
      engagement: item._id.engagement,
      userCount: item.count,
      averageDuration: Math.round(item.avgDuration * 100) / 100,
      averageEvents: Math.round(item.avgEvents * 100) / 100
    }));
  }

  async getRealTimeMetrics(userId: string) {
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    const last1Hour = new Date(Date.now() - 60 * 60 * 1000);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [currentlyActive, hourlyActivity, dailyTrend] = await Promise.all([
      this.getActiveUsers(userId, last5Minutes),
      this.getActivityCount(userId, last1Hour),
      this.getActivityCount(userId, last24Hours)
    ]);

    return {
      activeNow: currentlyActive,
      hourlyActivity,
      dailyActivity: dailyTrend,
      timestamp: new Date()
    };
  }

  private async getActiveUsers(userId: string, since: Date) {
    const result = await this.db.collection('analytics_events').distinct('metadata.sessionId', {
      userId,
      timestamp: { $gte: since }
    });
    return result.length;
  }

  private async getActivityCount(userId: string, since: Date) {
    const result = await this.db.collection('analytics_events').countDocuments({
      userId,
      timestamp: { $gte: since }
    });
    return result;
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();

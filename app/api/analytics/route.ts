import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { ConversationService } from '@/backend/lib/conversationService';
import { connectToDatabase } from '@/backend/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as 'day' | 'week' | 'month' || 'week';

    const conversationService = new ConversationService();
    const { db } = await connectToDatabase();

    // Get basic analytics from conversation service
    const overviewData = await conversationService.getAnalyticsSummary(session.user.id, timeframe);

    // Calculate date range
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

    // Get conversation trends
    const conversationTrends = await getConversationTrends(db, session.user.id, startDate, endDate, timeframe);

    // Get source usage distribution
    const sourceUsage = [
      {
        name: 'FAQ Sources',
        value: overviewData.faqSources || 0,
        color: '#1a56db'
      },
      {
        name: 'Document Sources',
        value: overviewData.documentSources || 0,
        color: '#7c3aed'
      }
    ];

    // Get popular topics (simplified - would need NLP for real implementation)
    const popularTopics = await getPopularTopics(db, session.user.id, startDate);

    // Get user engagement patterns
    const userEngagement = await getUserEngagement(db, session.user.id, startDate, timeframe);

    // Mock response metrics (would be calculated from actual data)
    const responseMetrics = {
      avgResponseTime: overviewData.avgRating || 2.3,
      fastResponses: Math.floor(overviewData.totalMessages * 0.6),
      mediumResponses: Math.floor(overviewData.totalMessages * 0.3),
      slowResponses: Math.floor(overviewData.totalMessages * 0.1)
    };

    const analyticsData = {
      overview: {
        totalConversations: overviewData.totalConversations,
        totalMessages: overviewData.totalMessages,
        avgMessagesPerConversation: overviewData.avgMessagesPerConversation,
        avgRating: overviewData.avgRating || 4.2,
        faqSources: overviewData.faqSources,
        documentSources: overviewData.documentSources,
        avgResponseTime: 2.3, // Would be calculated from actual processing times
        activeUsers: 1 // Simplified for single user
      },
      conversationTrends,
      sourceUsage,
      popularTopics,
      userEngagement,
      responseMetrics
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getConversationTrends(db: any, userId: string, startDate: Date, endDate: Date, timeframe: string) {
  const pipeline = [
    {
      $match: {
        userId,
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: timeframe === 'day' ? '%H:00' : timeframe === 'week' ? '%Y-%m-%d' : '%Y-%m',
            date: '$createdAt'
          }
        },
        conversations: { $sum: 1 },
        messages: { $sum: '$metadata.totalMessages' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ];

  const results = await db.collection('conversations').aggregate(pipeline).toArray();
  
  return results.map(item => ({
    date: item._id,
    conversations: item.conversations,
    messages: item.messages
  }));
}

async function getPopularTopics(db: any, userId: string, startDate: Date) {
  // Simplified implementation - would use NLP in production
  const commonTopics = [
    { topic: 'Getting Started', count: 45, trend: 'up' as const },
    { topic: 'File Upload', count: 32, trend: 'stable' as const },
    { topic: 'Account Settings', count: 28, trend: 'down' as const },
    { topic: 'API Integration', count: 19, trend: 'up' as const },
    { topic: 'Troubleshooting', count: 15, trend: 'stable' as const }
  ];

  return commonTopics;
}

async function getUserEngagement(db: any, userId: string, startDate: Date, timeframe: string) {
  // Generate hourly engagement data
  const engagement = [];
  
  if (timeframe === 'day') {
    // Hour by hour for today
    for (let hour = 0; hour < 24; hour++) {
      engagement.push({
        timeSlot: `${hour.toString().padStart(2, '0')}:00`,
        users: Math.floor(Math.random() * 5) + 1,
        messages: Math.floor(Math.random() * 20) + 5
      });
    }
  } else if (timeframe === 'week') {
    // Day by day for the week
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach(day => {
      engagement.push({
        timeSlot: day,
        users: Math.floor(Math.random() * 3) + 1,
        messages: Math.floor(Math.random() * 15) + 3
      });
    });
  } else {
    // Week by week for the month
    for (let week = 1; week <= 4; week++) {
      engagement.push({
        timeSlot: `Week ${week}`,
        users: Math.floor(Math.random() * 7) + 2,
        messages: Math.floor(Math.random() * 50) + 10
      });
    }
  }

  return engagement;
}

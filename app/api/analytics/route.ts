import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { ConversationService } from '@/backend/lib/conversationService';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { analyticsService } from '@/backend/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as 'day' | 'week' | 'month' || 'week';

    // Get real analytics data
    const analyticsData = await analyticsService.getAnalyticsSummary(session.user.id, timeframe);

    // Transform data for frontend compatibility
    const response = {
      overview: {
        totalConversations: analyticsData.totalConversations,
        totalMessages: analyticsData.totalMessages,
        avgMessagesPerConversation: analyticsData.avgMessagesPerConversation,
        avgRating: analyticsData.avgRating,
        faqSources: analyticsData.faqSources,
        documentSources: analyticsData.documentSources,
        avgResponseTime: analyticsData.avgResponseTime,
        activeUsers: analyticsData.activeUsers
      },
      conversationTrends: analyticsData.dailyDistribution.map(item => ({
        date: item.date,
        conversations: Math.ceil(item.count / 2), // Approximate conversations from messages
        messages: item.count
      })),
      sourceUsage: [
        {
          name: 'FAQ Sources',
          value: analyticsData.faqSources,
          color: '#1a56db'
        },
        {
          name: 'Document Sources', 
          value: analyticsData.documentSources,
          color: '#7c3aed'
        },
        {
          name: 'Direct Responses',
          value: Math.max(0, analyticsData.totalMessages - analyticsData.faqSources - analyticsData.documentSources),
          color: '#059669'
        }
      ],
      popularTopics: analyticsData.topTopics,
      userEngagement: analyticsData.hourlyDistribution.map(item => ({
        timeSlot: `${item.hour.toString().padStart(2, '0')}:00`,
        users: 1, // Single user for now
        messages: item.count
      })),
      responseMetrics: {
        avgResponseTime: analyticsData.avgResponseTime,
        fastResponses: analyticsData.responseTimeDistribution.fast,
        mediumResponses: analyticsData.responseTimeDistribution.medium,
        slowResponses: analyticsData.responseTimeDistribution.slow
      }
    };

    return NextResponse.json(response);
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
  
  return results.map((item: any) => ({
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

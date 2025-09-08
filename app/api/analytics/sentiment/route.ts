import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { sentimentAnalysisService } from '@/backend/lib/sentimentAnalysis';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'week';
    const limit = parseInt(searchParams.get('limit') || '100');

    const { db } = await connectToDatabase();
    
    // Fetch recent conversations
    const conversations = await db
      .collection('conversations')
      .find({ 
        userId: session.user.id,
        createdAt: {
          $gte: new Date(Date.now() - getTimeframeMs(timeframe))
        }
      })
      .limit(limit)
      .toArray();

    // Analyze conversations
    const conversationAnalyses = await sentimentAnalysisService.batchAnalyzeConversations(
      conversations.map(conv => ({
        id: conv._id.toString(),
        userId: conv.userId,
        messages: conv.messages || []
      }))
    );

    // Generate insights
    const sentimentTrends = sentimentAnalysisService.generateSentimentTrends(
      conversationAnalyses,
      timeframe as 'day' | 'week' | 'month'
    );

    // Calculate aggregate metrics
    const totalConversations = conversationAnalyses.length;
    const sentimentDistribution = {
      positive: conversationAnalyses.filter(a => a.sentiment.label === 'positive').length,
      neutral: conversationAnalyses.filter(a => a.sentiment.label === 'neutral').length,
      negative: conversationAnalyses.filter(a => a.sentiment.label === 'negative').length,
    };

    const averageSatisfaction = conversationAnalyses.length > 0
      ? conversationAnalyses.reduce((sum, a) => sum + (a.satisfactionScore || 0), 0) / conversationAnalyses.length
      : 0;

    // Top topics
    const topicCounts = new Map<string, number>();
    conversationAnalyses.forEach(analysis => {
      analysis.topics.forEach(topic => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });

    const topTopics = Array.from(topicCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    // Category distribution
    const categoryCountsMap = new Map<string, number>();
    conversationAnalyses.forEach(analysis => {
      analysis.categories.forEach(category => {
        categoryCountsMap.set(category, (categoryCountsMap.get(category) || 0) + 1);
      });
    });

    const categoryDistribution = Array.from(categoryCountsMap.entries())
      .map(([category, count]) => ({ category, count, percentage: (count / totalConversations) * 100 }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      overview: {
        totalConversations,
        averageSatisfaction: Math.round(averageSatisfaction),
        sentimentDistribution,
        averageResponseTime: conversationAnalyses.length > 0
          ? conversationAnalyses.reduce((sum, a) => sum + a.averageResponseTime, 0) / conversationAnalyses.length
          : 0
      },
      sentimentTrends,
      topTopics,
      categoryDistribution,
      recentAnalyses: conversationAnalyses.slice(0, 10).map(analysis => ({
        id: analysis.id,
        sentiment: analysis.sentiment,
        topics: analysis.topics,
        categories: analysis.categories,
        satisfactionScore: analysis.satisfactionScore
      }))
    });

  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze sentiment' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Fetch specific conversation
    const conversation = await db
      .collection('conversations')
      .findOne({ 
        _id: new ObjectId(conversationId),
        userId: session.user.id 
      });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Analyze specific conversation
    const analysis = await sentimentAnalysisService.analyzeFullConversation(
      conversation._id.toString(),
      conversation.userId,
      conversation.messages || []
    );

    // Store analysis result
    await db.collection('conversation_analyses').updateOne(
      { conversationId: conversation._id },
      { 
        $set: {
          ...analysis,
          analyzedAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error analyzing specific conversation:', error);
    return NextResponse.json(
      { error: 'Failed to analyze conversation' },
      { status: 500 }
    );
  }
}

function getTimeframeMs(timeframe: string): number {
  switch (timeframe) {
    case 'day':
      return 24 * 60 * 60 * 1000;
    case 'week':
      return 7 * 24 * 60 * 60 * 1000;
    case 'month':
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

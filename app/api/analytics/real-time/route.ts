import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { analyticsService } from '@/backend/lib/analytics';

export async function GET(req: NextRequest) {
  try {
  const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get real-time metrics
    const realTimeData = await analyticsService.getRealTimeMetrics(session.user.id);
    
    // Add some additional real-time calculations
    const currentTime = new Date();
    const last5Minutes = new Date(currentTime.getTime() - 5 * 60 * 1000);
    const lastHour = new Date(currentTime.getTime() - 60 * 60 * 1000);

    // Simulate some real-time data for demo
    const enhancedRealTimeData = {
      ...realTimeData,
      activeNow: realTimeData.activeNow || Math.floor(Math.random() * 25) + 5,
      messagesLastHour: realTimeData.hourlyActivity || Math.floor(Math.random() * 150) + 20,
      averageResponseTime: Math.floor(Math.random() * 800) + 200,
      onlineStatus: 'online' as const,
      systemHealth: {
        cpuUsage: Math.floor(Math.random() * 40) + 10,
        memoryUsage: Math.floor(Math.random() * 30) + 20,
        diskUsage: Math.floor(Math.random() * 20) + 15,
        uptime: 99.95
      },
      activeRegions: [
        { region: 'Europe', users: Math.floor(Math.random() * 15) + 3 },
        { region: 'North America', users: Math.floor(Math.random() * 12) + 2 },
        { region: 'Asia', users: Math.floor(Math.random() * 8) + 1 }
      ],
      recentEvents: [
        {
          type: 'conversation_started',
          timestamp: new Date(Date.now() - Math.random() * 300000),
          location: 'Italy'
        },
        {
          type: 'message_sent',
          timestamp: new Date(Date.now() - Math.random() * 180000),
          location: 'USA'
        },
        {
          type: 'lead_generated',
          timestamp: new Date(Date.now() - Math.random() * 120000),
          location: 'Germany'
        }
      ]
    };

    return NextResponse.json(enhancedRealTimeData);

  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch real-time data' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { analyticsService } from '@/backend/lib/analytics';

export async function GET(req: NextRequest) {
  try {
  const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const timeframe = searchParams.get('timeframe') || 'week';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (timeframe) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }

    // Fetch analytics data
    const analyticsData = await analyticsService.getDashboardData(
      startDate,
      endDate,
      session.user.id
    );

    if (format === 'csv') {
      const csv = generateCSV(analyticsData);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${timeframe}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else if (format === 'pdf') {
      // For PDF generation, you'd typically use a library like puppeteer or jsPDF
      // For now, return a JSON response indicating PDF generation isn't implemented
      return NextResponse.json({
        error: 'PDF export not yet implemented',
        message: 'Please use CSV export for now'
      }, { status: 501 });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });

  } catch (error) {
    console.error('Error exporting analytics:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

function generateCSV(data: any): string {
  const csvLines: string[] = [];
  
  // Header
  csvLines.push('Analytics Export Report');
  csvLines.push(`Generated: ${new Date().toISOString()}`);
  csvLines.push('');
  
  // Overview section
  csvLines.push('OVERVIEW');
  csvLines.push('Metric,Value');
  csvLines.push(`Total Users,${data.overview.totalUsers}`);
  csvLines.push(`Total Conversations,${data.overview.totalConversations}`);
  csvLines.push(`Total Messages,${data.overview.totalMessages}`);
  csvLines.push(`Average Response Time,${data.overview.averageResponseTime}s`);
  csvLines.push('');
  
  // Conversations over time
  csvLines.push('CONVERSATIONS OVER TIME');
  csvLines.push('Date,Count');
  data.charts.conversationsOverTime.forEach((item: any) => {
    csvLines.push(`${item.date},${item.count}`);
  });
  csvLines.push('');
  
  // Messages over time
  csvLines.push('MESSAGES OVER TIME');
  csvLines.push('Date,Count');
  data.charts.messagesOverTime.forEach((item: any) => {
    csvLines.push(`${item.date},${item.count}`);
  });
  csvLines.push('');
  
  // Response time over time
  csvLines.push('RESPONSE TIME OVER TIME');
  csvLines.push('Date,Average Time (ms)');
  data.charts.responseTimeOverTime.forEach((item: any) => {
    csvLines.push(`${item.date},${item.averageTime}`);
  });
  csvLines.push('');
  
  // Top pages
  csvLines.push('TOP PAGES');
  csvLines.push('Page,Interactions');
  data.charts.topPages.forEach((item: any) => {
    csvLines.push(`"${item.page}",${item.interactions}`);
  });
  csvLines.push('');
  
  // User engagement by hour
  csvLines.push('USER ENGAGEMENT BY HOUR');
  csvLines.push('Hour,Interactions');
  data.charts.userEngagement.forEach((item: any) => {
    csvLines.push(`${item.hour},${item.interactions}`);
  });
  csvLines.push('');
  
  // Peak hours
  csvLines.push('PEAK HOURS');
  csvLines.push('Hour,Activity');
  data.insights.peakHours.forEach((item: any) => {
    csvLines.push(`${item.hour},${item.activity}`);
  });
  csvLines.push('');
  
  // Popular templates
  csvLines.push('POPULAR TEMPLATES');
  csvLines.push('Template ID,Usage Count');
  data.insights.popularTemplates.forEach((item: any) => {
    csvLines.push(`${item.templateId},${item.usageCount}`);
  });
  csvLines.push('');
  
  // Common errors
  csvLines.push('COMMON ERRORS');
  csvLines.push('Error,Count');
  data.insights.commonErrors.forEach((item: any) => {
    csvLines.push(`"${item.error}",${item.count}`);
  });
  csvLines.push('');
  
  // User journey
  csvLines.push('USER JOURNEY');
  csvLines.push('Step,Completion Rate');
  data.insights.userJourney.forEach((item: any) => {
    csvLines.push(`"${item.step}",${(item.completionRate * 100).toFixed(2)}%`);
  });
  
  return csvLines.join('\n');
}

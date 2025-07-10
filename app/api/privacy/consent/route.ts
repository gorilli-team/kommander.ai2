import { NextRequest, NextResponse } from 'next/server';
import { gdprService } from '@/backend/lib/gdpr';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    
    const { userId, preferences, timestamp } = body;
    
    // Validate user
    if (!session?.user?.id || session.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user IP and user agent for audit
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Record consent for each cookie type
    const consentTypes = ['necessary', 'analytics', 'marketing', 'functional'];
    
    for (const type of consentTypes) {
      if (preferences[type] !== undefined) {
        await gdprService.recordConsent({
          userId,
          consentType: `cookie_${type}`,
          granted: preferences[type],
          timestamp: new Date(timestamp),
          version: '1.0',
          ipAddress,
          userAgent
        });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cookie consent recorded successfully' 
    });
    
  } catch (error) {
    console.error('Error recording cookie consent:', error);
    return NextResponse.json(
      { error: 'Failed to record consent' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user's current consent status
    const consents = await gdprService.getUserConsent(session.user.id);
    
    // Format consents into preferences object
    const preferences = {
      necessary: true, // Always true
      analytics: false,
      marketing: false,
      functional: false
    };
    
    // Get latest consent for each type
    const latestConsents = consents.reduce((acc, consent) => {
      const type = consent.consentType.replace('cookie_', '');
      if (!acc[type] || new Date(consent.timestamp) > new Date(acc[type].timestamp)) {
        acc[type] = consent;
      }
      return acc;
    }, {} as any);
    
    // Update preferences with latest consents
    Object.keys(latestConsents).forEach(type => {
      if (type in preferences) {
        preferences[type as keyof typeof preferences] = latestConsents[type].granted;
      }
    });
    
    return NextResponse.json({ 
      preferences,
      consents: consents.slice(0, 10) // Return last 10 consent records
    });
    
  } catch (error) {
    console.error('Error fetching cookie consent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consent' },
      { status: 500 }
    );
  }
}

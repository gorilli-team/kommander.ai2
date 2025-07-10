import { NextRequest, NextResponse } from 'next/server';
import { organizationService } from '@/backend/lib/organizationService';
import { withRateLimit } from '@/backend/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // Rate limiting
    const { allowed } = await withRateLimit(request, { windowMs: 60000, maxRequests: 100 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const token = params.token;
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const invitation = await organizationService.getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json({ 
        error: 'Invitation not found or has expired' 
      }, { status: 404 });
    }

    return NextResponse.json(invitation);
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}

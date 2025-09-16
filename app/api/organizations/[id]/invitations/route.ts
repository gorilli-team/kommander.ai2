import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { organizationService } from '@/backend/lib/organizationService';
import { withRateLimit, withAuditLog } from '@/backend/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = params.id;

// Check if user has permission to view invitations (must be able to invite users)
    const hasPermission = await organizationService.hasPermission(
      session.user.id,
      organizationId,
      'invite_users'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limiting
    const { allowed } = await withRateLimit(request, { windowMs: 60000, maxRequests: 100 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status') || 'pending';

    let invitations = await organizationService.getOrganizationInvitations(organizationId);
    if (statusFilter) {
      invitations = invitations.filter((inv: any) => inv.status === statusFilter);
    }

    await withAuditLog(
      request,
      'read',
      'organization_invitations',
      session.user.id,
      true,
      undefined,
      { organizationId, invitationCount: invitations.length, status: statusFilter }
    );

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

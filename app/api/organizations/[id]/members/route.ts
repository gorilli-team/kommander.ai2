import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { organizationService } from '@/backend/lib/organizationService';
import { withRateLimit, withAuditLog } from '@/backend/lib/security';
import { z } from 'zod';

const UpdateMemberSchema = z.object({
  role: z.enum(['admin', 'manager', 'user', 'viewer', 'guest']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  permissions: z.array(z.enum([
    'read_organization',
    'manage_members',
    'invite_users',
    'remove_users',
    'manage_invitations',
    'manage_organization',
    'manage_billing',
    'access_analytics',
    'admin_access',
  ])).optional()
});

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

    // Check if user has permission to view members
    const hasPermission = await organizationService.hasPermission(
      session.user.id,
      organizationId,
      'read_organization'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limiting
    const { allowed } = await withRateLimit(request, { windowMs: 60000, maxRequests: 100 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const members = await organizationService.getOrganizationMembers(organizationId);

    await withAuditLog(
      request,
      'read',
      'organization_members',
      session.user.id,
      true,
      undefined,
      { organizationId, memberCount: members.length }
    );

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = params.id;
    const body = await request.json();
    const { userId, ...updates } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user has permission to manage members
    const hasPermission = await organizationService.hasPermission(
      session.user.id,
      organizationId,
      'manage_members'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limiting
    const { allowed } = await withRateLimit(request, { windowMs: 60000, maxRequests: 50 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const validatedUpdates = UpdateMemberSchema.parse(updates);

    const success = await organizationService.updateMember(
      organizationId,
      userId,
      validatedUpdates
    );

    if (!success) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    await withAuditLog(
      request,
      'update',
      'organization_member',
      session.user.id,
      true,
      undefined,
      { organizationId, targetUserId: userId, updates: validatedUpdates }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating member:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = params.id;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user has permission to remove members
    const hasPermission = await organizationService.hasPermission(
      session.user.id,
      organizationId,
      'remove_users'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limiting
    const { allowed } = await withRateLimit(request, { windowMs: 60000, maxRequests: 20 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const success = await organizationService.removeMember(organizationId, userId);

    if (!success) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    await withAuditLog(
      request,
      'delete',
      'organization_member',
      session.user.id,
      true,
      undefined,
      { organizationId, removedUserId: userId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { organizationService } from '@/backend/lib/organizationService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = params.id;

    await organizationService.leaveOrganization(orgId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[POST /api/organizations/[id]/leave] Error:', error);
    if (error.message?.includes('owner cannot leave')) {
      return NextResponse.json({ error: 'Owner cannot leave. Transfer ownership first.' }, { status: 400 });
    }
    if (error.message?.includes('At least one admin')) {
      return NextResponse.json({ error: 'At least one admin must remain in the organization' }, { status: 400 });
    }
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to leave organization' }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { organizationService } from '@/backend/lib/organizationService';
import { z } from 'zod';

const TransferOwnershipSchema = z.object({
  newOwnerUserId: z.string().min(1),
});

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
    const body = await request.json();
    const { newOwnerUserId } = TransferOwnershipSchema.parse(body);

    await organizationService.transferOwnership(orgId, session.user.id, newOwnerUserId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[POST /api/organizations/[id]/transfer-ownership] Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    if (error.message?.includes('current owner')) {
      return NextResponse.json({ error: 'Only the current owner can transfer ownership' }, { status: 403 });
    }
    if (error.message?.includes('must be an active member')) {
      return NextResponse.json({ error: 'New owner must be an active member' }, { status: 400 });
    }
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to transfer ownership' }, { status: 500 });
  }
}


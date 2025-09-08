import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { organizationService } from '@/backend/lib/organizationService';
import { sendInvitationEmail } from '@/backend/lib/invitationEmail';
import { z } from 'zod';

const ResendInvitationSchema = z.object({
  id: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = ResendInvitationSchema.parse(body);

    const invitation = await organizationService.getInvitationById(id);
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check permissions
    const hasPermission = await organizationService.hasPermission(
      session.user.id,
      invitation.organizationId,
      'manage_invitations'
    );
    const isInviter = invitation.invitedBy === session.user.id;

    if (!hasPermission && !isInviter) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invitations can be resent' }, { status: 400 });
    }

    const emailResult = await sendInvitationEmail(
      invitation.email,
      invitation.token,
      invitation.organizationId,
      invitation.role,
      invitation.message
    );

    return NextResponse.json({ success: emailResult.success, emailSent: emailResult.success, error: emailResult.error });
  } catch (error: any) {
    console.error('[POST /api/invitations/resend] Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 });
  }
}


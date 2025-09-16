import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { organizationService } from '@/backend/lib/organizationService';
import { sendInvitationEmail } from '@/backend/lib/invitationEmail';
import { withRateLimit, withAuditLog } from '@/backend/lib/security';
import { z } from 'zod';

const CreateInvitationSchema = z.object({
  organizationId: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'user', 'viewer', 'guest', 'operator']),
  message: z.string().optional(),
  expiresInDays: z.number().min(1).max(30).optional()
});

const AcceptInvitationSchema = z.object({
  token: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for invitations
    const { allowed } = await withRateLimit(request, { windowMs: 60000, maxRequests: 20 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const validatedData = CreateInvitationSchema.parse(body);

    // Check if user has permission to invite users
    const hasPermission = await organizationService.hasPermission(
      session.user.id,
      validatedData.organizationId,
      'invite_users'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create invitation
    const token = await organizationService.createInvitation({
      organizationId: validatedData.organizationId,
      email: validatedData.email,
      role: validatedData.role,
      invitedBy: session.user.id,
      message: validatedData.message,
      expiresInDays: validatedData.expiresInDays || 7
    });

    // Send invitation email
    const emailResult = await sendInvitationEmail(
      validatedData.email,
      token,
      validatedData.organizationId,
      validatedData.role,
      validatedData.message
    );

    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
      // Don't fail the request, invitation is created
    }

    await withAuditLog(
      request,
      'create',
      'invitation',
      session.user.id,
      true,
      undefined,
      { 
        organizationId: validatedData.organizationId, 
        email: validatedData.email, 
        role: validatedData.role,
        emailSent: emailResult.success
      }
    );

    return NextResponse.json({ 
      success: true, 
      token,
      emailSent: emailResult.success 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating invitation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const { allowed } = await withRateLimit(request, { windowMs: 60000, maxRequests: 50 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { token } = AcceptInvitationSchema.parse(body);

    const success = await organizationService.acceptInvitation(token, session.user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      );
    }

    await withAuditLog(
      request,
      'accept',
      'invitation',
      session.user.id,
      true,
      undefined,
      { token: token.substring(0, 8) + '...' } // Don't log full token
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

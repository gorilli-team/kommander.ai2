import { NextRequest, NextResponse } from 'next/server';
import { organizationService } from '@/backend/lib/organizationService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invitationId = params.id;
    
    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    // Revoke the invitation
    await organizationService.revokeInvitation(invitationId, session.user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation revoked successfully' 
    });
  } catch (error: any) {
    console.error('[DELETE /api/invitations/[id]] Error:', error);
    
    // Handle specific error cases
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Insufficient permissions to revoke invitation' }, { status: 403 });
    }
    
    if (error.message.includes('Can only revoke pending')) {
      return NextResponse.json({ error: 'Can only revoke pending invitations' }, { status: 400 });
    }
    
    if (error.message.includes('Invalid')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to revoke invitation' 
    }, { status: 500 });
  }
}

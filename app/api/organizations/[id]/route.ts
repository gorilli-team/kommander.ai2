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

    const organizationId = params.id;
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Delete the organization
    await organizationService.deleteOrganization(organizationId, session.user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Organization deleted successfully' 
    });
  } catch (error: any) {
    console.error('[DELETE /api/organizations/[id]] Error:', error);
    
    // Handle specific error cases
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Insufficient permissions to delete organization' }, { status: 403 });
    }
    
    if (error.message.includes('Invalid')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete organization' 
    }, { status: 500 });
  }
}

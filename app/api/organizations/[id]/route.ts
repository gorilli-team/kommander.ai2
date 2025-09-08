import { NextRequest, NextResponse } from 'next/server';
import { organizationService } from '@/backend/lib/organizationService';
import { auth } from '@/frontend/auth';
import { z } from 'zod';

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

const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  settings: z.object({
    allowPublicJoin: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    defaultRole: z.enum(['admin', 'manager', 'user', 'viewer', 'guest']).optional(),
    maxMembers: z.number().min(1).max(10000).optional(),
    allowedDomains: z.array(z.string()).optional(),
  }).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
});

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
    const updates = UpdateOrganizationSchema.parse(body);

    const updated = await organizationService.updateOrganization(organizationId, session.user.id, updates);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[PATCH /api/organizations/[id]] Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    if (error.message?.includes('slug already exists')) {
      return NextResponse.json({ error: 'Organization slug already exists' }, { status: 400 });
    }
    if (error.message?.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { organizationService } from '@/backend/lib/organizationService';
import { withRateLimit, withAuditLog } from '@/backend/lib/security';
import { z } from 'zod';

const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  settings: z.object({
    allowPublicJoin: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    defaultRole: z.enum(['admin', 'manager', 'user', 'viewer', 'guest']).optional(),
    maxMembers: z.number().optional(),
    allowedDomains: z.array(z.string()).optional(),
  }).optional()
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const { allowed } = await withRateLimit(request, { windowMs: 60000, maxRequests: 100 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const organizations = await organizationService.getUserOrganizations(session.user.id);

    await withAuditLog(
      request,
      'read',
      'organizations',
      session.user.id,
      true,
      undefined,
      { count: organizations.length }
    );

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for creation
    const { allowed } = await withRateLimit(request, { windowMs: 60000, maxRequests: 10 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const validatedData = CreateOrganizationSchema.parse(body);

    // Check if slug is unique
    try {
      const organizationId = await organizationService.createOrganization({
        ...validatedData,
        ownerId: session.user.id
      });

      const organization = await organizationService.getOrganization(organizationId, session.user.id);

      await withAuditLog(
        request,
        'create',
        'organization',
        session.user.id,
        true,
        undefined,
        { organizationId, name: validatedData.name }
      );

      return NextResponse.json(organization, { status: 201 });
    } catch (error: any) {
      if (error.code === 11000) {
        return NextResponse.json(
          { error: 'Organization slug already exists' },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating organization:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}

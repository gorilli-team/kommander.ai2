import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { ObjectId } from 'mongodb';
import { organizationService } from '@/backend/lib/organizationService';

// Helper to resolve organization members' userIds
async function getOrganizationMemberUserIds(orgId: string): Promise<string[]> {
  const { db } = await connectToDatabase();
  const members = await db
    .collection('organization_members')
    .find({ organizationId: new ObjectId(orgId), status: 'active' })
    .project({ userId: 1 })
    .toArray();
  return members.map((m: any) => m.userId.toString());
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contextType = request.headers.get('x-context-type') || 'personal';
    const orgId = request.headers.get('x-organization-id') || undefined;

    // Disallow personal context for operators
    const userRole = (session.user as any)?.role;
    if (userRole === 'operator' && contextType !== 'organization') {
      return NextResponse.json({ error: 'Operators must use organization context' }, { status: 403 });
    }

    const { db } = await connectToDatabase();

    let filter: any = {};

    if (contextType === 'organization') {
      if (!orgId) {
        return NextResponse.json({ error: 'Missing organization context' }, { status: 400 });
      }
      // Permission check for org conversations
      const permitted = await organizationService.hasPermission(
        session.user.id,
        orgId,
        'read_conversations' as any
      );
      if (!permitted) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const memberUserIds = await getOrganizationMemberUserIds(orgId);
      if (memberUserIds.length === 0) {
        return NextResponse.json({ conversations: [], total: 0 });
      }
      filter.userId = { $in: memberUserIds };
    } else {
      filter.userId = session.user.id;
    }

    const docs = await db
      .collection('conversations')
      .find(filter)
      .sort({ updatedAt: -1 })
      .toArray();

    const conversations = docs.map((doc: any) => ({
      id: doc.conversationId,
      handledBy: doc.handledBy ?? 'bot',
      messages: (doc.messages || []).map((m: any) => ({
        role: m.role,
        text: m.text,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      })),
      site: doc.site,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    }));

    return NextResponse.json({ conversations, total: conversations.length });
  } catch (error) {
    console.error('[api/conversations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

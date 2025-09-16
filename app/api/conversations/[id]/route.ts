import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { deleteConversation, getConversation, setConversationHandledBy } from '@/app/conversations/actions';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { ObjectId } from 'mongodb';
import { organizationService } from '@/backend/lib/organizationService';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const orgId = request.headers.get('x-organization-id') || undefined;
  const contextType = request.headers.get('x-context-type') || undefined;
  const userRole = (session.user as any)?.role;
  if (userRole === 'operator' && contextType !== 'organization') {
    return NextResponse.json({ error: 'Operators must use organization context' }, { status: 403 });
  }

  if (orgId && contextType === 'organization') {
    // Operators should not be able to delete conversations; restrict to admins/managers/owners
    const canDelete = await organizationService.hasPermission(
      session.user.id,
      orgId,
      'manage_organization' as any
    );
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { db } = await connectToDatabase();
    const members = await db
      .collection('organization_members')
      .find({ organizationId: new ObjectId(orgId), status: 'active' })
      .project({ userId: 1 })
      .toArray();
    const memberUserIds = members.map((m: any) => m.userId.toString());
    const res = await db.collection('conversations').deleteOne({ conversationId: id, userId: { $in: memberUserIds } });
    if (res.deletedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  try {
    await deleteConversation(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const orgId = request.headers.get('x-organization-id') || undefined;
  const contextType = request.headers.get('x-context-type') || undefined;
  const userRole = (session.user as any)?.role;
  if (userRole === 'operator' && contextType !== 'organization') {
    return NextResponse.json({ error: 'Operators must use organization context' }, { status: 403 });
  }

  if (orgId && contextType === 'organization') {
    const permitted = await organizationService.hasPermission(
      session.user.id,
      orgId,
      'read_conversations' as any
    );
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { db } = await connectToDatabase();
    const members = await db
      .collection('organization_members')
      .find({ organizationId: new ObjectId(orgId), status: 'active' })
      .project({ userId: 1 })
      .toArray();
    const memberUserIds = members.map((m: any) => m.userId.toString());
    const doc = await db.collection('conversations').findOne({ conversationId: id, userId: { $in: memberUserIds } });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const conv = {
      id: doc.conversationId,
      handledBy: doc.handledBy ?? 'bot',
      messages: (doc.messages || []).map((m: any) => ({
        role: m.role,
        text: m.text,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      })),
      site: doc.site,
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString(),
    };
    return NextResponse.json(conv);
  }

  const conv = await getConversation(session.user.id, id);
  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(conv);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const handledBy = body?.handledBy;
  if (handledBy !== 'bot' && handledBy !== 'agent') {
    return NextResponse.json({ error: 'Invalid handledBy' }, { status: 400 });
  }
  const { id } = await params;

  const orgId = request.headers.get('x-organization-id') || undefined;
  const contextType = request.headers.get('x-context-type') || undefined;
  const userRole = (session.user as any)?.role;
  if (userRole === 'operator' && contextType !== 'organization') {
    return NextResponse.json({ error: 'Operators must use organization context' }, { status: 403 });
  }

  if (orgId && contextType === 'organization') {
    const permitted = await organizationService.hasPermission(
      session.user.id,
      orgId,
      'write_conversations' as any
    );
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { db } = await connectToDatabase();
    const members = await db
      .collection('organization_members')
      .find({ organizationId: new ObjectId(orgId), status: 'active' })
      .project({ userId: 1 })
      .toArray();
    const memberUserIds = members.map((m: any) => m.userId.toString());
    const res = await db.collection('conversations').updateOne(
      { conversationId: id, userId: { $in: memberUserIds } },
      { $set: { handledBy, updatedAt: new Date() } }
    );
    if (res.matchedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  await setConversationHandledBy(session.user.id, id, handledBy);
  return NextResponse.json({ success: true });
}

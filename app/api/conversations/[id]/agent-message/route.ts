import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { appendMessages, setConversationHandledBy } from '@/app/conversations/actions';
import { broadcastUpdate } from '@/backend/lib/realtime';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { ObjectId } from 'mongodb';
import { organizationService } from '@/backend/lib/organizationService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const text = body?.text;
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }
  const { id } = await params;
  const timestamp = new Date().toISOString();

  // Check if this is an operator acting in organization context
  const orgId = request.headers.get('x-organization-id') || undefined;
  const contextType = request.headers.get('x-context-type') || undefined;

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
    // Update conversation by conversationId but only if owned by any active org member
    const memberIds = await db
      .collection('organization_members')
      .find({ organizationId: new ObjectId(orgId), status: 'active' })
      .project({ userId: 1 })
      .toArray();
    const memberUserIds = memberIds.map((m: any) => m.userId.toString());

    const updateRes = await db.collection('conversations').updateOne(
      { conversationId: id, userId: { $in: memberUserIds } },
      {
        $push: { messages: { role: 'agent', text, timestamp: new Date(timestamp) } },
        $set: { handledBy: 'agent', updatedAt: new Date() },
      }
    );

    if (updateRes.matchedCount === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    try {
      await broadcastUpdate(id, {
        handledBy: 'agent',
        messages: [{ role: 'agent', text, timestamp }],
      });
    } catch {}

    return NextResponse.json({ success: true });
  }

  // Default personal-context behavior
  await appendMessages(session.user.id, id, [
    { role: 'agent', text, timestamp },
  ]);

  try { await setConversationHandledBy(session.user.id, id, 'agent'); } catch {}

  try {
    await broadcastUpdate(id, {
      handledBy: 'agent',
      messages: [{ role: 'agent', text, timestamp }],
    });
  } catch {}

  return NextResponse.json({ success: true });
}

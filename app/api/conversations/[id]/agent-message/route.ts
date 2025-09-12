import { NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { appendMessages, setConversationHandledBy } from '@/app/conversations/actions';
import { broadcastUpdate } from '@/backend/lib/realtime';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { text } = await request.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }
  const { id } = await params;
  const timestamp = new Date().toISOString();

  // Persist agent message
  await appendMessages(session.user.id, id, [
    { role: 'agent', text, timestamp },
  ]);

  // Ensure conversation is marked as handled by agent (idempotent)
  try { await setConversationHandledBy(session.user.id, id, 'agent'); } catch {}

  // Broadcast to subscribers via WS relay (or local WS in dev)
  try {
    await broadcastUpdate(id, {
      handledBy: 'agent',
      messages: [{ role: 'agent', text, timestamp }],
    });
  } catch {}

  return NextResponse.json({ success: true });
}

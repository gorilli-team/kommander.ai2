import { NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { deleteConversation, getConversation, setConversationHandledBy, appendMessages } from '@/app/conversations/actions';
import { broadcastUpdate } from '@/backend/lib/realtime';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    await deleteConversation(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const conv = await getConversation(session.user.id, id);
  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(conv);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { handledBy, operatorName } = await request.json();
  if (handledBy !== 'bot' && handledBy !== 'agent') {
    return NextResponse.json({ error: 'Invalid handledBy' }, { status: 400 });
  }
  const { id } = await params;
  await setConversationHandledBy(session.user.id, id, handledBy);

  // If operator takes over, insert and broadcast a system banner
  if (handledBy === 'agent') {
    const timestamp = new Date().toISOString();
    const name = operatorName || 'Operatore';
    const banner = { role: 'system', text: `Sei ora in contatto con ${name}`, timestamp } as const;
    try {
      await appendMessages(session.user.id, id, [banner]);
    } catch {}
    try {
      await broadcastUpdate(id, { handledBy: 'agent', messages: [banner as any] });
    } catch {}
  }

  return NextResponse.json({ success: true });
}

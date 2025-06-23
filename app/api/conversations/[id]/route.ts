import { NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { deleteConversation, getConversation, setConversationHandledBy } from '@/app/conversations/actions';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await deleteConversation(session.user.id, params.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const conv = await getConversation(session.user.id, params.id);
  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(conv);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { handledBy } = await request.json();
  if (handledBy !== 'bot' && handledBy !== 'agent') {
    return NextResponse.json({ error: 'Invalid handledBy' }, { status: 400 });
  }
  await setConversationHandledBy(session.user.id, params.id, handledBy);
  return NextResponse.json({ success: true });
}

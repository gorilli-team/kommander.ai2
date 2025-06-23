import { NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { getConversation } from '@/app/conversations/actions';

export async function GET(req: Request, { params }: any) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since');
  const conv = await getConversation(session.user.id, params.id);
  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  let messages = conv.messages;
  if (since) {
    const sinceDate = new Date(since);
    messages = messages.filter((m) => new Date(m.timestamp) > sinceDate);
  }
  return NextResponse.json({ messages, handledBy: conv.handledBy });
}

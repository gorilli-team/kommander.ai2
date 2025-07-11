import { NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { appendMessages } from '@/app/conversations/actions';

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
  await appendMessages(session.user.id, id, [
    { role: 'agent', text, timestamp: new Date().toISOString() },
  ]);
  return NextResponse.json({ success: true });
}

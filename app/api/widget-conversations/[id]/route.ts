import { NextResponse } from 'next/server';
import { getConversation } from '@/app/conversations/actions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json(
      { error: 'Missing userId' },
      { status: 400, headers: corsHeaders },
    );
  }
  const conv = await getConversation(userId, params.id);
  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
  }
  return NextResponse.json(conv, { headers: corsHeaders });
}

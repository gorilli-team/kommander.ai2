import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/backend/lib/mongodb';
import type { ChatbotSettingsDocument } from '@/backend/schemas/settings';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const userId = params.userId;
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  const { db } = await connectToDatabase();
  const doc = await db.collection<ChatbotSettingsDocument>('chatbot_settings').findOne({ userId });
  return NextResponse.json(doc || {});
}

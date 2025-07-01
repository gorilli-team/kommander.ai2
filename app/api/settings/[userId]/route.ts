import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/backend/lib/mongodb';
import type { ChatbotSettingsDocument } from '@/backend/schemas/settings';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  const { db } = await connectToDatabase();
  const doc = await db.collection<ChatbotSettingsDocument>('chatbot_settings').findOne({ userId });
  return NextResponse.json(doc || {});
}

export async function PUT(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  
  const settings = await req.json();
  const { db } = await connectToDatabase();
  
  await db.collection<ChatbotSettingsDocument>('chatbot_settings')
    .updateOne(
      { userId },
      { $set: { ...settings, userId, updatedAt: new Date() } },
      { upsert: true }
    );
  
  return NextResponse.json({ success: true });
}

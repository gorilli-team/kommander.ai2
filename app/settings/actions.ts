'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import { ChatbotSettingsSchema, type ChatbotSettingsDocument } from '@/backend/schemas/settings';
import { revalidatePath } from 'next/cache';
import { auth } from '@/frontend/auth';
import { ObjectId } from 'mongodb';

export async function getSettings(userId?: string): Promise<ChatbotSettingsDocument | null> {
  let userIdToUse = userId;
  
  if (!userIdToUse) {
    const session = await auth();
    if (!session?.user?.id) return null;
    userIdToUse = session.user.id;
  }
  
  const { db } = await connectToDatabase();
  const doc = await db
    .collection<ChatbotSettingsDocument>('chatbot_settings')
    .findOne({ userId: userIdToUse });
  return doc || null;
}

export async function saveSettings(data: Partial<ChatbotSettingsDocument>) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };
  const userId = session.user.id;
  const { db } = await connectToDatabase();

  const parsed = ChatbotSettingsSchema.omit({ _id: true, userId: true, createdAt: true, updatedAt: true }).partial().safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid data' };
  }

  const update = {
    $set: { ...parsed.data, updatedAt: new Date() },
    $setOnInsert: { userId, createdAt: new Date() },
  };
  await db
    .collection<ChatbotSettingsDocument>('chatbot_settings')
    .updateOne({ userId }, update, { upsert: true });

  revalidatePath('/settings');
  return { success: true };
}

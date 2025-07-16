'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import { ChatbotSettingsSchema, type ChatbotSettingsDocument } from '@/backend/schemas/settings';
import { revalidatePath } from 'next/cache';
import { auth } from '@/frontend/auth';
import { ObjectId } from 'mongodb';

// **CACHE OTTIMIZZAZIONE**: Cache in-memory per settings utente
const settingsCache = new Map<string, { data: ChatbotSettingsDocument | null; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 secondi

export async function getSettings(userId?: string): Promise<ChatbotSettingsDocument | null> {
  let userIdToUse = userId;
  
  if (!userIdToUse) {
    const session = await auth();
    if (!session?.user?.id) return null;
    userIdToUse = session.user.id;
  }
  
  // **CACHE CHECK**: Verifica se abbiamo i dati in cache
  const cached = settingsCache.get(userIdToUse);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const { db } = await connectToDatabase();
  const doc = await db
    .collection<ChatbotSettingsDocument>('chatbot_settings')
    .findOne({ userId: userIdToUse });
  
  // **CACHE SAVE**: Salva in cache per future richieste
  settingsCache.set(userIdToUse, { data: doc || null, timestamp: Date.now() });
  
  return doc || null;
}

export async function saveSettings(data: Partial<ChatbotSettingsDocument>, contextId?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };
  const userId = session.user.id;
  const { db } = await connectToDatabase();

  const parsed = ChatbotSettingsSchema.omit({ _id: true, userId: true, createdAt: true, updatedAt: true }).partial().safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid data' };
  }

  const targetId = contextId || userId;

  const update = {
    $set: { ...parsed.data, updatedAt: new Date() },
    $setOnInsert: { userId: targetId, createdAt: new Date() },
  };
  await db
    .collection<ChatbotSettingsDocument>('chatbot_settings')
    .updateOne({ userId: targetId }, update, { upsert: true });

  // **CACHE INVALIDATION**: Rimuovi dalla cache quando vengono aggiornati
  settingsCache.delete(targetId);

  revalidatePath('/settings');
  return { success: true };
}

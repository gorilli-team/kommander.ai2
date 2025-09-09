'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import { ChatbotSettingsSchema, type ChatbotSettingsDocument } from '@/backend/schemas/settings';
import { revalidatePath } from 'next/cache';
import { auth } from '@/frontend/auth';
import { ObjectId } from 'mongodb';

export async function getSettings(): Promise<ChatbotSettingsDocument | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { db } = await connectToDatabase();
  const doc = await db
    .collection<ChatbotSettingsDocument>('chatbot_settings')
    .findOne({ userId: session.user.id });
  return doc || null;
}

// Map trait values from UI (EN) -> schema (IT)
const TRAIT_MAP: Record<string, ChatbotSettingsDocument['traits'][number]> = {
  adventurous: 'avventuroso',
  confident: 'fiducioso',
  convincing: 'convincente',
  energetic: 'energetico',
  friendly: 'amichevole',
  fun: 'divertente',
  ironic: 'ironico',
  professional: 'professionista',
};

function normalizeSettings(input: Partial<ChatbotSettingsDocument>) {
  const out: Partial<ChatbotSettingsDocument> = {};
  if (typeof input.name === 'string') out.name = input.name;
  if (typeof input.color === 'string') out.color = input.color;
  if (input.personality && ['neutral', 'casual', 'formal'].includes(input.personality as any)) {
    out.personality = input.personality as any;
  }
  if (Array.isArray((input as any).traits)) {
    const mapped = (input as any).traits
      .map((t: string) => (TRAIT_MAP[t] ? TRAIT_MAP[t] : t))
      .filter((t: any) => Object.values(TRAIT_MAP).includes(t))
      .slice(0, 3);
    if (mapped.length) out.traits = mapped as any;
    else if ((input as any).traits?.length === 0) out.traits = [] as any;
  }
  if (typeof (input as any).notificationEmail === 'string') {
    out.notificationEmail = (input as any).notificationEmail as any;
  }
  return out;
}

export async function saveSettings(data: Partial<ChatbotSettingsDocument>, contextId?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };
  
  // Use contextId if provided, otherwise use session user id
  const userId = contextId || session.user.id;
  const { db } = await connectToDatabase();

  // Normalize/clean the payload so validation succeeds even if UI sends EN traits
  const sanitized = normalizeSettings(data);
  const parsed = ChatbotSettingsSchema
    .omit({ _id: true, userId: true, createdAt: true, updatedAt: true })
    .partial()
    .safeParse(sanitized);
  if (!parsed.success) {
    console.error('[settings/actions.ts] Validation error:', parsed.error);
    return { error: 'Invalid data' };
  }

  const update = {
    $set: { ...parsed.data, updatedAt: new Date() },
    $setOnInsert: { userId, createdAt: new Date() },
  };
  
  console.log('[settings/actions.ts] Saving settings for userId:', userId, 'data:', parsed.data);
  
  await db
    .collection<ChatbotSettingsDocument>('chatbot_settings')
    .updateOne({ userId }, update, { upsert: true });

  // Revalidate settings page; widget will pick changes on next page load (ETag changes)
  revalidatePath('/settings');
  return { success: true };
}

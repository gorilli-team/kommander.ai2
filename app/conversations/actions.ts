'use server';

import { connectToDatabase } from '@/backend/lib/mongodb';
import { auth } from '@/frontend/auth';
import type { ConversationDocument } from '@/backend/schemas/conversation';

export interface ConversationMessageDisplay {
  role: 'user' | 'assistant' | 'agent';
  text: string;
  timestamp: string;
}

export interface ConversationDisplayItem {
  id: string;
  messages: ConversationMessageDisplay[];
  site?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getConversations(): Promise<ConversationDisplayItem[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const userId = session.user.id;
  const { db } = await connectToDatabase();

  const docs = await db
    .collection<ConversationDocument>('conversations')
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();

  return docs.map((doc) => ({
    id: doc.conversationId,
    handledBy: doc.handledBy ?? 'bot',
    messages: doc.messages.map((m) => ({
      role: m.role,
      text: m.text || m.content, // Support both fields
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
    })),
    site: doc.site,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  }));
}

export async function appendMessages(
  userId: string,
  conversationId: string,
  messages: ConversationMessageDisplay[],
  site?: string,
  endUserId?: string,
): Promise<void> {
  const { db } = await connectToDatabase();
  const now = new Date();
  
  const insertData: any = { createdAt: now, site };
  if (endUserId) {
    insertData.endUserId = endUserId;
    console.log('[appendMessages] Saving with endUserId:', endUserId);
  }

  await db.collection<ConversationDocument>('conversations').updateOne(
    { userId, conversationId },
    {
      $setOnInsert: insertData,
      $set: { updatedAt: now },
      $push: {
        messages: {
          $each: messages.map((m) => ({
            id: `${conversationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: m.role,
            content: m.text, // Map text to content per schema
            timestamp: new Date(m.timestamp),
            // Keep legacy field for backward compatibility
            text: m.text,
          })),
        },
      },
    },
    { upsert: true }
  );
}

export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  const { db } = await connectToDatabase();
  await db.collection<ConversationDocument>('conversations').deleteOne({ userId, conversationId });
}

export async function setConversationHandledBy(
  userId: string,
  conversationId: string,
  handledBy: 'bot' | 'agent',
): Promise<void> {
  const { db } = await connectToDatabase();
  await db.collection<ConversationDocument>('conversations').updateOne(
    { userId, conversationId },
    { $set: { handledBy, updatedAt: new Date() } },
  );
}

export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<(ConversationDisplayItem & { handledBy: 'bot' | 'agent' }) | null> {
  const { db } = await connectToDatabase();
  const doc = await db
    .collection<ConversationDocument>('conversations')
    .findOne({ userId, conversationId });
  if (!doc) return null;
  return {
    id: doc.conversationId,
    handledBy: doc.handledBy ?? 'bot',
    messages: doc.messages.map((m) => ({
      role: m.role,
      text: m.text || m.content, // Support both fields
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
    })),
    site: doc.site,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
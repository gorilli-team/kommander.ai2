import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const ConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'agent']),
  text: z.string(),
  timestamp: z.date(),
});

export const ConversationSchema = z.object({
  _id: z
    .custom<ObjectId>((val) => typeof val === 'object' || ObjectId.isValid(val as string))
    .optional(),
  userId: z.string(),
  conversationId: z.string(),
  site: z.string().optional(),
  title: z.string().optional(),
  messages: z.array(ConversationMessageSchema),
  handledBy: z.enum(['bot', 'agent']).default('bot'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ConversationDocument = z.infer<typeof ConversationSchema>;
import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const ChatbotSettingsSchema = z.object({
  _id: z.custom<ObjectId>(val => typeof val === 'object' || ObjectId.isValid(val as string)).optional(),
  userId: z.string(),
  name: z.string().default('Kommander.ai'),
  color: z.string().default('#1E3A8A'),
  personality: z.enum(['neutral', 'casual', 'formal']).default('neutral'),
  traits: z.array(z.enum([
    'avventuroso',
    'fiducioso',
    'convincente',
    'energetico',
    'amichevole',
    'divertente',
    'ironico',
    'professionista',
  ])).max(3).default([]),
  notificationEmail: z.string().email().optional(), // Email per notifiche nuove conversazioni
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ChatbotSettingsDocument = z.infer<typeof ChatbotSettingsSchema>;

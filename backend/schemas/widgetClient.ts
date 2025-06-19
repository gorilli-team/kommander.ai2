import { z } from 'zod';
import type { ObjectId } from 'mongodb';

export const WidgetClientSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  clientId: z.string(),
  apiKey: z.string(),
  ownerId: z.string(),
  allowedDomains: z.array(z.string()).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type WidgetClientDocument = z.infer<typeof WidgetClientSchema>;

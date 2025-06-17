
import { z } from 'zod';
import type { ObjectId } from 'mongodb';

export const UserSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object' ),
  email: z.string().email(),
  name: z.string().optional(),
  hashedPassword: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type UserDocument = z.infer<typeof UserSchema>;

export type ClientUser = Omit<UserDocument, '_id' | 'hashedPassword' | 'createdAt' | 'updatedAt'> & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};


import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const UserSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object' ),
  email: z.string().email(),
  name: z.string().optional(),
  hashedPassword: z.string(),
  emailVerified: z.boolean().default(false).optional(), // Manteniamo questo campo, anche se lo impostiamo a true di default
  otp: z.string().optional().nullable(), // Manteniamo per futura flessibilità
  otpExpiresAt: z.date().optional().nullable(), // Manteniamo per futura flessibilità
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type UserDocument = z.infer<typeof UserSchema>;

export type ClientUser = Omit<UserDocument, '_id' | 'hashedPassword' | 'createdAt' | 'updatedAt' | 'otp' | 'otpExpiresAt'> & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

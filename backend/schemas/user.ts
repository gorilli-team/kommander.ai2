
import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const UserSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object' ),
  email: z.string().email(),
  name: z.string().optional(),
  hashedPassword: z.string(),
  emailVerified: z.boolean().default(false),
  otp: z.string().optional().nullable(),
  otpExpiresAt: z.date().optional().nullable(),
  // Password reset fields
  resetToken: z.string().optional().nullable(),
  resetTokenExpiresAt: z.date().optional().nullable(),
  // Password history for preventing reuse
  previousPasswords: z.array(z.string()).optional().default([]),
  passwordChangedAt: z.date().optional(),
  // Security fields
  loginAttempts: z.number().optional().default(0),
  lockUntil: z.date().optional().nullable(),
  lastLoginAt: z.date().optional(),
  lastLoginIp: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type UserDocument = z.infer<typeof UserSchema>;

export type ClientUser = Omit<UserDocument, '_id' | 'hashedPassword' | 'createdAt' | 'updatedAt' | 'otp' | 'otpExpiresAt'> & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

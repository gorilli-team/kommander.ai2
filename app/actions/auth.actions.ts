
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { RegisterSchema } from '@/frontend/lib/schemas/auth.schemas'; // Usiamo RegisterSchema
import type { UserDocument } from '@/backend/schemas/user';
// sendVerificationEmail non è più necessario per la registrazione diretta
// import { sendVerificationEmail } from '@/backend/lib/email';
// import { ObjectId } from 'mongodb';

// function generateOtp(): string {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// }

export async function registerUser(
  values: unknown
): Promise<{ success?: string; error?: string; fieldErrors?: any }> {
  console.log('[app/actions/auth.actions.ts] registerUser called with values:', values);
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    console.error('[app/actions/auth.actions.ts] Registration validation failed:', fieldErrors);
    return { error: 'Invalid fields.', fieldErrors };
  }

  const { email, password, name } = validatedFields.data;
  console.log('[app/actions/auth.actions.ts] Registration details validated for email:', email);

  try {
    const { db } = await connectToDatabase();
    const existingUser = await db.collection<UserDocument>('users').findOne({ email });

    if (existingUser) {
      console.warn('[app/actions/auth.actions.ts] Email already exists:', email);
      return { error: 'An account with this email already exists.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: Omit<UserDocument, '_id'> = {
      email,
      name: name || undefined,
      hashedPassword,
      emailVerified: true, // Email verificata direttamente alla registrazione
      // otp: undefined, // Non più necessario
      // otpExpiresAt: undefined, // Non più necessario
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await db.collection('users').insertOne(newUser as UserDocument);
    if (!insertResult.insertedId) {
      console.error('[app/actions/auth.actions.ts] Failed to insert new user.');
      return { error: 'Failed to create account. Please try again.' };
    }

    console.log('[app/actions/auth.actions.ts] User account created and verified successfully for:', email);
    return { success: 'Account created successfully! You can now log in.' };

  } catch (error) {
    console.error('[app/actions/auth.actions.ts] Error in registerUser:', error);
    let errorMessage = 'An unexpected error occurred during registration.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: `Registration failed: ${errorMessage}` };
  }
}

// Le funzioni initiateRegistration e verifyOtpAndCompleteRegistration sono state rimosse
// perché non stiamo più usando il flusso OTP per la registrazione.

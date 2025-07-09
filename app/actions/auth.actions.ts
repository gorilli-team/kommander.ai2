
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { InitialRegisterSchema, OtpSchema } from '@/frontend/lib/schemas/auth.schemas';
import type { UserDocument } from '@/backend/schemas/user';
import { sendVerificationEmail, generateOtp } from '@/backend/lib/email';
import { ObjectId } from 'mongodb';

// Inizia il processo di registrazione e invia OTP
export async function initiateRegistration(
  values: unknown
): Promise<{ success?: string; error?: string; fieldErrors?: any }> {
  console.log('[app/actions/auth.actions.ts] initiateRegistration called with values:', values);
  const validatedFields = InitialRegisterSchema.safeParse(values);

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
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minuti

    // Crea un utente temporaneo non verificato
    const newUser: Omit<UserDocument, '_id'> = {
      email,
      name: name || undefined,
      hashedPassword,
      emailVerified: false,
      otp,
      otpExpiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await db.collection('users').insertOne(newUser as UserDocument);
    if (!insertResult.insertedId) {
      console.error('[app/actions/auth.actions.ts] Failed to insert new user.');
      return { error: 'Failed to create account. Please try again.' };
    }

    // Invia email di verifica
    const emailResult = await sendVerificationEmail(email, otp);
    if (!emailResult.success) {
      // Se l'email fallisce, rimuovi l'utente creato
      await db.collection('users').deleteOne({ _id: insertResult.insertedId });
      console.error('[app/actions/auth.actions.ts] Failed to send verification email:', emailResult.error);
      
      // Messaggio di errore più specifico
      let errorMessage = 'Failed to send verification email. Please try again.';
      if (emailResult.error?.includes('testing email')) {
        errorMessage = 'This email service is currently in testing mode. Please contact support.';
      } else if (emailResult.error?.includes('verify a domain')) {
        errorMessage = 'Email service configuration required. Please contact support.';
      }
      
      return { error: errorMessage };
    }

    console.log('[app/actions/auth.actions.ts] User account created and OTP sent successfully for:', email);
    return { success: 'Registration initiated! Please check your email for the verification code.' };

  } catch (error) {
    console.error('[app/actions/auth.actions.ts] Error in initiateRegistration:', error);
    let errorMessage = 'An unexpected error occurred during registration.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: `Registration failed: ${errorMessage}` };
  }
}

// Verifica OTP e completa la registrazione
export async function verifyOtpAndCompleteRegistration(
  values: unknown
): Promise<{ success?: string; error?: string; fieldErrors?: any }> {
  console.log('[app/actions/auth.actions.ts] verifyOtpAndCompleteRegistration called with values:', values);
  const validatedFields = OtpSchema.safeParse(values);

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    console.error('[app/actions/auth.actions.ts] OTP validation failed:', fieldErrors);
    return { error: 'Invalid OTP format.', fieldErrors };
  }

  const { email, otp } = validatedFields.data;
  console.log('[app/actions/auth.actions.ts] OTP validation for email:', email);

  try {
    const { db } = await connectToDatabase();
    const user = await db.collection<UserDocument>('users').findOne({ email });

    if (!user) {
      console.warn('[app/actions/auth.actions.ts] User not found for email:', email);
      return { error: 'User not found. Please register first.' };
    }

    if (user.emailVerified) {
      console.warn('[app/actions/auth.actions.ts] Email already verified for:', email);
      return { error: 'Email already verified. Please login.' };
    }

    if (!user.otp || !user.otpExpiresAt) {
      console.warn('[app/actions/auth.actions.ts] No OTP found for user:', email);
      return { error: 'No verification code found. Please request a new one.' };
    }

    if (user.otp !== otp) {
      console.warn('[app/actions/auth.actions.ts] Invalid OTP for user:', email);
      return { error: 'Invalid verification code. Please try again.' };
    }

    if (new Date() > user.otpExpiresAt) {
      console.warn('[app/actions/auth.actions.ts] Expired OTP for user:', email);
      return { error: 'Verification code has expired. Please request a new one.' };
    }

    // Verifica l'utente
    const updateResult = await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          updatedAt: new Date(),
        },
        $unset: {
          otp: '',
          otpExpiresAt: '',
        },
      }
    );

    if (!updateResult.modifiedCount) {
      console.error('[app/actions/auth.actions.ts] Failed to update user verification status.');
      return { error: 'Failed to verify account. Please try again.' };
    }

    console.log('[app/actions/auth.actions.ts] User email verified successfully for:', email);
    return { success: 'Email verified successfully! You can now log in.' };

  } catch (error) {
    console.error('[app/actions/auth.actions.ts] Error in verifyOtpAndCompleteRegistration:', error);
    let errorMessage = 'An unexpected error occurred during verification.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: `Verification failed: ${errorMessage}` };
  }
}

// Funzione per rinviare l'OTP
export async function resendOtp(
  email: string
): Promise<{ success?: string; error?: string }> {
  console.log('[app/actions/auth.actions.ts] resendOtp called for email:', email);

  try {
    const { db } = await connectToDatabase();
    const user = await db.collection<UserDocument>('users').findOne({ email });

    if (!user) {
      console.warn('[app/actions/auth.actions.ts] User not found for resend OTP:', email);
      return { error: 'User not found. Please register first.' };
    }

    if (user.emailVerified) {
      console.warn('[app/actions/auth.actions.ts] Email already verified for resend OTP:', email);
      return { error: 'Email already verified. Please login.' };
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minuti

    // Aggiorna l'OTP
    const updateResult = await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          otp,
          otpExpiresAt,
          updatedAt: new Date(),
        },
      }
    );

    if (!updateResult.modifiedCount) {
      console.error('[app/actions/auth.actions.ts] Failed to update OTP.');
      return { error: 'Failed to generate new verification code. Please try again.' };
    }

    // Invia email di verifica
    const emailResult = await sendVerificationEmail(email, otp);
    if (!emailResult.success) {
      console.error('[app/actions/auth.actions.ts] Failed to resend verification email:', emailResult.error);
      return { error: 'Failed to send verification email. Please try again.' };
    }

    console.log('[app/actions/auth.actions.ts] OTP resent successfully for:', email);
    return { success: 'Verification code sent! Please check your email.' };

  } catch (error) {
    console.error('[app/actions/auth.actions.ts] Error in resendOtp:', error);
    let errorMessage = 'An unexpected error occurred while resending verification code.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: `Resend failed: ${errorMessage}` };
  }
}

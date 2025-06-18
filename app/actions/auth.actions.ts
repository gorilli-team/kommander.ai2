
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { RegisterDetailsSchema } from '@/frontend/lib/schemas/auth.schemas';
import type { UserDocument } from '@/backend/schemas/user';
import { sendVerificationEmail } from '@/backend/lib/email';
import { ObjectId } from 'mongodb';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function initiateRegistration(
  values: unknown
): Promise<{ success?: string; error?: string; fieldErrors?: any; email?: string }> {
  console.log('[app/actions/auth.actions.ts] initiateRegistration called with values:', values);
  const validatedFields = RegisterDetailsSchema.safeParse(values);

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    console.error('[app/actions/auth.actions.ts] Registration details validation failed:', fieldErrors);
    return { error: 'Invalid fields.', fieldErrors };
  }

  const { email, password, name } = validatedFields.data;
  console.log('[app/actions/auth.actions.ts] Registration details validated for email:', email);

  try {
    const { db } = await connectToDatabase();
    const existingUser = await db.collection<UserDocument>('users').findOne({ email });

    if (existingUser && existingUser.emailVerified) {
      console.warn('[app/actions/auth.actions.ts] Email already exists and is verified:', email);
      return { error: 'An account with this email already exists and is verified.' };
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
    const hashedPassword = await bcrypt.hash(password, 10);

    let userId: ObjectId;

    if (existingUser && !existingUser.emailVerified) {
      // User exists but email not verified, update OTP and resend
      console.log('[app/actions/auth.actions.ts] Unverified user exists, updating OTP for email:', email);
      const updateResult = await db.collection('users').updateOne(
        { _id: existingUser._id },
        { $set: { hashedPassword, name: name || undefined, otp, otpExpiresAt, updatedAt: new Date() } }
      );
      if (updateResult.modifiedCount === 0) {
        console.error('[app/actions/auth.actions.ts] Failed to update unverified user for OTP resend:', email);
        return { error: 'Failed to update user data for OTP. Please try again.' };
      }
      userId = existingUser._id;
    } else {
      // New user
      console.log('[app/actions/auth.actions.ts] Creating new user pending verification for email:', email);
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
        console.error('[app/actions/auth.actions.ts] Failed to insert new user for OTP verification.');
        return { error: 'Failed to create account for OTP verification. Please try again.' };
      }
      userId = insertResult.insertedId;
    }
    
    const emailResult = await sendVerificationEmail(email, otp);
    if (!emailResult.success) {
      console.error('[app/actions/auth.actions.ts] Failed to send verification email to:', email, 'Error:', emailResult.error);
      // Potentially rollback user creation or mark for cleanup if email fails, though for this step, we'll proceed
      return { error: `Failed to send OTP email: ${emailResult.error}. Please check your email or try again.` };
    }

    console.log('[app/actions/auth.actions.ts] OTP sent successfully to:', email);
    return { success: 'OTP has been sent to your email address. Please check your inbox (and spam folder).', email: email };

  } catch (error) {
    console.error('[app/actions/auth.actions.ts] Error in initiateRegistration:', error);
    let errorMessage = 'An unexpected error occurred during registration initiation.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: `Registration initiation failed: ${errorMessage}` };
  }
}

export async function verifyOtpAndCompleteRegistration(
  email: string,
  otp: string
): Promise<{ success?: string; error?: string }> {
  console.log(`[app/actions/auth.actions.ts] verifyOtpAndCompleteRegistration called for email: ${email} with OTP: ${otp}`);

  if (!email || !otp) {
    return { error: 'Email and OTP are required.' };
  }

  try {
    const { db } = await connectToDatabase();
    const user = await db.collection<UserDocument>('users').findOne({ email });

    if (!user) {
      console.warn('[app/actions/auth.actions.ts] User not found for OTP verification:', email);
      return { error: 'User not found. Please try the registration process again.' };
    }

    if (user.emailVerified) {
      console.warn('[app/actions/auth.actions.ts] Email already verified for:', email);
      return { success: 'Email already verified. You can log in.' }; // Or error, depending on flow
    }

    if (!user.otp || !user.otpExpiresAt) {
        console.warn('[app/actions/auth.actions.ts] OTP data missing for user:', email);
        return { error: 'OTP data not found. Please try initiating registration again.' };
    }

    if (user.otp !== otp) {
      console.warn('[app/actions/auth.actions.ts] Invalid OTP for email:', email);
      return { error: 'Invalid OTP. Please check the code and try again.' };
    }

    if (new Date() > user.otpExpiresAt) {
      console.warn('[app/actions/auth.actions.ts] OTP expired for email:', email);
      // Optionally, clear expired OTP here or allow resend
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { otp: null, otpExpiresAt: null, updatedAt: new Date() } }
      );
      return { error: 'OTP has expired. Please request a new one.' };
    }

    // OTP is valid
    const updateResult = await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { emailVerified: true, otp: null, otpExpiresAt: null, updatedAt: new Date() } }
    );

    if (updateResult.modifiedCount === 0) {
      console.error('[app/actions/auth.actions.ts] Failed to update user as verified:', email);
      return { error: 'Failed to verify email. Please try again.' };
    }

    console.log('[app/actions/auth.actions.ts] Email verified and account activated successfully for:', email);
    return { success: 'Account created and email verified successfully! You can now log in.' };

  } catch (error) {
    console.error('[app/actions/auth.actions.ts] Error in verifyOtpAndCompleteRegistration:', error);
    let errorMessage = 'An unexpected error occurred during OTP verification.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: `OTP verification failed: ${errorMessage}` };
  }
}

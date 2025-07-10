
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { InitialRegisterSchema, OtpSchema } from '@/frontend/lib/schemas/auth.schemas';
import type { UserDocument } from '@/backend/schemas/user';
import { sendVerificationEmail, generateOtp, sendResetPasswordEmail, generateResetToken } from '@/backend/lib/email';
import { ForgotPasswordSchema, ResetPasswordSchema, ChangePasswordSchema } from '@/frontend/lib/schemas/auth.schemas';
import { ObjectId } from 'mongodb';

// Funzione per richiedere reset password
export async function requestPasswordReset(values: unknown): Promise<{ success?: string; error?: string; fieldErrors?: any }> {
  console.log('[app/actions/auth.actions.ts] requestPasswordReset called with values:', values);
  const validatedFields = ForgotPasswordSchema.safeParse(values);

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    console.error('[app/actions/auth.actions.ts] Password reset request validation failed:', fieldErrors);
    return { error: 'Invalid email format.', fieldErrors };
  }

  const { email } = validatedFields.data;
  console.log('[app/actions/auth.actions.ts] Password reset request for email:', email);

  try {
    const { db } = await connectToDatabase();
    const user = await db.collection<UserDocument>('users').findOne({ email });

    if (!user) {
      console.warn('[app/actions/auth.actions.ts] User not found for email:', email);
      return { error: 'User not found. Please check your email and try again.' };
    }

    const resetToken = generateResetToken();
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const updateResult = await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          resetToken,
          resetTokenExpiresAt,
          updatedAt: new Date(),
        },
      }
    );

    if (!updateResult.modifiedCount) {
      console.error('[app/actions/auth.actions.ts] Failed to update reset token for user:', email);
      return { error: 'Failed to process password reset. Please try again.' };
    }

    const emailResult = await sendResetPasswordEmail(email, resetToken);

    if (!emailResult.success) {
      console.error('[app/actions/auth.actions.ts] Failed to send reset password email:', emailResult.error);
      return { error: 'Failed to send password reset email. Please try again.' };
    }

    console.log('[app/actions/auth.actions.ts] Password reset email sent successfully for:', email);
    return { success: 'Password reset link has been sent to your email. Please check your inbox.' };

  } catch (error) {
    console.error('[app/actions/auth.actions.ts] Error in requestPasswordReset:', error);
    let errorMessage = 'An unexpected error occurred while processing password reset.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: `Password reset request failed: ${errorMessage}` };
  }
}

// Funzione per completare il reset password
export async function resetPassword(values: unknown): Promise<{ success?: string; error?: string; fieldErrors?: any }> {
  console.log('[app/actions/auth.actions.ts] resetPassword called with values:', values);
  const validatedFields = ResetPasswordSchema.safeParse(values);

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    console.error('[app/actions/auth.actions.ts] Password reset validation failed:', fieldErrors);
    return { error: 'Invalid fields.', fieldErrors };
  }

  const { token, email, password } = validatedFields.data;
  console.log('[app/actions/auth.actions.ts] Password reset attempt for email:', email);

  try {
    const { db } = await connectToDatabase();
    const user = await db.collection<UserDocument>('users').findOne({ email });

    if (!user) {
      console.warn('[app/actions/auth.actions.ts] User not found for email:', email);
      return { error: 'User not found. Please request a password reset again.' };
    }

    if (!user.resetToken || user.resetToken !== token) {
      console.warn('[app/actions/auth.actions.ts] Invalid reset token for user:', email);
      return { error: 'Invalid or expired reset token. Please request a new password reset.' };
    }

    if (new Date() > user.resetTokenExpiresAt) {
      console.warn('[app/actions/auth.actions.ts] Expired reset token for user:', email);
      return { error: 'Reset token has expired. Please request a new password reset.' };
    }

    // Controlla se la nuova password è già stata utilizzata
    if (user.previousPasswords && user.previousPasswords.length > 0) {
      for (const prevPassword of user.previousPasswords) {
        const isPasswordReused = await bcrypt.compare(password, prevPassword);
        if (isPasswordReused) {
          console.warn('[app/actions/auth.actions.ts] Password reuse attempt for user:', email);
          return { error: 'You cannot reuse a previous password. Please choose a different password.' };
        }
      }
    }

    const newPasswordHash = await bcrypt.hash(password, 10);

    const updateResult = await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          hashedPassword: newPasswordHash,
          passwordChangedAt: new Date(),
          updatedAt: new Date(),
        },
        $unset: {
          resetToken: '',
          resetTokenExpiresAt: '',
        },
        $push: {
          previousPasswords: {
            $each: [newPasswordHash],
            $slice: -5 // Keep only the latest 5 passwords
          }
        }
      }
    );

    if (!updateResult.modifiedCount) {
      console.error('[app/actions/auth.actions.ts] Failed to update password for user:', email);
      return { error: 'Failed to reset password. Please try again.' };
    }

    console.log('[app/actions/auth.actions.ts] Password reset successfully for user:', email);
    return { success: 'Password reset successful! You can now log in with your new password.' };

  } catch (error) {
    console.error('[app/actions/auth.actions.ts] Error in resetPassword:', error);
    let errorMessage = 'An unexpected error occurred while resetting password.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: `Password reset failed: ${errorMessage}` };
  }
}

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

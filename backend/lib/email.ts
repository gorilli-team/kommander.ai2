
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn(
    '[backend/lib/email.ts] WARNING: RESEND_API_KEY environment variable is not set. Email sending will likely fail IF this library is used.'
  );
}

const resend = new Resend(resendApiKey);

const FROM_EMAIL_ADDRESS = process.env.EMAIL_FROM || 'Kommander.ai Proto <onboarding@resend.dev>';

interface EmailResponse {
  success: boolean;
  error?: string;
}

// Funzione per generare OTP di 6 cifre
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Funzione per generare token di reset password sicuro
export function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Funzione per inviare email di reset password
export async function sendResetPasswordEmail(email: string, token: string): Promise<EmailResponse> {
  console.log(`[backend/lib/email.ts] Starting sendResetPasswordEmail for: ${email}`);

  if (!resendApiKey) {
    const errorMessage = 'Resend API key is not configured. Cannot send email.';
    console.error(`[backend/lib/email.ts] sendResetPasswordEmail: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }

  console.log(`[backend/lib/email.ts] Attempting to send password reset email to: ${email}`);

  try {
    // Determina l'URL base: usa produzione se disponibile, altrimenti localhost per sviluppo
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || 'https://app.kommander.ai')
      : 'http://localhost:9002';
    const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL_ADDRESS,
      to: [email],
      subject: 'Kommander.ai Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Password Reset Request</h2>
          <p>Hi,</p>
          <p>We received a request to reset your password. You can do so by clicking the link below:</p>
          <p><a href="${resetLink}">Reset Password</a></p>
          <p>This link is valid for 1 hour. If you didn't request a password reset, please ignore this email.</p>
          <p>Thanks,<br/>The Kommander.ai Team</p>
        </div>
      `,
      text: `You requested a password reset. Use the link to reset it: ${resetLink}. This link is valid for 1 hour.`
    });

    if (error) {
      console.error('[backend/lib/email.ts] Resend API returned error:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message || 'Failed to send password reset email due to Resend error.' };
    }

    console.log('[backend/lib/email.ts] Password reset email sent successfully. Resend response:', JSON.stringify(data, null, 2));
    return { success: true };

  } catch (exception: any) {
    console.error('[backend/lib/email.ts] Exception during email sending:', exception);
    console.error('[backend/lib/email.ts] Exception stack:', exception.stack);
    let errorMessage = 'An unexpected error occurred while trying to send the password reset email.';
    if (exception instanceof Error) {
      errorMessage = exception.message;
    }
    return { success: false, error: errorMessage };
  }
}

// La funzione sendVerificationEmail
export async function sendVerificationEmail(email: string, otp: string): Promise<EmailResponse> {
  console.log(`[backend/lib/email.ts] Starting sendVerificationEmail for: ${email}`);
  console.log(`[backend/lib/email.ts] API Key status: ${resendApiKey ? 'Present' : 'Missing'}`);
  console.log(`[backend/lib/email.ts] FROM_EMAIL_ADDRESS: ${FROM_EMAIL_ADDRESS}`);
  
  if (!resendApiKey) {
    const errorMessage = 'Resend API key is not configured. Cannot send email.';
    console.error(`[backend/lib/email.ts] sendVerificationEmail: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }

  console.log(`[backend/lib/email.ts] Attempting to send OTP email to: ${email}`);

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL_ADDRESS,
      to: [email],
      subject: 'Your Kommander.ai Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Kommander.ai Email Verification</h2>
          <p>Hello,</p>
          <p>Please use the following One-Time Password (OTP) to verify your email address:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; text-align: center;">
            ${otp}
          </p>
          <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          <p>Thanks,<br/>The Kommander.ai Team</p>
        </div>
      `,
      text: `Your Kommander.ai verification code is: ${otp}. This OTP is valid for 10 minutes.`,
    });

    if (error) {
      console.error('[backend/lib/email.ts] Resend API returned error:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message || 'Failed to send OTP email due to Resend error.' };
    }

    console.log('[backend/lib/email.ts] Verification email sent successfully. Resend response:', JSON.stringify(data, null, 2));
    return { success: true };

  } catch (exception: any) {
    console.error('[backend/lib/email.ts] Exception during email sending:', exception);
    console.error('[backend/lib/email.ts] Exception stack:', exception.stack);
    let errorMessage = 'An unexpected error occurred while trying to send the verification email.';
    if (exception instanceof Error) {
      errorMessage = exception.message;
    }
    return { success: false, error: errorMessage };
  }
}

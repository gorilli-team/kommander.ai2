
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

// La funzione sendVerificationEmail non è più usata per la registrazione diretta,
// ma la lasciamo qui nel caso volessimo reintrodurla in futuro per altri scopi (es. reset password).
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


import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;

if (!resendApiKey) {
  console.error("[backend/lib/email.ts] CRITICAL: RESEND_API_KEY is not defined.");
  throw new Error("Please define the RESEND_API_KEY environment variable.");
}

if (!emailFrom) {
  console.error("[backend/lib/email.ts] CRITICAL: EMAIL_FROM is not defined.");
  throw new Error("Please define the EMAIL_FROM environment variable.");
}

const resend = new Resend(resendApiKey);

export async function sendVerificationEmail(to: string, otp: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[backend/lib/email.ts] Attempting to send verification email to: ${to}`);
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: [to],
      subject: 'Verify Your Email Address for Kommander.ai',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Welcome to Kommander.ai!</h2>
          <p>Thanks for signing up. Please use the following One-Time Password (OTP) to verify your email address and complete your registration:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; text-align: center;">${otp}</p>
          <p>This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br/>The Kommander.ai Team</p>
        </div>
      `,
    });

    if (error) {
      console.error(`[backend/lib/email.ts] Error sending email via Resend to ${to}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[backend/lib/email.ts] Verification email sent successfully to ${to}. Message ID: ${data?.id}`);
    return { success: true };
  } catch (e: any) {
    console.error(`[backend/lib/email.ts] Exception caught while sending email to ${to}:`, e);
    return { success: false, error: e.message || "An unexpected error occurred while sending the email." };
  }
}

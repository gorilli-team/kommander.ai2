
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

// Funzione per inviare notifica di nuova conversazione
export async function sendConversationNotificationEmail(
  email: string,
  chatbotName: string,
  userMessage: string,
  siteDomain: string,
  conversationId: string
): Promise<EmailResponse> {
  console.log(`[backend/lib/email.ts] Starting sendConversationNotificationEmail for: ${email}`);
  
  if (!resendApiKey) {
    const errorMessage = 'Resend API key is not configured. Cannot send email.';
    console.error(`[backend/lib/email.ts] sendConversationNotificationEmail: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }

  console.log(`[backend/lib/email.ts] Attempting to send conversation notification to: ${email}`);

  try {
    // Tronca il messaggio se è troppo lungo per l'email
    const truncatedMessage = userMessage.length > 150 
      ? userMessage.substring(0, 150) + '...' 
      : userMessage;

    // Determina l'URL base per il link alla conversazione
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || 'https://app.kommander.ai')
      : 'http://localhost:9002';
    
    const conversationLink = `${baseUrl}/conversations?id=${conversationId}`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL_ADDRESS,
      to: [email],
      subject: `🚨 Nuova conversazione avviata su ${chatbotName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🤖 ${chatbotName}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Nuova conversazione avviata</p>
          </div>
          
          <!-- Content -->
          <div style="background: white; padding: 30px 20px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="margin-bottom: 25px;">
              <h2 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">📍 Dettagli conversazione</h2>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 15px 0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                  <strong style="color: #2c3e50;">🌐 Sito web:</strong> ${siteDomain}
                </p>
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                  <strong style="color: #2c3e50;">🕒 Data e ora:</strong> ${new Date().toLocaleString('it-IT')}
                </p>
                <p style="margin: 0; font-size: 14px; color: #666;">
                  <strong style="color: #2c3e50;">🆔 ID conversazione:</strong> ${conversationId}
                </p>
              </div>
            </div>
            
            <div style="margin-bottom: 25px;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">💬 Primo messaggio dell'utente:</h3>
              <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">
                <p style="margin: 0; font-style: italic; color: #2c3e50; line-height: 1.4;">
                  "${truncatedMessage}"
                </p>
              </div>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${conversationLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;">
                🔗 Visualizza conversazione
              </a>
            </div>
            
            <!-- Footer Note -->
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
                📧 Stai ricevendo questa notifica perché hai configurato l'email di notifica per il chatbot <strong>${chatbotName}</strong>.<br>
                Puoi modificare queste impostazioni nel tuo pannello di controllo.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `🚨 Nuova conversazione avviata su ${chatbotName}\n\n` +
            `🌐 Sito web: ${siteDomain}\n` +
            `🕒 Data e ora: ${new Date().toLocaleString('it-IT')}\n` +
            `🆔 ID conversazione: ${conversationId}\n\n` +
            `💬 Primo messaggio dell'utente:\n"${truncatedMessage}"\n\n` +
            `🔗 Visualizza conversazione: ${conversationLink}\n\n` +
            `Stai ricevendo questa notifica perché hai configurato l'email di notifica per il chatbot ${chatbotName}.`
    });

    if (error) {
      console.error('[backend/lib/email.ts] Resend API returned error:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message || 'Failed to send conversation notification email due to Resend error.' };
    }

    console.log('[backend/lib/email.ts] Conversation notification email sent successfully. Resend response:', JSON.stringify(data, null, 2));
    return { success: true };

  } catch (exception: any) {
    console.error('[backend/lib/email.ts] Exception during conversation notification email sending:', exception);
    console.error('[backend/lib/email.ts] Exception stack:', exception.stack);
    let errorMessage = 'An unexpected error occurred while trying to send the conversation notification email.';
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

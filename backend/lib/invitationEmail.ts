import { Resend } from 'resend';
import { organizationService } from './organizationService';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);
const FROM_EMAIL_ADDRESS = process.env.EMAIL_FROM || 'Kommander.ai <noreply@kommander.ai>';

interface EmailResponse {
  success: boolean;
  error?: string;
}

/**
 * Send invitation email to join organization
 */
export async function sendInvitationEmail(
  email: string,
  token: string,
  organizationId: string,
  role: string,
  message?: string
): Promise<EmailResponse> {
  console.log(`[invitationEmail] Sending invitation to: ${email}`);

  if (!resendApiKey) {
    const errorMessage = 'Resend API key is not configured. Cannot send email.';
    console.error(`[invitationEmail] ${errorMessage}`);
    return { success: false, error: errorMessage };
  }

  try {
    // Get organization details
    const organization = await organizationService.getOrganization(organizationId);
    if (!organization) {
      return { success: false, error: 'Organization not found' };
    }

    // Determine base URL for invitation link
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || 'https://app.kommander.ai')
      : 'http://localhost:9002';
    
    const inviteLink = `${baseUrl}/invite?token=${token}`;

    // Role display names
    const roleDisplayNames = {
      admin: 'Administrator',
      manager: 'Manager', 
      user: 'Team Member',
      viewer: 'Viewer',
      guest: 'Guest'
    };

    const roleDisplay = roleDisplayNames[role as keyof typeof roleDisplayNames] || role;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL_ADDRESS,
      to: [email],
      subject: `You've been invited to join ${organization.name} on Kommander.ai`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              Join ${organization.name} on Kommander.ai
            </p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              ${organization.logo ? `<img src="${organization.logo}" alt="${organization.name}" style="max-width: 100px; height: auto; margin-bottom: 20px;">` : ''}
              <h2 style="color: #333; margin: 0 0 10px 0;">${organization.name}</h2>
              ${organization.description ? `<p style="color: #666; margin: 0;">${organization.description}</p>` : ''}
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #333;">
                <strong>Role:</strong> ${roleDisplay}
              </p>
              ${message ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                  <p style="margin: 0; color: #666; font-style: italic;">"${message}"</p>
                </div>
              ` : ''}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 25px;
                font-weight: bold;
                font-size: 16px;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                transition: transform 0.2s;
              ">
                Join Organization
              </a>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⏰ This invitation expires in 7 days.</strong>
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <div style="text-align: center;">
              <h3 style="color: #333; margin: 0 0 15px 0;">What is Kommander.ai?</h3>
              <p style="color: #666; margin: 0 0 15px 0; font-size: 14px;">
                Kommander.ai is an AI-powered platform that helps teams create and manage intelligent chatbots for their businesses.
              </p>
              <p style="color: #666; margin: 0; font-size: 14px;">
                With advanced natural language processing and seamless integrations, you can deliver exceptional customer experiences.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <div style="text-align: center; color: #999; font-size: 12px;">
              <p style="margin: 0 0 10px 0;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 0;">
                If you have trouble clicking the button, copy and paste this link into your browser:<br>
                <a href="${inviteLink}" style="color: #667eea; word-break: break-all;">${inviteLink}</a>
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
You've been invited to join ${organization.name} on Kommander.ai!

Organization: ${organization.name}
${organization.description ? `Description: ${organization.description}` : ''}
Role: ${roleDisplay}
${message ? `Message: "${message}"` : ''}

Click the link below to accept the invitation:
${inviteLink}

This invitation expires in 7 days.

What is Kommander.ai?
Kommander.ai is an AI-powered platform that helps teams create and manage intelligent chatbots for their businesses. With advanced natural language processing and seamless integrations, you can deliver exceptional customer experiences.

If you didn't expect this invitation, you can safely ignore this email.
      `.trim()
    });

    if (error) {
      console.error('[invitationEmail] Resend API error:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message || 'Failed to send invitation email' };
    }

    console.log('[invitationEmail] Invitation email sent successfully:', JSON.stringify(data, null, 2));
    return { success: true };

  } catch (exception: any) {
    console.error('[invitationEmail] Exception during email sending:', exception);
    let errorMessage = 'An unexpected error occurred while sending the invitation email.';
    if (exception instanceof Error) {
      errorMessage = exception.message;
    }
    return { success: false, error: errorMessage };
  }
}

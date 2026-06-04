import nodemailer from 'nodemailer';

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'E2W LMS';
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || 'noreply@e2wlms.com';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // For development
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    console.log('🔵 ATTEMPTING TO SEND EMAIL...');
    console.log('📧 From:', `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`);
    console.log('📧 To:', options.to);
    console.log('📧 SMTP Config:', { host: SMTP_HOST, port: SMTP_PORT, user: SMTP_USER });
    
    const info = await transporter.sendMail({
      from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || '',
    });

    console.log('✅ EMAIL SENT SUCCESSFULLY:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ EMAIL SENDING FAILED:', error);
    return false;
  }
}

/**
 * Send OTP email
 */
export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  const html = getOtpEmailTemplate(otp);
  const text = `Your E2W LMS verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this code, please ignore this email.`;

  return sendEmail({
    to: email,
    subject: 'Your Login Verification Code',
    html,
    text,
  });
}

/**
 * OTP Email Template
 */
function getOtpEmailTemplate(otp: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Logo -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #111827; font-size: 28px; font-weight: 700;">E2W LMS</h1>
              <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Lead Management System</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 24px;">
                Your verification code is:
              </p>
              
              <!-- OTP Code -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 32px; margin: 0 auto; max-width: 320px;">
                <p style="margin: 0; color: white; font-size: 48px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', monospace;">
                  ${otp}
                </p>
              </div>
              
              <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 20px;">
                This code expires in <strong style="color: #111827;">5 minutes</strong>
              </p>
            </td>
          </tr>
          
          <!-- Security Notice -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 20px;">
                If you didn't request this code, please ignore this email.<br>
                <strong style="color: #374151;">Never share this code with anyone.</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} E2W LMS. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('Email server is ready');
    return true;
  } catch (error) {
    console.error('Email server verification failed:', error);
    return false;
  }
}

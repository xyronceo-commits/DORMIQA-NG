import fs from 'fs';
import path from 'path';
import nodemailer, { type SendMailOptions } from 'nodemailer';

// Email masking helper: e.g. 'john.doe@example.com' -> 'j***e@example.com'
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '***';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface MailerConfig {
  host?: string;
  port: number;
  user?: string;
  pass?: string;
  fromName: string;
  fromAddress?: string;
  replyTo: string;
}

export function getMailerConfig(): MailerConfig {
  return {
    host: process.env.SMTP_HOST?.trim(),
    port: Number(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER?.trim(),
    pass: process.env.SMTP_PASS?.trim(),
    fromName: process.env.EMAIL_FROM_NAME?.trim() || 'Dormiqa',
    fromAddress: process.env.EMAIL_FROM_ADDRESS?.trim(),
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || 'dormiqa.ng@gmail.com',
  };
}

export function isSmtpConfigured(): boolean {
  const config = getMailerConfig();
  return Boolean(config.host && config.fromAddress && (config.user ? config.pass : true));
}

// Load templates at startup
const TEMPLATES_DIR = path.resolve(process.cwd(), 'supabase', 'templates');

interface LoadedTemplates {
  confirmSignupHtml: string;
  confirmSignupText: string;
  resetPasswordHtml: string;
  resetPasswordText: string;
  passwordChangedHtml: string;
  passwordChangedText: string;
}

function loadTemplate(filename: string, fallback: string): string {
  try {
    const fullPath = path.join(TEMPLATES_DIR, filename);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }
  } catch (err) {
    console.warn(`[Mailer] Could not read template ${filename}:`, err);
  }
  return fallback;
}

const templates: LoadedTemplates = {
  confirmSignupHtml: loadTemplate('confirm-signup.html', '<p>Confirm your email: {{ .ConfirmationURL }}</p>'),
  confirmSignupText: loadTemplate('confirm-signup.txt', 'Confirm your email: {{ .ConfirmationURL }}'),
  resetPasswordHtml: loadTemplate('reset-password.html', '<p>Reset your password: {{ .ConfirmationURL }}</p>'),
  resetPasswordText: loadTemplate('reset-password.txt', 'Reset your password: {{ .ConfirmationURL }}'),
  passwordChangedHtml: loadTemplate('password-changed.html', '<p>Your Dormiqa password was changed for {{ .Email }}.</p>'),
  passwordChangedText: loadTemplate('password-changed.txt', 'Your Dormiqa password was changed for {{ .Email }}.'),
};

export function getLoadedTemplates(): LoadedTemplates {
  return { ...templates };
}

function createTransporter() {
  const config = getMailerConfig();
  if (!config.host) {
    throw new Error('SMTP host is not configured.');
  }

  const isSecure = config.port === 465;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: isSecure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
}

async function sendMailWithRetry(
  mailOptions: SendMailOptions,
  requestId: string,
  eventName: string,
  recipientEmail: string
) {
  const masked = maskEmail(recipientEmail);
  const config = getMailerConfig();

  if (!isSmtpConfigured()) {
    console.error(`[Mailer ${eventName}] FAILED: SMTP provider not configured in server environment. RequestId: ${requestId}, Recipient: ${masked}`);
    throw new Error('SMTP provider is not configured. Please configure SMTP in server settings.');
  }

  const transporter = createTransporter();
  const finalOptions: SendMailOptions = {
    ...mailOptions,
    from: `"${config.fromName}" <${config.fromAddress}>`,
    replyTo: config.replyTo,
  };

  try {
    const info = await transporter.sendMail(finalOptions);
    console.log(`[Mailer ${eventName}] SUCCESS: RequestId: ${requestId}, Recipient: ${masked}, MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.warn(`[Mailer ${eventName}] RETRYING after failure: RequestId: ${requestId}, Recipient: ${masked}, Error: ${err?.message}`);
    // Retry once on transient error
    try {
      const retryInfo = await transporter.sendMail(finalOptions);
      console.log(`[Mailer ${eventName}] SUCCESS ON RETRY: RequestId: ${requestId}, Recipient: ${masked}, MessageId: ${retryInfo.messageId}`);
      return { success: true, messageId: retryInfo.messageId };
    } catch (retryErr: any) {
      console.error(`[Mailer ${eventName}] FAILED ON RETRY: RequestId: ${requestId}, Recipient: ${masked}, Error: ${retryErr?.message}`);
      throw new Error(`Failed to send email via SMTP provider: ${retryErr?.message || 'Network/SMTP error'}`);
    }
  }
}

export async function sendPasswordChangedNotice(
  toEmail: string,
  requestId = `pwd_${Date.now()}`
): Promise<{ success: boolean; messageId?: string }> {
  const safeEmail = escapeHtml(toEmail);
  const html = templates.passwordChangedHtml.replace(/\{\{\s*\.Email\s*\}\}/g, safeEmail);
  const text = templates.passwordChangedText.replace(/\{\{\s*\.Email\s*\}\}/g, toEmail);

  return sendMailWithRetry(
    {
      to: toEmail,
      subject: 'Your Dormiqa password was changed',
      html,
      text,
    },
    requestId,
    'PASSWORD_CHANGED',
    toEmail
  );
}

export async function sendSignupConfirmationEmailDirect(
  toEmail: string,
  confirmationUrl: string,
  requestId = `cnf_${Date.now()}`
): Promise<{ success: boolean; messageId?: string }> {
  const safeEmail = escapeHtml(toEmail);
  const safeUrl = escapeHtml(confirmationUrl);
  const html = templates.confirmSignupHtml
    .replace(/\{\{\s*\.Email\s*\}\}/g, safeEmail)
    .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, safeUrl);
  const text = templates.confirmSignupText
    .replace(/\{\{\s*\.Email\s*\}\}/g, toEmail)
    .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, confirmationUrl);

  return sendMailWithRetry(
    {
      to: toEmail,
      subject: 'Confirm your Dormiqa email address',
      html,
      text,
    },
    requestId,
    'CONFIRM_SIGNUP',
    toEmail
  );
}

export async function sendPasswordResetEmailDirect(
  toEmail: string,
  resetUrl: string,
  requestId = `rst_${Date.now()}`
): Promise<{ success: boolean; messageId?: string }> {
  const safeEmail = escapeHtml(toEmail);
  const safeUrl = escapeHtml(resetUrl);
  const html = templates.resetPasswordHtml
    .replace(/\{\{\s*\.Email\s*\}\}/g, safeEmail)
    .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, safeUrl);
  const text = templates.resetPasswordText
    .replace(/\{\{\s*\.Email\s*\}\}/g, toEmail)
    .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, resetUrl);

  return sendMailWithRetry(
    {
      to: toEmail,
      subject: 'Reset your Dormiqa password',
      html,
      text,
    },
    requestId,
    'RESET_PASSWORD',
    toEmail
  );
}

import nodemailer from 'nodemailer';
import { env } from '../../config/env';

export class EmailSender {
  async sendEmail(
    recipient: string,
    subject: string,
    body: string,
    senderCredentials?: { email: string; user?: string | null; pass?: string | null },
    attachments?: any[]
  ) {
    // Fallback to .env defaults if credentials are not fully provided by DB
    const authUser = senderCredentials?.user || env.SMTP_USER;
    const authPass = senderCredentials?.pass || env.SMTP_PASSWORD;
    const fromEmail = senderCredentials?.email || env.SMTP_USER;

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: authUser,
        pass: authPass,
      },
    });

    let mailAttachments: any[] = [];
    if (attachments && attachments.length > 0) {
      mailAttachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        encoding: 'base64',
        contentType: att.contentType
      }));
    }

    const info = await transporter.sendMail({
      from: `"ReachInbox Email Scheduler" <${fromEmail}>`,
      to: recipient,
      subject: subject,
      text: body.replace(/<[^>]*>?/gm, ''),
      html: body,
      attachments: mailAttachments
    });

    return {
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info) || undefined,
    };
  }
}

export const emailSender = new EmailSender();

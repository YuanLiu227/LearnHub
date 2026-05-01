import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

interface Notification {
  type: 'keyword_match' | 'hot_topic' | 'system';
  title: string;
  body: string;
  url?: string;
}

export async function sendEmail(notification: Notification): Promise<void> {
  if (!process.env.NOTIFICATION_EMAIL) {
    console.log('Email not configured, skipping...');
    return;
  }

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'LearnHub <onboarding@resend.dev>',
      to: process.env.NOTIFICATION_EMAIL,
      subject: `🔥 Hot Monitor: ${notification.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff6b35;">🔥 ${notification.title}</h2>
          <p style="color: #333; font-size: 16px;">${notification.body}</p>
          ${notification.url ? `<p><a href="${notification.url}" style="color: #007bff;">查看详情</a></p>` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">此邮件由 Hot Monitor 自动发送</p>
        </div>
      `,
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

export async function sendBrowserNotification(notification: Notification): Promise<void> {
  // 浏览器通知由前端触发，这里只是记录日志
  console.log('Browser notification:', notification);
}

export async function notify(notification: Notification): Promise<void> {
  // 并行发送邮件和记录日志
  await Promise.all([
    sendEmail(notification),
    sendBrowserNotification(notification),
  ]);
}

import nodemailer from 'nodemailer';
import db from '../db/sqlite.js';

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 分钟

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeVerificationCode(email: string, code: string): void {
  const id = `vc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  db.prepare(`
    INSERT INTO verification_codes (id, email, code, type, expires_at, created_at)
    VALUES (?, ?, ?, 'register', ?, ?)
  `).run(id, email, code, now + CODE_EXPIRY_MS, now);
}

export function verifyVerificationCode(email: string, code: string): boolean {
  const row = db.prepare(`
    SELECT id, expires_at FROM verification_codes
    WHERE email = ? AND code = ? AND type = 'register' AND used = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(email, code) as { id: string; expires_at: number } | undefined;

  if (!row) return false;
  if (Date.now() > row.expires_at) return false;

  db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(row.id);
  return true;
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  console.log(`[Verification] Sending code ${code} to ${email}`);

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'LearnHub <onboarding@resend.dev>',
      to: email,
      subject: '[LearnHub] 邮箱验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #333; margin-bottom: 16px;">LearnHub 注册验证</h2>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">您的注册验证码为：</p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
          </div>
          <p style="color: #999; font-size: 12px;">验证码有效期为 10 分钟，请尽快完成注册。</p>
          <p style="color: #999; font-size: 12px;">如果这不是您的操作，请忽略此邮件。</p>
        </div>
      `,
    });
    console.log(`[Verification] Email sent to ${email}`);
  } catch (error) {
    console.error(`[Verification] Failed to send email to ${email}:`, error);
    throw new Error('验证码发送失败，请检查邮箱配置或稍后重试');
  }
}

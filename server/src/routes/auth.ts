import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/sqlite.js';
import { authRequired, generateToken, type AuthRequest } from '../middleware/auth.js';
import { generateCode as genVCode, storeVerificationCode, verifyVerificationCode, sendVerificationEmail } from '../services/verification.js';
import { generateCaptchaId, generateCode as genCaptchaCode, storeCaptcha, verifyCaptcha, generateCaptchaSvg } from '../services/captcha.js';

const router = Router();

function generateId(): string {
  return `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 密码强度校验 */
function validatePassword(password: string): string | null {
  if (password.length < 6) return '密码长度至少 6 个字符';
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const categories = [hasLetter, hasDigit, hasSpecial].filter(Boolean).length;
  if (categories < 2) return '密码需包含字母、数字、特殊字符中的至少两种';
  return null;
}

/** 校验邮箱格式 */
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** SMTP 是否已配置 */
function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST || '';
  const user = process.env.SMTP_USER || '';
  return !host.includes('your-') && !user.includes('your-') && host.length > 0 && user.length > 0;
}

/** 校验图形验证码 */
function requireCaptcha(req: { body: { captchaId?: string; captchaCode?: string } }, res: any): boolean {
  const { captchaId, captchaCode } = req.body;
  if (!captchaId || !captchaCode) {
    res.status(400).json({ error: '缺少图形验证码' });
    return false;
  }
  if (!verifyCaptcha(captchaId, captchaCode)) {
    res.status(400).json({ error: '图形验证码错误或已过期' });
    return false;
  }
  return true;
}

// 获取图形验证码
router.get('/captcha', (req, res) => {
  const id = generateCaptchaId();
  const code = genCaptchaCode();
  storeCaptcha(id, code);
  const svg = generateCaptchaSvg(code);
  res.json({ captchaId: id, svg });
});

// 第一步：提交邮箱+密码，发送验证码
router.post('/register', async (req, res) => {
  try {
    if (!requireCaptcha(req, res)) return;

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码为必填项' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    const pwdError = validatePassword(password);
    if (pwdError) return res.status(400).json({ error: pwdError });

    // 检查邮箱是否已注册
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }

    // 生成邮箱验证码并发送
    const vcode = genVCode();
    storeVerificationCode(email, vcode);
    console.log(`[Auth] Verification code for ${email}: ${vcode}`);

    if (isSmtpConfigured()) {
      sendVerificationEmail(email, vcode).catch(err => {
        console.error('[Auth] Failed to send verification email:', err);
      });
      res.json({ success: true, message: '验证码已发送到您的邮箱' });
    } else {
      console.log(`[Auth] SMTP not configured — dev mode: code is ${vcode}`);
      res.json({
        success: true,
        message: `验证码已发送到您的邮箱`,
        devCode: vcode,
      });
    }
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || '注册失败' });
  }
});

// 第二步：提交验证码，完成注册
router.post('/register/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: '邮箱和验证码为必填项' });
    }

    // 邮箱验证码校验
    if (!verifyVerificationCode(email, code)) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    // 再次检查邮箱是否已被注册（防止重复提交）
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
    if (existing) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: '密码缺失，请重新注册' });
    }

    const id = generateId();
    const passwordHash = bcrypt.hashSync(password, 10);
    const createdAt = Date.now();

    db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
      .run(id, email, passwordHash, createdAt);

    const token = generateToken(id, email);
    res.status(201).json({ token, user: { id, email } });
  } catch (error: any) {
    console.error('Register verify error:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录：邮箱 + 密码
router.post('/login', (req, res) => {
  try {
    if (!requireCaptcha(req, res)) return;

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码为必填项' });
    }

    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!row) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    if (!bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = generateToken(row.id, row.email);
    res.json({ token, user: { id: row.id, email: row.email } });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 重新发送验证码
router.post('/resend-code', async (req, res) => {
  try {
    if (!requireCaptcha(req, res)) return;

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: '邮箱为必填项' });
    if (!validateEmail(email)) return res.status(400).json({ error: '邮箱格式不正确' });

    const vcode = genVCode();
    storeVerificationCode(email, vcode);
    console.log(`[Auth] Resend code for ${email}: ${vcode}`);

    if (isSmtpConfigured()) {
      sendVerificationEmail(email, vcode).catch(err => {
        console.error('[Auth] Failed to resend verification email:', err);
      });
      res.json({ success: true, message: '验证码已重新发送' });
    } else {
      res.json({ success: true, message: '验证码已重新发送', devCode: vcode });
    }
  } catch (error: any) {
    console.error('Resend code error:', error);
    res.status(500).json({ error: '重新发送失败' });
  }
});

router.get('/me', authRequired, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export default router;

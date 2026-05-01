import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { authApi } from '@/services/api';
import { PasswordStrength } from '@/components/auth/PasswordStrength';

type Step = 'login' | 'register' | 'verify';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginPage() {
  const { login, sendRegisterCode, verifyRegisterCode } = useAppStore();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');         // email 验证码
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaInput, setCaptchaInput] = useState(''); // 图形验证码输入
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchCaptcha = useCallback(async () => {
    try {
      const data = await authApi.getCaptcha();
      setCaptchaId(data.captchaId);
      setCaptchaSvg(data.svg);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setCode('');
    setCaptchaInput('');
    setError(null);
    setMessage(null);
    setStep('login');
    fetchCaptcha();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) { setError('请输入正确的邮箱格式'); return; }
    if (!captchaInput) { setError('请输入图形验证码'); return; }
    setLoading(true);
    try {
      await login(email, password, captchaId, captchaInput);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '登录失败');
      fetchCaptcha();
      setCaptchaInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!isValidEmail(email)) { setError('请输入正确的邮箱格式'); return; }
    if (!captchaInput) { setError('请输入图形验证码'); return; }
    if (password.length < 6) { setError('密码长度至少 6 个字符'); return; }
    if (password !== confirmPassword) { setError('两次密码输入不一致'); return; }
    setLoading(true);
    try {
      const result = await sendRegisterCode(email, password, captchaId, captchaInput);
      setStep('verify');
      setMessage('验证码已发送到您的邮箱，请查收');
      // 开发模式下不自动填入，可在控制台查看验证码
      if (result.devCode) {
        console.log('[Dev] 验证码:', result.devCode);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '发送验证码失败');
      fetchCaptcha();
      setCaptchaInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code || code.length < 4) { setError('请输入邮箱验证码'); return; }
    setLoading(true);
    try {
      await verifyRegisterCode(email, code, password, captchaId, captchaInput);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '验证失败');
      fetchCaptcha();
      setCaptchaInput('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-dot-grid pointer-events-none" />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 mb-4">
            <BookOpen className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-text tracking-tight">LearnHub</h1>
          <p className="text-sm text-text-secondary mt-1">学习内容搜索平台</p>
        </div>

        {/* 登录 */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-medium text-text text-center">登录</h2>

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 text-center">{error}</div>
            )}

            <div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="邮箱"
                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-sm"
                autoFocus
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密码"
                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-sm"
              />
            </div>

            {/* 图形验证码 — 左输入 + 右 SVG */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={captchaInput}
                onChange={e => setCaptchaInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="验证码"
                className="flex-1 px-3 py-1.5 bg-surface border border-border rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-sm tracking-[4px] font-mono text-center"
                maxLength={4}
              />
              <img
                src={captchaSvg ? `data:image/svg+xml;base64,${btoa(captchaSvg)}` : ''}
                alt="验证码"
                className="border border-border rounded-lg cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                onClick={fetchCaptcha}
                title="点击刷新验证码"
                width={120}
                height={44}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password || !captchaInput}
              className="w-full py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              登录
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setStep('register'); setError(null); setCaptchaInput(''); fetchCaptcha(); }}
                className="text-xs text-text-tertiary hover:text-accent transition-colors"
              >
                没有账号？去注册
              </button>
            </div>
          </form>
        )}

        {/* 注册 - 第一步 */}
        {step === 'register' && (
          <form onSubmit={handleSendCode} className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={resetForm} className="text-text-tertiary hover:text-text transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-medium text-text">注册</h2>
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 text-center">{error}</div>
            )}

            <div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="邮箱"
                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-sm"
                autoFocus
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密码"
                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-sm"
              />
              <PasswordStrength password={password} />
            </div>

            <div>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="确认密码"
                className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-sm"
              />
            </div>

            {/* 图形验证码 — 左输入 + 右 SVG */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={captchaInput}
                onChange={e => setCaptchaInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="验证码"
                className="flex-1 px-3 py-1.5 bg-surface border border-border rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-sm tracking-[4px] font-mono text-center"
                maxLength={4}
              />
              <img
                src={captchaSvg ? `data:image/svg+xml;base64,${btoa(captchaSvg)}` : ''}
                alt="验证码"
                className="border border-border rounded-lg cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                onClick={fetchCaptcha}
                title="点击刷新验证码"
                width={120}
                height={44}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password || !confirmPassword || !captchaInput}
              className="w-full py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              发送验证码
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setStep('login'); setError(null); setCaptchaInput(''); fetchCaptcha(); }}
                className="text-xs text-text-tertiary hover:text-accent transition-colors"
              >
                已有账号？去登录
              </button>
            </div>
          </form>
        )}

        {/* 注册 - 第二步：邮箱验证码 */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { setStep('register'); setError(null); setCode(''); fetchCaptcha(); }} className="text-text-tertiary hover:text-text transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-medium text-text">验证邮箱</h2>
            </div>

            {message && (
              <div className="text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {message}
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 text-center">{error}</div>
            )}

            <p className="text-xs text-text-secondary text-center">
              验证码已发送至 <span className="text-text font-medium">{email}</span>
            </p>

            <div>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="输入邮箱验证码"
                className="w-full px-3.5 py-3 bg-surface border border-border rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-lg text-center tracking-[8px] font-mono"
                autoFocus
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 4}
              className="w-full py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              确认注册
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import { useMemo } from 'react';

interface Props {
  password: string;
}

export function PasswordStrength({ password }: Props) {
  const checks = useMemo(() => {
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const categories = [hasLetter, hasDigit, hasSpecial].filter(Boolean).length;
    return { hasLetter, hasDigit, hasSpecial, strong: password.length >= 6 && categories >= 2 };
  }, [password]);

  if (!password) return null;

  const items = [
    { label: '字母 (a-z, A-Z)', ok: checks.hasLetter },
    { label: '数字 (0-9)', ok: checks.hasDigit },
    { label: '特殊字符 (!@#$% 等)', ok: checks.hasSpecial },
  ];

  return (
    <div className="space-y-1 mt-1.5">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`text-xs ${item.ok ? 'text-green-400' : 'text-text-tertiary'}`}>
            {item.ok ? '✓' : '○'}
          </span>
          <span className={`text-xs ${item.ok ? 'text-green-400' : 'text-text-tertiary'}`}>
            {item.label}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className={`text-xs ${checks.strong ? 'text-green-400' : 'text-text-tertiary'}`}>
          {checks.strong ? '✓' : '○'}
        </span>
        <span className={`text-xs ${checks.strong ? 'text-green-400' : 'text-text-tertiary'}`}>
          至少满足 2 项即可
        </span>
      </div>
    </div>
  );
}

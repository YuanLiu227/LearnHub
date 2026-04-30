/**
 * 简易图形验证码 — 生成 4 位数字 SVG + 服务端存储校验
 */

const captchaStore = new Map<string, { code: string; expiresAt: number }>();
const TTL = 5 * 60 * 1000; // 5 分钟

// 定期清理过期验证码
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of captchaStore) {
    if (now > data.expiresAt) captchaStore.delete(id);
  }
}, 60 * 1000);

export function generateCaptchaId(): string {
  return `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function storeCaptcha(id: string, code: string): void {
  captchaStore.set(id, { code, expiresAt: Date.now() + TTL });
}

export function verifyCaptcha(id: string, code: string): boolean {
  const data = captchaStore.get(id);
  if (!data) return false;
  if (Date.now() > data.expiresAt) {
    captchaStore.delete(id);
    return false;
  }
  const ok = data.code === code;
  captchaStore.delete(id); // 一次性使用
  return ok;
}

/**
 * 生成 4 位数字 SVG 验证码图片
 */
export function generateCaptchaSvg(code: string): string {
  const chars = code.split('');
  const width = 120;
  const height = 44;

  // 随机颜色
  const colors = ['#ff6b35', '#2563eb', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b'];

  // 为每个数字生成随机偏移和旋转
  const positions = chars.map((char, i) => {
    const x = 18 + i * 24 + Math.random() * 8;
    const y = 28 + Math.random() * 8 - 4;
    const angle = (Math.random() - 0.5) * 30;
    const color = colors[Math.floor(Math.random() * colors.length)];
    return { char, x, y, angle, color, size: 22 + Math.random() * 6 };
  });

  // 干扰线
  const lines = Array.from({ length: 4 }, () => ({
    x1: Math.random() * width,
    y1: Math.random() * height,
    x2: Math.random() * width,
    y2: Math.random() * height,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  // 干扰点
  const dots = Array.from({ length: 30 }, () => ({
    cx: Math.random() * width,
    cy: Math.random() * height,
    r: 1 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  const textElements = positions.map(p =>
    `<text x="${p.x}" y="${p.y}" font-size="${p.size}" fill="${p.color}"
            transform="rotate(${p.angle},${p.x},${p.y})"
            font-family="monospace" font-weight="bold">${p.char}</text>`
  ).join('\n    ');

  const lineElements = lines.map(l =>
    `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"
           stroke="${l.color}" stroke-width="1.5" opacity="0.5"/>`
  ).join('\n    ');

  const dotElements = dots.map(d =>
    `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="${d.color}" opacity="0.6"/>`
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f8f8f8" rx="4"/>
  <g>
    ${lineElements}
    ${dotElements}
    ${textElements}
  </g>
</svg>`;
}

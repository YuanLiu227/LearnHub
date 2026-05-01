import { Router } from 'express';
import db from '../db/sqlite.js';
import { authRequired, type AuthRequest } from '../middleware/auth.js';
import { getEffectiveConfig, setUserConfigValue, deleteUserConfigValue } from '../services/config.js';

const router = Router();

// 默认配置
const defaultConfig = {
  hotInterval: 1800000,      // 30 分钟
  monitorInterval: 900000,   // 15 分钟
  emailEnabled: true,
  notificationEnabled: true,
};

// 获取配置
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM config').all() as { key: string; value: string }[];
    const config: Record<string, any> = { ...defaultConfig };

    for (const row of rows) {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch {
        config[row.key] = row.value;
      }
    }

    res.json(config);
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// 更新配置
router.put('/', (req, res) => {
  try {
    const updates = req.body;

    const upsert = db.prepare(`
      INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)
    `);

    for (const [key, value] of Object.entries(updates)) {
      upsert.run(key, JSON.stringify(value));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

const SECRET_KEYS = new Set(['DEEPSEEK_API_KEY', 'YOUTUBE_API_KEY', 'YOUTUBE_PROXY_URL']);

function maskSecretValue(key: string, value: string | null): string | null {
  if (!value) return null;
  if (key === 'YOUTUBE_PROXY_URL') {
    try {
      const url = new URL(value);
      if (url.password) return `${url.protocol}//***:***@${url.hostname}${url.port ? ':' + url.port : ''}`;
    } catch {}
    return value;
  }
  // API 密钥：只显示首尾
  if (value.length > 8) return value.slice(0, 3) + '****' + value.slice(-4);
  return '****';
}

// 获取当前用户的配置及来源信息
router.get('/user', authRequired, (req: AuthRequest, res) => {
  try {
    const config = getEffectiveConfig(req.user!.userId!);
    // 对密钥类字段做掩码处理
    const masked = Object.fromEntries(
      Object.entries(config).map(([key, val]) => [
        key,
        val.source === 'user' && SECRET_KEYS.has(key)
          ? { value: maskSecretValue(key, val.value), source: val.source }
          : val,
      ]),
    );
    res.json(masked);
  } catch (error) {
    console.error('User config error:', error);
    res.status(500).json({ error: 'Failed to fetch user config' });
  }
});

// 更新用户配置
router.put('/user', authRequired, (req: AuthRequest, res) => {
  try {
    const { key, value } = req.body;
    const userId = req.user!.userId;
    if (!key) {
      return res.status(400).json({ error: 'key is required' });
    }
    if (value === null || value === undefined) {
      deleteUserConfigValue(key, userId);
    } else {
      setUserConfigValue(key, String(value), userId);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('User config update error:', error);
    res.status(500).json({ error: 'Failed to update user config' });
  }
});

export default router;

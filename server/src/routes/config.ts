import { Router } from 'express';
import db from '../db/sqlite.js';

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

export default router;

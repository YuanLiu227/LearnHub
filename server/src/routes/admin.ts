import { Router } from 'express';
import db from '../db/sqlite.js';
import { adminRequired, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// 所有路由使用 adminRequired 中间件
router.use(adminRequired);

// 获取用户列表（分页）
router.get('/users', (req: AuthRequest, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const rows = db.prepare(
      'SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(Number(pageSize), offset);

    const countResult = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;

    res.json({ users: rows, total: countResult.count, page: Number(page), pageSize: Number(pageSize) });
  } catch (error: any) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 删除用户
router.delete('/users/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.userId;

    // 不能删除自己
    if (id === adminId) {
      return res.status(400).json({ error: '不能删除自己的账号' });
    }

    // 检查目标用户是否存在
    const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id) as any;
    if (!target) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 如果是管理员，检查是否为最后一个管理员
    if (target.role === 'admin') {
      const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as any).count;
      if (adminCount <= 1) {
        return res.status(400).json({ error: '不能删除最后一个管理员账号' });
      }
    }

    // 级联删除关联数据
    db.prepare('DELETE FROM news_items WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM keywords WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM followed_creators WHERE user_id = ?').run(id);
    db.prepare("DELETE FROM config WHERE user_id = ?").run(id);
    db.prepare('DELETE FROM verification_codes WHERE email = (SELECT email FROM users WHERE id = ?)').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// 冻结用户
router.patch('/users/:id/freeze', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.userId;

    if (id === adminId) {
      return res.status(400).json({ error: '不能冻结自己的账号' });
    }

    const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id) as any;
    if (!target) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 不能冻结管理员
    if (target.role === 'admin') {
      return res.status(400).json({ error: '不能冻结管理员账号' });
    }

    db.prepare("UPDATE users SET status = 'frozen' WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Admin freeze user error:', error);
    res.status(500).json({ error: '冻结用户失败' });
  }
});

// 解冻用户
router.patch('/users/:id/unfreeze', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(id) as any;
    if (!target) {
      return res.status(404).json({ error: '用户不存在' });
    }

    db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Admin unfreeze user error:', error);
    res.status(500).json({ error: '解冻用户失败' });
  }
});

// 获取系统设置
router.get('/settings', (req: AuthRequest, res) => {
  try {
    const regRow = db.prepare("SELECT value FROM config WHERE key = 'registration_enabled'").get() as any;
    const registrationEnabled = regRow ? regRow.value !== 'false' : true;
    res.json({ registrationEnabled });
  } catch (error: any) {
    console.error('Admin get settings error:', error);
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 更新系统设置
router.put('/settings', (req: AuthRequest, res) => {
  try {
    const { registrationEnabled } = req.body;

    // 使用 upsert 逻辑
    const existing = db.prepare("SELECT key FROM config WHERE key = 'registration_enabled'").get();
    if (existing) {
      db.prepare("UPDATE config SET value = ? WHERE key = 'registration_enabled'").run(registrationEnabled ? 'true' : 'false');
    } else {
      db.prepare("INSERT INTO config (key, value) VALUES ('registration_enabled', ?)").run(registrationEnabled ? 'true' : 'false');
    }

    res.json({ success: true, registrationEnabled });
  } catch (error: any) {
    console.error('Admin update settings error:', error);
    res.status(500).json({ error: '更新设置失败' });
  }
});

export default router;

import { Router } from 'express';
import db from '../db/sqlite.js';
import type { Keyword } from '../types/index.js';
import { authRequired, type AuthRequest } from '../middleware/auth.js';

const router = Router();

function generateId(): string {
  return `kw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 行转 Keyword */
function toKeyword(row: any): Keyword {
  return {
    id: row.id,
    term: row.term,
    scope: row.scope,
    enabled: Boolean(row.enabled),
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    lastMatchedAt: row.last_matched_at,
    hotspotCount: row.hotspot_count ?? 0,
  };
}

// 获取活跃关键词（未归档的）
router.get('/', authRequired, (req: AuthRequest, res) => {
  try {
    const keywords = db.prepare(`
      SELECT k.*,
        (SELECT COUNT(*) FROM news_items WHERE keyword_id = k.id) as hotspot_count
      FROM keywords k
      WHERE k.archived IS NOT 1 AND k.user_id = ?
      ORDER BY k.created_at DESC
    `).all(req.user!.userId);
    res.json({ keywords: keywords.map(toKeyword) });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

// 获取所有关键词（含已归档，用于总览）
router.get('/all', authRequired, (req: AuthRequest, res) => {
  try {
    const keywords = db.prepare(`
      SELECT k.*,
        (SELECT COUNT(*) FROM news_items WHERE keyword_id = k.id) as hotspot_count
      FROM keywords k
      WHERE k.user_id = ?
      ORDER BY k.archived ASC, k.created_at DESC
    `).all(req.user!.userId);
    res.json({ keywords: keywords.map(toKeyword) });
  } catch (error) {
    console.error('Error fetching all keywords:', error);
    res.status(500).json({ error: 'Failed to fetch all keywords' });
  }
});

// 添加关键词
router.post('/', authRequired, (req: AuthRequest, res) => {
  try {
    const { term, scope = 'AI编程' } = req.body;

    if (!term) {
      return res.status(400).json({ error: 'term is required' });
    }

    // 检查是否已存在相同关键词
    const existing = db.prepare('SELECT id FROM keywords WHERE term = ? AND user_id = ?').get(term, req.user!.userId);
    if (existing) {
      return res.status(409).json({ error: '关键词已存在' });
    }

    const id = generateId();
    const createdAt = Date.now();

    db.prepare(`
      INSERT INTO keywords (id, term, scope, enabled, created_at, user_id)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(id, term, scope, createdAt, req.user!.userId);

    res.status(201).json(toKeyword({ id, term, scope, enabled: 1, created_at: createdAt, archived: 0, hotspot_count: 0 }));
  } catch (error) {
    console.error('Error adding keyword:', error);
    res.status(500).json({ error: 'Failed to add keyword' });
  }
});

// 归档关键词（保留资源）
router.post('/archive', authRequired, (req: AuthRequest, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });

    db.prepare('UPDATE keywords SET archived = 1, enabled = 0 WHERE id = ? AND user_id = ?').run(id, req.user!.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving keyword:', error);
    res.status(500).json({ error: 'Failed to archive keyword' });
  }
});

// 恢复归档关键词
router.post('/restore', authRequired, (req: AuthRequest, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });
    db.prepare('UPDATE keywords SET archived = 0, enabled = 1 WHERE id = ? AND user_id = ?').run(id, req.user!.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error restoring keyword:', error);
    res.status(500).json({ error: 'Failed to restore keyword' });
  }
});

// 永久删除关键词 + 关联资源
router.delete('/permanent', authRequired, (req: AuthRequest, res) => {
  try {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'id is required' });

    db.prepare("DELETE FROM news_items WHERE keyword_id = ? AND (favorited IS NOT 1 OR favorited IS NULL) AND user_id = ?").run(id, req.user!.userId);
    db.prepare('DELETE FROM keywords WHERE id = ? AND user_id = ?').run(id, req.user!.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error permanently deleting keyword:', error);
    res.status(500).json({ error: 'Failed to permanently delete keyword' });
  }
});

// 更新关键词
router.patch('/', authRequired, (req: AuthRequest, res) => {
  try {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });

    if (updates.enabled !== undefined) {
      db.prepare('UPDATE keywords SET enabled = ? WHERE id = ? AND user_id = ?').run(updates.enabled ? 1 : 0, id, req.user!.userId);
    }
    if (updates.lastMatchedAt !== undefined) {
      db.prepare('UPDATE keywords SET last_matched_at = ? WHERE id = ? AND user_id = ?').run(updates.lastMatchedAt, id, req.user!.userId);
    }

    const row = db.prepare('SELECT * FROM keywords WHERE id = ? AND user_id = ?').get(id, req.user!.userId) as Record<string, unknown>;
    if (!row) return res.status(404).json({ error: 'Keyword not found' });

    res.json(toKeyword(row));
  } catch (error) {
    console.error('Error updating keyword:', error);
    res.status(500).json({ error: 'Failed to update keyword' });
  }
});

export default router;

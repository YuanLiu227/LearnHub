import { Router } from 'express';
import db from '../db/sqlite.js';
import type { Keyword } from '../types/index.js';

const router = Router();

function generateId(): string {
  return `kw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// 获取所有关键词
router.get('/', (req, res) => {
  try {
    const keywords = db.prepare(`
      SELECT k.*,
        (SELECT COUNT(*) FROM news_items WHERE keyword_id = k.id) as hotspot_count
      FROM keywords k
      ORDER BY k.created_at DESC
    `).all();
    const result: Keyword[] = keywords.map((row: any) => ({
      id: row.id,
      term: row.term,
      scope: row.scope,
      enabled: Boolean(row.enabled),
      createdAt: row.created_at,
      lastMatchedAt: row.last_matched_at,
      hotspotCount: row.hotspot_count,
    }));
    res.json({ keywords: result });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

// 添加关键词
router.post('/', (req, res) => {
  try {
    const { term, scope = 'AI编程' } = req.body;

    if (!term) {
      return res.status(400).json({ error: 'term is required' });
    }

    const id = generateId();
    const createdAt = Date.now();

    db.prepare(`
      INSERT INTO keywords (id, term, scope, enabled, created_at)
      VALUES (?, ?, ?, 1, ?)
    `).run(id, term, scope, createdAt);

    const keyword: Keyword = {
      id,
      term,
      scope,
      enabled: true,
      createdAt,
    };

    res.status(201).json(keyword);
  } catch (error) {
    console.error('Error adding keyword:', error);
    res.status(500).json({ error: 'Failed to add keyword' });
  }
});

// 删除关键词
router.delete('/', (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    // 先删除关联的新闻记录
    db.prepare('DELETE FROM news_items WHERE keyword_id = ?').run(id);
    // 再删除关键词
    db.prepare('DELETE FROM keywords WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting keyword:', error);
    res.status(500).json({ error: 'Failed to delete keyword' });
  }
});

// 更新关键词
router.patch('/', (req, res) => {
  try {
    const { id, ...updates } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    if (updates.enabled !== undefined) {
      db.prepare('UPDATE keywords SET enabled = ? WHERE id = ?').run(updates.enabled ? 1 : 0, id);
    }

    if (updates.lastMatchedAt !== undefined) {
      db.prepare('UPDATE keywords SET last_matched_at = ? WHERE id = ?').run(updates.lastMatchedAt, id);
    }

    const keyword = db.prepare('SELECT * FROM keywords WHERE id = ?').get(id) as any;
    if (!keyword) {
      return res.status(404).json({ error: 'Keyword not found' });
    }

    res.json({
      id: keyword.id,
      term: keyword.term,
      scope: keyword.scope,
      enabled: Boolean(keyword.enabled),
      createdAt: keyword.created_at,
      lastMatchedAt: keyword.last_matched_at,
    });
  } catch (error) {
    console.error('Error updating keyword:', error);
    res.status(500).json({ error: 'Failed to update keyword' });
  }
});

export default router;

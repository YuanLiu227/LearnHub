import { Router } from 'express';
import db from '../db/sqlite.js';

const router = Router();

interface DashboardStats {
  totalHotspots: number;
  todayNew: number;
  urgentHot: number;
  monitoredKeywords: number;
}

// 获取仪表盘统计数据
router.get('/stats', (_req, res) => {
  try {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);

    const totalHotspots = (db.prepare('SELECT COUNT(*) as count FROM news_items').get() as any).count;
    const todayNew = (db.prepare('SELECT COUNT(*) as count FROM news_items WHERE matched_at > ?').get(todayStart) as any).count;
    const urgentHot = (db.prepare('SELECT COUNT(*) as count FROM news_items WHERE is_urgent = 1').get() as any).count;
    const monitoredKeywords = (db.prepare('SELECT COUNT(*) as count FROM keywords WHERE enabled = 1').get() as any).count;

    const stats: DashboardStats = {
      totalHotspots,
      todayNew,
      urgentHot,
      monitoredKeywords,
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 获取热点列表（分页）
router.get('/hotspots', (req, res) => {
  try {
    const { page = 1, pageSize = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const rows = db.prepare(`
      SELECT n.*, k.term as keyword_term
      FROM news_items n
      LEFT JOIN keywords k ON n.keyword_id = k.id
      ORDER BY n.matched_at DESC
      LIMIT ? OFFSET ?
    `).all(Number(pageSize), offset);

    const total = (db.prepare('SELECT COUNT(*) as count FROM news_items').get() as any).count;

    const items = rows.map((row: any) => ({
      id: row.id,
      keywordId: row.keyword_id,
      keywordTerm: row.keyword_term,
      title: row.title,
      url: row.url,
      source: row.source,
      sourceName: row.source_name,
      publishedAt: row.published_at,
      isReal: Boolean(row.is_real),
      confidence: row.confidence,
      summary: row.summary,
      matchedAt: row.matched_at,
      isUrgent: Boolean(row.is_urgent),
      heat: row.heat,
    }));

    res.json({ items, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    console.error('Hotspots list error:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
});

// 搜索热点
router.get('/search', (req, res) => {
  try {
    const { q = '', page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    if (!q || q.toString().trim() === '') {
      return res.json({ items: [], total: 0 });
    }

    const searchTerm = `%${q}%`;

    const rows = db.prepare(`
      SELECT n.*, k.term as keyword_term
      FROM news_items n
      LEFT JOIN keywords k ON n.keyword_id = k.id
      WHERE n.title LIKE ? OR n.summary LIKE ?
      ORDER BY n.matched_at DESC
      LIMIT ? OFFSET ?
    `).all(searchTerm, searchTerm, Number(pageSize), offset);

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM news_items
      WHERE title LIKE ? OR summary LIKE ?
    `).get(searchTerm, searchTerm) as any;

    const items = rows.map((row: any) => ({
      id: row.id,
      keywordId: row.keyword_id,
      keywordTerm: row.keyword_term,
      title: row.title,
      url: row.url,
      source: row.source,
      sourceName: row.source_name,
      publishedAt: row.published_at,
      isReal: Boolean(row.is_real),
      confidence: row.confidence,
      summary: row.summary,
      matchedAt: row.matched_at,
      isUrgent: Boolean(row.is_urgent),
      heat: row.heat,
    }));

    res.json({
      items,
      total: countResult.count,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

export default router;

import { Router } from 'express';
import db from '../db/sqlite.js';

interface CountRow {
  count: number;
}

interface NewsItemRow {
  id: string;
  keyword_id: string;
  keyword_term: string | null;
  title: string;
  url: string;
  source: string;
  source_name: string;
  published_at: number;
  is_real: number;
  confidence: number;
  summary: string | null;
  matched_at: number;
  is_urgent: number;
  heat: number;
}

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

    const totalHotspots = (db.prepare('SELECT COUNT(*) as count FROM news_items').get() as CountRow).count;
    const todayNew = (db.prepare('SELECT COUNT(*) as count FROM news_items WHERE matched_at > ?').get(todayStart) as CountRow).count;
    const urgentHot = (db.prepare('SELECT COUNT(*) as count FROM news_items WHERE is_urgent = 1').get() as CountRow).count;
    const monitoredKeywords = (db.prepare('SELECT COUNT(*) as count FROM keywords WHERE enabled = 1').get() as CountRow).count;

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

// 获取热点列表（分页，可选按来源筛选）
router.get('/hotspots', (req, res) => {
  try {
    const { page = 1, pageSize = 20, source } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const params: any[] = [];

    let whereClause = '';
    if (source && source !== 'all') {
      whereClause = 'WHERE n.source = ?';
      params.push(source);
    }

    const rows = db.prepare(`
      SELECT n.*, k.term as keyword_term
      FROM news_items n
      LEFT JOIN keywords k ON n.keyword_id = k.id
      ${whereClause}
      ORDER BY n.heat DESC, n.matched_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(pageSize), offset);

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM news_items n
      ${whereClause}
    `).get(...params) as CountRow;

    const items = rows.map((row: NewsItemRow) => ({
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

    res.json({ items, total: countResult.count, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    console.error('Hotspots list error:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
});

// 搜索热点（同时搜索 news_items 和 hot_topics）
router.get('/search', (req, res) => {
  try {
    const { q = '', page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    if (!q || q.toString().trim() === '') {
      return res.json({ items: [], total: 0 });
    }

    const searchTerm = `%${q}%`;

    // 搜索 news_items + hot_topics 两张表，并包含 keyword_term 匹配
    const newsRows = db.prepare(`
      SELECT n.*, k.term as keyword_term, 'news' as _data_type
      FROM news_items n
      LEFT JOIN keywords k ON n.keyword_id = k.id
      WHERE n.title LIKE ? OR n.summary LIKE ? OR k.term LIKE ?
      ORDER BY n.heat DESC, n.matched_at DESC
      LIMIT ? OFFSET ?
    `).all(searchTerm, searchTerm, searchTerm, Number(pageSize), offset) as NewsItemRow[];

    const hotRows = db.prepare(`
      SELECT
        id, NULL as keyword_id, title, url, source, source_name,
        published_at, 1 as is_real, 1.0 as confidence, summary,
        fetched_at as matched_at, 0 as is_urgent, heat,
        NULL as keyword_term, 'hot' as _data_type
      FROM hot_topics
      WHERE title LIKE ? OR summary LIKE ?
      ORDER BY fetched_at DESC
    `).all(searchTerm, searchTerm) as HotTopicRow[];

    // 合并结果，按 matched_at 倒序，去重 URL
    const seenUrls = new Set<string>();
    const merged = [...newsRows, ...hotRows]
      .filter((item: NewsItemRow | HotTopicRow) => {
        if (seenUrls.has(item.url)) return false;
        seenUrls.add(item.url);
        return true;
      })
      .sort((a: NewsItemRow | HotTopicRow, b: NewsItemRow | HotTopicRow) => (b.heat || 0) - (a.heat || 0) || b.matched_at - a.matched_at)
      .slice(offset, offset + Number(pageSize));

    // 统计总数（去重后）
    const newsCount = (db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT n.url FROM news_items n
        LEFT JOIN keywords k ON n.keyword_id = k.id
        WHERE n.title LIKE ? OR n.summary LIKE ? OR k.term LIKE ?
        UNION
        SELECT url FROM hot_topics WHERE title LIKE ? OR summary LIKE ?
      )
    `).get(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm) as CountRow).count;

    const items = merged.map((row: NewsItemRow | HotTopicRow) => ({
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
      total: newsCount,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// 删除单个资源
router.delete('/resource/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM news_items WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;

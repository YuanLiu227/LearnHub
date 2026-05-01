import { Router } from 'express';
import db from '../db/sqlite.js';
import { authRequired, type AuthRequest } from '../middleware/auth.js';

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
  creator_id: string | null;
  creator_name: string | null;
  completed?: number;
  favorited?: number;
  resource_type?: string;
}

interface HotTopicRow {
  id: string;
  keyword_id: null;
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
  keyword_term: null;
  creator_id: null;
  creator_name: null;
}

const router = Router();

interface DashboardStats {
  totalHotspots: number;
  todayNew: number;
  urgentHot: number;
  monitoredKeywords: number;
}

// 获取仪表盘统计数据
router.get('/stats', authRequired, (req: AuthRequest, res) => {
  try {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const userId = req.user!.userId;

    const totalHotspots = (db.prepare('SELECT COUNT(*) as count FROM news_items WHERE user_id = ?').get(userId) as unknown as CountRow).count;
    const todayNew = (db.prepare('SELECT COUNT(*) as count FROM news_items WHERE matched_at > ? AND user_id = ?').get(todayStart, userId) as unknown as CountRow).count;
    const urgentHot = (db.prepare('SELECT COUNT(*) as count FROM news_items WHERE is_urgent = 1 AND user_id = ?').get(userId) as unknown as CountRow).count;
    const monitoredKeywords = (db.prepare('SELECT COUNT(*) as count FROM keywords WHERE enabled = 1 AND user_id = ?').get(userId) as unknown as CountRow).count;

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

// 获取热点列表（分页，可选按来源或资源类型筛选）
router.get('/hotspots', authRequired, (req: AuthRequest, res) => {
  try {
    const { page = 1, pageSize = 20, source, resourceType } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const params: any[] = [req.user!.userId];

    let whereClause = 'WHERE n.user_id = ?';
    if (source && source !== 'all') {
      whereClause += ' AND n.source = ?';
      params.push(source);
    }
    if (resourceType) {
      whereClause += ' AND n.resource_type = ?';
      params.push(resourceType);
    }

    const rows = db.prepare(`
      SELECT n.*, k.term as keyword_term
      FROM news_items n
      LEFT JOIN keywords k ON n.keyword_id = k.id
      ${whereClause}
      ORDER BY n.published_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(pageSize), offset);

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM news_items n
      ${whereClause}
    `).get(...params) as unknown as CountRow;

    const items = (rows as unknown as NewsItemRow[]).map((row) => ({
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
      creatorId: row.creator_id || undefined,
      creatorName: row.creator_name || undefined,
      completed: Boolean(row.completed),
      favorited: Boolean(row.favorited),
      resourceType: row.resource_type || (row.keyword_id ? 'keyword' : row.creator_id ? 'creator' : undefined),
    }));

    res.json({ items, total: countResult.count, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    console.error('Hotspots list error:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
});

// 搜索热点（同时搜索 news_items 和 hot_topics）
router.get('/search', authRequired, (req: AuthRequest, res) => {
  try {
    const { q = '', page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const userId = req.user!.userId;

    if (!q || q.toString().trim() === '') {
      return res.json({ items: [], total: 0 });
    }

    const searchTerm = `%${q}%`;

    // 搜索 news_items + hot_topics 两张表，并包含 keyword_term 匹配
    const newsRows = db.prepare(`
      SELECT n.*, k.term as keyword_term, 'news' as _data_type
      FROM news_items n
      LEFT JOIN keywords k ON n.keyword_id = k.id
      WHERE (n.title LIKE ? OR n.summary LIKE ? OR k.term LIKE ?) AND n.user_id = ?
      ORDER BY n.published_at DESC
      LIMIT ? OFFSET ?
    `).all(searchTerm, searchTerm, searchTerm, userId, Number(pageSize), offset) as unknown as NewsItemRow[];

    const hotRows = db.prepare(`
      SELECT
        id, NULL as keyword_id, title, url, source, source_name,
        published_at, 1 as is_real, 1.0 as confidence, summary,
        fetched_at as matched_at, 0 as is_urgent, heat,
        NULL as keyword_term, 'hot' as _data_type,
        NULL as creator_id, NULL as creator_name
      FROM hot_topics
      WHERE title LIKE ? OR summary LIKE ?
      ORDER BY fetched_at DESC
    `).all(searchTerm, searchTerm) as unknown as HotTopicRow[];

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
        WHERE (n.title LIKE ? OR n.summary LIKE ? OR k.term LIKE ?) AND n.user_id = ?
        UNION
        SELECT url FROM hot_topics WHERE title LIKE ? OR summary LIKE ?
      )
    `).get(searchTerm, searchTerm, searchTerm, userId, searchTerm, searchTerm) as unknown as CountRow).count;

    const items = (merged as any[]).map((row) => ({
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
      creatorId: row.creator_id || undefined,
      creatorName: row.creator_name || undefined,
      completed: Boolean(row.completed),
      favorited: Boolean(row.favorited),
      resourceType: row.resource_type || (row.keyword_id ? 'keyword' : row.creator_id ? 'creator' : undefined),
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

// 更新资源（完成状态、收藏状态等）
router.patch('/resource/:id', authRequired, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { completed, favorited } = req.body;
    const userId = req.user!.userId;

    // 取消收藏时检查关联实体是否存在
    if (favorited === false) {
      const item = db.prepare('SELECT keyword_id, creator_id FROM news_items WHERE id = ? AND user_id = ?').get(id as string, userId) as any;
      if (item) {
        let hasAssociation = false;
        let allGone = true;
        if (item.keyword_id) {
          hasAssociation = true;
          if (db.prepare('SELECT id FROM keywords WHERE id = ? AND user_id = ?').get(item.keyword_id, userId)) {
            allGone = false;
          }
        }
        if (item.creator_id) {
          hasAssociation = true;
          if (db.prepare('SELECT id FROM followed_creators WHERE id = ? AND user_id = ?').get(item.creator_id, userId)) {
            allGone = false;
          }
        }
        if (hasAssociation && allGone) {
          db.prepare('DELETE FROM news_items WHERE id = ? AND user_id = ?').run(id as string, userId);
          return res.json({ success: true, deleted: true });
        }
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (completed !== undefined) {
      updates.push('completed = ?');
      params.push(completed ? 1 : 0);
    }
    if (favorited !== undefined) {
      updates.push('favorited = ?');
      params.push(favorited ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(id, userId);
      db.prepare(`UPDATE news_items SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// 获取收藏资源
router.get('/favorites', authRequired, (req: AuthRequest, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const userId = req.user!.userId;

    const rows = db.prepare(`
      SELECT n.*, k.term as keyword_term
      FROM news_items n
      LEFT JOIN keywords k ON n.keyword_id = k.id
      WHERE n.favorited = 1 AND n.user_id = ?
      ORDER BY n.matched_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, Number(pageSize), offset);

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM news_items WHERE favorited = 1 AND user_id = ?
    `).get(userId) as unknown as CountRow;

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
      creatorId: row.creator_id || undefined,
      creatorName: row.creator_name || undefined,
      completed: Boolean(row.completed),
      favorited: Boolean(row.favorited),
      resourceType: row.resource_type || (row.keyword_id ? 'keyword' : row.creator_id ? 'creator' : undefined),
    }));

    res.json({ items, total: countResult.count, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    console.error('Favorites error:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// 批量删除资源（按 ID）
router.post('/resources/batch-delete-by-ids', authRequired, (req: AuthRequest, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user!.userId;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM news_items WHERE id IN (${placeholders}) AND user_id = ?`).run(...ids, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Batch delete by ids error:', error);
    res.status(500).json({ error: 'Failed to batch delete resources' });
  }
});

// 批量删除资源（按类型）
router.post('/resources/batch-delete', authRequired, (req: AuthRequest, res) => {
  try {
    const { type } = req.body;
    const userId = req.user!.userId;
    if (type === 'keywords') {
      db.prepare("DELETE FROM news_items WHERE resource_type = 'keyword' AND user_id = ?").run(userId);
    } else if (type === 'creators') {
      db.prepare("DELETE FROM news_items WHERE resource_type = 'creator' AND user_id = ?").run(userId);
    } else if (type === 'direct_video') {
      db.prepare("DELETE FROM news_items WHERE resource_type = 'direct_video' AND user_id = ?").run(userId);
    } else {
      return res.status(400).json({ error: 'Invalid type, must be "keywords", "creators", or "direct_video"' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Batch delete error:', error);
    res.status(500).json({ error: 'Failed to batch delete resources' });
  }
});

// 删除单个资源
router.delete('/resource/:id', authRequired, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM news_items WHERE id = ? AND user_id = ?').run(id as string, req.user!.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;

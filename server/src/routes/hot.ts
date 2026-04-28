import { Router } from 'express';
import { collectHotTopics } from '../services/hot-collector.js';
import db from '../db/sqlite.js';

const router = Router();

interface HotTopicRow {
  id: string;
  title: string;
  url: string;
  source: string;
  source_name: string;
  heat: number;
  published_at: number;
  scope: string;
  summary: string | null;
  fetched_at: number;
}

// 获取热点列表
router.post('/', async (req, res) => {
  console.log('[Hot API] Received request:', req.body);
  try {
    const { scope = 'AI编程', limit = 20, forceRefresh = false } = req.body;

    // 如果不是强制刷新，先尝试从数据库获取缓存
    if (!forceRefresh) {
      const cachedTopics = db.prepare(`
        SELECT * FROM hot_topics
        WHERE scope = ?
        ORDER BY fetched_at DESC
        LIMIT ?
      `).all(scope, limit) as HotTopicRow[];

      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const isStale = cachedTopics.length === 0 ||
        (cachedTopics[0]?.fetched_at || 0) < oneHourAgo;

      if (!isStale) {
        // 返回缓存数据
        const topics = cachedTopics.map(row => ({
          id: row.id,
          title: row.title,
          url: row.url,
          source: row.source,
          sourceName: row.source_name,
          heat: row.heat,
          publishedAt: row.published_at,
          scope: row.scope,
          summary: row.summary,
        }));
        return res.json({ topics, cached: true });
      }
    }

    // 收集新数据
    const topics = await collectHotTopics(scope, limit);

    // 保存到数据库
    if (topics.length > 0) {
      const insert = db.prepare(`
        INSERT OR REPLACE INTO hot_topics
        (id, title, url, source, source_name, heat, published_at, scope, summary, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const fetchedAt = Date.now();
      for (const topic of topics) {
        insert.run(
          topic.id,
          topic.title,
          topic.url,
          topic.source,
          topic.sourceName,
          topic.heat,
          topic.publishedAt,
          topic.scope,
          topic.summary || null,
          fetchedAt
        );
      }
    }

    res.json({ topics, cached: false });
  } catch (error) {
    console.error('Error fetching hot topics:', error);
    res.status(500).json({ error: 'Failed to fetch hot topics' });
  }
});

export default router;
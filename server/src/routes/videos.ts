import { Router } from 'express';
import db from '../db/sqlite.js';
import { authRequired, type AuthRequest } from '../middleware/auth.js';
import { extractBVID, getBilibiliVideoStats } from '../services/bilibili-api.js';
import { getYouTubeVideoStats } from '../services/youtube-api.js';

const router = Router();

interface CountRow {
  count: number;
}

/**
 * 从 YouTube URL 中提取 videoId
 * 支持格式：
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*[&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 提交视频 URL，获取视频信息并存储
 */
router.post('/submit', authRequired, async (req: AuthRequest, res) => {
  try {
    const { url, platform } = req.body;
    const userId = req.user!.userId;

    if (!url || !platform) {
      return res.status(400).json({ error: '请提供视频 URL 和平台' });
    }

    if (platform !== 'bilibili' && platform !== 'youtube') {
      return res.status(400).json({ error: '平台仅支持 bilibili 或 youtube' });
    }

    // 检查 URL 是否已存在
    const existing = db.prepare('SELECT id FROM news_items WHERE url = ? AND user_id = ?').get(url, userId);
    if (existing) {
      return res.status(409).json({ error: '该视频已添加过' });
    }

    let title: string;
    let author: string;
    let publishedAt: number;
    let heat: number;
    let summary: string;
    let source: string;
    let sourceName: string;

    if (platform === 'bilibili') {
      const bvid = extractBVID(url);
      if (!bvid) {
        return res.status(400).json({ error: '无效的 Bilibili 视频链接' });
      }

      const stats = await getBilibiliVideoStats(bvid);
      if (!stats) {
        return res.status(502).json({ error: '获取 Bilibili 视频信息失败，请检查链接是否正确' });
      }

      title = stats.title;
      author = stats.author;
      publishedAt = stats.pubdate * 1000;
      heat = Math.min(100, Math.round(stats.view / 1000));
      summary = `${stats.title} · 👁️${stats.view} 👍${stats.like} ⭐${stats.favorite}`;
      source = 'bilibili';
      sourceName = 'Bilibili';
    } else {
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        return res.status(400).json({ error: '无效的 YouTube 视频链接' });
      }

      const statsMap = await getYouTubeVideoStats([videoId]);
      const stats = statsMap.get(videoId);
      if (!stats) {
        return res.status(502).json({ error: '获取 YouTube 视频信息失败，请检查链接是否正确' });
      }

      title = stats.title;
      author = stats.channelTitle;
      // YouTube API 返回的视频信息中没有 pubdate，使用当前时间
      publishedAt = Date.now();
      heat = Math.min(100, Math.round(stats.viewCount / 1000));
      summary = `${stats.title} · 👁️${stats.viewCount} 👍${stats.likeCount} 💬${stats.commentCount}`;
      source = 'youtube';
      sourceName = 'YouTube';
    }

    const id = `ni_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    db.prepare(`
      INSERT INTO news_items (id, keyword_id, title, url, source, source_name, published_at,
        is_real, confidence, summary, matched_at, heat, creator_id, creator_name,
        completed, favorited, user_id, resource_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, null, title, url, source, sourceName, publishedAt,
      1, 1.0, summary, now, heat,
      null, author,
      0, 0, userId, 'direct_video',
    );

    const item = {
      id,
      keywordId: null,
      keywordTerm: null,
      title,
      url,
      source,
      sourceName,
      publishedAt,
      isReal: true,
      confidence: 1.0,
      summary,
      matchedAt: now,
      isUrgent: false,
      heat,
      creatorId: undefined,
      creatorName: author,
      completed: false,
      favorited: false,
      resourceType: 'direct_video',
    };

    console.log(`[Videos] Added direct video: "${title.slice(0, 50)}" for user ${userId}`);
    res.json({ success: true, item });
  } catch (error: any) {
    console.error('[Videos] Submit error:', error);
    res.status(500).json({ error: error.message || '添加视频失败' });
  }
});

/**
 * 获取当前用户的视频资源列表（分页）
 */
router.get('/', authRequired, (req: AuthRequest, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const userId = req.user!.userId;

    const rows = db.prepare(`
      SELECT * FROM news_items
      WHERE resource_type = 'direct_video' AND user_id = ?
      ORDER BY matched_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, Number(pageSize), offset);

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM news_items
      WHERE resource_type = 'direct_video' AND user_id = ?
    `).get(userId) as CountRow;

    const items = rows.map((row: any) => ({
      id: row.id,
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
      resourceType: row.resource_type,
    }));

    res.json({ items, total: countResult.count, page: Number(page), pageSize: Number(pageSize) });
  } catch (error: any) {
    console.error('[Videos] List error:', error);
    res.status(500).json({ error: '获取视频列表失败' });
  }
});

export default router;

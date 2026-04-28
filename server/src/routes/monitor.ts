import { Router } from 'express';
import db from '../db/sqlite.js';
import { notify } from '../services/notifier.js';
import { progressEmitter, type MonitorProgress } from '../services/progress.js';

const router = Router();

function generateId(): string {
  return `ni_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emitProgress(monitorId: string, progress: MonitorProgress) {
  progressEmitter.emit(monitorId, progress);
}

// 手动触发监控（完全异步）
router.post('/', async (_req, res) => {
  const monitorId = `monitor_${Date.now()}`;

  // 立即返回，不等待任何处理
  res.json({
    status: 'started',
    monitorId,
    message: '监控已启动，正在后台处理...',
    timestamp: Date.now(),
  });

  // 完全在后台异步执行
  runMonitorInBackground(monitorId);
});

// 进度查询端点
router.get('/progress/:monitorId', (req, res) => {
  const { monitorId } = req.params;
  console.log(`[Progress] GET request for ${monitorId}`);

  // 检查是否有进度记录
  const progress = progressEmitter.getProgress(monitorId);
  if (progress) {
    console.log(`[Progress] Found progress for ${monitorId}:`, progress.stage);
    res.json(progress);
  } else {
    console.log(`[Progress] No progress found for ${monitorId}`);
    res.json({ stage: 'waiting', message: '等待进度更新...' });
  }
});

// 后台异步执行监控
async function runMonitorInBackground(monitorId: string) {
  let matchedCount = 0;
  let verifiedCount = 0;

  try {
    emitProgress(monitorId, {
      stage: 'started',
      message: '监控已开始...',
    });

    console.log('[Monitor] Background monitoring started');

    // 获取所有启用的关键词
    const keywords = db.prepare('SELECT * FROM keywords WHERE enabled = 1').all() as any[];

    if (keywords.length === 0) {
      emitProgress(monitorId, {
        stage: 'completed',
        message: '没有启用的关键词',
        matched: 0,
        verified: 0,
      });
      return;
    }

    emitProgress(monitorId, {
      stage: 'collecting',
      message: `正在收集 ${keywords.length} 个关键词的热点...`,
    });

    for (const keyword of keywords) {
      console.log(`[Monitor] Processing keyword: ${keyword.term}`);

      emitProgress(monitorId, {
        stage: 'collecting',
        message: `正在搜索关键词: ${keyword.term}`,
        total: 0,
      });

      // 多渠道并行搜索：Firecrawl + Twitter
      try {
        const { searchWithFirecrawl } = await import('../services/firecrawl-mcp.js');
        const { collectTwitterHotTopics } = await import('../services/twitter-api.js');

        const searchQuery = `${keyword.term} AI`;

        // 并行执行 Firecrawl 和 Twitter 搜索
        const [firecrawlResults, twitterResults] = await Promise.allSettled([
          searchWithFirecrawl(searchQuery),
          collectTwitterHotTopics([keyword.term], 10),
        ]);

        let totalResults = 0;

        // 处理 Firecrawl 结果
        if (firecrawlResults.status === 'fulfilled') {
          const searchResults = firecrawlResults.value;
          totalResults += searchResults.length;

          emitProgress(monitorId, {
            stage: 'matching',
            message: `关键词 "${keyword.term}" Firecrawl 找到 ${searchResults.length} 条`,
            total: totalResults,
          });

          for (const item of searchResults) {
            const title = item.title || item.description || 'Untitled';
            const content = item.description || '';

            const id = generateId();
            const matchedAt = Date.now();
            matchedCount++;

            db.prepare(`
              INSERT INTO news_items
              (id, keyword_id, title, url, source, source_name, published_at, is_real, confidence, summary, matched_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              id,
              keyword.id,
              title,
              item.url,
              'firecrawl',
              'Firecrawl Search',
              item.publishedAt ? new Date(item.publishedAt).getTime() : Date.now(),
              1,
              0.8,
              content.slice(0, 200),
              matchedAt
            );

            notify({
              type: 'keyword_match',
              title: `关键词匹配: ${keyword.term}`,
              body: title,
              url: item.url,
            }).catch(err => console.error('Notify error:', err));
          }
        }

        // 处理 Twitter 结果
        if (twitterResults.status === 'fulfilled') {
          const tweets = twitterResults.value;
          totalResults += tweets.length;

          emitProgress(monitorId, {
            stage: 'matching',
            message: `关键词 "${keyword.term}" Twitter 找到 ${tweets.length} 条`,
            total: totalResults,
          });

          for (const tweet of tweets) {
            const id = generateId();
            const matchedAt = Date.now();
            matchedCount++;

            db.prepare(`
              INSERT INTO news_items
              (id, keyword_id, title, url, source, source_name, published_at, is_real, confidence, summary, matched_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              id,
              keyword.id,
              tweet.title,
              tweet.url,
              'twitter',
              'Twitter',
              tweet.publishedAt || Date.now(),
              1,
              0.8,
              tweet.summary || '',
              matchedAt
            );

            notify({
              type: 'keyword_match',
              title: `关键词匹配: ${keyword.term}`,
              body: tweet.title,
              url: tweet.url,
            }).catch(err => console.error('Notify error:', err));
          }
        }

        // 更新关键词的最后匹配时间
        db.prepare('UPDATE keywords SET last_matched_at = ? WHERE id = ?')
          .run(Date.now(), keyword.id);

        console.log(`[Monitor] Keyword "${keyword.term}" total results: ${totalResults}`);

      } catch (error: any) {
        console.error(`[Monitor] Error searching for keyword ${keyword.term}:`, error.message);
      }
    }

    emitProgress(monitorId, {
      stage: 'completed',
      message: `执行成功！匹配 ${matchedCount} 条，验证 ${verifiedCount} 条`,
      matched: matchedCount,
      verified: verifiedCount,
    });

    console.log(`[Monitor] Background monitoring completed: matched=${matchedCount}, verified=${verifiedCount}`);

  } catch (error: any) {
    console.error('[Monitor] Background error:', error);
    emitProgress(monitorId, {
      stage: 'error',
      message: `执行失败: ${error.message || '未知错误'}`,
      error: error.message,
    });
  }
}

// 获取匹配历史
router.get('/history', (req, res) => {
  try {
    const { keywordId, limit = 20 } = req.query;

    let query = `SELECT * FROM news_items`;
    const params: any[] = [];

    if (keywordId) {
      query += ` WHERE keyword_id = ?`;
      params.push(keywordId);
    }

    query += ` ORDER BY matched_at DESC LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(query).all(...params);

    const items = rows.map((row: any) => ({
      id: row.id,
      keywordId: row.keyword_id,
      title: row.title,
      url: row.url,
      source: row.source,
      sourceName: row.source_name,
      publishedAt: row.published_at,
      isReal: Boolean(row.is_real),
      confidence: row.confidence,
      summary: row.summary,
      matchedAt: row.matched_at,
    }));

    res.json({ items });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
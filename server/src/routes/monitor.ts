import { Router } from 'express';
import db from '../db/sqlite.js';
import { notify } from '../services/notifier.js';
import { progressEmitter, type MonitorProgress } from '../services/progress.js';
import { calcCombinedScore } from '../services/scoring.js';
import { deduplicateItems } from '../services/dedup.js';
import { searchBilibiliVideos, getBilibiliVideoStats, extractBVID } from '../services/bilibili-api.js';
import { collectYouTubeVideos } from '../services/youtube-api.js';
import { collectCodefatherArticles } from '../services/codefather-api.js';
import { collectAiCodefatherArticles } from '../services/ai-codefather-api.js';

interface DbKeywordRow {
  id: string;
  term: string;
  scope: string;
  enabled: number;
  archived: number;
  created_at: number;
  last_matched_at: number | null;
}

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




// 后台异步执行监控（导出供定时任务调用）
export async function runMonitorInBackground(monitorId: string = `auto_${Date.now()}`) {
  let matchedCount = 0;
  let verifiedCount = 0;

  try {
    emitProgress(monitorId, {
      stage: 'started',
      message: '监控已开始...',
    });

    console.log('[Monitor] Background monitoring started');

    // 获取所有启用的关键词
    const keywords = db.prepare('SELECT * FROM keywords WHERE enabled = 1 AND archived IS NOT 1').all() as DbKeywordRow[];

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

      const allItems: any[] = [];

      try {
        // 读取 Bilibili 阈值
        const minViews = parseInt(process.env.BILIBILI_MIN_VIEWS || '5000', 10);
        const minLikes = parseInt(process.env.BILIBILI_MIN_LIKES || '200', 10);
        const minFavorites = parseInt(process.env.BILIBILI_MIN_FAVORITES || '100', 10);

        // 1. 从 Bilibili 搜索
        const bilibiliResults = await searchBilibiliVideos(keyword.term, 10);
        for (const bResult of bilibiliResults) {
          const bvid = extractBVID(bResult.url);
          if (!bvid) continue;
          const stats = await getBilibiliVideoStats(bvid);
          if (!stats) continue;
          if (stats.view < minViews || stats.like < minLikes || stats.favorite < minFavorites) {
            console.log(`[Monitor] Bilibili "${bvid}" filtered: view=${stats.view} like=${stats.like} fav=${stats.favorite}`);
            continue;
          }
          const heatScore = Math.min(100, Math.round(stats.view / 1000));
          allItems.push({
            title: stats.title.slice(0, 200),
            url: bResult.url,
            source: 'bilibili',
            sourceName: 'Bilibili',
            author: stats.author,
            heat: heatScore,
            publishedAt: Date.now(),
            summary: `${stats.title} · 👁️${stats.view} 👍${stats.like} ⭐${stats.favorite}`,
            _sourceType: 'bilibili',
          });
        }
        console.log(`[Monitor] Bilibili found ${bilibiliResults.length} results for "${keyword.term}"`);

        // 2. 从 YouTube 搜索
        const ytMinViews = parseInt(process.env.YOUTUBE_MIN_VIEWS || '10000', 10);
        const ytMinLikes = parseInt(process.env.YOUTUBE_MIN_LIKES || '500', 10);
        let ytResults: any[] = [];
        try {
          ytResults = await collectYouTubeVideos(keyword.term, 10, ytMinViews, ytMinLikes);
          allItems.push(...ytResults);
          console.log(`[Monitor] YouTube found ${ytResults.length} results for "${keyword.term}"`);
        } catch (ytErr: any) {
          console.error(`[Monitor] YouTube error for "${keyword.term}":`, ytErr.message);
        }

        // 3. 从编程导航搜索（仅保留官方内容）
        const enableCodenav = process.env.ENABLE_CODENAV === 'true' || process.env.ENABLE_CODENAV === '1';
        if (enableCodenav) {
          try {
            const cfResults = await collectCodefatherArticles(
              keyword.term, 10
            );
            allItems.push(...cfResults);
            console.log(`[Monitor] Codefather found ${cfResults.length} results for "${keyword.term}"`);
          } catch (cErr: any) {
            console.error(`[Monitor] Codefather error for "${keyword.term}":`, cErr.message);
          }
        }

        // 4. 从鱼皮AI导航搜索（全部官方教程，不过滤）
        const enableAiCodefather = process.env.ENABLE_AI_CODEFATHER === 'true' || process.env.ENABLE_AI_CODEFATHER === '1';
        if (enableAiCodefather) {
          try {
            const aiCfResults = await collectAiCodefatherArticles(keyword.term, 10);
            allItems.push(...aiCfResults);
            console.log(`[Monitor] AiCodefather found ${aiCfResults.length} results for "${keyword.term}"`);
          } catch (acErr: any) {
            console.error(`[Monitor] AiCodefather error:`, acErr.message);
          }
        }

        // 跨源去重：标题和作者相似则视为重复
        const beforeDedup = allItems.length;
        const deduped = deduplicateItems(allItems);
        allItems.length = 0;
        allItems.push(...deduped);
        if (deduped.length < beforeDedup) {
          console.log(`[Monitor] Deduplicated ${beforeDedup - deduped.length} items across sources`);
        }

        // 对所有结果应用综合评分
        for (const item of allItems) {
          const score = calcCombinedScore({
            heat: item.heat ?? 50,
            source: item.source || 'web',
            publishedAt: item.publishedAt || Date.now(),
          });
          item.heat = score.combined;
        }

        const totalResults = allItems.length;

        if (totalResults === 0) {
          console.log(`[Monitor] No results found for "${keyword.term}" (Bilibili: ${bilibiliResults.length}, YouTube: ${ytResults?.length || 0}, Codefather: checked, AiCodefather: checked)`);
        } else {
          emitProgress(monitorId, {
            stage: 'matching',
            message: `关键词 "${keyword.term}" 共找到 ${totalResults} 条`,
            total: totalResults,
          });

          for (const item of allItems) {
            emitProgress(monitorId, {
              stage: 'verifying',
              message: `正在保存: ${item.title?.slice(0, 50)}`,
              verified: verifiedCount,
              total: totalResults,
            });

            try {
              const id = generateId();
              const matchedAt = Date.now();
              matchedCount++;

              db.prepare(`
                INSERT INTO news_items
                (id, keyword_id, title, url, source, source_name, published_at, is_real, confidence, summary, matched_at, heat)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                id,
                keyword.id,
                item.title,
                item.url,
                item.source || 'web',
                item.sourceName || 'Web',
                item.publishedAt || Date.now(),
                1,
                0.7,
                item.summary || item.description || '',
                matchedAt,
                item.heat ?? 50
              );

              verifiedCount++;

              notify({
                type: 'keyword_match',
                title: `关键词匹配: ${keyword.term}`,
                body: item.title,
                url: item.url,
              }).catch(err => console.error('Notify error:', err));

            } catch (dbError: any) {
              console.error(`[Monitor] DB insert error:`, dbError.message);
            }
          }
        }

        // 更新关键词的最后匹配时间
        db.prepare('UPDATE keywords SET last_matched_at = ? WHERE id = ?')
          .run(Date.now(), keyword.id);

        console.log(`[Monitor] Keyword "${keyword.term}" total results: ${totalResults}, verified: ${verifiedCount}`);

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

    setTimeout(() => progressEmitter.clear(monitorId), 300000);

  } catch (error: any) {
    console.error('[Monitor] Background error:', error);
    emitProgress(monitorId, {
      stage: 'error',
      message: `执行失败: ${error.message || '未知错误'}`,
      error: error.message,
    });

    setTimeout(() => progressEmitter.clear(monitorId), 300000);
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
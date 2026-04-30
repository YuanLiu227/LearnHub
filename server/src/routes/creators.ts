import { Router } from 'express';
import db from '../db/sqlite.js';
import { searchBilibiliUser, searchYouTubeChannel, collectCreatorContent } from '../services/creator-collector.js';
import { progressEmitter, type MonitorProgress } from '../services/progress.js';
import { deduplicateItems } from '../services/dedup.js';
import { notify } from '../services/notifier.js';
import type { FollowedCreator } from '../types/index.js';

const router = Router();

function generateId(): string {
  return `cr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toFollowedCreator(row: any): FollowedCreator {
  return {
    id: row.id,
    platform: row.platform,
    channelId: row.channel_id,
    channelName: row.channel_name,
    description: row.description || undefined,
    avatarUrl: row.avatar_url || undefined,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    lastFetchedAt: row.last_fetched_at || undefined,
    archived: Boolean(row.archived),
  };
}

// 获取所有未归档的博主
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM followed_creators WHERE archived IS NOT 1 ORDER BY created_at DESC',
    ).all();
    res.json({ creators: rows.map(toFollowedCreator) });
  } catch (error) {
    console.error('[Creators] Error fetching:', error);
    res.status(500).json({ error: '获取关注的博主失败' });
  }
});

// 获取所有博主（含已归档）
router.get('/all', (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM followed_creators ORDER BY archived ASC, created_at DESC',
    ).all();
    res.json({ creators: rows.map(toFollowedCreator) });
  } catch (error) {
    console.error('[Creators] Error fetching all:', error);
    res.status(500).json({ error: '获取全部博主失败' });
  }
});

// 添加关注的博主（自动解析）
router.post('/', async (req, res) => {
  try {
    const { platform, query } = req.body;
    if (!platform || !query) {
      return res.status(400).json({ error: 'platform 和 query 是必填项' });
    }
    if (platform !== 'youtube' && platform !== 'bilibili') {
      return res.status(400).json({ error: 'platform 必须是 youtube 或 bilibili' });
    }

    // 解析博主信息
    let channelId = '';
    let channelName = '';
    let avatarUrl = '';

    if (platform === 'bilibili') {
      const user = await searchBilibiliUser(query);
      if (!user) {
        return res.status(404).json({ error: '未找到该 Bilibili UP 主，请检查名称是否正确' });
      }
      channelId = user.mid;
      channelName = user.name;
      avatarUrl = user.avatar;
    } else {
      const channel = await searchYouTubeChannel(query);
      if (!channel) {
        return res.status(404).json({ error: '未找到该 YouTube 频道，请检查名称是否正确' });
      }
      channelId = channel.channelId;
      channelName = channel.title;
      avatarUrl = channel.avatar;
    }

    // 检查是否已关注
    const existing = db.prepare(
      'SELECT id FROM followed_creators WHERE platform = ? AND channel_id = ?',
    ).get(platform, channelId);
    if (existing) {
      return res.status(409).json({ error: `已关注该${platform === 'bilibili' ? 'UP 主' : '频道'}` });
    }

    const id = generateId();
    const createdAt = Date.now();

    db.prepare(`
      INSERT INTO followed_creators (id, platform, channel_id, channel_name, avatar_url, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(id, platform, channelId, channelName, avatarUrl, createdAt);

    res.status(201).json(toFollowedCreator({
      id, platform, channel_id: channelId, channel_name: channelName,
      avatar_url: avatarUrl, enabled: 1, created_at: createdAt,
    }));
  } catch (error: any) {
    console.error('[Creators] Error adding:', error);
    res.status(500).json({ error: error.message || '添加关注失败' });
  }
});

// 更新关注的博主（启用/禁用等）
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (enabled !== undefined) {
      db.prepare('UPDATE followed_creators SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
    }

    const row = db.prepare('SELECT * FROM followed_creators WHERE id = ?').get(id) as any;
    if (!row) return res.status(404).json({ error: '未找到该博主' });

    res.json(toFollowedCreator(row));
  } catch (error) {
    console.error('[Creators] Error updating:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

// 取消关注（归档，保留学习资源）
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE followed_creators SET archived = 1, enabled = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Creators] Error archiving:', error);
    res.status(500).json({ error: '取消关注失败' });
  }
});

// 恢复归档博主
router.post('/restore/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE followed_creators SET archived = 0, enabled = 1 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Creators] Error restoring:', error);
    res.status(500).json({ error: '恢复博主失败' });
  }
});

// 永久删除博主及其关联的所有内容
router.delete('/permanent/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM news_items WHERE creator_id = ? AND (favorited IS NOT 1 OR favorited IS NULL)").run(id);
    db.prepare('DELETE FROM followed_creators WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Creators] Error permanent deleting:', error);
    res.status(500).json({ error: '永久删除失败' });
  }
});

// ====== 博主内容收集（独立于关键词搜索）======

function generateNewsId(): string {
  return `ni_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emitProgress(collectId: string, progress: MonitorProgress) {
  progressEmitter.emit(collectId, progress);
}

/**
 * 后台收集博主内容（供 API 和定时任务共用）
 */
export async function runCreatorCollection(collectId: string = `creator_${Date.now()}`) {
  let matchedCount = 0;
  let verifiedCount = 0;

  try {
    emitProgress(collectId, { stage: 'started', message: '开始收集博主内容...' });
    console.log(`[CreatorCollect] Started: ${collectId}`);

    const creatorRows = db.prepare('SELECT * FROM followed_creators WHERE enabled = 1').all() as any[];
    if (creatorRows.length === 0) {
      emitProgress(collectId, {
        stage: 'completed', message: '没有启用的博主', matched: 0, verified: 0,
      });
      return;
    }

    emitProgress(collectId, {
      stage: 'collecting', message: `正在收集 ${creatorRows.length} 个关注博主的内容...`,
    });

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const creatorContent = await collectCreatorContent(creatorRows);
    const allCreatorItems: any[] = [];

    for (const [, items] of creatorContent) {
      // 只保留近 7 天的内容
      const recent = items.filter((item: any) => {
        const pubTime = item.publishedAt || 0;
        return (now - pubTime) < SEVEN_DAYS_MS;
      });
      allCreatorItems.push(...recent);
    }

    console.log(`[CreatorCollect] Collected ${allCreatorItems.length} items from creators`);

    if (allCreatorItems.length > 0) {
      const deduped = deduplicateItems(allCreatorItems);

      // 博主内容按发布时间倒序排列（不用关键词评分逻辑）
      deduped.sort((a: any, b: any) => (b.publishedAt || 0) - (a.publishedAt || 0));
      console.log(`[CreatorCollect] After dedup: ${deduped.length}`);

      for (const item of deduped) {
        const timeHeat = Math.min(100, Math.max(0, Math.round((now - (item.publishedAt || now)) / 360000)));
        const itemHeat = Math.round((item.heat || 0) * 0.3 + timeHeat * 0.7);

        emitProgress(collectId, {
          stage: 'verifying',
          message: `保存博主内容: ${(item.title || '').slice(0, 50)}`,
          verified: verifiedCount,
          total: allCreatorItems.length,
        });

        try {
          // 检查 URL 是否已存在（只返回新内容）
          const existing = db.prepare('SELECT id FROM news_items WHERE url = ?').get(item.url);
          if (existing) {
            console.log(`[CreatorCollect] Skipping existing URL: ${(item.url || '').slice(0, 60)}`);
            continue;
          }

          const id = generateNewsId();
          matchedCount++;

          db.prepare(`
            INSERT INTO news_items
            (id, keyword_id, title, url, source, source_name, published_at, is_real, confidence, summary, matched_at, heat, creator_id, creator_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id,
            null,
            item.title || '',
            item.url || '',
            item.source || 'web',
            item.sourceName || 'Web',
            item.publishedAt || Date.now(),
            1,
            0.7,
            item.summary || item.description || '',
            Date.now(),
            itemHeat,
            item._creatorId || null,
            item._creatorName || null,
          );

          verifiedCount++;

          notify({
            type: 'keyword_match',
            title: `博主更新: ${item._creatorName || '关注博主'}`,
            body: item.title || '',
            url: item.url,
          }).catch(err => console.error('Notify error:', err));

        } catch (dbError: any) {
          console.error(`[CreatorCollect] Insert error:`, dbError.message);
        }
      }

      // 更新博主的 last_fetched_at
      for (const creator of creatorRows) {
        db.prepare('UPDATE followed_creators SET last_fetched_at = ? WHERE id = ?')
          .run(Date.now(), creator.id);
      }
    }

    emitProgress(collectId, {
      stage: 'completed',
      message: `收集完成！新增 ${verifiedCount} 条博主内容`,
      matched: matchedCount,
      verified: verifiedCount,
    });

    console.log(`[CreatorCollect] Completed: matched=${matchedCount}, verified=${verifiedCount}`);

    setTimeout(() => progressEmitter.clear(collectId), 300000);

  } catch (error: any) {
    console.error('[CreatorCollect] Error:', error);
    emitProgress(collectId, {
      stage: 'error', message: `收集失败: ${error.message || '未知错误'}`, error: error.message,
    });
    setTimeout(() => progressEmitter.clear(collectId), 300000);
  }
}

// POST /collect - 手动触发收集博主内容
router.post('/collect', (_req, res) => {
  const collectId = `creator_${Date.now()}`;

  res.json({
    status: 'started',
    collectId,
    message: '博主内容收集已启动，正在后台处理...',
    timestamp: Date.now(),
  });

  runCreatorCollection(collectId);
});

// 收集进度查询
router.get('/collect/progress/:collectId', (req, res) => {
  const { collectId } = req.params;
  const progress = progressEmitter.getProgress(collectId);
  if (progress) {
    res.json(progress);
  } else {
    res.json({ stage: 'waiting', message: '等待进度更新...' });
  }
});

export default router;

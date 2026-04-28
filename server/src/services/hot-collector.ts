import type { HotTopic } from '../types/index.js';
import { searchWithFirecrawl } from './firecrawl-mcp.js';
import { summarizeContent, checkAIRelevance, checkHotness } from './openrouter.js';
import { collectTwitterHotTopics } from './twitter-api.js';

function generateId(): string {
  return `ht_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 从 Firecrawl 搜索收集内容（仅权威渠道）
 */
async function collectFromFirecrawl(scope: string, limit: number): Promise<any[]> {
  try {
    console.log('[HotCollector] Firecrawl searching authoritative sources...');
    // 只从权威 AI 来源搜索，简化查询
    const searchQuery = `${scope}`;
    const results = await searchWithFirecrawl(searchQuery);
    console.log('[HotCollector] Firecrawl got', results.length, 'results');
    return results.slice(0, limit).map(item => ({
      title: item.title || item.description || 'Untitled',
      description: item.description || '',
      url: item.url,
      publishedAt: item.publishedAt ? new Date(item.publishedAt).getTime() : null,
      source: 'firecrawl',
      sourceName: 'Firecrawl Search',
    }));
  } catch (error) {
    console.error('[HotCollector] Firecrawl error:', error);
    return [];
  }
}

/**
 * 从 Twitter 收集内容
 */
async function collectFromTwitter(limit: number): Promise<any[]> {
  if (process.env.ENABLE_TWITTER !== 'true' && process.env.ENABLE_TWITTER !== '1') {
    console.log('[HotCollector] Twitter disabled');
    return [];
  }
  try {
    console.log('[HotCollector] Twitter searching...');
    const tweets = await collectTwitterHotTopics(['AI', 'ChatGPT', 'Claude', 'LLM', 'AI编程'], limit);
    console.log('[HotCollector] Twitter got', tweets.length, 'tweets');
    return tweets;
  } catch (error) {
    console.error('[HotCollector] Twitter error:', error);
    return [];
  }
}

/**
 * 收集热点话题 - Firecrawl + Twitter 双渠道并行 + AI 统一筛选
 */
export async function collectHotTopics(scope: string = 'AI编程', limit: number = 10): Promise<HotTopic[]> {
  console.log('[HotCollector] Starting parallel collection for scope:', scope, ', limit:', limit);

  // 1. 并行收集 Firecrawl + Twitter 双渠道
  const [firecrawlResult, twitterResult] = await Promise.allSettled([
    collectFromFirecrawl(scope, limit),
    collectFromTwitter(limit),
  ]);

  let allItems: any[] = [];

  // 合并 Firecrawl 结果
  if (firecrawlResult.status === 'fulfilled') {
    console.log('[HotCollector] Firecrawl collected:', firecrawlResult.value.length, 'items');
    allItems.push(...firecrawlResult.value);
  } else {
    console.log('[HotCollector] Firecrawl failed:', firecrawlResult.reason);
  }

  // 合并 Twitter 结果
  if (twitterResult.status === 'fulfilled') {
    console.log('[HotCollector] Twitter collected:', twitterResult.value.length, 'items');
    allItems.push(...twitterResult.value);
  } else {
    console.log('[HotCollector] Twitter failed:', twitterResult.reason);
  }

  console.log('[HotCollector] Total collected:', allItems.length, 'items from all sources');

  // 2. AI 统一筛选
  const filteredTopics: HotTopic[] = [];
  let skippedRelevance = 0;
  let skippedHotness = 0;

  for (const item of allItems) {
    // 降低 AI 筛选门槛，因为来源已经是权威的了
    const relevance = await checkAIRelevance(item.title, item.description || '');
    if (!relevance.isRelevant && relevance.confidence < 0.4) {
      skippedRelevance++;
      continue;
    }

    const hotness = await checkHotness(item.title, item.description || '', item.publishedAt);
    if (!hotness.isHot && hotness.hotScore < 0.3) {
      skippedHotness++;
      continue;
    }

    filteredTopics.push({
      id: generateId(),
      title: item.title,
      url: item.url,
      source: item.source,
      sourceName: item.sourceName,
      heat: hotness.hotScore * 100,
      publishedAt: item.publishedAt || Date.now(),
      scope,
      summary: hotness.reason || relevance.reason || '',
    });
  }

  console.log('[HotCollector] Filtered: skipped', skippedRelevance, 'for relevance,', skippedHotness, 'for hotness');

  // 3. 按热度排序并返回 Top limit
  filteredTopics.sort((a, b) => b.heat - a.heat);
  const result = filteredTopics.slice(0, limit);

  console.log('[HotCollector] Final hot topics:', result.length);

  // 4. 为每个热点生成 AI 总结
  for (const topic of result) {
    try {
      const sourceContent = topic.title + '. ' + (topic.summary || '');
      const aiSummary = await summarizeContent(sourceContent);
      topic.summary = aiSummary.slice(0, 150).trim() + (aiSummary.length > 150 ? '...' : '');
    } catch (error) {
      console.error('[HotCollector] Summary error:', error);
    }
  }

  return result;
}

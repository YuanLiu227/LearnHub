import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { chat } from './deepseek.js';
import { getUserConfigValue } from './config.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YouTubeSearchItem {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  channelTitle: string;
}

interface YouTubeStats {
  videoId: string;
  title: string;
  channelTitle: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

/**
 * 生成多语言搜索关键词
 * - 如果关键词含中文，用 AI 翻译成简中、繁中、英文三个版本
 * - 如果关键词是纯英文/ASCII，保持原词不变
 */
async function generateSearchKeywords(keyword: string): Promise<string[]> {
  // 纯英文/ASCII 关键词不需要翻译
  if (/^[\x00-\x7F\s]+$/.test(keyword)) {
    return [keyword];
  }

  const prompt = `Translate the following search keyword into three languages for YouTube search:

1. Simplified Chinese (zh-CN)
2. Traditional Chinese (zh-TW)
3. English (en)

Rules:
- Always output all three versions
- Keep technical terms and proper nouns unchanged (e.g., "React", "JavaScript", "GPT")

Keyword: "${keyword}"

Return ONLY a JSON array of strings, no other text.
Example: ["人工智能", "人工智慧", "Artificial Intelligence"]`;

  try {
    const response = await chat([
      { role: 'system', content: 'You are a translator for YouTube search keywords.' },
      { role: 'user', content: prompt },
    ]);

    const match = response.match(/\[[\s\S]*?\]/);
    if (match) {
      const translations: string[] = JSON.parse(match[0]);
      // 去重并始终保留原词
      return [...new Set([keyword, ...translations])];
    }
  } catch (err: any) {
    console.error(`[YouTube] Translation failed for "${keyword}":`, err.message || err);
  }

  return [keyword];
}

/** 获取 YouTube API 的代理配置（仅使用用户配置） */
function getProxyAgent(userId?: string): HttpsProxyAgent<string> | undefined {
  const proxyUrl = getUserConfigValue('YOUTUBE_PROXY_URL', userId);
  if (proxyUrl) {
    console.log(`[YouTube] Using proxy: ${proxyUrl.replace(/\/\/.*@/, '//***@')}`);
    return new HttpsProxyAgent(proxyUrl);
  }
  return undefined;
}

/**
 * 搜索 YouTube 视频
 */
export async function searchYouTubeVideos(keyword: string, limit: number = 10, userId?: string): Promise<YouTubeSearchItem[]> {
  const apiKey = getUserConfigValue('YOUTUBE_API_KEY', userId);
  if (!apiKey) {
    console.log('[YouTube] YOUTUBE_API_KEY not configured');
    return [];
  }

  try {
    console.log(`[YouTube] Searching: "${keyword}"`);
    const config: any = {
      params: { part: 'snippet', q: keyword, type: 'video', maxResults: limit, key: apiKey },
      timeout: 30000,
    };
    const agent = getProxyAgent(userId);
    if (agent) config.httpsAgent = agent;

    const resp = await axios.get(`${YOUTUBE_API_BASE}/search`, config);

    const items = resp.data.items || [];
    return items.map((item: any) => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      publishedAt: item.snippet?.publishedAt || '',
      channelTitle: item.snippet?.channelTitle || '',
    })).filter((r: YouTubeSearchItem) => r.videoId);
  } catch (err: any) {
    console.error(`[YouTube] Search error for "${keyword}":`, err.response?.data?.error?.message || err.message || err.code);
    return [];
  }
}

/**
 * 批量获取 YouTube 视频统计（一次最多 50 个）
 */
export async function getYouTubeVideoStats(videoIds: string[], userId?: string): Promise<Map<string, YouTubeStats>> {
  const apiKey = getUserConfigValue('YOUTUBE_API_KEY', userId);
  if (!apiKey || videoIds.length === 0) return new Map();

  const result = new Map<string, YouTubeStats>();

  try {
    const config: any = {
      params: { part: 'statistics,snippet', id: videoIds.join(','), key: apiKey },
      timeout: 30000,
    };
    const agent = getProxyAgent(userId);
    if (agent) config.httpsAgent = agent;

    const resp = await axios.get(`${YOUTUBE_API_BASE}/videos`, config);

    const items = resp.data.items || [];
    for (const item of items) {
      const videoId = item.id || '';
      const stats = item.statistics || {};
      result.set(videoId, {
        videoId,
        title: item.snippet?.title || '',
        channelTitle: item.snippet?.channelTitle || '',
        viewCount: parseInt(stats.viewCount || '0', 10),
        likeCount: parseInt(stats.likeCount || '0', 10),
        commentCount: parseInt(stats.commentCount || '0', 10),
      });
    }
  } catch (err: any) {
    console.error('[YouTube] Stats error:', err.response?.data?.error?.message || err.message || err.code);
  }

  return result;
}

/**
 * 搜索 YouTube + 获取统计数据 + 阈值过滤（支持多语言搜索）
 */
export async function collectYouTubeVideos(
  keyword: string,
  limit: number = 10,
  minViews: number = 10000,
  minLikes: number = 500,
  userId?: string
): Promise<any[]> {
  // 1. 生成多语言关键词
  const keywords = await generateSearchKeywords(keyword);
  if (keywords.length > 1) {
    console.log(`[YouTube] Multi-language keywords: [${keywords.join(', ')}]`);
  }

  // 2. 多语言搜索，按 videoId 去重
  const seen = new Set<string>();
  const allItems: YouTubeSearchItem[] = [];

  for (const kw of keywords) {
    const items = await searchYouTubeVideos(kw, limit, userId);
    for (const item of items) {
      if (!seen.has(item.videoId)) {
        seen.add(item.videoId);
        allItems.push(item);
      }
    }
  }

  if (allItems.length === 0) return [];

  console.log(`[YouTube] Deduplicated ${allItems.length} results from ${keywords.length} languages for "${keyword}"`);

  // 3. 获取统计数据
  const videoIds = allItems.map(r => r.videoId);
  const statsMap = await getYouTubeVideoStats(videoIds, userId);

  // 4. 阈值过滤
  const results: any[] = [];
  for (const item of allItems) {
    const stats = statsMap.get(item.videoId);
    if (!stats) continue;

    if (stats.viewCount < minViews || stats.likeCount < minLikes) {
      console.log(`[YouTube] "${item.title.slice(0, 40)}" filtered: views=${stats.viewCount} likes=${stats.likeCount}`);
      continue;
    }

    const heatScore = Math.min(100, Math.round(stats.viewCount / 1000));
    results.push({
      title: stats.title.slice(0, 200),
      url: `https://www.youtube.com/watch?v=${item.videoId}`,
      source: 'youtube',
      sourceName: 'YouTube',
      author: stats.channelTitle,
      heat: heatScore,
      publishedAt: item.publishedAt ? new Date(item.publishedAt).getTime() : Date.now(),
      summary: `${stats.title} · 👁️${stats.viewCount} 👍${stats.likeCount} 💬${stats.commentCount}`,
      description: item.description,
      _sourceType: 'youtube',
    });
  }

  console.log(`[YouTube] Collected ${results.length}/${allItems.length} for "${keyword}"`);
  return results;
}

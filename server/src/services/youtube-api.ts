import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

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
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

/** 获取 YouTube API 的代理配置（优先 YOUTUBE_PROXY_URL，其次 https_proxy） */
function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const proxyUrl = process.env.YOUTUBE_PROXY_URL || process.env.https_proxy || process.env.HTTPS_PROXY;
  if (proxyUrl) {
    console.log(`[YouTube] Using proxy: ${proxyUrl.replace(/\/\/.*@/, '//***@')}`);
    return new HttpsProxyAgent(proxyUrl);
  }
  return undefined;
}

/**
 * 搜索 YouTube 视频
 */
export async function searchYouTubeVideos(keyword: string, limit: number = 10): Promise<YouTubeSearchItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
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
    const agent = getProxyAgent();
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
export async function getYouTubeVideoStats(videoIds: string[]): Promise<Map<string, YouTubeStats>> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || videoIds.length === 0) return new Map();

  const result = new Map<string, YouTubeStats>();

  try {
    const config: any = {
      params: { part: 'statistics,snippet', id: videoIds.join(','), key: apiKey },
      timeout: 30000,
    };
    const agent = getProxyAgent();
    if (agent) config.httpsAgent = agent;

    const resp = await axios.get(`${YOUTUBE_API_BASE}/videos`, config);

    const items = resp.data.items || [];
    for (const item of items) {
      const videoId = item.id || '';
      const stats = item.statistics || {};
      result.set(videoId, {
        videoId,
        title: item.snippet?.title || '',
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
 * 搜索 YouTube + 获取统计数据 + 阈值过滤
 */
export async function collectYouTubeVideos(
  keyword: string,
  limit: number = 10,
  minViews: number = 10000,
  minLikes: number = 500
): Promise<any[]> {
  const items = await searchYouTubeVideos(keyword, limit);
  if (items.length === 0) return [];

  const videoIds = items.map(r => r.videoId);
  const statsMap = await getYouTubeVideoStats(videoIds);

  const results: any[] = [];
  for (const item of items) {
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
      heat: heatScore,
      publishedAt: item.publishedAt ? new Date(item.publishedAt).getTime() : Date.now(),
      summary: `${stats.title} · 👁️${stats.viewCount} 👍${stats.likeCount} 💬${stats.commentCount}`,
      description: item.description,
      _sourceType: 'youtube',
    });
  }

  console.log(`[YouTube] Collected ${results.length}/${items.length} for "${keyword}"`);
  return results;
}

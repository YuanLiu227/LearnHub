import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getBilibiliVideoStats, extractBVID } from './bilibili-api.js';
import { getYouTubeVideoStats } from './youtube-api.js';
import { getUserConfigValue } from './config.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const REFERER = 'https://www.bilibili.com/';
const COOKIE = 'buvid3=local; b_nut=1; buvid4=local; _uuid=local';

function biliHeaders() {
  return {
    'User-Agent': UA,
    'Referer': REFERER,
    'Cookie': COOKIE,
    'Origin': 'https://www.bilibili.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };
}

function getProxyAgent(userId?: string): HttpsProxyAgent<string> | undefined {
  const proxyUrl = getUserConfigValue('YOUTUBE_PROXY_URL', userId);
  if (proxyUrl) {
    return new HttpsProxyAgent(proxyUrl);
  }
  return undefined;
}

/**
 * 通过 Bilibili 搜索 API 查找 UP 主
 * 使用代理访问（Bilibili 对直连 Node.js 请求会返回空结果）
 */
/** 通过 Bilibili 搜索 API 查找 UP 主 */
export async function searchBilibiliUser(keyword: string): Promise<{ mid: string; name: string; avatar: string } | null> {
  try {
    const resp = await axios.get(
      `https://api.bilibili.com/x/web-interface/search/type?search_type=bili_user&keyword=${encodeURIComponent(keyword)}`,
      { timeout: 10000, headers: biliHeaders() },
    );
    if (resp.data.code !== 0) return null;
    const result = resp.data.data?.result;
    if (!result || !Array.isArray(result) || result.length === 0) return null;
    const user = result[0];
    return {
      mid: String(user.mid || ''),
      name: user.uname || keyword,
      avatar: user.upic || '',
    };
  } catch (err: any) {
    console.error(`[Creator] Bilibili user search error for "${keyword}":`, err.message);
    return null;
  }
}

/**
 * 获取 Bilibili UP 主的视频列表
 */
const BILI_SEARCH_DELAY = 3000;

/**
 * 获取 Bilibili UP 主的最新视频
 * 优先使用搜索 API（比空间 API 限流更宽松），按发布排序取最新视频
 */
export async function getBilibiliUserVideos(mid: string, limit: number = 20, knownName?: string): Promise<any[]> {
  // 先用空间 API 快速获取（如未限流）
  try {
    const resp = await axios.get(
      `https://api.bilibili.com/x/space/arc/search?mid=${mid}&ps=${limit}&pn=1`,
      { timeout: 15000, headers: biliHeaders() },
    );
    if (resp.data.code === 0) {
      const vlist = resp.data.data?.list?.vlist;
      if (vlist && Array.isArray(vlist) && vlist.length > 0) {
        return await processBilibiliVideos(vlist, mid, limit);
      }
    }
  } catch (e: any) {
    if (e.response?.status !== 412 && e.response?.status !== 429) {
      console.error(`[Creator] Bilibili space API error for mid=${mid}:`, e.message);
    }
  }

  // 空间 API 被限流时，使用搜索 API 按作者名查找（优先使用已知名称，避免再调 API）
  console.log(`[Creator] Bilibili space API rate limited, falling back to search API for mid=${mid}`);

  // 优先使用已知作者名（从DB的 channel_name 传入），否则尝试从 API 获取
  let authorName = knownName || '';
  if (!authorName) {
    try {
      const infoResp = await axios.get(
        `https://api.bilibili.com/x/space/acc/info?mid=${mid}`,
        { timeout: 10000, headers: biliHeaders() },
      );
      if (infoResp.data.code === 0) {
        authorName = infoResp.data.data?.name || '';
      }
    } catch (e: any) {
      console.error(`[Creator] Bilibili user info error for mid=${mid}:`, e.message);
      return [];
    }

    if (!authorName) {
      console.error(`[Creator] Bilibili: cannot resolve author name for mid=${mid}`);
      return [];
    }
  } else {
    console.log(`[Creator] Bilibili using known name "${authorName}" for mid=${mid}`);
  }

  // 等待限流恢复后，用搜索 API 查找该 UP 主的视频
  await new Promise(r => setTimeout(r, BILI_SEARCH_DELAY));
  try {
    const searchResp = await axios.get(
      `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(authorName)}&order=pubdate`,
      { timeout: 15000, headers: biliHeaders() },
    );

    if (searchResp.data.code !== 0) {
      console.log(`[Creator] Bilibili search API error: code=${searchResp.data.code}`);
      return [];
    }

    const result = searchResp.data.data?.result;
    if (!result || !Array.isArray(result)) return [];

    // 只保留该 UP 主的视频
    const filtered = result.filter((r: any) => {
      const rBvid = r.bvid || r.aid;
      const rAuthor = r.author || '';
      return rBvid && (r.mid === Number(mid) || rAuthor === authorName);
    }).slice(0, limit);

    if (filtered.length === 0) {
      console.log(`[Creator] Bilibili search: no videos found for "${authorName}"`);
      return [];
    }

    console.log(`[Creator] Bilibili search found ${filtered.length} videos for "${authorName}"`);
    const fakeVlist = filtered.map((r: any) => ({
      bvid: r.bvid,
      title: r.title,
      play: r.play || 0,
      likes: r.likes || 0,
      created: r.pubdate || 0,
    }));

    return await processBilibiliVideos(fakeVlist, mid, limit);
  } catch (e: any) {
    console.error(`[Creator] Bilibili search fallback error for mid=${mid}:`, e.message);
    return [];
  }
}

/** 处理 Bilibili 视频列表：获取统计、评分 */
async function processBilibiliVideos(vlist: any[], mid: string, limit: number): Promise<any[]> {
  const items: any[] = [];
  for (const v of vlist) {
    if (!v.bvid) continue;
    if (items.length >= limit) break;

    await new Promise(r => setTimeout(r, 500));
    const stats = await getBilibiliVideoStats(v.bvid);
    if (!stats) continue;

    const publishedAt = v.created ? v.created * 1000 : (stats.pubdate ? stats.pubdate * 1000 : Date.now());
    const heatScore = Math.min(100, Math.round(stats.view / 1000));
    items.push({
      title: stats.title.slice(0, 200),
      url: `https://www.bilibili.com/video/${v.bvid}`,
      source: 'bilibili',
      sourceName: 'Bilibili',
      author: stats.author,
      heat: heatScore,
      publishedAt,
      summary: `${stats.title} · 👁️${stats.view} 👍${stats.like} ⭐${stats.favorite}`,
      _sourceType: 'bilibili',
    });
  }

  console.log(`[Creator] Bilibili user ${mid}: collected ${items.length} videos`);
  return items;
}

/**
 * 通过 YouTube Search API 搜索频道
 */
export async function searchYouTubeChannel(query: string, userId?: string): Promise<{ channelId: string; title: string; avatar: string } | null> {
  const apiKey = getUserConfigValue('YOUTUBE_API_KEY', userId);
  if (!apiKey) {
    console.log('[Creator] YOUTUBE_API_KEY not configured');
    return null;
  }

  try {
    const config: any = {
      params: { part: 'snippet', type: 'channel', q: query, maxResults: 1, key: apiKey },
      timeout: 15000,
    };
    const agent = getProxyAgent(userId);
    if (agent) config.httpsAgent = agent;

    const resp = await axios.get('https://www.googleapis.com/youtube/v3/search', config);

    const items = resp.data.items || [];
    if (items.length === 0) return null;

    const channel = items[0];
    return {
      channelId: channel.id?.channelId || '',
      title: channel.snippet?.title || query,
      avatar: channel.snippet?.thumbnails?.default?.url || '',
    };
  } catch (err: any) {
    console.error(`[Creator] YouTube channel search error for "${query}":`, err.message);
    return null;
  }
}

/**
 * 获取 YouTube 频道的最新视频
 */
export async function getYouTubeChannelVideos(channelId: string, limit: number = 10, userId?: string): Promise<any[]> {
  const apiKey = getUserConfigValue('YOUTUBE_API_KEY', userId);
  if (!apiKey) return [];

  try {
    const searchConfig: any = {
      params: {
        part: 'snippet',
        channelId,
        order: 'date',
        maxResults: limit,
        type: 'video',
        key: apiKey,
      },
      timeout: 15000,
    };
    const agent = getProxyAgent(userId);
    if (agent) searchConfig.httpsAgent = agent;

    const searchResp = await axios.get('https://www.googleapis.com/youtube/v3/search', searchConfig);

    const items = searchResp.data.items || [];
    const videoIds = items
      .filter((i: any) => i.id?.videoId)
      .map((i: any) => i.id.videoId);

    if (videoIds.length === 0) return [];

    const statsMap = await getYouTubeVideoStats(videoIds);

    const results: any[] = [];
    for (const item of items) {
      const videoId = item.id?.videoId;
      if (!videoId) continue;

      const stats = statsMap.get(videoId);
      if (!stats) continue;

      const heatScore = Math.min(100, Math.round(stats.viewCount / 1000));
      results.push({
        title: stats.title.slice(0, 200),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        source: 'youtube',
        sourceName: 'YouTube',
        author: stats.channelTitle,
        heat: heatScore,
        publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).getTime() : Date.now(),
        summary: `${stats.title} · 👁️${stats.viewCount} 👍${stats.likeCount}`,
        description: item.snippet?.description || '',
        _sourceType: 'youtube',
      });
    }

    console.log(`[Creator] YouTube channel ${channelId}: collected ${results.length} videos`);
    return results;
  } catch (err: any) {
    console.error(`[Creator] YouTube channel videos error for channelId=${channelId}:`, err.message);
    return [];
  }
}

/**
 * 从所有关注的博主收集内容
 * 返回按 creatorId -> items[] 的 Map
 */
export async function collectCreatorContent(creators: any[], userId?: string): Promise<Map<string, any[]>> {
  const result = new Map<string, any[]>();

  for (const creator of creators) {
    const cId = creator.id;
    const cPlatform = creator.platform;
    const cName = creator.channel_name || creator.channelName;
    const cChannelId = creator.channel_id || creator.channelId;

    console.log(`[Creator] Collecting content from "${cName}" (${cPlatform})`);

    let items: any[] = [];
    if (cPlatform === 'bilibili') {
      items = await getBilibiliUserVideos(cChannelId, 20, cName);
    } else if (cPlatform === 'youtube') {
      items = await getYouTubeChannelVideos(cChannelId, 10, userId);
    }

    // 给每个条目标记 creator 信息
    for (const item of items) {
      item._creatorId = cId;
      item._creatorName = cName;
    }

    result.set(cId, items);
  }

  return result;
}

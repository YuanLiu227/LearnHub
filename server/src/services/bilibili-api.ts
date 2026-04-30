import axios from 'axios';

const BILIBILI_VIEW_API = 'https://api.bilibili.com/x/web-interface/view';
const BILIBILI_SEARCH_API = 'https://api.bilibili.com/x/web-interface/search/type';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const REFERER = 'https://www.bilibili.com/';
const COOKIE = 'buvid3=local; b_nut=1; buvid4=local; _uuid=local';

/** 所有 Bilibili API 请求共用的浏览器级请求头 */
function apiHeaders() {
  return {
    'User-Agent': UA,
    'Referer': REFERER,
    'Cookie': COOKIE,
    'Origin': 'https://www.bilibili.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  };
}

interface VideoStats {
  bvid: string;
  title: string;
  desc: string;
  author: string;
  view: number;
  like: number;
  favorite: number;
  coin: number;
  danmaku: number;
  reply: number;
  pubdate: number;
}

interface SearchResult {
  title?: string;
  description?: string;
  url: string;
  publishedAt?: string;
}

/** BVID 正则：BV 开头 + 10 位字母数字 */
const BVID_REGEX = /BV[a-zA-Z0-9]{10}/;

/**
 * 从 Bilibili 视频 URL 中提取 BV 号
 */
export function extractBVID(url: string): string | null {
  const match = url.match(BVID_REGEX);
  return match ? match[0] : null;
}

/**
 * 调用 Bilibili 官方 API 获取视频统计数据
 * GET /x/web-interface/view?bvid={BVID}
 */
export async function getBilibiliVideoStats(bvid: string): Promise<VideoStats | null> {
  try {
    const resp = await axios.get(`${BILIBILI_VIEW_API}?bvid=${bvid}`, {
      timeout: 10000,
      headers: apiHeaders(),
    });

    if (resp.data.code !== 0) {
      console.log(`[Bilibili] API error for ${bvid}: code=${resp.data.code}`);
      return null;
    }

    const d = resp.data.data;
    const st = d.stat || {};
    return {
      bvid: d.bvid || bvid,
      title: d.title || '',
      desc: d.desc || '',
      author: d.owner?.name || '',
      view: st.view || 0,
      like: st.like || 0,
      favorite: st.favorite || 0,
      coin: st.coin || 0,
      danmaku: st.danmaku || 0,
      reply: st.reply || 0,
      pubdate: d.pubdate || 0,
    };
  } catch (err: any) {
    console.error(`[Bilibili] Stats request failed for ${bvid}:`, err.message);
    return null;
  }
}

/**
 * 使用 Bilibili 官方搜索 API 搜索视频
 * GET /x/web-interface/search/type/v2?search_type=video&keyword={keyword}
 *
 * 返回 SearchResult 数组（含标题、URL、描述），与之前 Firecrawl 版本的接口一致。
 * 免费、无需 API Key。
 */
export async function searchBilibiliVideos(keyword: string, limit: number = 10): Promise<SearchResult[]> {
  try {
    console.log(`[Bilibili] Searching via API: "${keyword}"`);
    const resp = await axios.get(`${BILIBILI_SEARCH_API}?search_type=video&keyword=${encodeURIComponent(keyword)}&order=click`, {
      timeout: 15000,
      headers: apiHeaders(),
    });

    if (resp.data.code !== 0) {
      console.log(`[Bilibili] Search API error: code=${resp.data.code}`);
      return [];
    }

    const result = resp.data.data?.result;
    if (!result || !Array.isArray(result)) {
      console.log(`[Bilibili] No results array in search response for "${keyword}"`);
      return [];
    }

    const items = result
      .filter((r: any) => r.bvid) // 只保留有 BVID 的视频
      .slice(0, limit)
      .map((r: any) => ({
        title: r.title?.replace(/<[^>]+>/g, '') || '', // 去掉标题中的 HTML 标签
        description: r.desc || '',
        url: `https://www.bilibili.com/video/${r.bvid}`,
        publishedAt: r.pubdate ? new Date(r.pubdate * 1000).toISOString() : undefined,
      }));

    console.log(`[Bilibili] Search found ${items.length} videos for "${keyword}"`);
    return items;
  } catch (err: any) {
    console.error(`[Bilibili] Search request failed for "${keyword}":`, err.message);
    return [];
  }
}

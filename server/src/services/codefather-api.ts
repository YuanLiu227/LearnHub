import axios from 'axios';

/** 程序员鱼皮在 codefather.cn 的用户 ID */
const YUPI_USER_ID = '1601072287388278786';

const POST_LIST_API = 'https://api.codefather.cn/api/post/list/page/vo';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function apiHeaders() {
  return {
    'User-Agent': UA,
    'Content-Type': 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  };
}

/**
 * 获取程序员鱼皮的文章列表
 * POST /api/post/list/page/vo
 * 返回 程序员鱼皮 发布的所有文章，直接保留不过滤
 */
export async function collectCodefatherArticles(
  keyword: string,
  limit: number = 10,
): Promise<any[]> {
  try {
    console.log(`[Codefather] Fetching 程序员鱼皮 posts (keyword=${keyword}, limit=${limit})`);

    const pageSize = Math.min(Math.max(limit, 10), 20);
    const resp = await axios.post(
      POST_LIST_API,
      { userId: YUPI_USER_ID, current: 1, pageSize },
      { timeout: 15000, headers: apiHeaders() },
    );

    if (resp.data.code !== 0) {
      console.log(`[Codefather] API error: code=${resp.data.code}`);
      return [];
    }

    const records = resp.data.data?.records || [];
    if (!Array.isArray(records)) return [];

    const results: any[] = [];
    const kw = keyword.toLowerCase();

    for (const r of records) {
      const title = r.title || '';
      const desc = r.plainTextDescription || r.content || '';

      // 客户端侧关键词匹配
      if (kw) {
        const titleMatch = title.toLowerCase().includes(kw);
        const descMatch = desc.toLowerCase().includes(kw);
        if (!titleMatch && !descMatch) {
          console.log(`[Codefather] filtered: keyword mismatch "${title.slice(0, 40)}"`);
          continue;
        }
      }

      const urlPath = '/post/';

      const heatScore = Math.min(100, Math.round((r.viewNum || 0) / 100));

      results.push({
        title: title.slice(0, 200),
        url: `https://codefather.cn${urlPath}${r.id}`,
        source: 'codefather',
        sourceName: '编程导航',
        heat: heatScore,
        publishedAt: r.createTime || Date.now(),
        summary: `${title} · 👁️${r.viewNum || 0} 👍${r.thumbNum || 0} 💬${r.commentNum || 0}`,
        description: desc,
        _sourceType: 'codefather',
      });
    }

    console.log(`[Codefather] Collected ${results.length}/${records.length} for "${keyword}"`);
    return results;
  } catch (err: any) {
    console.error(`[Codefather] Error:`, err.message);
    return [];
  }
}

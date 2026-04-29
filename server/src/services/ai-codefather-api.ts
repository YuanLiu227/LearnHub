import axios from 'axios';

const COURSE_ARTICLE_API = 'https://api.codefather.cn/api/course_article/list';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function apiHeaders() {
  return {
    'User-Agent': UA,
    'Content-Type': 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  };
}

/** Vibe Coding 课程 ID（鱼皮官方发布的 AI 教程） */
const VIBE_CODING_COURSE_ID = '1935993640975368194';

/**
 * 获取鱼皮AI导航课程文章列表
 * POST /api/course_article/list
 *
 * Vibe Coding 课程包含 638+ 条官方发布的 AI 教程/资讯/项目实战，
 * 全部由"程序员鱼皮"(role: admin) 发布，直接保留不过滤。
 *
 * @param keyword 可选，传入时按标题匹配关键词
 * @param limit 获取数量
 */
export async function collectAiCodefatherArticles(keyword?: string, limit: number = 10): Promise<any[]> {
  try {
    console.log(`[AiCodefather] Fetching course articles (keyword=${keyword || 'all'}, limit=${limit})...`);
    const pageSize = keyword ? Math.max(limit * 5, 50) : limit; // 有关键词时多取一些便于匹配
    const resp = await axios.post(
      COURSE_ARTICLE_API,
      { courseId: VIBE_CODING_COURSE_ID, current: 1, pageSize },
      { timeout: 15000, headers: apiHeaders() },
    );

    if (resp.data.code !== 0) {
      console.log(`[AiCodefather] API error: code=${resp.data.code}`);
      return [];
    }

    const records = resp.data.data || [];
    if (!Array.isArray(records)) return [];

    const results: any[] = [];
    const seenUrls = new Set<string>();

    for (const r of records) {
      const title = r.title || '';
      const desc = r.plainTextDescription || r.content || '';

      // 有关键词时，按标题/简介匹配
      if (keyword) {
        const kw = keyword.toLowerCase();
        const matchesTitle = title.toLowerCase().includes(kw);
        const matchesDesc = desc.toLowerCase().includes(kw);
        if (!matchesTitle && !matchesDesc) continue;
      }

      const url = `https://ai.codefather.cn/library/${r.id}`;
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const heatScore = Math.min(100, Math.round((r.viewNum || 0) / 100));
      results.push({
        title: (r.title || '').slice(0, 200),
        url,
        source: 'ai-codefather',
        sourceName: '鱼皮AI导航',
        heat: heatScore,
        publishedAt: r.createTime || Date.now(),
        summary: `${r.title || ''} · 👁️${r.viewNum || 0} 👍${r.thumbNum || 0} 💬${r.commentNum || 0}`,
        description: r.plainTextDescription || r.content || '',
        _sourceType: 'ai-codefather',
      });
    }

    console.log(`[AiCodefather] Collected ${results.length} articles`);
    return results;
  } catch (err: any) {
    console.error(`[AiCodefather] Error:`, err.message);
    return [];
  }
}

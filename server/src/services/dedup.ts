/**
 * 计算字符串相似度（字符 bigram Jaccard），同时支持中文和英文
 */
function strSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '').trim();
  const s2 = b.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '').trim();
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const bigrams1 = new Set<string>();
  const bigrams2 = new Set<string>();
  for (let i = 0; i < s1.length - 1; i++) bigrams1.add(s1.substring(i, i + 2));
  for (let i = 0; i < s2.length - 1; i++) bigrams2.add(s2.substring(i, i + 2));

  let intersection = 0;
  for (const b of bigrams1) { if (bigrams2.has(b)) intersection++; }
  const union = bigrams1.size + bigrams2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

const CREDIBILITY: Record<string, number> = {
  'codefather': 3, 'ai-codefather': 3, 'bilibili': 2, 'youtube': 1,
};

/**
 * 跨源去重：标题和作者都相似则视为重复，保留可信度更高的来源
 * Bilibili 优先于 YouTube（同一位作者跨平台发布时优先保留 Bilibili）
 */
export function deduplicateItems(items: any[]): any[] {
  const TITLE_THRESHOLD = 0.75;
  const AUTHOR_THRESHOLD = 0.6;

  const kept: any[] = [];
  for (const item of items) {
    let isDup = false;
    for (let i = 0; i < kept.length; i++) {
      const existing = kept[i];
      const titleSim = strSimilarity(item.title || '', existing.title || '');
      const authorSim = strSimilarity(item.author || '', existing.author || '');
      if (titleSim >= TITLE_THRESHOLD && authorSim >= AUTHOR_THRESHOLD) {
        isDup = true;
        const itemCred = CREDIBILITY[item.source] ?? 0;
        const existingCred = CREDIBILITY[existing.source] ?? 0;
        if (itemCred > existingCred) kept[i] = item;
        break;
      }
    }
    if (!isDup) kept.push(item);
  }
  return kept;
}

/** 来源可信度 */
const CREDIBILITY: Record<string, number> = {
  'codefather': 0.9,
  'ai-codefather': 0.9,
  'youtube': 0.7,
  'bilibili': 0.6,
};

/** 内容类型得分 */
const CONTENT_TYPE: Record<string, number> = {
  'ai-codefather': 0.9,
  'codefather': 0.8,
  'youtube': 0.7,
  'bilibili': 0.7,
};

function calcTimeliness(publishedAt: number): number {
  const days = (Date.now() - publishedAt) / 86400000;
  if (days <= 7) return 1.0;
  if (days <= 30) return 0.7;
  if (days <= 90) return 0.4;
  return 0.2;
}

export interface ScoringInput {
  heat: number;
  source: string;
  publishedAt: number;
}

export interface ScoringResult {
  combined: number;
  heatScore: number;
  credibilityScore: number;
  timelinessScore: number;
  contentTypeScore: number;
}

export function calcCombinedScore(input: ScoringInput): ScoringResult {
  const heatScore = Math.max(0, Math.min(1, (input.heat || 50) / 100));
  const credibilityScore = CREDIBILITY[input.source] ?? 0.5;
  const timelinessScore = calcTimeliness(input.publishedAt || Date.now());
  const contentTypeScore = CONTENT_TYPE[input.source] ?? 0.6;

  const combined = Math.round(
    (heatScore * 0.4 +
    credibilityScore * 0.3 +
    timelinessScore * 0.2 +
    contentTypeScore * 0.1) * 100
  );

  return { combined, heatScore, credibilityScore, timelinessScore, contentTypeScore };
}

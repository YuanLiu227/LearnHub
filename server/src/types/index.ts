// 类型定义

export interface Keyword {
  id: string;
  term: string;
  scope?: string;
  enabled: boolean;
  archived: boolean;
  createdAt: number;
  lastMatchedAt?: number;
  hotspotCount?: number;
}

export interface NewsItem {
  id: string;
  keywordId: string;
  title: string;
  url: string;
  source: string;
  sourceName: string;
  publishedAt: number;
  isReal: boolean;
  confidence: number;
  summary?: string;
  matchedAt: number;
}

export interface HotTopic {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceName: string;
  heat: number;
  publishedAt: number;
  scope: string;
  summary?: string;
}

export interface Config {
  hotInterval: number;
  monitorInterval: number;
  emailEnabled: boolean;
  notificationEnabled: boolean;
  email?: string;
}

export interface VeracityResult {
  isReal: boolean;
  confidence: number;
  reason: string;
  summary?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

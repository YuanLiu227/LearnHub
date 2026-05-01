export interface Keyword {
  id: string;
  term: string;
  scope: string;
  enabled: boolean;
  archived: boolean;
  createdAt: number;
  lastMatchedAt?: number;
  hotspotCount?: number;
}

export interface NewsItem {
  id: string;
  keywordId?: string;
  keywordTerm?: string;
  title: string;
  url: string;
  source: string;
  sourceName: string;
  publishedAt: number;
  isReal: boolean;
  confidence: number;
  summary?: string;
  matchedAt: number;
  isUrgent?: boolean;
  heat?: number;
  creatorId?: string;
  creatorName?: string;
  completed?: boolean;
  favorited?: boolean;
  resourceType?: 'keyword' | 'creator' | 'direct_video';
}

export interface FollowedCreator {
  id: string;
  platform: 'youtube' | 'bilibili';
  channelId: string;
  channelName: string;
  description?: string;
  avatarUrl?: string;
  enabled: boolean;
  createdAt: number;
  lastFetchedAt?: number;
  archived?: boolean;
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

export interface AppConfig {
  emailEnabled: boolean;
  notificationEnabled: boolean;
  email?: string;
}

// 监控间隔选项（分钟）
export const MONITOR_INTERVAL_OPTIONS = [
  { label: '关闭', value: 0 },
  { label: '15 分钟', value: 15 * 60 * 1000 },
  { label: '30 分钟', value: 30 * 60 * 1000 },
  { label: '60 分钟', value: 60 * 60 * 1000 },
  { label: '120 分钟', value: 120 * 60 * 1000 },
];

export interface MonitorProgress {
  stage: 'started' | 'collecting' | 'matching' | 'verifying' | 'completed' | 'error';
  message: string;
  matched?: number;
  verified?: number;
  total?: number;
  error?: string;
}

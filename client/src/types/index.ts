export interface Keyword {
  id: string;
  term: string;
  scope: string;
  enabled: boolean;
  createdAt: number;
  lastMatchedAt?: number;
  hotspotCount?: number;
}

export interface NewsItem {
  id: string;
  keywordId: string;
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
  hotRefreshEnabled: boolean;   // 是否启用热点定时刷新
  hotRefreshInterval: number;    // 热点刷新间隔(ms)
  autoMonitorEnabled: boolean; // 是否启用自动监控
  monitorInterval: number;      // 自动监控间隔(ms)
  emailEnabled: boolean;
  notificationEnabled: boolean;
  email?: string;
}

// 刷新间隔选项（分钟）
export const HOT_REFRESH_OPTIONS = [
  { label: '关闭', value: 0 },
  { label: '5 分钟', value: 5 * 60 * 1000 },
  { label: '10 分钟', value: 10 * 60 * 1000 },
  { label: '15 分钟', value: 15 * 60 * 1000 },
  { label: '30 分钟', value: 30 * 60 * 1000 },
  { label: '60 分钟', value: 60 * 60 * 1000 },
];

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

import { create } from 'zustand';
import type { Keyword, NewsItem, AppConfig, MonitorProgress } from '../types';
import { keywordsApi, monitorApi, dashboardApi, configApi } from '../services/api';

export type TabType = 'dashboard' | 'keywords' | 'search';

interface DashboardStats {
  totalHotspots: number;
  todayNew: number;
  urgentHot: number;
  monitoredKeywords: number;
}

interface AppState {
  // Tab 状态
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // 关键词
  keywords: Keyword[];
  fetchKeywords: () => Promise<void>;
  addKeyword: (term: string) => Promise<void>;
  deleteKeyword: (id: string) => Promise<void>;
  toggleKeyword: (id: string, enabled: boolean) => Promise<void>;

  // 仪表盘
  stats: DashboardStats;
  hotspots: NewsItem[];
  hotspotsTotal: number;
  newHotspotItems: NewsItem[];
  fetchStats: () => Promise<void>;
  fetchHotspots: (page?: number) => Promise<void>;
  clearNewHotspotItems: () => void;

  // 监控
  isMonitoring: boolean;
  monitorProgress: MonitorProgress | null;
  triggerMonitor: () => Promise<void>;

  // 搜索
  searchQuery: string;
  searchResults: NewsItem[];
  searchTotal: number;
  setSearchQuery: (q: string) => void;
  searchHotspots: (q: string, page?: number) => Promise<void>;

  // 配置
  config: AppConfig;
  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;

  // 全局状态
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Tab 状态
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // 关键词
  keywords: [],
  fetchKeywords: async () => {
    set({ isLoading: true });
    try {
      const keywords = await keywordsApi.getAll();
      set({ keywords, error: null });
    } catch (error: any) {
      set({ error: error.message || '获取关键词失败' });
    } finally {
      set({ isLoading: false });
    }
  },
  addKeyword: async (term: string) => {
    try {
      const keyword = await keywordsApi.add(term);
      set(state => ({
        keywords: [keyword, ...state.keywords],
        error: null,
      }));
    } catch (error: any) {
      set({ error: error.message || '添加关键词失败' });
    }
  },
  deleteKeyword: async (id: string) => {
    try {
      await keywordsApi.delete(id);
      set(state => ({
        keywords: state.keywords.filter(k => k.id !== id),
        error: null,
      }));
    } catch (error: any) {
      set({ error: error.message || '删除关键词失败' });
    }
  },
  toggleKeyword: async (id: string, enabled: boolean) => {
    try {
      await keywordsApi.update(id, { enabled });
      set(state => ({
        keywords: state.keywords.map(k =>
          k.id === id ? { ...k, enabled } : k
        ),
        error: null,
      }));
    } catch (error: any) {
      set({ error: error.message || '更新关键词失败' });
    }
  },

  // 仪表盘
  stats: {
    totalHotspots: 0,
    todayNew: 0,
    urgentHot: 0,
    monitoredKeywords: 0,
  },
  hotspots: [],
  hotspotsTotal: 0,
  newHotspotItems: [],

  fetchStats: async () => {
    try {
      const stats = await dashboardApi.getStats();
      set({ stats, error: null });
    } catch (error: any) {
      set({ error: error.message || '获取统计失败' });
    }
  },

  fetchHotspots: async (page = 1) => {
    try {
      const data = await dashboardApi.getHotspots(page);
      set({
        hotspots: data.items,
        hotspotsTotal: data.total,
        error: null,
      });
    } catch (error: any) {
      set({ error: error.message || '获取热点失败' });
    }
  },

  clearNewHotspotItems: () => set({ newHotspotItems: [] }),

  // 监控
  isMonitoring: false,
  monitorProgress: null,

  triggerMonitor: async () => {
    const startedAt = Date.now();

    set({
      isMonitoring: true,
      monitorProgress: { stage: 'started', message: '正在启动监控...' },
      error: null
    });

    try {
      const response = await monitorApi.trigger();
      const monitorId = response.monitorId;

      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/monitor/progress/${monitorId}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const progress = await res.json() as MonitorProgress;
          set({ monitorProgress: progress });

            if (progress.stage === 'completed' || progress.stage === 'error') {
              clearInterval(pollInterval);
              setTimeout(() => {
                set({ isMonitoring: false, monitorProgress: null });
                // 刷新数据
                get().fetchStats();
                get().fetchHotspots().then(() => {
                  const latestHotspots = get().hotspots;
                  const newItems = latestHotspots.filter(item => item.matchedAt >= startedAt);
                  set({ newHotspotItems: newItems });
                });
              }, 2000);
          }
        } catch (e: any) {
          console.error('[Progress] Poll error:', e);
          clearInterval(pollInterval);
          set({ error: '获取进度失败: ' + e.message, isMonitoring: false, monitorProgress: null });
        }
      }, 500);

    } catch (error: any) {
      set({ error: error.message || '监控启动失败', isMonitoring: false, monitorProgress: null });
    }
  },

  // 搜索
  searchQuery: '',
  searchResults: [],
  searchTotal: 0,
  setSearchQuery: (q) => set({ searchQuery: q }),
  searchHotspots: async (q: string, page = 1) => {
    if (!q.trim()) {
      set({ searchResults: [], searchTotal: 0 });
      return;
    }
    try {
      const data = await dashboardApi.search(q, page);
      set({ searchResults: data.items, searchTotal: data.total, error: null });
    } catch (error: any) {
      set({ error: error.message || '搜索失败' });
    }
  },

  // 配置
  config: {
    hotRefreshEnabled: true,
    hotRefreshInterval: 30 * 60 * 1000,
    autoMonitorEnabled: true,
    monitorInterval: 60 * 60 * 1000,
    emailEnabled: true,
    notificationEnabled: true,
  },
  fetchConfig: async () => {
    try {
      const config = await configApi.get();
      set({ config, error: null });
    } catch (error: any) {
      set({ error: error.message || '获取配置失败' });
    }
  },
  updateConfig: async (updates: Partial<AppConfig>) => {
    try {
      await configApi.update(updates);
      set(state => ({
        config: { ...state.config, ...updates },
        error: null,
      }));
    } catch (error: any) {
      set({ error: error.message || '更新配置失败' });
    }
  },

  // 全局
  isLoading: false,
  error: null,
  clearError: () => set({ error: null }),
}));

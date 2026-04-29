import { create } from 'zustand';
import type { Keyword, NewsItem, AppConfig, MonitorProgress } from '../types';
import { keywordsApi, monitorApi, dashboardApi, searchApi, configApi } from '../services/api';

export type TabType = 'dashboard' | 'keywords' | 'overview' | 'search';

interface DashboardStats {
  totalResources: number;
  todayNew: number;
  sourcesCount: number;
  monitoredKeywords: number;
}

interface AppState {
  // Tab 状态
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // 关键词
  keywords: Keyword[];
  allKeywords: Keyword[];
  fetchKeywords: () => Promise<void>;
  fetchAllKeywords: () => Promise<void>;
  addKeyword: (term: string) => Promise<void>;
  archiveKeyword: (id: string) => Promise<void>;
  permanentDeleteKeyword: (id: string) => Promise<void>;
  toggleKeyword: (id: string, enabled: boolean) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;

  // 学习资源
  stats: DashboardStats;
  resources: NewsItem[];
  resourcesTotal: number;
  newResourceItems: NewsItem[];
  fetchStats: () => Promise<void>;
  fetchResources: (page?: number) => Promise<void>;
  clearNewResourceItems: () => void;

  // 监控（搜索）
  isSearching: boolean;
  searchProgress: MonitorProgress | null;
  triggerSearch: () => Promise<void>;

  // 搜索（历史）
  searchQuery: string;
  searchResults: NewsItem[];
  searchTotal: number;
  setSearchQuery: (q: string) => void;
  searchResources: (q: string, page?: number) => Promise<void>;

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
  activeTab: 'search',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // 关键词
  keywords: [],
  allKeywords: [],
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
  fetchAllKeywords: async () => {
    try {
      const allKeywords = await keywordsApi.getAllKeywords();
      set({ allKeywords, error: null });
    } catch (error: any) {
      set({ error: error.message || '获取关键词总览失败' });
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
  archiveKeyword: async (id: string) => {
    try {
      await keywordsApi.archive(id);
      set(state => ({
        keywords: state.keywords.filter(k => k.id !== id),
        error: null,
      }));
    } catch (error: any) {
      set({ error: error.message || '归档关键词失败' });
    }
  },
  permanentDeleteKeyword: async (id: string) => {
    try {
      await keywordsApi.permanentDelete(id);
      await get().fetchAllKeywords();
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message || '永久删除失败' });
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

  // 学习资源
  stats: {
    totalResources: 0,
    todayNew: 0,
    sourcesCount: 4,
    monitoredKeywords: 0,
  },
  resources: [],
  resourcesTotal: 0,
  newResourceItems: [],

  fetchStats: async () => {
    try {
      const data = await dashboardApi.getStats();
      set({
        stats: {
          totalResources: data.totalHotspots,
          todayNew: data.todayNew,
          sourcesCount: 4,
          monitoredKeywords: data.monitoredKeywords,
        },
        error: null,
      });
    } catch (error: any) {
      set({ error: error.message || '获取统计失败' });
    }
  },

  fetchResources: async (page = 1) => {
    try {
      const data = await dashboardApi.getHotspots(page, 20);
      set({
        resources: data.items,
        resourcesTotal: data.total,
        error: null,
      });
    } catch (error: any) {
      set({ error: error.message || '获取资源失败' });
    }
  },

  clearNewResourceItems: () => set({ newResourceItems: [] }),

  // 搜索（触发全量搜索）
  isSearching: false,
  searchProgress: null,

  triggerSearch: async () => {
    const startedAt = Date.now();

    set({
      isSearching: true,
      searchProgress: { stage: 'started', message: '正在搜索...' },
      error: null,
    });

    try {
      const response = await monitorApi.trigger();
      const monitorId = response.monitorId;

      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/monitor/progress/${monitorId}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const progress = await res.json() as MonitorProgress;
          set({ searchProgress: progress });

          if (progress.stage === 'completed' || progress.stage === 'error') {
            clearInterval(pollInterval);
            setTimeout(() => {
              set({ isSearching: false, searchProgress: null });
              get().fetchStats();
              get().fetchResources().then(() => {
                const latest = get().resources;
                const newItems = latest.filter(item => item.matchedAt >= startedAt);
                set({ newResourceItems: newItems });
              });
            }, 2000);
          }
        } catch (e: any) {
          console.error('[Progress] Poll error:', e);
          clearInterval(pollInterval);
          set({ error: '获取进度失败: ' + e.message, isSearching: false, searchProgress: null });
        }
      }, 500);

    } catch (error: any) {
      set({ error: error.message || '搜索启动失败', isSearching: false, searchProgress: null });
    }
  },

  // 搜索（历史记录）
  searchQuery: '',
  searchResults: [],
  searchTotal: 0,
  setSearchQuery: (q) => set({ searchQuery: q }),
  searchResources: async (q: string, page = 1) => {
    if (!q.trim()) {
      set({ searchResults: [], searchTotal: 0 });
      return;
    }
    try {
      const data = await searchApi.search(q, page);
      set({ searchResults: data.items, searchTotal: data.total, error: null });
    } catch (error: any) {
      set({ error: error.message || '搜索失败' });
    }
  },

  deleteResource: async (id: string) => {
    try {
      await dashboardApi.deleteResource(id);
      set(state => ({
        resources: state.resources.filter(r => r.id !== id),
        searchResults: state.searchResults.filter(r => r.id !== id),
        error: null,
      }));
    } catch (error: any) {
      set({ error: error.message || '删除资源失败' });
    }
  },

  // 配置
  config: {
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

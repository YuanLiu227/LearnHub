import { create } from 'zustand';
import type { Keyword, NewsItem, AppConfig, MonitorProgress, FollowedCreator, UserConfigMap } from '../types';
import api, { keywordsApi, monitorApi, dashboardApi, searchApi, configApi, creatorsApi, authApi, videosApi } from '../services/api';

export type TabType = 'dashboard' | 'keywords' | 'overview' | 'search' | 'favorites' | 'settings';

interface DashboardStats {
  totalResources: number;
  todayNew: number;
  sourcesCount: number;
  monitoredKeywords: number;
}

interface AppState {
  // Auth 状态
  user: { id: string; email: string; role?: string; status?: string } | null;
  token: string | null;
  isAuthReady: boolean;
  login: (email: string, password: string, captchaId: string, captchaCode: string) => Promise<void>;
  sendRegisterCode: (email: string, password: string, captchaId: string, captchaCode: string) => Promise<{ devCode?: string }>;
  verifyRegisterCode: (email: string, code: string, password: string, captchaId: string, captchaCode: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;

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
  restoreKeyword: (id: string) => Promise<void>;
  permanentDeleteKeyword: (id: string) => Promise<void>;
  toggleKeyword: (id: string, enabled: boolean) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  batchDeleteResources: (type: 'keywords' | 'creators' | 'direct_video') => Promise<void>;
  batchDeleteResourcesByIds: (ids: string[]) => Promise<void>;

  // 学习资源
  stats: DashboardStats;
  resources: NewsItem[];
  resourcesTotal: number;
  newResourceItems: NewsItem[];
  fetchStats: () => Promise<void>;
  fetchResources: (page?: number) => Promise<void>;
  fetchResourcesByType: (page: number, resourceType?: string) => Promise<void>;
  clearNewResourceItems: () => void;
  favoriteResources: NewsItem[];
  favoriteResourcesTotal: number;
  fetchFavorites: (page?: number) => Promise<void>;
  toggleComplete: (id: string, completed: boolean) => Promise<void>;
  toggleFavorite: (id: string, favorited: boolean) => Promise<void>;

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

  // 关注的博主
  followedCreators: FollowedCreator[];
  allCreators: FollowedCreator[];
  fetchFollowedCreators: () => Promise<void>;
  fetchAllCreators: () => Promise<void>;
  addFollowedCreator: (platform: string, query: string) => Promise<void>;
  toggleFollowedCreator: (id: string, enabled: boolean) => Promise<void>;
  archiveCreator: (id: string) => Promise<void>;
  restoreCreator: (id: string) => Promise<void>;
  permanentDeleteCreator: (id: string) => Promise<void>;

  // 博主内容收集（独立于关键词搜索）
  isCollectingCreators: boolean;
  creatorCollectProgress: MonitorProgress | null;
  triggerCreatorCollect: () => Promise<void>;

  // 视频 URL 提交
  isSubmittingVideo: boolean;
  submitVideoUrl: (url: string, platform: string) => Promise<void>;

  // 用户配置
  userConfig: UserConfigMap;
  fetchUserConfig: () => Promise<void>;
  updateUserConfig: (key: string, value: string | null) => Promise<void>;

  // 全局状态
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const storedToken = localStorage.getItem('token');

export const useAppStore = create<AppState>((set, get) => ({
  // Auth 状态
  user: null,
  token: storedToken,
  isAuthReady: false,

  login: async (email: string, password: string, captchaId: string, captchaCode: string) => {
    const data = await authApi.login(email, password, captchaId, captchaCode);
    localStorage.setItem('token', data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    set({ user: data.user, token: data.token, error: null });
  },

  sendRegisterCode: async (email: string, password: string, captchaId: string, captchaCode: string): Promise<{ devCode?: string }> => {
    const data = await authApi.register(email, password, captchaId, captchaCode);
    return data;
  },

  verifyRegisterCode: async (email: string, code: string, password: string, captchaId: string, captchaCode: string) => {
    const data = await authApi.verifyRegistration(email, code, password, captchaId, captchaCode);
    localStorage.setItem('token', data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    set({ user: data.user, token: data.token, error: null });
  },

  logout: () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, token: null, error: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthReady: true, user: null, token: null });
      return;
    }
    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const data = await authApi.me();
      set({ user: data.user, token, isAuthReady: true });
    } catch {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      set({ user: null, token: null, isAuthReady: true });
    }
  },

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
      const msg = error.response?.data?.error || error.message || '添加关键词失败';
      set({ error: msg });
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
  restoreKeyword: async (id: string) => {
    try {
      await keywordsApi.restore(id);
      await get().fetchAllKeywords();
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message || '恢复关键词失败' });
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
        resources: data.items.filter((r: NewsItem) => !r.favorited),
        resourcesTotal: data.total,
        error: null,
      });
    } catch (error: any) {
      set({ error: error.message || '获取资源失败' });
    }
  },

  fetchResourcesByType: async (page: number, resourceType?: string) => {
    try {
      const data = await dashboardApi.getHotspots(page, 20, undefined, resourceType);
      set({
        resources: data.items.filter((r: NewsItem) => !r.favorited),
        resourcesTotal: data.total,
        error: null,
      });
    } catch (error: any) {
      set({ error: error.message || '获取资源失败' });
    }
  },

  clearNewResourceItems: () => set({ newResourceItems: [] }),

  // 收藏资源
  favoriteResources: [],
  favoriteResourcesTotal: 0,

  fetchFavorites: async (page = 1) => {
    try {
      const data = await dashboardApi.getFavorites(page, 20);
      set({ favoriteResources: data.items, favoriteResourcesTotal: data.total, error: null });
    } catch (error: any) {
      set({ error: error.message || '获取收藏资源失败' });
    }
  },

  toggleComplete: async (id: string, completed: boolean) => {
    try {
      await dashboardApi.updateResource(id, { completed });
      set(state => ({
        resources: state.resources.map(r => r.id === id ? { ...r, completed } : r),
        searchResults: state.searchResults.map(r => r.id === id ? { ...r, completed } : r),
        favoriteResources: state.favoriteResources.map(r => r.id === id ? { ...r, completed } : r),
        error: null,
      }));
    } catch (error: any) {
      set({ error: error.message || '更新状态失败' });
    }
  },

  toggleFavorite: async (id: string, favorited: boolean) => {
    try {
      const result = await dashboardApi.updateResource(id, { favorited });
      if (favorited) {
        // 收藏：从资源总览移除，搜索结果保留但更新状态
        set(state => ({
          resources: state.resources.filter(r => r.id !== id),
          searchResults: state.searchResults.map(r => r.id === id ? { ...r, favorited } : r),
          error: null,
        }));
      } else {
        // 取消收藏
        if (result.deleted) {
          // 关联实体已删除，资源被级联删除
          set(state => ({
            resources: state.resources.filter(r => r.id !== id),
            searchResults: state.searchResults.filter(r => r.id !== id),
            favoriteResources: state.favoriteResources.filter(r => r.id !== id),
            error: null,
          }));
        } else {
          // 关联实体存在，重新加入资源总览
          set(state => ({
            searchResults: state.searchResults.map(r => r.id === id ? { ...r, favorited } : r),
            error: null,
          }));
          get().fetchResources();
        }
        // 刷新收藏列表
        await get().fetchFavorites();
      }
    } catch (error: any) {
      set({ error: error.message || '更新收藏状态失败' });
    }
  },

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
            setTimeout(async () => {
              set({ isSearching: false, searchProgress: null });
              get().fetchStats();
              try {
                const allData = await dashboardApi.getHotspots(1, 100);
                const newItems = allData.items.filter((item: NewsItem) => !item.favorited && item.matchedAt >= startedAt);
                set({ newResourceItems: newItems });
              } catch {}
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

  // 视频 URL 提交
  isSubmittingVideo: false,

  submitVideoUrl: async (url: string, platform: string) => {
    set({ isSubmittingVideo: true, error: null });
    try {
      await videosApi.submit(url, platform);
      set({ isSubmittingVideo: false, error: null });
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || '添加视频失败';
      set({ isSubmittingVideo: false, error: msg });
      throw error;
    }
  },

  batchDeleteResources: async (type: 'keywords' | 'creators' | 'direct_video') => {
    try {
      await dashboardApi.batchDeleteResources(type);
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message || '批量清除失败' });
    }
  },

  batchDeleteResourcesByIds: async (ids: string[]) => {
    try {
      await dashboardApi.batchDeleteResourcesByIds(ids);
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message || '批量删除失败' });
    }
  },

  // 配置
  config: {},
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

  // 关注的博主
  followedCreators: [],
  allCreators: [],
  fetchFollowedCreators: async () => {
    try {
      const followedCreators = await creatorsApi.getAll();
      set({ followedCreators, error: null });
    } catch (error: any) {
      set({ error: error.message || '获取关注的博主失败' });
    }
  },
  fetchAllCreators: async () => {
    try {
      const allCreators = await creatorsApi.getAllCreators();
      set({ allCreators, error: null });
    } catch (error: any) {
      set({ error: error.message || '获取全部博主失败' });
    }
  },
  addFollowedCreator: async (platform: string, query: string) => {
    try {
      const creator = await creatorsApi.add(platform, query);
      set(state => ({
        followedCreators: [creator, ...state.followedCreators],
        error: null,
      }));
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || '添加关注失败';
      set({ error: msg });
    }
  },
  toggleFollowedCreator: async (id: string, enabled: boolean) => {
    try {
      await creatorsApi.update(id, { enabled });
      set(state => ({
        followedCreators: state.followedCreators.map(c =>
          c.id === id ? { ...c, enabled } : c
        ),
        error: null,
      }));
    } catch (error: any) {
      set({ error: error.message || '更新博主状态失败' });
    }
  },
  archiveCreator: async (id: string) => {
    try {
      await creatorsApi.archive(id);
      set(state => ({
        followedCreators: state.followedCreators.filter(c => c.id !== id),
        error: null,
      }));
    } catch (error: any) {
      set({ error: error.message || '归档博主失败' });
    }
  },
  restoreCreator: async (id: string) => {
    try {
      await creatorsApi.restore(id);
      await get().fetchAllCreators();
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message || '恢复博主失败' });
    }
  },
  permanentDeleteCreator: async (id: string) => {
    try {
      await creatorsApi.permanentDelete(id);
      await get().fetchAllCreators();
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message || '永久删除失败' });
    }
  },

  // 博主内容收集（独立于关键词搜索）
  isCollectingCreators: false,
  creatorCollectProgress: null,

  triggerCreatorCollect: async () => {
    set({
      isCollectingCreators: true,
      creatorCollectProgress: { stage: 'started', message: '正在收集博主内容...' },
      error: null,
    });

    try {
      const response = await creatorsApi.triggerCollect();
      const collectId = response.collectId;

      const pollInterval = setInterval(async () => {
        try {
          const res = await creatorsApi.getCollectProgress(collectId);
          set({ creatorCollectProgress: res });

          if (res.stage === 'completed' || res.stage === 'error') {
            clearInterval(pollInterval);
            setTimeout(() => {
              set({ isCollectingCreators: false, creatorCollectProgress: null });
              get().fetchStats();
              get().fetchFollowedCreators();
            }, 2000);
          }
        } catch (e: any) {
          console.error('[CreatorCollect] Poll error:', e);
          clearInterval(pollInterval);
          set({
            error: '获取进度失败: ' + e.message,
            isCollectingCreators: false,
            creatorCollectProgress: null,
          });
        }
      }, 500);

    } catch (error: any) {
      set({
        error: error.message || '博主内容收集启动失败',
        isCollectingCreators: false,
        creatorCollectProgress: null,
      });
    }
  },

  // 用户配置
  userConfig: {},
  fetchUserConfig: async () => {
    try {
      const config = await configApi.getUser();
      set({ userConfig: config as UserConfigMap, error: null });
    } catch (error: any) {
      set({ error: error.message || '获取用户配置失败' });
    }
  },
  updateUserConfig: async (key: string, value: string | null) => {
    try {
      await configApi.updateUser(key, value);
      set(state => ({
        userConfig: {
          ...state.userConfig,
          [key]: { value, source: value !== null ? 'user' : 'none' },
        },
        error: null,
      }));
    } catch (error: any) {
      set({ error: error.message || '更新用户配置失败' });
    }
  },

  // 全局
  isLoading: false,
  error: null,
  clearError: () => set({ error: null }),
}));

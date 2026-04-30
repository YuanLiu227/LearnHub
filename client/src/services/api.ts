import axios from 'axios';
import type { Keyword, NewsItem, AppConfig, FollowedCreator } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 300000, // 5 分钟
});

// 关键词 API
export const keywordsApi = {
  getAll: async (): Promise<Keyword[]> => {
    const response = await api.get('/keywords');
    return response.data.keywords;
  },

  getAllKeywords: async (): Promise<Keyword[]> => {
    const response = await api.get('/keywords/all');
    return response.data.keywords;
  },

  add: async (term: string): Promise<Keyword> => {
    const response = await api.post('/keywords', { term });
    return response.data;
  },

  archive: async (id: string): Promise<void> => {
    await api.post('/keywords/archive', { id });
  },

  restore: async (id: string): Promise<void> => {
    await api.post('/keywords/restore', { id });
  },

  permanentDelete: async (id: string): Promise<void> => {
    await api.delete('/keywords/permanent', { params: { id } });
  },

  update: async (id: string, updates: Partial<Keyword>): Promise<Keyword> => {
    const response = await api.patch('/keywords', { id, ...updates });
    return response.data;
  },
};

// 实时搜索 API
export const searchApi = {
  search: async (q: string, page: number = 1, pageSize: number = 20) => {
    const response = await api.get('/dashboard/search', { params: { q, page, pageSize } });
    return response.data;
  },
};

// 监控 API
export const monitorApi = {
  trigger: async (): Promise<{ monitorId: string }> => {
    const response = await api.post('/monitor');
    return response.data;
  },

  getHistory: async (keywordId?: string, limit: number = 20): Promise<NewsItem[]> => {
    const response = await api.get('/monitor/history', { params: { keywordId, limit } });
    return response.data.items;
  },
};

// 配置 API
export const configApi = {
  get: async (): Promise<AppConfig> => {
    const response = await api.get('/config');
    return response.data;
  },

  update: async (updates: Partial<AppConfig>): Promise<void> => {
    await api.put('/config', updates);
  },
};

// 仪表盘 API
export const dashboardApi = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getHotspots: async (page = 1, pageSize = 20, source?: string) => {
    const params: any = { page, pageSize };
    if (source && source !== 'all') params.source = source;
    const response = await api.get('/dashboard/hotspots', { params });
    return response.data;
  },

  search: async (q: string, page = 1, pageSize = 20) => {
    const response = await api.get('/dashboard/search', { params: { q, page, pageSize } });
    return response.data;
  },

  updateResource: async (id: string, updates: { completed?: boolean; favorited?: boolean }): Promise<{ deleted?: boolean }> => {
    const response = await api.patch(`/dashboard/resource/${id}`, updates);
    return response.data;
  },

  getFavorites: async (page = 1, pageSize = 20): Promise<{ items: NewsItem[]; total: number }> => {
    const response = await api.get('/dashboard/favorites', { params: { page, pageSize } });
    return response.data;
  },

  deleteResource: async (id: string): Promise<void> => {
    await api.delete(`/dashboard/resource/${id}`);
  },

  batchDeleteResources: async (type: 'keywords' | 'creators'): Promise<void> => {
    await api.post('/dashboard/resources/batch-delete', { type });
  },

  batchDeleteResourcesByIds: async (ids: string[]): Promise<void> => {
    await api.post('/dashboard/resources/batch-delete-by-ids', { ids });
  },
};

// 健康检查
export const healthApi = {
  check: async (): Promise<boolean> => {
    try {
      const response = await api.get('/health');
      return response.data.status === 'ok';
    } catch {
      return false;
    }
  },
};

// 关注的博主 API
export const creatorsApi = {
  getAll: async (): Promise<FollowedCreator[]> => {
    const response = await api.get('/creators');
    return response.data.creators;
  },

  getAllCreators: async (): Promise<FollowedCreator[]> => {
    const response = await api.get('/creators/all');
    return response.data.creators;
  },

  add: async (platform: string, query: string): Promise<FollowedCreator> => {
    const response = await api.post('/creators', { platform, query });
    return response.data;
  },

  update: async (id: string, updates: Partial<FollowedCreator>): Promise<FollowedCreator> => {
    const response = await api.patch(`/creators/${id}`, updates);
    return response.data;
  },

  archive: async (id: string): Promise<void> => {
    await api.delete(`/creators/${id}`);
  },

  restore: async (id: string): Promise<void> => {
    await api.post(`/creators/restore/${id}`);
  },

  permanentDelete: async (id: string): Promise<void> => {
    await api.delete(`/creators/permanent/${id}`);
  },

  triggerCollect: async (): Promise<{ collectId: string }> => {
    const response = await api.post('/creators/collect');
    return response.data;
  },

  getCollectProgress: async (collectId: string): Promise<any> => {
    const response = await api.get(`/creators/collect/progress/${collectId}`);
    return response.data;
  },
};

export default api;

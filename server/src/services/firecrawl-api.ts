import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v0';

interface FirecrawlResponse {
  success: boolean;
  data?: {
    title?: string;
    description?: string;
    url?: string;
    content?: string;
    markdown?: string;
    metadata?: {
      publishedAt?: string;
      [key: string]: any;
    };
  };
  error?: string;
}

interface SearchResult {
  title?: string;
  description?: string;
  url: string;
  publishedAt?: string;
}

interface ScrapeResult {
  title?: string;
  description?: string;
  url: string;
  content?: string;
  publishedAt?: string;
}

function getApiKey(): string {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not configured');
  }
  return apiKey;
}

/**
 * 使用 Firecrawl REST API 搜索网页
 * @param query 搜索查询
 */
export async function searchWithFirecrawl(query: string): Promise<SearchResult[]> {
  try {
    const apiKey = getApiKey();

    const response = await axios.post<any>(
      `${FIRECRAWL_API_URL}/search`,
      {
        query,
        limit: 10,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 30000,
      }
    );

    if (response.data.data) {
      return response.data.data.map((item: any) => ({
        title: item.title,
        description: item.description,
        url: item.url,
        publishedAt: item.metadata?.publishedAt,
      }));
    }

    return [];
  } catch (error: any) {
    console.error('Firecrawl search error:', error.response?.data || error.message);
    return [];
  }
}

/**
 * 使用 Firecrawl REST API 抓取网页
 * @param url 要抓取的 URL
 */
export async function scrapeWithFirecrawl(url: string): Promise<ScrapeResult> {
  try {
    const apiKey = getApiKey();

    const response = await axios.post<FirecrawlResponse>(
      `${FIRECRAWL_API_URL}/scrape`,
      {
        url,
        pageOptions: {
          onlyMainContent: true,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 30000,
      }
    );

    if (response.data.success && response.data.data) {
      return {
        title: response.data.data.title,
        description: response.data.data.description,
        url: response.data.data.url || url,
        content: response.data.data.content || response.data.data.markdown,
        publishedAt: response.data.data.metadata?.publishedAt,
      };
    }

    return {
      url,
      description: response.data.error || 'Failed to scrape',
    };
  } catch (error: any) {
    console.error('Firecrawl scrape error:', error.response?.data || error.message);
    return {
      url,
      description: `Failed to scrape: ${error.message}`,
    };
  }
}

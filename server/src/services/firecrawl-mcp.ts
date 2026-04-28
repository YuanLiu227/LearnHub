import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

dotenv.config();

let firecrawlClient: Client | null = null;
let initError: string | null = null;

interface ScrapeResult {
  title?: string;
  description?: string;
  url: string;
  content?: string;
  publishedAt?: string;
}

interface SearchResult {
  title?: string;
  description?: string;
  url: string;
  publishedAt?: string;
  source?: string;
}

async function getFirecrawlClient(): Promise<Client> {
  if (firecrawlClient && !initError) {
    return firecrawlClient;
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not configured');
  }

  console.log('[Firecrawl MCP] Initializing client...');

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['d:/AiCode/Hot-Monitor/node_modules/firecrawl-mcp/dist/index.js'],
    env: {
      ...process.env,
      FIRECRAWL_API_KEY: apiKey,
    },
  });

  const client = new Client({
    name: 'hot-monitor-firecrawl',
    version: '1.0.0',
  });

  // 添加连接超时
  await Promise.race([
    client.connect(transport),
    new Promise((_, reject) => setTimeout(() => reject(new Error('MCP connection timeout')), 30000)),
  ]);
  console.log('[Firecrawl MCP] Client connected successfully');

  firecrawlClient = client;
  initError = null;
  return client;
}

/**
 * 使用 Firecrawl MCP 搜索网页
 */
export async function searchWithFirecrawl(query: string): Promise<SearchResult[]> {
  let client: Client | null = null;

  try {
    console.log('[Firecrawl MCP] Searching for:', query);
    client = await getFirecrawlClient();

    // 添加调用超时
    const response = await Promise.race([
      client.callTool({
        name: 'firecrawl_search',
        arguments: { query, limit: 10 },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firecrawl search timeout')), 60000)),
    ]) as any;

    console.log('[Firecrawl MCP] Response received, parsing...');

    const responseContent = response.content as Array<{ text?: string }>;
    if (responseContent[0]?.text) {
      const result = JSON.parse(responseContent[0].text);
      console.log('[Firecrawl MCP] Parse successful, results count:', result.web?.length || 0);

      // Firecrawl 返回的结构是 { web: [...] }
      if (result.web && Array.isArray(result.web)) {
        return result.web.map((item: any) => ({
          title: item.title,
          description: item.description,
          url: item.url,
          publishedAt: item.publishedAt,
        }));
      }

      return result.results || [];
    }

    return [];
  } catch (error: any) {
    console.error('[Firecrawl MCP] Search error:', error.message || error);
    initError = error.message;
    firecrawlClient = null; // 重置客户端
    return [];
  }
}

/**
 * 使用 Firecrawl MCP 抓取网页
 */
export async function scrapeWithFirecrawl(url: string): Promise<ScrapeResult> {
  let client: Client | null = null;

  try {
    console.log('[Firecrawl MCP] Scraping URL:', url);
    client = await getFirecrawlClient();

    const response = await client.callTool({
      name: 'firecrawl_scrape',
      arguments: { url, formats: ['markdown', 'html'] },
    });

    const scrapeContent = response.content as Array<{ text?: string }>;
    if (scrapeContent[0]?.text) {
      const result = JSON.parse(scrapeContent[0].text);
      return {
        title: result.data?.title,
        description: result.data?.description,
        url: result.data?.url || url,
        content: result.data?.content || result.data?.markdown,
        publishedAt: result.data?.metadata?.publishedAt,
      };
    }

    return { url };
  } catch (error: any) {
    console.error('[Firecrawl MCP] Scrape error:', error.message || error);
    initError = error.message;
    firecrawlClient = null;
    return { url };
  }
}

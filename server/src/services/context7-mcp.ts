import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

dotenv.config();

let context7Client: Client | null = null;

async function getContext7Client(): Promise<Client> {
  if (context7Client) {
    return context7Client;
  }

  const apiKey = process.env.UPSTASH_CONTEXT7_API_KEY;
  if (!apiKey) {
    throw new Error('UPSTASH_CONTEXT7_API_KEY is not configured');
  }

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp'],
    env: {
      UPSTASH_CONTEXT7_API_KEY: apiKey,
    },
  });

  context7Client = new Client({
    name: 'hot-monitor-context7',
    version: '1.0.0',
  });

  await context7Client.connect(transport);
  return context7Client;
}

interface DocResult {
  content: string;
  source: string;
}

/**
 * 使用 Context7 MCP 获取技术文档
 * @param query 查询内容，如 "React 19 new features"
 */
export async function getContext7Docs(query: string): Promise<DocResult> {
  try {
    const client = await getContext7Client();

    const response = await client.callTool({
      name: 'context7_get_relevant_docs',
      arguments: { query },
    });

    // 解析响应
    const responseContent = response.content as Array<{ text?: string }>;
    const result = JSON.parse(responseContent[0]?.text || '{}');
    return {
      content: result.content || result.docs || JSON.stringify(result),
      source: result.source || 'context7',
    };
  } catch (error) {
    console.error('Context7 MCP error:', error);
    return {
      content: `Failed to fetch docs for: ${query}`,
      source: 'context7-error',
    };
  }
}

/**
 * 获取多个技术的最新文档
 */
export async function getTechDocs(technologies: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  for (const tech of technologies) {
    try {
      const doc = await getContext7Docs(`${tech} latest version documentation 2024 2025`);
      results[tech] = doc.content;
      // 添加延迟避免限流
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error fetching docs for ${tech}:`, error);
      results[tech] = `Error: ${error}`;
    }
  }

  return results;
}

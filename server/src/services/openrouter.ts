import axios from 'axios';
import type { ChatMessage, VeracityResult } from '../types/index.js';
import { getContext7Docs } from './context7-mcp.js';

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

interface AIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function chat(
  messages: ChatMessage[],
  model: string = 'deepseek-ai/DeepSeek-V3'
): Promise<string> {
  const apiKey = process.env.SILICONFLOW_API_KEY;

  if (!apiKey) {
    throw new Error('SILICONFLOW_API_KEY is not configured');
  }

  let retries = 3;
  while (retries > 0) {
    try {
      const response = await axios.post<AIResponse>(
        SILICONFLOW_API_URL,
        {
          model,
          messages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          timeout: 30000,
        }
      );

      return response.data.choices[0]?.message?.content || '';
    } catch (error: any) {
      retries--;
      if (retries === 0) {
        console.error('SiliconFlow API error:', error.response?.data || error.message);
        throw new Error('Failed to call SiliconFlow API');
      }
      console.log(`Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error('SiliconFlow API failed');
}

/**
 * 获取增强的系统提示（使用 Context7 获取最新最佳实践）
 */
async function getEnhancedSystemPrompt(context: string): Promise<string> {
  try {
    const doc = await getContext7Docs(context);
    return doc.content;
  } catch (error) {
    console.error('Failed to get enhanced prompt:', error);
    return '';
  }
}

/**
 * 检查内容是否与AI相关
 */
export async function checkAIRelevance(
  title: string,
  content: string
): Promise<{ isRelevant: boolean; confidence: number; reason: string }> {
  const systemPrompt = `You are an AI relevance classifier. Determine if the given content is directly related to AI (Artificial Intelligence) topics.

AI related topics include but are not limited to:
- Machine learning, deep learning, neural networks
- Large language models (LLM), ChatGPT, Claude, Gemini, GPT
- AI agents, AI coding tools (Cursor, Copilot, etc.)
- Computer vision, speech recognition
- Robotics, autonomous systems
- AI research, AI ethics, AI safety
- AI products, AI services, AI companies

IMPORTANT: You MUST respond with ONLY valid JSON, no other text. Format:
{"isRelevant":true,"confidence":0.85,"reason":"brief reason why"}

Respond with isRelevant:true only if the content is clearly about AI topics.`;

  const userMessage = `Title: ${title}\n\nContent: ${content}`;

  try {
    const response = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      'deepseek-ai/DeepSeek-V3'
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        return {
          isRelevant: result.isRelevant ?? false,
          confidence: Math.max(0, Math.min(1.0, result.confidence ?? 0.5)),
          reason: result.reason ?? '',
        };
      } catch (parseError) {
        console.error('[AIRelevance] JSON parse error:', parseError);
      }
    }

    return {
      isRelevant: false,
      confidence: 0.5,
      reason: 'AI analysis failed, defaulting to not relevant',
    };
  } catch (error: any) {
    console.error('[AIRelevance] Check failed:', error.message || error);
    return {
      isRelevant: false,
      confidence: 0.5,
      reason: 'AI relevance check failed, defaulting to not relevant',
    };
  }
}

/**
 * 检查内容是否是热门大事件
 */
export async function checkHotness(
  title: string,
  content: string,
  publishedAt: number | null
): Promise<{ isHot: boolean; hotScore: number; reason: string }> {
  const systemPrompt = `You are a hotness evaluator. Determine if this content represents a significant/trending event or just routine updates.

Consider:
1. Is this a MAJOR news/breakthrough announcement? (product launches, major discoveries, big company announcements)
2. Or is this routine content? (general tutorials, routine updates, opinion pieces)
3. Does it have the potential for wide discussion/controversy?

AI related hot events include:
- New AI model releases (GPT-5, Claude 4, Gemini Ultra, etc.)
- Major AI company announcements (OpenAI, Google, Anthropic, Meta)
- AI policy/regulation news
- Breakthrough research papers
- Major AI product launches
- Significant AI incidents or controversies

Routine content:
- General how-to tutorials
- Routine software updates
- Personal opinions without news value
- Job postings
- Event announcements without major impact

IMPORTANT: You MUST respond with ONLY valid JSON, no other text. Format:
{"isHot":true,"hotScore":0.85,"reason":"brief reason why this is or isn't hot"}

hotScore: 0.0-1.0 where 1.0 is extremely hot/major news`;

  const freshnessBonus = publishedAt ? Math.max(0, 1 - (Date.now() - publishedAt) / (7 * 24 * 60 * 60 * 1000)) : 0.5;
  const userMessage = `Title: ${title}\n\nContent: ${content}\n\nPublished: ${publishedAt ? new Date(publishedAt).toISOString() : 'Unknown'}`;

  try {
    const response = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      'deepseek-ai/Deepseek-V3'
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        const hotScore = Math.max(0, Math.min(1.0, result.hotScore ?? 0.5));
        // 结合时间新鲜度和AI评估的热度
        const finalScore = (hotScore * 0.7 + freshnessBonus * 0.3);
        return {
          isHot: result.isHot ?? false,
          hotScore: finalScore,
          reason: result.reason ?? '',
        };
      } catch (parseError) {
        console.error('[Hotness] JSON parse error:', parseError);
      }
    }

    return {
      isHot: false,
      hotScore: 0.5,
      reason: 'AI analysis failed, defaulting to moderate',
    };
  } catch (error: any) {
    console.error('[Hotness] Check failed:', error.message || error);
    return {
      isHot: false,
      hotScore: 0.5,
      reason: 'Hotness check failed, defaulting to moderate',
    };
  }
}

export async function checkVeracity(
  title: string,
  content: string,
  url: string
): Promise<VeracityResult> {
  const apiKey = process.env.SILICONFLOW_API_KEY;

  const systemPrompt = `You are a fact-checker AI. Analyze the given content and determine if it appears to be real news or potentially fake/misleading content.

IMPORTANT: You MUST respond with ONLY valid JSON, no other text. Format:
{"isReal":true,"confidence":0.85,"reason":"brief reason","summary":"brief summary"}

Consider:
1. Is this from a credible source?
2. Does the claim seem plausible?
3. Are there any red flags like sensationalism, fake dates, or impossible claims?
4. Is the information consistent and coherent?`;

  const userMessage = `Title: ${title}\n\nContent: ${content}\n\nURL: ${url}`;

  try {
    const response = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      'deepseek-ai/DeepSeek-V3'
    );

    // Try to parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        return {
          isReal: result.isReal ?? true,
          confidence: Math.max(0.5, Math.min(1.0, result.confidence ?? 0.7)),
          reason: result.reason ?? '',
          summary: result.summary ?? content.slice(0, 100),
        };
      } catch (parseError) {
        console.error('[Veracity] JSON parse error:', parseError);
      }
    }

    // If JSON parsing fails, return default with moderate confidence
    return {
      isReal: true,
      confidence: 0.7,
      reason: 'AI analysis completed',
      summary: content.slice(0, 100),
    };
  } catch (error: any) {
    console.error('[Veracity] Check failed:', error.message || error);
    return {
      isReal: true,
      confidence: 0.7,
      reason: 'Veracity check failed, defaulting to pass',
      summary: content.slice(0, 100),
    };
  }
}

export async function summarizeContent(content: string): Promise<string> {
  // Skip Context7 call to avoid hanging - directly use basic prompt
  const systemPrompt = 'You are a content summarizer. Provide a brief summary (2-3 sentences) of the following content. Respond in Chinese if the content is in Chinese.';

  try {
    const summary = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content },
      ],
      'deepseek-ai/DeepSeek-V3'
    );
    return summary;
  } catch (error) {
    console.error('Summarization failed:', error);
    return content.slice(0, 200);
  }
}

/**
 * AI 辅助的热点分析（使用 Context7 获取最新趋势）
 */
export async function analyzeHotTopic(title: string, content: string): Promise<{
  category: string;
  relevance: number;
  trend: string;
}> {
  const enhancedContext = await getEnhancedSystemPrompt('AI technology trends analysis classification 2025');

  const systemPrompt = enhancedContext || `You are a technology trend analyzer. Analyze the given content and classify it.

Respond in JSON format with:
{
  "category": "category name",
  "relevance": 0.0-1.0,
  "trend": "rising/stable/declining"
}`;

  try {
    const response = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Title: ${title}\n\nContent: ${content}` },
      ],
      'deepseek-ai/DeepSeek-V3'
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      category: 'General',
      relevance: 0.5,
      trend: 'stable',
    };
  } catch (error) {
    console.error('Hot topic analysis failed:', error);
    return {
      category: 'General',
      relevance: 0.5,
      trend: 'stable',
    };
  }
}

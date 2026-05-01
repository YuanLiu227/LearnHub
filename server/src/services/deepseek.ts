import axios from 'axios';
import type { ChatMessage, VeracityResult } from '../types/index.js';
import { getContext7Docs } from './context7-mcp.js';
import { getUserConfigValue } from './config.js';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

interface AIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function chat(
  messages: ChatMessage[],
  model: string = 'deepseek-chat',
  userId?: string
): Promise<string> {
  const apiKey = getUserConfigValue('DEEPSEEK_API_KEY', userId);

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  let retries = 3;
  while (retries > 0) {
    try {
      const response = await axios.post<AIResponse>(
        DEEPSEEK_API_URL,
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
        console.error('DeepSeek API error:', error.response?.data || error.message);
        throw new Error('Failed to call DeepSeek API');
      }
      console.log(`Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error('DeepSeek API failed');
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
      'deepseek-chat'
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
 * 检查内容质量：评估信息是否有实质价值，过滤低质噪音
 */
export async function checkContentQuality(
  title: string,
  content: string
): Promise<{ isQuality: boolean; score: number; reason: string }> {
  const systemPrompt = `You are a content quality evaluator for tech news aggregation. Determine if the given content is substantive and useful versus low-effort noise.

Criteria for LOW quality (score < 0.3):
- Vague one-liners with no specific information ("AI is the future", "this is amazing")
- Pure opinion without facts or data
- Generic motivational phrases, spam-like content
- Content with no technical substance (no model names, no version numbers, no concrete details)
- Duplicate or near-duplicate of common knowledge

Criteria for HIGH quality (score >= 0.6):
- Specific news with concrete details (model releases, benchmarks, version numbers)
- Technical analysis or comparison with data
- Official announcements, verified reports
- In-depth tutorials or code examples
- Original insights or analysis

IMPORTANT: You MUST respond with ONLY valid JSON, no other text. Format:
{"isQuality":true,"score":0.85,"reason":"brief reason why"}

score: 0.0-1.0 where 1.0 is highest quality, substantive content`;

  const userMessage = `Title: ${title}\n\nContent: ${content}`;

  try {
    const response = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      'deepseek-chat'
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        return {
          isQuality: result.isQuality ?? false,
          score: Math.max(0, Math.min(1.0, result.score ?? 0.5)),
          reason: result.reason ?? '',
        };
      } catch (parseError) {
        console.error('[ContentQuality] JSON parse error:', parseError);
      }
    }

    return {
      isQuality: false,
      score: 0.5,
      reason: 'AI analysis failed, defaulting to moderate quality',
    };
  } catch (error: any) {
    console.error('[ContentQuality] Check failed:', error.message || error);
    return {
      isQuality: false,
      score: 0.5,
      reason: 'Content quality check failed, defaulting to moderate quality',
    };
  }
}

export async function checkVeracity(
  title: string,
  content: string,
  url: string,
  userId?: string
): Promise<VeracityResult> {
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
      'deepseek-chat'
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
      'deepseek-chat'
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
      'deepseek-chat'
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

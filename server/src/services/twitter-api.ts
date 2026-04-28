import axios from 'axios';

const TWITTER_API_BASE = 'https://api.twitterapi.io/twitter';

interface TwitterTweet {
  id: string;
  text: string;
  createdAt: string;
  author: {
    name: string;
    username: string;
    profileImageUrl: string;
  };
  likeCount: number;
  retweetCount: number;
  replyCount: number;
}

interface TwitterSearchResult {
  tweets: TwitterTweet[];
}

/**
 * 使用 TwitterAPI.io 搜索推文
 */
export async function searchTweets(query: string, limit: number = 10): Promise<TwitterSearchResult> {
  const apiKey = process.env.TWITTERAPI_IO_KEY;

  if (!apiKey) {
    console.log('[Twitter API] TWITTERAPI_IO_KEY not configured');
    return { tweets: [] };
  }

  try {
    console.log('[Twitter API] Searching for:', query);
    const response = await axios.get(`${TWITTER_API_BASE}/search`, {
      params: { query, limit },
      headers: {
        'X-API-Key': apiKey,
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error: any) {
    console.error('[Twitter API] Search error:', error.message || error);
    return { tweets: [] };
  }
}

/**
 * 收集 Twitter/X 热点
 */
export async function collectTwitterHotTopics(keywords: string[], limit: number = 10): Promise<any[]> {
  const allTweets: any[] = [];

  for (const keyword of keywords) {
    try {
      const result = await searchTweets(keyword, Math.ceil(limit / keywords.length));

      for (const tweet of result.tweets || []) {
        // 计算热度分数：基于点赞、转发、回复
        const heatScore = 50 + (tweet.likeCount || 0) * 0.1 + (tweet.retweetCount || 0) * 0.5 + (tweet.replyCount || 0) * 0.3;

        allTweets.push({
          title: tweet.text.slice(0, 200), // 推文前200字符作为标题
          url: `https://twitter.com/${tweet.author?.username || 'unknown'}/status/${tweet.id}`,
          source: 'twitter',
          sourceName: 'Twitter',
          heat: Math.min(100, heatScore),
          publishedAt: new Date(tweet.createdAt).getTime(),
          summary: `${tweet.author?.name || 'Unknown'} · ${tweet.likeCount || 0} 👍 ${tweet.retweetCount || 0} rt`,
        });
      }
    } catch (error) {
      console.error('[Twitter API] Error collecting for keyword:', keyword, error);
    }
  }

  // 按热度排序
  allTweets.sort((a, b) => b.heat - a.heat);

  return allTweets.slice(0, limit);
}

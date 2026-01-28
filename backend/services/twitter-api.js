/**
 * TwitterAPI.io Service
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class TwitterAPIService {
  constructor() {
    this.apiKey = process.env.TWITTER_API_KEY;
    this.baseUrl = process.env.TWITTER_API_URL || 'https://api.twitterapi.io/twitter';
  }

  async searchTweets(query, count = 20) {
    try {
      const url = `${this.baseUrl}/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=Latest&count=${count}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseTweetsResponse(data);
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  async fetchAllTweets(query, maxTweets = 100) {
    try {
      const result = await this.searchTweets(query, Math.min(maxTweets, 100));
      return result;
    } catch (error) {
      console.error('Fetch error:', error);
      return { tweets: [], users: [] };
    }
  }

  parseTweetsResponse(data) {
    const tweets = [];
    const users = new Map();

    if (!data || !data.tweets) {
      return { tweets: [], users: [] };
    }

    for (const tweet of data.tweets) {
      // User
      if (tweet.author) {
        const author = tweet.author;
        users.set(author.id, {
          id: author.id,
          username: author.userName || author.username,
          name: author.name || author.displayName,
          profile_image_url: author.profilePicture || author.profile_image_url,
          banner_url: author.coverPicture || author.profile_banner_url || null,
          followers_count: author.followers || author.followersCount || 0,
          following_count: author.following || author.followingCount || 0,
          description: author.description || author.bio || '',
          verified: author.isVerified || author.verified || author.isBlueVerified ? 1 : 0
        });
      }

      // Tweet
      tweets.push({
        id: tweet.id,
        user_id: tweet.author?.id,
        text: tweet.text || tweet.fullText || '',
        created_at: tweet.createdAt || tweet.created_at,
        likes_count: tweet.likeCount || tweet.likes || tweet.favorite_count || 0,
        retweets_count: tweet.retweetCount || tweet.retweets || tweet.retweet_count || 0,
        replies_count: tweet.replyCount || tweet.replies || tweet.reply_count || 0,
        views_count: tweet.viewCount || tweet.views || 0,
        quotes_count: tweet.quoteCount || tweet.quotes || 0,
        bookmark_count: tweet.bookmarkCount || 0,
        url: tweet.url || `https://twitter.com/${tweet.author?.userName}/status/${tweet.id}`,
        is_reply: tweet.isReply || false,
        is_quote: tweet.isQuote || false,
        language: tweet.lang || 'en'
      });
    }

    return {
      tweets,
      users: Array.from(users.values())
    };
  }
}

module.exports = TwitterAPIService;

/**
 * RedStone Tweet Tracker - Backend Server v3.0
 * کامل و فیکس شده
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const TwitterAPIService = require('./services/twitter-api');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Database Setup
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'tweets.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT,
    profile_image_url TEXT,
    banner_url TEXT,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    description TEXT,
    verified INTEGER DEFAULT 0,
    location TEXT,
    first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tweets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT,
    likes_count INTEGER DEFAULT 0,
    retweets_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    quotes_count INTEGER DEFAULT 0,
    bookmark_count INTEGER DEFAULT 0,
    url TEXT,
    is_reply INTEGER DEFAULT 0,
    is_quote INTEGER DEFAULT 0,
    language TEXT DEFAULT 'en',
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS fetch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT,
    tweets_fetched INTEGER DEFAULT 0,
    users_fetched INTEGER DEFAULT 0,
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_tweets_user_id ON tweets(user_id);
  CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tweets_likes ON tweets(likes_count DESC);
  CREATE INDEX IF NOT EXISTS idx_tweets_views ON tweets(views_count DESC);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

console.log('✅ Database initialized');

const twitterAPI = new TwitterAPIService();

// کلمات بلک‌لیست برای فیلتر توییت‌های بی‌ربط
const BLACKLIST_WORDS = [
  'murder', 'killed', 'killing', 'death', 'dead', 'crime', 'criminal',
  'minecraft', 'gaming', 'game', 'gamer', 'redstone dust', 'redstone torch',
  'redstone lamp', 'redstone repeater', 'redstone block', 'redstone ore',
  'قتل', 'کشته', 'جنایت', 'مرگ'
];

// کلمات مرتبط با RedStone DeFi
const RELEVANT_WORDS = [
  'redstone_defi', '@redstone_defi', 'redstone oracle', 'redstone finance',
  'defi', 'oracle', 'blockchain', 'crypto', 'web3', 'tvl', 'chain', 'protocol',
  'smart contract', 'price feed', 'data feed', 'modular', 'push', 'pull'
];

function isRelevantTweet(text) {
  const lowerText = text.toLowerCase();
  
  // چک بلک‌لیست
  for (const word of BLACKLIST_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      return false;
    }
  }
  
  // باید حداقل یکی از کلمات مرتبط رو داشته باشه
  for (const word of RELEVANT_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      return true;
    }
  }
  
  // اگه @redstone_defi رو منشن کرده، مرتبطه
  if (lowerText.includes('@redstone_defi')) {
    return true;
  }
  
  return false;
}

function getDateRange(period) {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '15d':
      startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      startDate = new Date('2020-01-01');
      break;
  }
  
  return { startDate, endDate: now };
}

function formatDateForSQL(date) {
  return date.toISOString();
}

function getPeriodLabel(period) {
  const labels = {
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '15d': 'Last 15 Days',
    '30d': 'Last 30 Days',
    'all': 'All Time'
  };
  return labels[period] || 'All Time';
}

// ============================================
// API Routes
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0' });
});

// Stats
app.get('/api/stats', (req, res) => {
  try {
    const period = req.query.period || 'all';
    const { startDate } = getDateRange(period);
    const startDateSQL = formatDateForSQL(startDate);

    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT t.id) as total_tweets,
        COALESCE(SUM(t.likes_count), 0) as total_likes,
        COALESCE(SUM(t.retweets_count), 0) as total_retweets,
        COALESCE(SUM(t.replies_count), 0) as total_replies,
        COALESCE(SUM(t.views_count), 0) as total_views,
        COUNT(DISTINCT t.user_id) as unique_users,
        COALESCE(MAX(t.views_count), 0) as max_views,
        COALESCE(MAX(t.likes_count), 0) as max_likes
      FROM tweets t
      WHERE t.created_at >= ?
    `).get(startDateSQL);

    const mostViewed = db.prepare(`
      SELECT t.*, u.username, u.name, u.profile_image_url, u.verified
      FROM tweets t
      JOIN users u ON t.user_id = u.id
      WHERE t.created_at >= ?
      ORDER BY t.views_count DESC
      LIMIT 1
    `).get(startDateSQL);

    const lastFetch = db.prepare(`
      SELECT fetched_at, tweets_fetched FROM fetch_history ORDER BY fetched_at DESC LIMIT 1
    `).get();

    const totalInDB = db.prepare(`SELECT COUNT(*) as count FROM tweets`).get();

    res.json({
      success: true,
      data: {
        ...stats,
        period,
        period_label: getPeriodLabel(period),
        most_viewed_tweet: mostViewed || null,
        last_updated: lastFetch?.fetched_at || null,
        total_in_database: totalInDB.count
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Top 3
app.get('/api/top3', (req, res) => {
  try {
    const period = req.query.period || 'all';
    const { startDate } = getDateRange(period);
    const startDateSQL = formatDateForSQL(startDate);

    const top3 = db.prepare(`
      SELECT 
        u.id, u.username, u.name, u.profile_image_url, u.banner_url,
        u.followers_count, u.verified, u.description,
        COUNT(t.id) as tweet_count,
        COALESCE(SUM(t.likes_count), 0) as total_likes,
        COALESCE(SUM(t.retweets_count), 0) as total_retweets,
        COALESCE(SUM(t.replies_count), 0) as total_replies,
        COALESCE(SUM(t.views_count), 0) as total_views,
        (COALESCE(SUM(t.likes_count), 0) * 3 + 
         COALESCE(SUM(t.retweets_count), 0) * 5 + 
         COALESCE(SUM(t.views_count), 0) * 0.01 +
         COUNT(t.id) * 10) as engagement_score
      FROM users u
      LEFT JOIN tweets t ON u.id = t.user_id AND t.created_at >= ?
      GROUP BY u.id
      HAVING tweet_count > 0
      ORDER BY engagement_score DESC
      LIMIT 3
    `).all(startDateSQL);

    res.json({ 
      success: true, 
      data: top3.map((u, i) => ({ ...u, rank: i + 1 })),
      period 
    });
  } catch (error) {
    console.error('Top3 error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100);
    const period = req.query.period || 'all';
    const { startDate } = getDateRange(period);
    const startDateSQL = formatDateForSQL(startDate);

    const leaderboard = db.prepare(`
      SELECT 
        u.id, u.username, u.name, u.profile_image_url, u.banner_url,
        u.followers_count, u.verified, u.description,
        COUNT(t.id) as tweet_count,
        COALESCE(SUM(t.likes_count), 0) as total_likes,
        COALESCE(SUM(t.retweets_count), 0) as total_retweets,
        COALESCE(SUM(t.replies_count), 0) as total_replies,
        COALESCE(SUM(t.views_count), 0) as total_views,
        (COALESCE(SUM(t.likes_count), 0) * 3 + 
         COALESCE(SUM(t.retweets_count), 0) * 5 + 
         COALESCE(SUM(t.views_count), 0) * 0.01 +
         COUNT(t.id) * 10) as engagement_score
      FROM users u
      LEFT JOIN tweets t ON u.id = t.user_id AND t.created_at >= ?
      GROUP BY u.id
      HAVING tweet_count > 0
      ORDER BY engagement_score DESC
      LIMIT ?
    `).all(startDateSQL, limit);

    res.json({
      success: true,
      data: leaderboard.map((u, i) => ({ ...u, rank: i + 1 })),
      period
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search - همه یوزرها
app.get('/api/search', (req, res) => {
  try {
    const query = req.query.q || '';
    const period = req.query.period || 'all';
    
    if (!query || query.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const { startDate } = getDateRange(period);
    const startDateSQL = formatDateForSQL(startDate);

    // سرچ در همه یوزرها
    const results = db.prepare(`
      SELECT 
        u.id, u.username, u.name, u.profile_image_url, u.followers_count, u.verified,
        COUNT(t.id) as tweet_count,
        COALESCE(SUM(t.likes_count), 0) as total_likes,
        COALESCE(SUM(t.retweets_count), 0) as total_retweets,
        COALESCE(SUM(t.replies_count), 0) as total_replies,
        COALESCE(SUM(t.views_count), 0) as total_views,
        (COALESCE(SUM(t.likes_count), 0) * 3 + 
         COALESCE(SUM(t.retweets_count), 0) * 5 + 
         COALESCE(SUM(t.views_count), 0) * 0.01 +
         COUNT(t.id) * 10) as engagement_score
      FROM users u
      LEFT JOIN tweets t ON u.id = t.user_id AND t.created_at >= ?
      WHERE LOWER(u.username) LIKE LOWER(?) OR LOWER(u.name) LIKE LOWER(?)
      GROUP BY u.id
      ORDER BY engagement_score DESC
      LIMIT 50
    `).all(startDateSQL, `%${query}%`, `%${query}%`);

    // محاسبه رنک
    const allUsers = db.prepare(`
      SELECT u.id,
        (COALESCE(SUM(t.likes_count), 0) * 3 + 
         COALESCE(SUM(t.retweets_count), 0) * 5 + 
         COALESCE(SUM(t.views_count), 0) * 0.01 +
         COUNT(t.id) * 10) as engagement_score
      FROM users u
      LEFT JOIN tweets t ON u.id = t.user_id AND t.created_at >= ?
      GROUP BY u.id
      HAVING COUNT(t.id) > 0
      ORDER BY engagement_score DESC
    `).all(startDateSQL);

    const rankMap = {};
    allUsers.forEach((u, idx) => { rankMap[u.id] = idx + 1; });

    res.json({ 
      success: true, 
      data: results.map(u => ({ ...u, rank: rankMap[u.id] || null }))
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// User details با همه توییت‌ها
app.get('/api/user/:username', (req, res) => {
  try {
    const { username } = req.params;
    const period = req.query.period || 'all';
    const { startDate } = getDateRange(period);
    const startDateSQL = formatDateForSQL(startDate);

    const user = db.prepare(`
      SELECT 
        u.*,
        COUNT(t.id) as tweet_count,
        COALESCE(SUM(t.likes_count), 0) as total_likes,
        COALESCE(SUM(t.retweets_count), 0) as total_retweets,
        COALESCE(SUM(t.replies_count), 0) as total_replies,
        COALESCE(SUM(t.views_count), 0) as total_views,
        (COALESCE(SUM(t.likes_count), 0) * 3 + 
         COALESCE(SUM(t.retweets_count), 0) * 5 + 
         COALESCE(SUM(t.views_count), 0) * 0.01 +
         COUNT(t.id) * 10) as engagement_score
      FROM users u
      LEFT JOIN tweets t ON u.id = t.user_id AND t.created_at >= ?
      WHERE LOWER(u.username) = LOWER(?)
      GROUP BY u.id
    `).get(startDateSQL, username);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // همه توییت‌های یوزر
    const tweets = db.prepare(`
      SELECT * FROM tweets 
      WHERE user_id = ? AND created_at >= ?
      ORDER BY created_at DESC
    `).all(user.id, startDateSQL);

    // محاسبه رنک
    const allUsers = db.prepare(`
      SELECT u.id,
        (COALESCE(SUM(t.likes_count), 0) * 3 + 
         COALESCE(SUM(t.retweets_count), 0) * 5 + 
         COALESCE(SUM(t.views_count), 0) * 0.01 +
         COUNT(t.id) * 10) as engagement_score
      FROM users u
      LEFT JOIN tweets t ON u.id = t.user_id AND t.created_at >= ?
      GROUP BY u.id
      HAVING COUNT(t.id) > 0
      ORDER BY engagement_score DESC
    `).all(startDateSQL);

    let rank = null;
    allUsers.forEach((u, idx) => {
      if (u.id === user.id) rank = idx + 1;
    });

    res.json({
      success: true,
      data: { ...user, rank, tweets, period, period_label: getPeriodLabel(period) }
    });
  } catch (error) {
    console.error('User error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Refresh
app.post('/api/refresh', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Starting refresh...');
    
    // چندین سرچ مختلف
    const queries = [
      '@redstone_defi -is:retweet',
      '"RedStone Oracle" -is:retweet',
      '"RedStone" defi -minecraft -game -is:retweet',
      '$RED oracle -is:retweet'
    ];

    let allTweets = [];
    let allUsers = new Map();

    for (const query of queries) {
      try {
        console.log(`📡 Query: ${query}`);
        const result = await twitterAPI.fetchAllTweets(query, 100);
        
        if (result.tweets) {
          const relevant = result.tweets.filter(t => isRelevantTweet(t.text));
          allTweets.push(...relevant);
          console.log(`   ${relevant.length} relevant / ${result.tweets.length} total`);
        }
        
        if (result.users) {
          result.users.forEach(u => allUsers.set(u.id, u));
        }

        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.log(`   Error: ${err.message}`);
      }
    }

    let usersAdded = 0;
    let tweetsAdded = 0;

    const insertUser = db.prepare(`
      INSERT INTO users (id, username, name, profile_image_url, banner_url, followers_count, following_count, description, verified, updated_at)
      VALUES (@id, @username, @name, @profile_image_url, @banner_url, @followers_count, @following_count, @description, @verified, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        profile_image_url = excluded.profile_image_url,
        banner_url = excluded.banner_url,
        followers_count = excluded.followers_count,
        verified = excluded.verified,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const user of allUsers.values()) {
      try { insertUser.run(user); usersAdded++; } catch (err) {}
    }

    const insertTweet = db.prepare(`
      INSERT INTO tweets (id, user_id, text, created_at, likes_count, retweets_count, replies_count, views_count, quotes_count, bookmark_count, url, is_reply, is_quote, language, fetched_at)
      VALUES (@id, @user_id, @text, @created_at, @likes_count, @retweets_count, @replies_count, @views_count, @quotes_count, @bookmark_count, @url, @is_reply, @is_quote, @language, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        likes_count = excluded.likes_count,
        retweets_count = excluded.retweets_count,
        replies_count = excluded.replies_count,
        views_count = excluded.views_count,
        fetched_at = CURRENT_TIMESTAMP
    `);

    const uniqueTweets = [...new Map(allTweets.map(t => [t.id, t])).values()];

    for (const tweet of uniqueTweets) {
      try {
        insertTweet.run({ 
          ...tweet, 
          is_reply: tweet.is_reply ? 1 : 0, 
          is_quote: tweet.is_quote ? 1 : 0 
        });
        tweetsAdded++;
      } catch (err) {}
    }

    const duration = Date.now() - startTime;
    db.prepare(`INSERT INTO fetch_history (query, tweets_fetched, users_fetched, duration_ms) VALUES (?, ?, ?, ?)`)
      .run('Multiple', tweetsAdded, usersAdded, duration);

    const totalTweets = db.prepare(`SELECT COUNT(*) as count FROM tweets`).get();
    const totalUsers = db.prepare(`SELECT COUNT(*) as count FROM users`).get();

    console.log(`✅ Done: ${tweetsAdded} tweets, ${usersAdded} users`);

    res.json({
      success: true,
      stats: { 
        tweets_added: tweetsAdded, 
        users_added: usersAdded,
        total_tweets: totalTweets.count,
        total_users: totalUsers.count,
        duration_ms: duration
      }
    });

  } catch (error) {
    console.error('❌ Refresh error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🔴 RedStone Tracker v3.0 running on port ${PORT}`);
});

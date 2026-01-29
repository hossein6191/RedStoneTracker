/**
 * RedStone Tweet Tracker - Backend Server v3.1
 * - بدون دکمه Refresh (Auto-refresh هر 30 دقیقه)
 * - سرچ از API
 * - بدون All Time
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

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
    description TEXT,
    verified INTEGER DEFAULT 0,
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
    url TEXT,
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fetch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweets_fetched INTEGER DEFAULT 0,
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_tweets_created ON tweets(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

console.log('✅ Database ready');

const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_URL = 'https://api.twitterapi.io/twitter';

const BLACKLIST = ['murder', 'killed', 'death', 'crime', 'minecraft', 'gaming', 'game', 'redstone dust', 'redstone torch', 'قتل', 'کشته'];

function isRelevant(text) {
  const lower = text.toLowerCase();
  return !BLACKLIST.some(w => lower.includes(w));
}

async function fetchAPI(query, count = 100) {
  try {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(`${TWITTER_API_URL}/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=Latest&count=${count}`, {
      headers: { 'X-API-Key': TWITTER_API_KEY }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('API error:', e.message);
    return null;
  }
}

function parseTweets(data) {
  if (!data?.tweets) return { tweets: [], users: [] };
  const users = new Map();
  const tweets = [];

  for (const t of data.tweets) {
    if (t.author) {
      users.set(t.author.id, {
        id: t.author.id,
        username: t.author.userName || t.author.username,
        name: t.author.name,
        profile_image_url: t.author.profilePicture,
        banner_url: t.author.coverPicture || null,
        followers_count: t.author.followers || 0,
        description: t.author.description || '',
        verified: t.author.isBlueVerified ? 1 : 0
      });
    }
    tweets.push({
      id: t.id,
      user_id: t.author?.id,
      text: t.text || '',
      created_at: t.createdAt,
      likes_count: t.likeCount || 0,
      retweets_count: t.retweetCount || 0,
      replies_count: t.replyCount || 0,
      views_count: t.viewCount || 0,
      url: t.url || `https://twitter.com/${t.author?.userName}/status/${t.id}`
    });
  }
  return { tweets, users: [...users.values()] };
}

async function autoRefresh() {
  console.log('🔄 Auto-refresh...');
  const queries = ['@redstone_defi -is:retweet', '"RedStone Oracle" -is:retweet', '"RedStone" defi -minecraft -is:retweet'];
  
  let count = 0;
  for (const q of queries) {
    const data = await fetchAPI(q);
    if (!data) continue;
    
    const { tweets, users } = parseTweets(data);
    const relevant = tweets.filter(t => isRelevant(t.text));

    for (const u of users) {
      try {
        db.prepare(`INSERT INTO users (id, username, name, profile_image_url, banner_url, followers_count, description, verified)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, profile_image_url=excluded.profile_image_url, banner_url=excluded.banner_url, followers_count=excluded.followers_count, updated_at=CURRENT_TIMESTAMP`)
          .run(u.id, u.username, u.name, u.profile_image_url, u.banner_url, u.followers_count, u.description, u.verified);
      } catch (e) {}
    }

    for (const t of relevant) {
      try {
        db.prepare(`INSERT INTO tweets (id, user_id, text, created_at, likes_count, retweets_count, replies_count, views_count, url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET likes_count=excluded.likes_count, retweets_count=excluded.retweets_count, replies_count=excluded.replies_count, views_count=excluded.views_count`)
          .run(t.id, t.user_id, t.text, t.created_at, t.likes_count, t.retweets_count, t.replies_count, t.views_count, t.url);
        count++;
      } catch (e) {}
    }
    await new Promise(r => setTimeout(r, 300));
  }

  db.prepare(`INSERT INTO fetch_history (tweets_fetched) VALUES (?)`).run(count);
  console.log(`✅ Refreshed: ${count} tweets`);
}

// Auto-refresh هر 30 دقیقه
setInterval(autoRefresh, 30 * 60 * 1000);
setTimeout(autoRefresh, 3000);

// Helpers
function getStartDate(period) {
  const now = Date.now();
  const ms = { '24h': 24*60*60*1000, '7d': 7*24*60*60*1000, '15d': 15*24*60*60*1000, '30d': 30*24*60*60*1000 };
  return new Date(now - (ms[period] || ms['30d'])).toISOString();
}

// Routes
app.get('/api/stats', (req, res) => {
  const p = req.query.period || '30d';
  const start = getStartDate(p);
  
  const stats = db.prepare(`SELECT COUNT(DISTINCT id) as total_tweets, COALESCE(SUM(likes_count),0) as total_likes, COALESCE(SUM(retweets_count),0) as total_retweets, COALESCE(SUM(replies_count),0) as total_replies, COALESCE(SUM(views_count),0) as total_views, COUNT(DISTINCT user_id) as unique_users FROM tweets WHERE created_at >= ?`).get(start);
  const top = db.prepare(`SELECT t.*, u.username, u.name, u.profile_image_url FROM tweets t JOIN users u ON t.user_id=u.id WHERE t.created_at >= ? ORDER BY t.views_count DESC LIMIT 1`).get(start);
  const last = db.prepare(`SELECT fetched_at FROM fetch_history ORDER BY id DESC LIMIT 1`).get();

  res.json({ success: true, data: { ...stats, period: p, most_viewed_tweet: top, last_updated: last?.fetched_at } });
});

app.get('/api/top3', (req, res) => {
  const p = req.query.period || '30d';
  const start = getStartDate(p);
  
  const top3 = db.prepare(`SELECT u.id, u.username, u.name, u.profile_image_url, u.banner_url, u.verified,
    COUNT(t.id) as tweet_count, COALESCE(SUM(t.likes_count),0) as total_likes, COALESCE(SUM(t.retweets_count),0) as total_retweets,
    COALESCE(SUM(t.replies_count),0) as total_replies, COALESCE(SUM(t.views_count),0) as total_views,
    (COALESCE(SUM(t.likes_count),0)*3 + COALESCE(SUM(t.retweets_count),0)*5 + COALESCE(SUM(t.views_count),0)*0.01 + COUNT(t.id)*10) as engagement_score
    FROM users u JOIN tweets t ON u.id=t.user_id WHERE t.created_at >= ? GROUP BY u.id ORDER BY engagement_score DESC LIMIT 3`).all(start);

  res.json({ success: true, data: top3.map((u,i) => ({...u, rank: i+1})) });
});

app.get('/api/leaderboard', (req, res) => {
  const p = req.query.period || '30d';
  const start = getStartDate(p);
  
  const list = db.prepare(`SELECT u.id, u.username, u.name, u.profile_image_url, u.banner_url, u.verified,
    COUNT(t.id) as tweet_count, COALESCE(SUM(t.likes_count),0) as total_likes, COALESCE(SUM(t.retweets_count),0) as total_retweets,
    COALESCE(SUM(t.replies_count),0) as total_replies, COALESCE(SUM(t.views_count),0) as total_views,
    (COALESCE(SUM(t.likes_count),0)*3 + COALESCE(SUM(t.retweets_count),0)*5 + COALESCE(SUM(t.views_count),0)*0.01 + COUNT(t.id)*10) as engagement_score
    FROM users u JOIN tweets t ON u.id=t.user_id WHERE t.created_at >= ? GROUP BY u.id ORDER BY engagement_score DESC LIMIT 200`).all(start);

  res.json({ success: true, data: list.map((u,i) => ({...u, rank: i+1})) });
});

app.get('/api/search', async (req, res) => {
  const q = req.query.q || '';
  const p = req.query.period || '30d';
  if (q.length < 2) return res.json({ success: true, data: [] });

  const start = getStartDate(p);

  // سرچ در دیتابیس
  let results = db.prepare(`SELECT u.id, u.username, u.name, u.profile_image_url, u.verified,
    COUNT(t.id) as tweet_count, COALESCE(SUM(t.likes_count),0) as total_likes, COALESCE(SUM(t.views_count),0) as total_views,
    (COALESCE(SUM(t.likes_count),0)*3 + COALESCE(SUM(t.views_count),0)*0.01) as score
    FROM users u LEFT JOIN tweets t ON u.id=t.user_id AND t.created_at >= ?
    WHERE LOWER(u.username) LIKE ? OR LOWER(u.name) LIKE ?
    GROUP BY u.id ORDER BY score DESC LIMIT 50`).all(start, `%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);

  // اگه نیست، از API بگیر
  if (results.length === 0) {
    const data = await fetchAPI(`from:${q}`, 20);
    if (data) {
      const { tweets, users } = parseTweets(data);
      for (const u of users) {
        try {
          db.prepare(`INSERT INTO users (id, username, name, profile_image_url, banner_url, followers_count, description, verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, profile_image_url=excluded.profile_image_url`)
            .run(u.id, u.username, u.name, u.profile_image_url, u.banner_url, u.followers_count, u.description, u.verified);
        } catch (e) {}
      }
      for (const t of tweets) {
        try {
          db.prepare(`INSERT INTO tweets (id, user_id, text, created_at, likes_count, retweets_count, replies_count, views_count, url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
            .run(t.id, t.user_id, t.text, t.created_at, t.likes_count, t.retweets_count, t.replies_count, t.views_count, t.url);
        } catch (e) {}
      }
      results = db.prepare(`SELECT u.id, u.username, u.name, u.profile_image_url, u.verified,
        COUNT(t.id) as tweet_count, COALESCE(SUM(t.likes_count),0) as total_likes, COALESCE(SUM(t.views_count),0) as total_views
        FROM users u LEFT JOIN tweets t ON u.id=t.user_id
        WHERE LOWER(u.username) LIKE ? GROUP BY u.id LIMIT 50`).all(`%${q.toLowerCase()}%`);
    }
  }

  // رنک
  const all = db.prepare(`SELECT u.id, (COALESCE(SUM(t.likes_count),0)*3 + COALESCE(SUM(t.views_count),0)*0.01) as s
    FROM users u LEFT JOIN tweets t ON u.id=t.user_id AND t.created_at >= ? GROUP BY u.id HAVING COUNT(t.id)>0 ORDER BY s DESC`).all(start);
  const ranks = {};
  all.forEach((u,i) => ranks[u.id] = i+1);

  res.json({ success: true, data: results.map(u => ({...u, rank: ranks[u.id] || null})) });
});

app.get('/api/user/:username', (req, res) => {
  const { username } = req.params;
  const p = req.query.period || '30d';
  const start = getStartDate(p);

  const user = db.prepare(`SELECT u.*, COUNT(t.id) as tweet_count, COALESCE(SUM(t.likes_count),0) as total_likes,
    COALESCE(SUM(t.retweets_count),0) as total_retweets, COALESCE(SUM(t.replies_count),0) as total_replies,
    COALESCE(SUM(t.views_count),0) as total_views
    FROM users u LEFT JOIN tweets t ON u.id=t.user_id AND t.created_at >= ?
    WHERE LOWER(u.username) = ? GROUP BY u.id`).get(start, username.toLowerCase());

  if (!user) return res.status(404).json({ success: false, error: 'Not found' });

  const tweets = db.prepare(`SELECT * FROM tweets WHERE user_id=? AND created_at >= ? ORDER BY views_count DESC`).all(user.id, start);

  const all = db.prepare(`SELECT u.id, (COALESCE(SUM(t.likes_count),0)*3 + COALESCE(SUM(t.views_count),0)*0.01) as s
    FROM users u LEFT JOIN tweets t ON u.id=t.user_id AND t.created_at >= ? GROUP BY u.id HAVING COUNT(t.id)>0 ORDER BY s DESC`).all(start);
  let rank = null;
  all.forEach((u,i) => { if (u.id === user.id) rank = i+1; });

  res.json({ success: true, data: { ...user, rank, tweets } });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => console.log(`🔴 Server running on port ${PORT}`));

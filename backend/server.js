/**
 * RedStone Tweet Tracker v7.0
 * - Twitter Official API (Bearer Token)
 * - Weekly stats (Monday to Sunday)
 * - Auto-refresh every 30 minutes
 * - Live RED price
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

// Database
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'tweets.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT,
    profile_image_url TEXT,
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
    is_reply INTEGER DEFAULT 0,
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS weekly_reset (
    id INTEGER PRIMARY KEY,
    last_reset TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_tweets_user ON tweets(user_id);
  CREATE INDEX IF NOT EXISTS idx_tweets_date ON tweets(created_at);
`);

// Initialize weekly reset tracker
const resetRow = db.prepare('SELECT * FROM weekly_reset WHERE id = 1').get();
if (!resetRow) {
  db.prepare('INSERT INTO weekly_reset (id, last_reset) VALUES (1, ?)').run(new Date().toISOString());
}

console.log('✅ Database ready');

// Twitter API Config
const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const TWITTER_API = 'https://api.twitter.com/2';

// Blacklist
const BLACKLIST = ['murder', 'killed', 'death', 'minecraft', 'gaming', 'game', 'redstone dust', 'redstone torch'];

function isRelevant(text) {
  const lower = text.toLowerCase();
  return !BLACKLIST.some(w => lower.includes(w));
}

// Get Monday of current week
function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

// Check if we need to reset (new week)
function checkWeeklyReset() {
  const lastReset = db.prepare('SELECT last_reset FROM weekly_reset WHERE id = 1').get();
  const lastResetDate = new Date(lastReset?.last_reset || 0);
  const currentWeekStart = new Date(getWeekStart());
  
  if (lastResetDate < currentWeekStart) {
    console.log('🔄 New week! Resetting data...');
    db.exec('DELETE FROM tweets');
    db.prepare('UPDATE weekly_reset SET last_reset = ? WHERE id = 1').run(new Date().toISOString());
    console.log('✅ Weekly reset complete');
    return true;
  }
  return false;
}

// Fetch from Twitter Official API
async function fetchTwitter(query, maxResults = 100) {
  if (!BEARER_TOKEN) {
    console.log('❌ No Bearer Token!');
    return null;
  }

  try {
    const fetch = (await import('node-fetch')).default;
    
    const params = new URLSearchParams({
      query: query,
      max_results: Math.min(maxResults, 100).toString(),
      'tweet.fields': 'created_at,public_metrics,author_id,in_reply_to_user_id',
      'user.fields': 'name,username,profile_image_url,description,public_metrics,verified',
      'expansions': 'author_id'
    });

    console.log(`📡 Twitter API: ${query}`);
    
    const res = await fetch(`${TWITTER_API}/tweets/search/recent?${params}`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.text();
      console.log(`❌ Twitter API Error ${res.status}: ${err}`);
      return null;
    }

    const data = await res.json();
    console.log(`   ✓ Got ${data.data?.length || 0} tweets`);
    return data;
  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
    return null;
  }
}

// Search user by username
async function searchUser(username) {
  if (!BEARER_TOKEN) return null;

  try {
    const fetch = (await import('node-fetch')).default;
    
    const params = new URLSearchParams({
      'user.fields': 'name,username,profile_image_url,description,public_metrics,verified'
    });

    const res = await fetch(`${TWITTER_API}/users/by/username/${username}?${params}`, {
      headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch (e) {
    return null;
  }
}

// Get user's recent tweets
async function getUserTweets(userId, maxResults = 20) {
  if (!BEARER_TOKEN) return null;

  try {
    const fetch = (await import('node-fetch')).default;
    
    const params = new URLSearchParams({
      max_results: maxResults.toString(),
      'tweet.fields': 'created_at,public_metrics,in_reply_to_user_id',
      exclude: 'retweets'
    });

    const res = await fetch(`${TWITTER_API}/users/${userId}/tweets?${params}`, {
      headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// Parse Twitter API response
function parseTwitterResponse(data) {
  if (!data?.data) return { tweets: [], users: [] };
  
  const usersMap = new Map();
  if (data.includes?.users) {
    for (const u of data.includes.users) {
      usersMap.set(u.id, {
        id: u.id,
        username: u.username,
        name: u.name,
        profile_image_url: u.profile_image_url,
        followers_count: u.public_metrics?.followers_count || 0,
        description: u.description || '',
        verified: u.verified ? 1 : 0
      });
    }
  }

  const tweets = [];
  for (const t of data.data) {
    const isReply = !!t.in_reply_to_user_id;
    
    tweets.push({
      id: t.id,
      user_id: t.author_id,
      text: t.text,
      created_at: t.created_at,
      likes_count: t.public_metrics?.like_count || 0,
      retweets_count: t.public_metrics?.retweet_count || 0,
      replies_count: t.public_metrics?.reply_count || 0,
      views_count: t.public_metrics?.impression_count || 0,
      url: `https://twitter.com/i/status/${t.id}`,
      is_reply: isReply ? 1 : 0
    });
  }

  return { tweets, users: [...usersMap.values()] };
}

// Save to DB
function saveToDB(tweets, users) {
  const iu = db.prepare(`INSERT OR REPLACE INTO users (id,username,name,profile_image_url,followers_count,description,verified,updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`);
  const it = db.prepare(`INSERT OR REPLACE INTO tweets (id,user_id,text,created_at,likes_count,retweets_count,replies_count,views_count,url,is_reply,fetched_at) VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`);
  
  let count = 0;
  for (const u of users) {
    try { iu.run(u.id, u.username, u.name, u.profile_image_url, u.followers_count, u.description, u.verified); } catch(e) {}
  }
  for (const t of tweets) {
    if (isRelevant(t.text)) {
      try { it.run(t.id, t.user_id, t.text, t.created_at, t.likes_count, t.retweets_count, t.replies_count, t.views_count, t.url, t.is_reply); count++; } catch(e) {}
    }
  }
  return count;
}

// RED Price
let redPrice = null;

async function fetchRedPrice() {
  try {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=redstone-oracles&vs_currencies=usd&include_24hr_change=true');
    if (res.ok) {
      const data = await res.json();
      redPrice = {
        usd: data['redstone-oracles']?.usd || 0,
        change_24h: data['redstone-oracles']?.usd_24h_change || 0,
        updated_at: new Date().toISOString()
      };
      console.log(`💰 RED: $${redPrice.usd.toFixed(4)}`);
    }
  } catch (e) {}
}

// Auto-refresh
async function autoRefresh() {
  console.log('\n🔄 AUTO-REFRESH');
  
  // Check weekly reset
  checkWeeklyReset();
  
  if (!BEARER_TOKEN) {
    console.log('❌ No Bearer Token configured!');
    return;
  }

  const queries = [
    '@redstone_defi -is:retweet',
    '"RedStone Oracle" -is:retweet',
    'redstone oracle crypto -minecraft -is:retweet',
    '#RedStone defi -is:retweet'
  ];

  let total = 0;
  for (const q of queries) {
    const data = await fetchTwitter(q, 100);
    if (data) {
      const { tweets, users } = parseTwitterResponse(data);
      total += saveToDB(tweets, users);
    }
    await new Promise(r => setTimeout(r, 1000)); // Rate limit
  }

  const stats = db.prepare('SELECT COUNT(*) as c FROM tweets WHERE is_reply = 0').get();
  console.log(`✅ Total: ${total} new, ${stats.c} in DB\n`);
}

// Start refresh cycles
setTimeout(autoRefresh, 5000);
setInterval(autoRefresh, 30 * 60 * 1000); // Every 30 min
setInterval(fetchRedPrice, 30000); // Price every 30 sec
fetchRedPrice();

// =====================
// API ROUTES
// =====================

app.get('/api/health', (req, res) => {
  const stats = db.prepare('SELECT COUNT(*) as tweets FROM tweets WHERE is_reply = 0').get();
  res.json({ status: 'ok', version: '7.0', tweets: stats.tweets, has_token: !!BEARER_TOKEN });
});

app.get('/api/price', (req, res) => {
  res.json({ success: true, data: redPrice });
});

app.get('/api/stats', (req, res) => {
  try {
    const weekStart = getWeekStart();
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_tweets,
        COALESCE(SUM(likes_count), 0) as total_likes,
        COALESCE(SUM(retweets_count), 0) as total_retweets,
        COALESCE(SUM(replies_count), 0) as total_replies,
        COALESCE(SUM(views_count), 0) as total_views,
        COUNT(DISTINCT user_id) as unique_users
      FROM tweets WHERE is_reply = 0 AND created_at >= ?
    `).get(weekStart);

    const mostViewed = db.prepare(`
      SELECT t.*, u.username, u.name, u.profile_image_url
      FROM tweets t JOIN users u ON t.user_id = u.id
      WHERE t.is_reply = 0 AND t.created_at >= ?
      ORDER BY t.views_count DESC LIMIT 1
    `).get(weekStart);

    res.json({
      success: true,
      data: { ...stats, week_start: weekStart, most_viewed_tweet: mostViewed, red_price: redPrice }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/top3', (req, res) => {
  try {
    const weekStart = getWeekStart();
    
    const top3 = db.prepare(`
      SELECT u.id, u.username, u.name, u.profile_image_url, u.verified,
        COUNT(t.id) as tweet_count,
        COALESCE(SUM(t.likes_count), 0) as total_likes,
        COALESCE(SUM(t.retweets_count), 0) as total_retweets,
        COALESCE(SUM(t.views_count), 0) as total_views,
        (COALESCE(SUM(t.likes_count), 0) * 3 + COALESCE(SUM(t.retweets_count), 0) * 5 + COALESCE(SUM(t.views_count), 0) * 0.01 + COUNT(t.id) * 10) as score
      FROM users u JOIN tweets t ON u.id = t.user_id
      WHERE t.is_reply = 0 AND t.created_at >= ?
      GROUP BY u.id ORDER BY score DESC LIMIT 3
    `).all(weekStart);

    res.json({ success: true, data: top3.map((u, i) => ({ ...u, rank: i + 1 })) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/leaderboard', (req, res) => {
  try {
    const weekStart = getWeekStart();
    
    const list = db.prepare(`
      SELECT u.id, u.username, u.name, u.profile_image_url, u.verified,
        COUNT(t.id) as tweet_count,
        COALESCE(SUM(t.likes_count), 0) as total_likes,
        COALESCE(SUM(t.retweets_count), 0) as total_retweets,
        COALESCE(SUM(t.views_count), 0) as total_views,
        (COALESCE(SUM(t.likes_count), 0) * 3 + COALESCE(SUM(t.retweets_count), 0) * 5 + COALESCE(SUM(t.views_count), 0) * 0.01 + COUNT(t.id) * 10) as score
      FROM users u JOIN tweets t ON u.id = t.user_id
      WHERE t.is_reply = 0 AND t.created_at >= ?
      GROUP BY u.id ORDER BY score DESC LIMIT 100
    `).all(weekStart);

    res.json({ success: true, data: list.map((u, i) => ({ ...u, rank: i + 1 })), week_start: weekStart });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, data: [] });

    const weekStart = getWeekStart();
    const searchTerm = `%${q.toLowerCase()}%`;

    // Search in DB
    let results = db.prepare(`
      SELECT u.id, u.username, u.name, u.profile_image_url, u.verified,
        COUNT(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN 1 END) as tweet_count,
        COALESCE(SUM(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN t.views_count ELSE 0 END), 0) as total_views
      FROM users u LEFT JOIN tweets t ON u.id = t.user_id
      WHERE LOWER(u.username) LIKE ? OR LOWER(u.name) LIKE ?
      GROUP BY u.id ORDER BY total_views DESC LIMIT 20
    `).all(weekStart, weekStart, searchTerm, searchTerm);

    // If not found, search Twitter API
    if (results.length === 0 && BEARER_TOKEN) {
      const twitterUser = await searchUser(q);
      if (twitterUser) {
        // Save user
        db.prepare(`INSERT OR REPLACE INTO users (id,username,name,profile_image_url,followers_count,description,verified) VALUES (?,?,?,?,?,?,?)`)
          .run(twitterUser.id, twitterUser.username, twitterUser.name, twitterUser.profile_image_url, twitterUser.public_metrics?.followers_count || 0, twitterUser.description || '', twitterUser.verified ? 1 : 0);

        // Get their tweets
        const userTweets = await getUserTweets(twitterUser.id, 20);
        if (userTweets?.data) {
          for (const t of userTweets.data) {
            if (t.text.toLowerCase().includes('redstone') && isRelevant(t.text)) {
              db.prepare(`INSERT OR REPLACE INTO tweets (id,user_id,text,created_at,likes_count,retweets_count,replies_count,views_count,url,is_reply) VALUES (?,?,?,?,?,?,?,?,?,?)`)
                .run(t.id, twitterUser.id, t.text, t.created_at, t.public_metrics?.like_count || 0, t.public_metrics?.retweet_count || 0, t.public_metrics?.reply_count || 0, t.public_metrics?.impression_count || 0, `https://twitter.com/${twitterUser.username}/status/${t.id}`, t.in_reply_to_user_id ? 1 : 0);
            }
          }
        }

        // Re-query
        results = db.prepare(`
          SELECT u.id, u.username, u.name, u.profile_image_url, u.verified,
            COUNT(CASE WHEN t.is_reply = 0 THEN 1 END) as tweet_count,
            COALESCE(SUM(CASE WHEN t.is_reply = 0 THEN t.views_count ELSE 0 END), 0) as total_views
          FROM users u LEFT JOIN tweets t ON u.id = t.user_id
          WHERE LOWER(u.username) = ?
          GROUP BY u.id
        `).all(q.toLowerCase());
      }
    }

    // Get ranks
    const ranked = db.prepare(`
      SELECT u.id FROM users u JOIN tweets t ON u.id = t.user_id
      WHERE t.is_reply = 0 AND t.created_at >= ?
      GROUP BY u.id ORDER BY (SUM(t.likes_count) * 3 + SUM(t.views_count) * 0.01) DESC
    `).all(weekStart);
    
    const ranks = {};
    ranked.forEach((u, i) => { ranks[u.id] = i + 1; });

    res.json({
      success: true,
      data: results.map(u => ({ ...u, rank: ranks[u.id] || null, has_tweets: u.tweet_count > 0 }))
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/user/:username', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const weekStart = getWeekStart();

    let user = db.prepare(`
      SELECT u.*,
        COUNT(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN 1 END) as tweet_count,
        COALESCE(SUM(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN t.likes_count ELSE 0 END), 0) as total_likes,
        COALESCE(SUM(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN t.retweets_count ELSE 0 END), 0) as total_retweets,
        COALESCE(SUM(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN t.views_count ELSE 0 END), 0) as total_views
      FROM users u LEFT JOIN tweets t ON u.id = t.user_id
      WHERE LOWER(u.username) = ? GROUP BY u.id
    `).get(weekStart, weekStart, weekStart, weekStart, username);

    // Fetch from Twitter if not found
    if (!user && BEARER_TOKEN) {
      const twitterUser = await searchUser(username);
      if (twitterUser) {
        db.prepare(`INSERT OR REPLACE INTO users (id,username,name,profile_image_url,followers_count,description,verified) VALUES (?,?,?,?,?,?,?)`)
          .run(twitterUser.id, twitterUser.username, twitterUser.name, twitterUser.profile_image_url, twitterUser.public_metrics?.followers_count || 0, twitterUser.description || '', twitterUser.verified ? 1 : 0);

        const userTweets = await getUserTweets(twitterUser.id, 30);
        if (userTweets?.data) {
          for (const t of userTweets.data) {
            if (t.text.toLowerCase().includes('redstone') && isRelevant(t.text)) {
              db.prepare(`INSERT OR REPLACE INTO tweets (id,user_id,text,created_at,likes_count,retweets_count,replies_count,views_count,url,is_reply) VALUES (?,?,?,?,?,?,?,?,?,?)`)
                .run(t.id, twitterUser.id, t.text, t.created_at, t.public_metrics?.like_count || 0, t.public_metrics?.retweet_count || 0, t.public_metrics?.reply_count || 0, t.public_metrics?.impression_count || 0, `https://twitter.com/${twitterUser.username}/status/${t.id}`, t.in_reply_to_user_id ? 1 : 0);
            }
          }
        }

        user = db.prepare(`
          SELECT u.*, COUNT(CASE WHEN t.is_reply = 0 THEN 1 END) as tweet_count,
            COALESCE(SUM(CASE WHEN t.is_reply = 0 THEN t.likes_count ELSE 0 END), 0) as total_likes,
            COALESCE(SUM(CASE WHEN t.is_reply = 0 THEN t.retweets_count ELSE 0 END), 0) as total_retweets,
            COALESCE(SUM(CASE WHEN t.is_reply = 0 THEN t.views_count ELSE 0 END), 0) as total_views
          FROM users u LEFT JOIN tweets t ON u.id = t.user_id
          WHERE LOWER(u.username) = ? GROUP BY u.id
        `).get(username);
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const tweets = db.prepare(`
      SELECT * FROM tweets WHERE user_id = ? AND is_reply = 0 AND created_at >= ?
      ORDER BY views_count DESC
    `).all(user.id, weekStart);

    // Get rank
    let rank = null;
    if (user.tweet_count > 0) {
      const ranked = db.prepare(`
        SELECT u.id FROM users u JOIN tweets t ON u.id = t.user_id
        WHERE t.is_reply = 0 AND t.created_at >= ?
        GROUP BY u.id ORDER BY (SUM(t.likes_count) * 3 + SUM(t.views_count) * 0.01) DESC
      `).all(weekStart);
      ranked.forEach((u, i) => { if (u.id === user.id) rank = i + 1; });
    }

    res.json({
      success: true,
      data: { ...user, rank, tweets, has_tweets: user.tweet_count > 0, week_start: weekStart }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🔴 RedStone Tracker v7.0 on port ${PORT}`);
  console.log(`   Twitter API: ${BEARER_TOKEN ? '✅ Configured' : '❌ Missing'}\n`);
});

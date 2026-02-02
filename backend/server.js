/**
 * RedStone Tweet Tracker v7.1 (twitterapi.io)
 * - Uses twitterapi.io (X-API-Key) instead of X official credits
 * - Weekly stats (Monday to Sunday)
 * - Auto-refresh every 30 minutes
 * - Live RED price
 */

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

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

// =====================
// Database
// =====================
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

const resetRow = db.prepare('SELECT * FROM weekly_reset WHERE id = 1').get();
if (!resetRow) {
  db.prepare('INSERT INTO weekly_reset (id, last_reset) VALUES (1, ?)').run(new Date().toISOString());
}

console.log('✅ Database ready');

// =====================
// twitterapi.io Config
// =====================
const TWITTERAPI_KEY = process.env.TWITTERAPI_IO_KEY;

// Blacklist
const BLACKLIST = ['murder', 'killed', 'death', 'minecraft', 'gaming', 'game', 'redstone dust', 'redstone torch'];

function isRelevant(text) {
  const lower = (text || '').toLowerCase();
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

// Weekly reset
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

// =====================
// twitterapi.io helpers
// =====================
async function fetchTwitterAdvancedSearch(query, cursor = "") {
  if (!TWITTERAPI_KEY) {
    console.log("❌ No TWITTERAPI_IO_KEY configured!");
    return null;
  }

  try {
    const params = new URLSearchParams({
      query,
      queryType: "Latest",
      cursor
    });

    console.log(`📡 twitterapi.io search: ${query} ${cursor ? "(cursor)" : ""}`);

    const res = await fetch(`https://api.twitterapi.io/twitter/tweet/advanced_search?${params}`, {
      headers: { "X-API-Key": TWITTERAPI_KEY }
    });

    if (!res.ok) {
      const err = await res.text();
      console.log(`❌ twitterapi.io Error ${res.status}: ${err}`);
      return null;
    }

    return await res.json();
  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
    return null;
  }
}

// Get user info by username (twitterapi.io)
async function fetchUserInfo(username) {
  if (!TWITTERAPI_KEY) return null;

  try {
    const res = await fetch(
      `https://api.twitterapi.io/twitter/user/info?userName=${encodeURIComponent(username)}`,
      { headers: { "X-API-Key": TWITTERAPI_KEY } }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const u = data?.data || data?.user || data;

    if (!u?.id) return null;

    return {
      id: u.id,
      username: u.userName || u.username || username,
      name: u.name || '',
      profile_image_url: u.profilePicture || '',
      followers_count: u.followers || 0,
      description: u.description || '',
      verified: u.isBlueVerified ? 1 : 0
    };
  } catch (e) {
    return null;
  }
}

// Get user tweets by username (twitterapi.io)
async function fetchUserTweets(username, cursor = "") {
  if (!TWITTERAPI_KEY) return null;

  try {
    const params = new URLSearchParams({
      userName: username,
      cursor
    });

    const res = await fetch(
      `https://api.twitterapi.io/twitter/user/tweets?${params}`,
      { headers: { "X-API-Key": TWITTERAPI_KEY } }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// Parse twitterapi.io advanced_search response
function parseSearchResponse(data) {
  if (!data?.tweets) return { tweets: [], users: [], next_cursor: "", has_next_page: false };

  const usersMap = new Map();
  const tweets = [];

  for (const t of data.tweets) {
    const a = t.author;

    if (a?.id && !usersMap.has(a.id)) {
      usersMap.set(a.id, {
        id: a.id,
        username: a.userName,
        name: a.name,
        profile_image_url: a.profilePicture,
        followers_count: a.followers || 0,
        description: a.description || "",
        verified: a.isBlueVerified ? 1 : 0
      });
    }

    tweets.push({
      id: t.id,
      user_id: a?.id || "",
      text: t.text || "",
      created_at: t.createdAt || "",
      likes_count: t.likeCount || 0,
      retweets_count: t.retweetCount || 0,
      replies_count: t.replyCount || 0,
      views_count: t.viewCount || 0,
      url: t.url || `https://x.com/i/status/${t.id}`,
      is_reply: t.isReply ? 1 : 0
    });
  }

  return {
    tweets,
    users: [...usersMap.values()],
    next_cursor: data.next_cursor || "",
    has_next_page: !!data.has_next_page
  };
}

// Parse twitterapi.io user/tweets response (best-effort)
function parseUserTweetsResponse(data, fallbackUserId = "") {
  const tweets = [];
  const users = [];

  const list = data?.tweets || data?.data || [];
  for (const t of list) {
    const a = t.author;

    if (a?.id) {
      users.push({
        id: a.id,
        username: a.userName || "",
        name: a.name || "",
        profile_image_url: a.profilePicture || "",
        followers_count: a.followers || 0,
        description: a.description || "",
        verified: a.isBlueVerified ? 1 : 0
      });
    }

    tweets.push({
      id: t.id,
      user_id: a?.id || fallbackUserId || "",
      text: t.text || "",
      created_at: t.createdAt || "",
      likes_count: t.likeCount || 0,
      retweets_count: t.retweetCount || 0,
      replies_count: t.replyCount || 0,
      views_count: t.viewCount || 0,
      url: t.url || `https://x.com/i/status/${t.id}`,
      is_reply: t.isReply ? 1 : 0
    });
  }

  return {
    tweets,
    users,
    next_cursor: data?.next_cursor || "",
    has_next_page: !!data?.has_next_page
  };
}

// Save to DB
function saveToDB(tweets, users) {
  const iu = db.prepare(`
    INSERT OR REPLACE INTO users
    (id,username,name,profile_image_url,followers_count,description,verified,updated_at)
    VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
  `);

  const it = db.prepare(`
    INSERT OR REPLACE INTO tweets
    (id,user_id,text,created_at,likes_count,retweets_count,replies_count,views_count,url,is_reply,fetched_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
  `);

  let count = 0;

  for (const u of users || []) {
    if (!u?.id || !u?.username) continue;
    try { iu.run(u.id, u.username, u.name || "", u.profile_image_url || "", u.followers_count || 0, u.description || "", u.verified || 0); } catch(e) {}
  }

  for (const t of tweets || []) {
    if (!t?.id || !t?.user_id || !t?.text) continue;
    if (!isRelevant(t.text)) continue;

    try {
      it.run(
        t.id,
        t.user_id,
        t.text,
        t.created_at || null,
        t.likes_count || 0,
        t.retweets_count || 0,
        t.replies_count || 0,
        t.views_count || 0,
        t.url || null,
        t.is_reply ? 1 : 0
      );
      count++;
    } catch(e) {}
  }

  return count;
}

// =====================
// RED Price (CoinGecko)
// =====================
let redPrice = null;

async function fetchRedPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=redstone-oracles&vs_currencies=usd&include_24hr_change=true');
    if (res.ok) {
      const data = await res.json();
      redPrice = {
        usd: data['redstone-oracles']?.usd || 0,
        change_24h: data['redstone-oracles']?.usd_24hr_change || data['redstone-oracles']?.usd_24h_change || 0,
        updated_at: new Date().toISOString()
      };
      console.log(`💰 RED: $${Number(redPrice.usd).toFixed(4)}`);
    }
  } catch (e) {}
}

// =====================
// Auto-refresh
// =====================
async function autoRefresh() {
  console.log('\n🔄 AUTO-REFRESH');
  checkWeeklyReset();

  if (!TWITTERAPI_KEY) {
    console.log('❌ No TWITTERAPI_IO_KEY configured!');
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
    let cursor = "";

    for (let page = 0; page < 3; page++) { // 3 pages (~60 tweets)
      const data = await fetchTwitterAdvancedSearch(q, cursor);
      if (!data) break;

      const parsed = parseSearchResponse(data);
      total += saveToDB(parsed.tweets, parsed.users);

      if (!parsed.has_next_page) break;
      cursor = parsed.next_cursor;

      await new Promise(r => setTimeout(r, 800));
    }
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
  res.json({ status: 'ok', version: '7.1', tweets: stats.tweets, has_token: !!TWITTERAPI_KEY });
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

    // Search in DB first
    let results = db.prepare(`
      SELECT u.id, u.username, u.name, u.profile_image_url, u.verified,
        COUNT(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN 1 END) as tweet_count,
        COALESCE(SUM(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN t.views_count ELSE 0 END), 0) as total_views
      FROM users u LEFT JOIN tweets t ON u.id = t.user_id
      WHERE LOWER(u.username) LIKE ? OR LOWER(u.name) LIKE ?
      GROUP BY u.id ORDER BY total_views DESC LIMIT 20
    `).all(weekStart, weekStart, searchTerm, searchTerm);

    // If not found, fetch user info + tweets from twitterapi.io
    if (results.length === 0 && TWITTERAPI_KEY) {
      const user = await fetchUserInfo(q);
      if (user?.id) {
        // Save user
        db.prepare(`
          INSERT OR REPLACE INTO users
          (id,username,name,profile_image_url,followers_count,description,verified,updated_at)
          VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        `).run(user.id, user.username, user.name, user.profile_image_url, user.followers_count, user.description, user.verified);

        // Fetch their tweets (few pages)
        let cursor = "";
        for (let page = 0; page < 2; page++) {
          const ut = await fetchUserTweets(user.username, cursor);
          if (!ut) break;

          const parsed = parseUserTweetsResponse(ut, user.id);
          const onlyRedstone = parsed.tweets.filter(t => (t.text || "").toLowerCase().includes("redstone") && isRelevant(t.text));
          totalSaved = saveToDB(onlyRedstone, parsed.users.length ? parsed.users : [user]);

          if (!parsed.has_next_page) break;
          cursor = parsed.next_cursor;
          await new Promise(r => setTimeout(r, 800));
        }

        // Re-query from DB
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

    // ranks
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
    const username = (req.params.username || '').toLowerCase();
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

    // If missing, fetch and store from twitterapi.io
    if (!user && TWITTERAPI_KEY) {
      const u = await fetchUserInfo(username);
      if (u?.id) {
        db.prepare(`
          INSERT OR REPLACE INTO users
          (id,username,name,profile_image_url,followers_count,description,verified,updated_at)
          VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        `).run(u.id, u.username, u.name, u.profile_image_url, u.followers_count, u.description, u.verified);

        // fetch few tweets
        let cursor = "";
        for (let page = 0; page < 2; page++) {
          const ut = await fetchUserTweets(u.username, cursor);
          if (!ut) break;

          const parsed = parseUserTweetsResponse(ut, u.id);
const onlyRedstone = parsed.tweets.filter(
  t => (t.text || "").toLowerCase().includes("redstone") && isRelevant(t.text)
);

saveToDB(onlyRedstone, parsed.users.length ? parsed.users : [u]);


          if (!parsed.has_next_page) break;
          cursor = parsed.next_cursor;
          await new Promise(r => setTimeout(r, 800));
        }

        // re-query
        user = db.prepare(`
          SELECT u.*,
            COUNT(CASE WHEN t.is_reply = 0 THEN 1 END) as tweet_count,
            COALESCE(SUM(CASE WHEN t.is_reply = 0 THEN t.likes_count ELSE 0 END), 0) as total_likes,
            COALESCE(SUM(CASE WHEN t.is_reply = 0 THEN t.retweets_count ELSE 0 END), 0) as total_retweets,
            COALESCE(SUM(CASE WHEN t.is_reply = 0 THEN t.views_count ELSE 0 END), 0) as total_views
          FROM users u LEFT JOIN tweets t ON u.id = t.user_id
          WHERE LOWER(u.username) = ? GROUP BY u.id
        `).get(username);
      }
    }

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const tweets = db.prepare(`
      SELECT * FROM tweets WHERE user_id = ? AND is_reply = 0 AND created_at >= ?
      ORDER BY views_count DESC
    `).all(user.id, weekStart);

    // rank
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

// Frontend fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🔴 RedStone Tracker v7.1 on port ${PORT}`);
  console.log(`   twitterapi.io: ${TWITTERAPI_KEY ? '✅ Configured' : '❌ Missing'}\n`);
});

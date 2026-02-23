/**
 * RedStone Tweet Tracker v7.3 (twitterapi.io)
 * - twitterapi.io (X-API-Key)
 * - Weekly stats (Monday 00:00 UTC to Sunday)
 * - Auto-refresh every 24 hours
 * - Live RED price from CoinGecko
 * - Update all existing users view/like counts
 * - Banner support
 * - Smart RedStone signal detection
 * - Exact "RedStone" case sensitive detection
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

console.log('Database ready');

// Optional one-time clear
if ((process.env.CLEAR_TWEETS_ON_START || '').toLowerCase() === 'true') {
  db.exec('DELETE FROM tweets');
  db.prepare('UPDATE weekly_reset SET last_reset = ? WHERE id = 1').run(new Date().toISOString());
  console.log('CLEAR_TWEETS_ON_START=true -> tweets cleared');
}

// =====================
// twitterapi.io Config
// =====================
const TWITTERAPI_KEY = process.env.TWITTERAPI_IO_KEY;

// Blacklist - exclude these words
const BLACKLIST = ['murder','killed','death','minecraft','redstone dust','redstone torch','arsenal','military','army','navy','space command','spacecom','huntsville','alabama','headquarters','pentagon','delegation'];

function isRelevant(text) {
  const lower = (text || '').toLowerCase();
  return !BLACKLIST.some(w => lower.includes(w));
}

// Smart RedStone signal detection
function hasRedstoneSignal(text, username = "") {
  const s = (text || "").toLowerCase();
  const u = (username || "").toLowerCase();
  
  // Official RedStone account - always include all tweets
  if (u === "redstone_defi") return true;
  
  // Exclude military/political
  const isMilitary = 
    s.includes("arsenal") ||
    s.includes("military") ||
    s.includes("army") ||
    s.includes("space command") ||
    s.includes("spacecom") ||
    s.includes("huntsville") ||
    s.includes("alabama") ||
    s.includes("pentagon") ||
    s.includes("headquarters") ||
    s.includes("delegation");
  
  if (isMilitary) return false;
  
  // Direct mentions - always include
  if (s.includes("@redstone_defi")) return true;
  if (s.includes("redstone oracle")) return true;
  if (s.includes("redstone bolt")) return true;
  if (s.includes("redstone defi")) return true;
  
  // Exact "RedStone" with capital R and S (case sensitive)
  if (text && text.includes("RedStone")) return true;
  
  // "redstone" alone needs crypto context
  if (s.includes("redstone")) {
    const hasCryptoContext = 
      s.includes("oracle") ||
      s.includes("defi") ||
      s.includes("crypto") ||
      s.includes("blockchain") ||
      s.includes("onchain") ||
      s.includes("web3") ||
      s.includes("$red") ||
      s.includes("token") ||
      s.includes("price") ||
      s.includes("chain") ||
      s.includes("protocol") ||
      s.includes("smart contract") ||
      s.includes("eth") ||
      s.includes("btc");
    
    return hasCryptoContext;
  }
  
  return false;
}

// Force created_at to ISO format
function toISODate(input) {
  if (!input) return null;
  if (typeof input === 'string' && input.includes('T') && input.endsWith('Z')) return input;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// Monday 00:00 UTC start
function getWeekStartISO() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
  return monday.toISOString();
}

// Weekly reset (clears DB when new week starts)
function checkWeeklyReset() {
  const lastReset = db.prepare('SELECT last_reset FROM weekly_reset WHERE id = 1').get();
  const lastResetDate = new Date(lastReset?.last_reset || 0);
  const currentWeekStart = new Date(getWeekStartISO());

  if (lastResetDate < currentWeekStart) {
    console.log('New week! Resetting data...');
    db.exec('DELETE FROM tweets');
    db.prepare('UPDATE weekly_reset SET last_reset = ? WHERE id = 1').run(new Date().toISOString());
    console.log('Weekly reset complete');
    return true;
  }
  return false;
}

// =====================
// twitterapi.io helpers
// =====================
async function fetchTwitterAdvancedSearch(query, cursor = "") {
  if (!TWITTERAPI_KEY) {
    console.log("No TWITTERAPI_IO_KEY configured!");
    return null;
  }

  try {
    const params = new URLSearchParams({
      query,
      queryType: "Latest",
      cursor
    });

    console.log(`twitterapi.io search: ${query} ${cursor ? "(cursor)" : ""}`);

    const res = await fetch(`https://api.twitterapi.io/twitter/tweet/advanced_search?${params}`, {
      headers: { "X-API-Key": TWITTERAPI_KEY }
    });

    if (!res.ok) {
      const err = await res.text();
      console.log(`twitterapi.io Error ${res.status}: ${err}`);
      return null;
    }

    return await res.json();
  } catch (e) {
    console.log(`Error: ${e.message}`);
    return null;
  }
}

// User info from twitterapi.io
async function fetchUserInfo(username) {
  if (!TWITTERAPI_KEY) return null;

  try {
    const res = await fetch(
      `https://api.twitterapi.io/twitter/user/info?userName=${encodeURIComponent(username)}`,
      { headers: { "X-API-Key": TWITTERAPI_KEY } }
    );

    if (!res.ok) {
      const err = await res.text();
      console.log(`twitterapi.io user/info Error ${res.status}: ${err}`);
      return null;
    }

    const data = await res.json();
    const u = data?.data || data?.user || data;

    if (!u?.id) return null;

    return {
      id: u.id,
      username: u.userName || u.username || username,
      name: u.name || '',
      profile_image_url: u.profilePicture || '',
      banner_url: u.coverPicture || u.profileBannerUrl || '',
      followers_count: u.followers || 0,
      description: u.description || '',
      verified: u.isBlueVerified ? 1 : 0
    };
  } catch (e) {
    return null;
  }
}

// User tweets from twitterapi.io
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

    if (!res.ok) {
      const err = await res.text();
      console.log(`twitterapi.io user/tweets Error ${res.status}: ${err}`);
      return null;
    }

    return await res.json();
  } catch (e) {
    return null;
  }
}

// Parse advanced_search response
function parseSearchResponse(data) {
  if (!data?.tweets) return { tweets: [], users: [], next_cursor: "", has_next_page: false };

  const usersMap = new Map();
  const tweets = [];

  for (const t of data.tweets) {
    const a = t.author;

    if (a?.id && !usersMap.has(a.id)) {
      usersMap.set(a.id, {
        id: a.id,
        username: a.userName || "",
        name: a.name || "",
        profile_image_url: a.profilePicture || "",
        banner_url: a.coverPicture || a.profileBannerUrl || "",
        followers_count: a.followers || 0,
        description: a.description || "",
        verified: a.isBlueVerified ? 1 : 0
      });
    }

    tweets.push({
      id: t.id,
      user_id: a?.id || "",
      text: t.text || "",
      created_at: toISODate(t.createdAt) || "",
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

// Parse user/tweets response
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
        banner_url: a.coverPicture || a.profileBannerUrl || "",
        followers_count: a.followers || 0,
        description: a.description || "",
        verified: a.isBlueVerified ? 1 : 0
      });
    }

    tweets.push({
      id: t.id,
      user_id: a?.id || fallbackUserId || "",
      text: t.text || "",
      created_at: toISODate(t.createdAt) || "",
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

// Save to DB with update on conflict
function saveToDB(tweets, users) {
  const iu = db.prepare(`
    INSERT OR REPLACE INTO users
    (id,username,name,profile_image_url,banner_url,followers_count,description,verified,updated_at)
    VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
  `);

  const it = db.prepare(`
    INSERT INTO tweets (id,user_id,text,created_at,likes_count,retweets_count,replies_count,views_count,url,is_reply,fetched_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      likes_count = excluded.likes_count,
      retweets_count = excluded.retweets_count,
      replies_count = excluded.replies_count,
      views_count = excluded.views_count,
      fetched_at = CURRENT_TIMESTAMP
  `);

  let count = 0;

  for (const u of users || []) {
    if (!u?.id || !u?.username) continue;
    try {
      iu.run(
        u.id,
        u.username,
        u.name || "",
        u.profile_image_url || "",
        u.banner_url || "",
        u.followers_count || 0,
        u.description || "",
        u.verified || 0
      );
    } catch (e) {}
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
    } catch (e) {}
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
        change_24h: data['redstone-oracles']?.usd_24h_change || 0,
        updated_at: new Date().toISOString()
      };
      console.log(`RED Price: $${Number(redPrice.usd).toFixed(4)}`);
    }
  } catch (e) {}
}

// =====================
// Auto-refresh
// =====================
async function autoRefresh() {
  console.log('\n=== AUTO-REFRESH START ===');
  checkWeeklyReset();

  if (!TWITTERAPI_KEY) {
    console.log('No TWITTERAPI_IO_KEY configured!');
    return;
  }

  // Search queries for RedStone tweets
  const queries = [
    "from:redstone_defi -is:retweet",
    "@redstone_defi -is:retweet",
    '"RedStone Oracle" -is:retweet',
    '"RedStone Bolt" -is:retweet',
    '"RedStone" -minecraft -is:retweet',
    '"RedStone" crypto -minecraft -is:retweet',
    '"RedStone" defi -minecraft -is:retweet',
    "#RedStone -minecraft -is:retweet",
    "RedStone oracle -minecraft -is:retweet"
  ];

  let total = 0;

  // Step 1: Search queries for new tweets
  console.log('Step 1: Searching for new tweets...');
  for (const q of queries) {
    let cursor = "";

    for (let page = 0; page < 10; page++) {
      const data = await fetchTwitterAdvancedSearch(q, cursor);
      if (!data) break;

      const parsed = parseSearchResponse(data);

      // Filter only relevant RedStone tweets
      const filteredTweets = parsed.tweets.filter(t => {
        const username = parsed.users.find(u => u.id === t.user_id)?.username || "";
        return hasRedstoneSignal(t.text, username) && isRelevant(t.text);
      });
      total += saveToDB(filteredTweets, parsed.users);

      if (!parsed.has_next_page) break;
      cursor = parsed.next_cursor;

      await new Promise(r => setTimeout(r, 800));
    }
  }

  // Step 2: Update ALL existing users tweets for fresh view/like counts
  console.log('Step 2: Updating existing users...');
  const existingUsers = db.prepare(`
    SELECT DISTINCT u.username 
    FROM users u 
    JOIN tweets t ON u.id = t.user_id 
    WHERE t.is_reply = 0
  `).all();

  console.log(`Found ${existingUsers.length} users to update`);

  for (const user of existingUsers) {
    try {
      const data = await fetchTwitterAdvancedSearch(`from:${user.username} -is:retweet`, "");
      if (data) {
        const parsed = parseSearchResponse(data);
        const filteredTweets = parsed.tweets.filter(t => {
          const username = parsed.users.find(u => u.id === t.user_id)?.username || "";
          return hasRedstoneSignal(t.text, username) && isRelevant(t.text);
        });
        total += saveToDB(filteredTweets, parsed.users);
      }
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {}
  }

  const stats = db.prepare('SELECT COUNT(*) as c FROM tweets WHERE is_reply = 0').get();
  console.log(`=== AUTO-REFRESH COMPLETE: ${total} new/updated, ${stats.c} total in DB ===\n`);
}

// Start refresh cycles
setTimeout(autoRefresh, 5000);
setInterval(autoRefresh, 24 * 60 * 60 * 1000); // Every 24 hours
setInterval(fetchRedPrice, 30000); // Price every 30 seconds
fetchRedPrice();

// =====================
// API ROUTES
// =====================
app.get('/api/health', (req, res) => {
  const stats = db.prepare('SELECT COUNT(*) as tweets FROM tweets WHERE is_reply = 0').get();
  res.json({ status: 'ok', version: '7.3', tweets: stats.tweets, has_token: !!TWITTERAPI_KEY });
});

app.get('/api/price', (req, res) => {
  res.json({ success: true, data: redPrice });
});

app.get('/api/stats', (req, res) => {
  try {
    const weekStart = getWeekStartISO();

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
    const weekStart = getWeekStartISO();

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
    const weekStart = getWeekStartISO();

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

    const weekStart = getWeekStartISO();
    const searchTerm = `%${q.toLowerCase()}%`;

    // Search in DB only (no API call to save tokens)
    let results = db.prepare(`
      SELECT u.id, u.username, u.name, u.profile_image_url, u.verified,
        COUNT(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN 1 END) as tweet_count,
        COALESCE(SUM(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN t.views_count ELSE 0 END), 0) as total_views
      FROM users u LEFT JOIN tweets t ON u.id = t.user_id
      WHERE LOWER(u.username) LIKE ? OR LOWER(u.name) LIKE ?
      GROUP BY u.id ORDER BY total_views DESC LIMIT 20
    `).all(weekStart, weekStart, searchTerm, searchTerm);

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
    const username = (req.params.username || '').toLowerCase();
    const weekStart = getWeekStartISO();

    let user = db.prepare(`
      SELECT u.*,
        COUNT(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN 1 END) as tweet_count,
        COALESCE(SUM(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN t.likes_count ELSE 0 END), 0) as total_likes,
        COALESCE(SUM(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN t.retweets_count ELSE 0 END), 0) as total_retweets,
        COALESCE(SUM(CASE WHEN t.is_reply = 0 AND t.created_at >= ? THEN t.views_count ELSE 0 END), 0) as total_views
      FROM users u LEFT JOIN tweets t ON u.id = t.user_id
      WHERE LOWER(u.username) = ? GROUP BY u.id
    `).get(weekStart, weekStart, weekStart, weekStart, username);

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

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
      ranked.forEach((row, i) => { if (row.id === user.id) rank = i + 1; });
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
  console.log(`\nRedStone Tracker v7.3 running on port ${PORT}`);
  console.log(`twitterapi.io: ${TWITTERAPI_KEY ? 'Configured' : 'Missing'}\n`);
});

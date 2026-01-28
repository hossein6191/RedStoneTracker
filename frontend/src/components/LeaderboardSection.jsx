import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Heart, Repeat2, Eye, MessageCircle, ChevronDown } from 'lucide-react';

export default function LeaderboardSection({ leaderboard, period, onUserClick }) {
  const [showCount, setShowCount] = useState(20);
  const [sortBy, setSortBy] = useState('engagement');

  if (!leaderboard || leaderboard.length === 0) return null;

  const sorted = [...leaderboard].sort((a, b) => {
    switch (sortBy) {
      case 'likes': return b.total_likes - a.total_likes;
      case 'retweets': return b.total_retweets - a.total_retweets;
      case 'views': return b.total_views - a.total_views;
      case 'tweets': return b.tweet_count - a.tweet_count;
      default: return b.engagement_score - a.engagement_score;
    }
  }).map((u, i) => ({ ...u, rank: i + 1 }));

  const displayed = sorted.slice(0, showCount);

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'bg-yellow-500 text-yellow-900';
    if (rank === 2) return 'bg-gray-400 text-gray-900';
    if (rank === 3) return 'bg-amber-600 text-amber-100';
    if (rank <= 10) return 'bg-rs-red/20 text-rs-red border border-rs-red/30';
    return 'bg-white/5 text-white/50';
  };

  return (
    <section className="py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-yellow-500/20">
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Top 100 Leaderboard</h2>
            <p className="text-white/40 text-sm">{leaderboard.length} members • Click for details</p>
          </div>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none"
        >
          <option value="engagement">Sort: Engagement</option>
          <option value="likes">Sort: Likes</option>
          <option value="retweets">Sort: Retweets</option>
          <option value="views">Sort: Views</option>
          <option value="tweets">Sort: Tweets</option>
        </select>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2 text-white/40 text-xs font-mono uppercase border-b border-white/5 mb-2">
        <div className="col-span-1">#</div>
        <div className="col-span-3">User</div>
        <div className="col-span-2 text-center">Tweets</div>
        <div className="col-span-2 text-center">Likes</div>
        <div className="col-span-2 text-center">Retweets</div>
        <div className="col-span-2 text-center">Views</div>
      </div>

      <div className="space-y-2">
        {displayed.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index * 0.02, 0.4) }}
            onClick={() => onUserClick && onUserClick(user.username)}
            className="glass-panel p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
          >
            {/* Mobile */}
            <div className="lg:hidden flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${getRankClass(user.rank)}`}>
                {user.rank}
              </div>
              <img
                src={user.profile_image_url || `https://ui-avatars.com/api/?name=${user.name}&background=AE0822&color=fff`}
                alt=""
                className="w-9 h-9 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate text-sm">{user.name}</p>
                <div className="flex gap-3 text-[10px] text-white/40 font-mono">
                  <span>❤️ {formatNumber(user.total_likes)}</span>
                  <span>👁️ {formatNumber(user.total_views)}</span>
                </div>
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
              <div className="col-span-1">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${getRankClass(user.rank)}`}>
                  {user.rank}
                </div>
              </div>
              <div className="col-span-3 flex items-center gap-3">
                <img
                  src={user.profile_image_url || `https://ui-avatars.com/api/?name=${user.name}&background=AE0822&color=fff`}
                  alt=""
                  className="w-9 h-9 rounded-full"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate text-sm">{user.name}</p>
                  <p className="text-rs-raspberry text-xs font-mono">@{user.username}</p>
                </div>
              </div>
              <div className="col-span-2 text-center text-white font-mono">{user.tweet_count}</div>
              <div className="col-span-2 text-center text-pink-400 font-mono">{formatNumber(user.total_likes)}</div>
              <div className="col-span-2 text-center text-green-400 font-mono">{formatNumber(user.total_retweets)}</div>
              <div className="col-span-2 text-center text-purple-400 font-mono">{formatNumber(user.total_views)}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {sorted.length > showCount && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowCount(c => Math.min(c + 30, 100))}
            className="btn-glass px-6 py-3 inline-flex items-center gap-2"
          >
            Show More
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {showCount > 20 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => { setShowCount(20); document.getElementById('leaderboard')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="text-white/40 text-sm hover:text-white"
          >
            Show Less
          </button>
        </div>
      )}
    </section>
  );
}

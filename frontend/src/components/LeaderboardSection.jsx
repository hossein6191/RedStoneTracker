import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronDown } from 'lucide-react';

export default function LeaderboardSection({ leaderboard, onUserClick }) {
  const [show, setShow] = useState(20);
  const [sort, setSort] = useState('engagement');

  if (!leaderboard?.length) return null;

  const sorted = [...leaderboard].sort((a, b) => {
    if (sort === 'likes') return b.total_likes - a.total_likes;
    if (sort === 'views') return b.total_views - a.total_views;
    if (sort === 'tweets') return b.tweet_count - a.tweet_count;
    return b.engagement_score - a.engagement_score;
  }).map((u, i) => ({ ...u, rank: i + 1 }));

  const displayed = sorted.slice(0, show);

  const fmt = (n) => {
    if (!n) return '0';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
    return n.toString();
  };

  const rankClass = (r) => {
    if (r === 1) return 'bg-yellow-500 text-yellow-900';
    if (r === 2) return 'bg-gray-400 text-gray-900';
    if (r === 3) return 'bg-amber-600 text-amber-100';
    if (r <= 10) return 'bg-rs-red/20 text-rs-red border border-rs-red/30';
    return 'bg-white/5 text-white/50';
  };

  return (
    <section id="leaderboard" className="py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-yellow-500/20">
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            <p className="text-white/40 text-sm">{sorted.length} members</p>
          </div>
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="glass-panel px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-rs-red/50 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-10"
        >
          <option value="engagement" className="bg-[#1a1a2e] text-white">Sort: Engagement</option>
          <option value="likes" className="bg-[#1a1a2e] text-white">Sort: Likes</option>
          <option value="views" className="bg-[#1a1a2e] text-white">Sort: Views</option>
          <option value="tweets" className="bg-[#1a1a2e] text-white">Sort: Tweets</option>
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
        {displayed.map((user, idx) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(idx * 0.02, 0.4) }}
            onClick={() => onUserClick?.(user.username)}
            className="glass-panel p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
          >
            {/* Mobile */}
            <div className="lg:hidden flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${rankClass(user.rank)}`}>{user.rank}</div>
              <img src={user.profile_image_url || `https://ui-avatars.com/api/?name=${user.name}&background=AE0822&color=fff`} alt="" className="w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate text-sm">{user.name}</p>
                <div className="flex gap-3 text-[10px] text-white/40 font-mono">
                  <span>❤️ {fmt(user.total_likes)}</span>
                  <span>👁️ {fmt(user.total_views)}</span>
                </div>
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
              <div className="col-span-1">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${rankClass(user.rank)}`}>{user.rank}</div>
              </div>
              <div className="col-span-3 flex items-center gap-3">
                <img src={user.profile_image_url || `https://ui-avatars.com/api/?name=${user.name}&background=AE0822&color=fff`} alt="" className="w-9 h-9 rounded-full" />
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate text-sm">{user.name}</p>
                  <p className="text-rs-raspberry text-xs font-mono">@{user.username}</p>
                </div>
              </div>
              <div className="col-span-2 text-center text-white font-mono">{user.tweet_count}</div>
              <div className="col-span-2 text-center text-pink-400 font-mono">{fmt(user.total_likes)}</div>
              <div className="col-span-2 text-center text-green-400 font-mono">{fmt(user.total_retweets)}</div>
              <div className="col-span-2 text-center text-purple-400 font-mono">{fmt(user.total_views)}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {sorted.length > show && (
        <div className="mt-6 text-center">
          <button onClick={() => setShow(s => Math.min(s + 30, sorted.length))} className="glass-panel px-6 py-3 rounded-xl inline-flex items-center gap-2 hover:bg-white/5">
            Show More <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {show > 20 && (
        <div className="mt-4 text-center">
          <button onClick={() => { setShow(20); document.getElementById('leaderboard')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-white/40 text-sm hover:text-white">
            Show Less
          </button>
        </div>
      )}
    </section>
  );
}

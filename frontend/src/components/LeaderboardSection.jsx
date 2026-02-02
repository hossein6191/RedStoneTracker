import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';

export default function LeaderboardSection({ leaderboard, onUserClick }) {
  const [showAll, setShowAll] = useState(false);

  if (!leaderboard?.length) return (
    <section className="py-8 text-center">
      <Trophy className="w-12 h-12 text-yellow-500/50 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
      <p className="text-white/40 mt-2">No data yet. Check back soon!</p>
    </section>
  );

  const displayed = showAll ? leaderboard : leaderboard.slice(0, 20);
  const fmt = (n) => !n ? '0' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n.toString();

  const rankStyle = (r) => {
    if (r === 1) return 'bg-yellow-500 text-yellow-900';
    if (r === 2) return 'bg-gray-400 text-gray-900';
    if (r === 3) return 'bg-amber-700 text-amber-100';
    if (r <= 10) return 'bg-[#AE0822]/30 text-[#AE0822] border border-[#AE0822]/50';
    return 'bg-white/5 text-white/50';
  };

  return (
    <section id="leaderboard" className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-yellow-500/20">
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            <p className="text-white/40 text-sm">{leaderboard.length} RedStone champions this week</p>
          </div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-white/40 text-xs font-mono uppercase border-b border-white/10 mb-2">
        <div className="col-span-1">#</div>
        <div className="col-span-4">User</div>
        <div className="col-span-2 text-center">Tweets</div>
        <div className="col-span-2 text-center">Likes</div>
        <div className="col-span-3 text-center">Views</div>
      </div>

      <div className="space-y-2">
        {displayed.map((user, idx) => (
          <motion.div 
            key={user.id} 
            initial={{opacity:0,x:-10}} 
            animate={{opacity:1,x:0}} 
            transition={{delay:Math.min(idx*0.02, 0.3)}}
            onClick={() => onUserClick?.(user.username)} 
            className="bg-white/5 hover:bg-white/10 backdrop-blur-sm p-3 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-[#AE0822]/30"
          >
            {/* Mobile */}
            <div className="md:hidden flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${rankStyle(user.rank)}`}>
                {user.rank}
              </div>
              <img src={user.profile_image_url || `https://ui-avatars.com/api/?name=${user.name}&background=AE0822&color=fff`} className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{user.name}</p>
                <div className="flex gap-3 text-[10px] text-white/50 font-mono">
                  <span>❤️ {fmt(user.total_likes)}</span>
                  <span>👁️ {fmt(user.total_views)}</span>
                </div>
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden md:grid grid-cols-12 gap-4 items-center">
              <div className="col-span-1">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${rankStyle(user.rank)}`}>
                  {user.rank}
                </div>
              </div>
              <div className="col-span-4 flex items-center gap-3">
                <img src={user.profile_image_url || `https://ui-avatars.com/api/?name=${user.name}&background=AE0822&color=fff`} className="w-10 h-10 rounded-full" />
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[#AE0822] text-xs font-mono">@{user.username}</p>
                </div>
              </div>
              <div className="col-span-2 text-center text-white font-mono">{user.tweet_count}</div>
              <div className="col-span-2 text-center text-pink-400 font-mono">{fmt(user.total_likes)}</div>
              <div className="col-span-3 text-center text-purple-400 font-mono">{fmt(user.total_views)}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {leaderboard.length > 20 && (
        <div className="mt-6 text-center">
          <button 
            onClick={() => setShowAll(!showAll)} 
            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            {showAll ? (
              <>Show Less <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Show All {leaderboard.length} <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

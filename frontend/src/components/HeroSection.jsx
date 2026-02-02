import { motion } from 'framer-motion';
import { Heart, Repeat2, Eye, MessageCircle, Crown } from 'lucide-react';

export default function HeroSection({ top3, onUserClick }) {
  const fmt = (n) => !n ? '0' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n.toString();
  
  if (!top3?.length) return (
    <section className="py-16 text-center">
      <h2 className="text-4xl font-bold text-white">Weekly Champions</h2>
      <p className="text-white/40 mt-4">Loading this week's top performers...</p>
    </section>
  );

  const ordered = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <section className="py-12">
      <motion.div className="text-center mb-12" initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}}>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">
          Weekly <span className="text-[#AE0822]">Champions</span>
        </h2>
        <p className="text-white/40">Top performers this week (Mon-Sun)</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-end">
        {ordered.map((user, idx) => {
          const isFirst = idx === 1;
          return (
            <motion.div key={user.id} initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:idx*0.15}}
              className={`${isFirst ? 'md:order-2 md:-mt-8' : idx===0 ? 'md:order-1' : 'md:order-3'}`}>
              
              {user.rank === 1 && (
                <motion.div className="text-center mb-3" animate={{y:[0,-8,0]}} transition={{duration:2,repeat:Infinity}}>
                  <Crown className="w-12 h-12 text-yellow-500 mx-auto" fill="#EAB308" />
                </motion.div>
              )}
              
              <div 
                onClick={() => onUserClick?.(user.username)} 
                className={`bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-1 cursor-pointer hover:scale-[1.02] transition-all border ${isFirst ? 'border-[#AE0822]/50' : 'border-white/10'}`}
              >
                {/* Banner */}
                <div className="h-24 rounded-t-[20px] overflow-hidden relative">
                  {user.banner_url ? (
                    <img src={user.banner_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#AE0822]/40 to-transparent" />
                  )}
                  <div className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    user.rank===1 ? 'bg-yellow-500 text-yellow-900' :
                    user.rank===2 ? 'bg-gray-400 text-gray-900' :
                    'bg-amber-700 text-amber-100'
                  }`}>{user.rank}</div>
                </div>

                {/* Content */}
                <div className="px-4 pb-4 pt-12 relative">
                  <div className="absolute -top-8 left-4">
                    <img 
                      src={user.profile_image_url || `https://ui-avatars.com/api/?name=${user.name}&background=AE0822&color=fff`} 
                      className="w-16 h-16 rounded-full border-4 border-[#0a0408] object-cover"
                    />
                  </div>
                  
                  <h3 className="font-bold text-white truncate">{user.name}</h3>
                  <p className="text-[#AE0822] text-sm font-mono">@{user.username}</p>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="flex items-center gap-1.5 text-white/70">
                      <Heart size={12} className="text-pink-400" /> {fmt(user.total_likes)}
                    </div>
                    <div className="flex items-center gap-1.5 text-white/70">
                      <Repeat2 size={12} className="text-green-400" /> {fmt(user.total_retweets)}
                    </div>
                    <div className="flex items-center gap-1.5 text-white/70">
                      <Eye size={12} className="text-purple-400" /> {fmt(user.total_views)}
                    </div>
                    <div className="flex items-center gap-1.5 text-white/70">
                      <MessageCircle size={12} className="text-blue-400" /> {user.tweet_count}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-white/30 text-[10px]">SCORE</span>
                    <span className="text-[#AE0822] font-bold font-mono">{fmt(Math.round(user.score || 0))}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

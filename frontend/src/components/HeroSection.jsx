import { motion } from 'framer-motion';
import { Heart, Repeat2, Eye, MessageCircle } from 'lucide-react';

export default function HeroSection({ top3, period, onUserClick }) {
  if (!top3 || top3.length === 0) {
    return (
      <section className="py-16 text-center">
        <h2 className="text-4xl font-bold mb-4">
          <span className="gradient-text">Top Champions</span>
        </h2>
        <p className="text-white/40">No data yet. Click Refresh to fetch tweets.</p>
      </section>
    );
  }

  const ordered = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <section className="py-12">
      <motion.div 
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-3">
          <span className="gradient-text">Top</span>
          <span className="text-white"> Champions</span>
        </h2>
        <p className="text-white/40">Most engaged community members</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-end">
        {ordered.map((user, index) => {
          const isFirst = index === 1;
          const orderClass = isFirst ? 'md:order-2' : index === 0 ? 'md:order-1' : 'md:order-3';
          
          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${orderClass} ${isFirst ? 'md:-mt-6' : ''}`}
              onClick={() => onUserClick && onUserClick(user.username)}
            >
              {user.rank === 1 && (
                <motion.div 
                  className="text-center mb-2"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="text-4xl">👑</span>
                </motion.div>
              )}

              <div className={`glass-card p-1 cursor-pointer hover:scale-[1.02] transition-transform ${isFirst ? 'ring-2 ring-rs-red/30' : ''}`}>
                {/* Banner */}
                <div className="h-24 rounded-t-2xl overflow-hidden relative">
                  {user.banner_url ? (
                    <img src={user.banner_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-rs-red/30 to-rs-maroon" />
                  )}
                  <div className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    user.rank === 1 ? 'bg-yellow-500 text-yellow-900' :
                    user.rank === 2 ? 'bg-gray-400 text-gray-900' :
                    'bg-amber-600 text-amber-100'
                  }`}>
                    {user.rank}
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-4 pt-10 relative">
                  {/* Avatar */}
                  <div className="absolute -top-8 left-4">
                    <img
                      src={user.profile_image_url || `https://ui-avatars.com/api/?name=${user.name}&background=AE0822&color=fff`}
                      alt={user.name}
                      className="w-16 h-16 rounded-full border-4 border-[#12121a] object-cover"
                    />
                  </div>

                  <div className="mb-3">
                    <h3 className="font-bold text-white truncate">{user.name}</h3>
                    <p className="text-rs-raspberry text-sm font-mono">@{user.username}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Heart size={12} className="text-pink-400" />
                      <span className="text-white/70">{formatNumber(user.total_likes)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Repeat2 size={12} className="text-green-400" />
                      <span className="text-white/70">{formatNumber(user.total_retweets)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye size={12} className="text-purple-400" />
                      <span className="text-white/70">{formatNumber(user.total_views)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle size={12} className="text-blue-400" />
                      <span className="text-white/70">{user.tweet_count} tweets</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-white/30 text-[10px]">SCORE</span>
                    <span className="text-rs-red font-bold font-mono">{formatNumber(Math.round(user.engagement_score))}</span>
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

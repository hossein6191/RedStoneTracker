import { motion } from 'framer-motion';
import { X, Heart, Repeat2, Eye, MessageCircle, ExternalLink, Users, AlertCircle, Trophy } from 'lucide-react';

export default function UserModal({ user, onClose }) {
  if (!user) return null;

  const fmt = (n) => !n ? '0' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n.toString();

  // Find best tweet
  const best = user.tweets?.length > 0
    ? user.tweets.reduce((b, t) => {
        const s = (t.likes_count || 0) * 3 + (t.views_count || 0) * 0.01;
        const bs = (b.likes_count || 0) * 3 + (b.views_count || 0) * 0.01;
        return s > bs ? t : b;
      }, user.tweets[0])
    : null;

  return (
    <motion.div 
      initial={{opacity:0}} 
      animate={{opacity:1}} 
      exit={{opacity:0}} 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" 
      onClick={onClose}
    >
      <motion.div 
        initial={{scale:0.9,opacity:0}} 
        animate={{scale:1,opacity:1}} 
        exit={{scale:0.9,opacity:0}} 
        className="bg-gradient-to-b from-[#1a0a0e] to-[#0a0408] max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-3xl border border-[#AE0822]/20" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="relative">
          <div className="h-32 overflow-hidden">
            {user.banner_url ? (
              <img src={user.banner_url} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#AE0822]/40 to-transparent" />
            )}
          </div>
          
          <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white">
            <X size={20} />
          </button>
          
          {/* Avatar */}
          <div className="absolute -bottom-12 left-6">
            <img 
              src={user.profile_image_url || `https://ui-avatars.com/api/?name=${user.name}&background=AE0822&color=fff`} 
              className="w-24 h-24 rounded-full border-4 border-[#0a0408]" 
            />
          </div>
          
          {/* Rank badge */}
          {user.rank && user.has_tweets && (
            <div className="absolute -bottom-4 left-28 flex items-center gap-2 px-3 py-1 rounded-full bg-[#AE0822] text-white text-sm font-bold">
              <Trophy size={14} />
              Rank #{user.rank}
            </div>
          )}
        </div>

        <div className="p-6 pt-16">
          {/* Name & Username */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{user.name}</h2>
              <a 
                href={`https://twitter.com/${user.username}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#AE0822] font-mono hover:underline"
              >
                @{user.username}
              </a>
            </div>
            <a 
              href={`https://twitter.com/${user.username}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm flex items-center gap-2 text-white transition-colors"
            >
              <ExternalLink size={14} /> Profile
            </a>
          </div>

          {user.description && (
            <p className="text-white/60 text-sm mb-6">{user.description}</p>
          )}

          {/* No tweets warning */}
          {!user.has_tweets && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-yellow-500 font-semibold">
                <AlertCircle size={18} />
                No RedStone Tweets This Week
              </div>
              <p className="text-white/60 text-sm mt-2">
                This user hasn't tweeted about RedStone this week. They are not ranked on the leaderboard.
              </p>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <MessageCircle size={18} className="text-blue-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-white font-mono">{user.tweet_count || 0}</div>
              <div className="text-white/40 text-[10px]">TWEETS</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Heart size={18} className="text-pink-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-white font-mono">{fmt(user.total_likes)}</div>
              <div className="text-white/40 text-[10px]">LIKES</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Repeat2 size={18} className="text-green-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-white font-mono">{fmt(user.total_retweets)}</div>
              <div className="text-white/40 text-[10px]">RETWEETS</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Eye size={18} className="text-purple-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-white font-mono">{fmt(user.total_views)}</div>
              <div className="text-white/40 text-[10px]">VIEWS</div>
            </div>
          </div>

          {user.followers_count > 0 && (
            <div className="flex items-center gap-2 text-white/50 text-sm mb-6">
              <Users size={16} /> {fmt(user.followers_count)} followers
            </div>
          )}

          {/* Best tweet */}
          {best && (
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                🔥 Best Tweet This Week
              </h3>
              <a 
                href={best.url || `https://twitter.com/${user.username}/status/${best.id}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-colors"
              >
                <p className="text-white/80 text-sm mb-3">{best.text}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-xs font-mono">
                    <span className="text-pink-400">❤️ {fmt(best.likes_count)}</span>
                    <span className="text-green-400">🔁 {fmt(best.retweets_count)}</span>
                    <span className="text-purple-400">👁️ {fmt(best.views_count)}</span>
                  </div>
                  <ExternalLink size={14} className="text-white/30" />
                </div>
              </a>
            </div>
          )}

          {/* All tweets */}
          {user.tweets?.length > 1 && (
            <div className="border-t border-white/10 pt-6 mt-6">
              <h3 className="text-white font-semibold mb-3">📝 All Tweets ({user.tweets.length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {user.tweets.map((t) => (
                  <a 
                    key={t.id} 
                    href={t.url || `https://twitter.com/${user.username}/status/${t.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors"
                  >
                    <p className="text-white/70 text-xs line-clamp-2 mb-2">{t.text}</p>
                    <div className="flex gap-3 text-[10px] text-white/40 font-mono">
                      <span>❤️ {fmt(t.likes_count)}</span>
                      <span>👁️ {fmt(t.views_count)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

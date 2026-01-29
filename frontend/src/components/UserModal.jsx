import { motion } from 'framer-motion';
import { X, Heart, Repeat2, Eye, MessageCircle, ExternalLink, Users } from 'lucide-react';

export default function UserModal({ user, onClose }) {
  if (!user) return null;

  const fmt = (n) => {
    if (!n) return '0';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
    return n.toString();
  };

  const best = user.tweets?.length > 0
    ? user.tweets.reduce((b, t) => {
        const s = (t.likes_count * 3) + (t.retweets_count * 5) + (t.views_count * 0.01);
        const bs = (b.likes_count * 3) + (b.retweets_count * 5) + (b.views_count * 0.01);
        return s > bs ? t : b;
      }, user.tweets[0])
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative">
          <div className="h-28 rounded-t-3xl overflow-hidden">
            {user.banner_url ? (
              <img src={user.banner_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-rs-red/30 to-transparent" />
            )}
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70">
            <X size={18} />
          </button>
          <div className="absolute -bottom-10 left-5">
            <img src={user.profile_image_url || `https://ui-avatars.com/api/?name=${user.name}&background=AE0822&color=fff`} alt="" className="w-20 h-20 rounded-full border-4 border-[#0a0a0f]" />
          </div>
          {user.rank && (
            <div className={`absolute -bottom-3 left-20 px-3 py-1 rounded-full text-sm font-bold ${
              user.rank === 1 ? 'bg-yellow-500 text-yellow-900' :
              user.rank === 2 ? 'bg-gray-400 text-gray-900' :
              user.rank === 3 ? 'bg-amber-600 text-amber-100' :
              'bg-rs-red text-white'
            }`}>Rank #{user.rank}</div>
          )}
        </div>

        <div className="p-5 pt-14">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <a href={`https://twitter.com/${user.username}`} target="_blank" rel="noopener noreferrer" className="text-rs-raspberry text-sm font-mono hover:text-rs-red">
                @{user.username}
              </a>
            </div>
            <a href={`https://twitter.com/${user.username}`} target="_blank" rel="noopener noreferrer" className="glass-panel px-4 py-2 text-sm flex items-center gap-2 rounded-xl hover:bg-white/5">
              <ExternalLink size={14} /> Profile
            </a>
          </div>

          {user.description && <p className="text-white/60 text-sm mb-5">{user.description}</p>}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="glass-panel rounded-xl p-3 text-center">
              <MessageCircle size={16} className="text-blue-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white font-mono">{user.tweet_count}</div>
              <div className="text-white/40 text-[10px]">Tweets</div>
            </div>
            <div className="glass-panel rounded-xl p-3 text-center">
              <Heart size={16} className="text-pink-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white font-mono">{fmt(user.total_likes)}</div>
              <div className="text-white/40 text-[10px]">Likes</div>
            </div>
            <div className="glass-panel rounded-xl p-3 text-center">
              <Repeat2 size={16} className="text-green-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white font-mono">{fmt(user.total_retweets)}</div>
              <div className="text-white/40 text-[10px]">Retweets</div>
            </div>
            <div className="glass-panel rounded-xl p-3 text-center">
              <Eye size={16} className="text-purple-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white font-mono">{fmt(user.total_views)}</div>
              <div className="text-white/40 text-[10px]">Views</div>
            </div>
          </div>

          {user.followers_count > 0 && (
            <div className="flex items-center gap-2 text-white/40 text-sm mb-5">
              <Users size={14} /> {fmt(user.followers_count)} followers
            </div>
          )}

          {/* Best Tweet */}
          {best && (
            <div className="border-t border-white/10 pt-5">
              <h3 className="text-white font-semibold mb-3">🔥 Best Tweet</h3>
              <a 
                href={best.url || `https://twitter.com/${user.username}/status/${best.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block glass-panel rounded-xl p-4 hover:bg-white/5 transition-colors"
              >
                <p className="text-white/80 text-sm mb-3 whitespace-pre-wrap">{best.text}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-xs font-mono">
                    <span className="text-pink-400">❤️ {fmt(best.likes_count)}</span>
                    <span className="text-green-400">🔁 {fmt(best.retweets_count)}</span>
                    <span className="text-purple-400">👁️ {fmt(best.views_count)}</span>
                    <span className="text-blue-400">💬 {fmt(best.replies_count)}</span>
                  </div>
                  <ExternalLink size={12} className="text-white/30" />
                </div>
              </a>
            </div>
          )}

          {/* All Tweets */}
          {user.tweets?.length > 1 && (
            <div className="border-t border-white/10 pt-5 mt-5">
              <h3 className="text-white font-semibold mb-3">📝 All Tweets ({user.tweets.length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {user.tweets.map((t, i) => (
                  <a
                    key={t.id || i}
                    href={t.url || `https://twitter.com/${user.username}/status/${t.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block glass-panel rounded-lg p-3 hover:bg-white/5 transition-colors"
                  >
                    <p className="text-white/70 text-xs line-clamp-2 mb-2">{t.text}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3 text-[10px] text-white/40 font-mono">
                        <span>❤️ {fmt(t.likes_count)}</span>
                        <span>🔁 {fmt(t.retweets_count)}</span>
                        <span>👁️ {fmt(t.views_count)}</span>
                      </div>
                      <ExternalLink size={10} className="text-white/20" />
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

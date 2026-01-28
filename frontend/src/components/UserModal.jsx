import { motion } from 'framer-motion';
import { X, Heart, Repeat2, Eye, MessageCircle, ExternalLink, Calendar, Users } from 'lucide-react';

export default function UserModal({ user, onClose }) {
  if (!user) return null;

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // بهترین توییت
  const bestTweet = user.tweets?.length > 0
    ? user.tweets.reduce((best, t) => {
        const score = (t.likes_count * 3) + (t.retweets_count * 5) + (t.views_count * 0.01);
        const bestScore = (best.likes_count * 3) + (best.retweets_count * 5) + (best.views_count * 0.01);
        return score > bestScore ? t : best;
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
          <div className="h-28 overflow-hidden rounded-t-3xl">
            {user.banner_url ? (
              <img src={user.banner_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-rs-red/30 to-rs-maroon" />
            )}
          </div>

          <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70">
            <X size={18} />
          </button>

          <div className="absolute -bottom-10 left-5">
            <img
              src={user.profile_image_url || `https://ui-avatars.com/api/?name=${user.name}&background=AE0822&color=fff`}
              alt=""
              className="w-20 h-20 rounded-full border-4 border-[#12121a]"
            />
          </div>

          {user.rank && (
            <div className={`absolute -bottom-3 left-20 px-3 py-1 rounded-full text-sm font-bold ${
              user.rank === 1 ? 'bg-yellow-500 text-yellow-900' :
              user.rank === 2 ? 'bg-gray-400 text-gray-900' :
              user.rank === 3 ? 'bg-amber-600 text-amber-100' :
              'bg-rs-red text-white'
            }`}>
              Rank #{user.rank}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 pt-14">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <a
                href={`https://twitter.com/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rs-raspberry text-sm font-mono hover:text-rs-red"
              >
                @{user.username}
              </a>
            </div>
            <a
              href={`https://twitter.com/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glass px-4 py-2 text-sm flex items-center gap-2"
            >
              <ExternalLink size={14} />
              Profile
            </a>
          </div>

          {user.description && (
            <p className="text-white/60 text-sm mb-5">{user.description}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatBox icon={<MessageCircle size={16} />} value={user.tweet_count} label="Tweets" color="text-blue-400" />
            <StatBox icon={<Heart size={16} />} value={formatNumber(user.total_likes)} label="Likes" color="text-pink-400" />
            <StatBox icon={<Repeat2 size={16} />} value={formatNumber(user.total_retweets)} label="Retweets" color="text-green-400" />
            <StatBox icon={<Eye size={16} />} value={formatNumber(user.total_views)} label="Views" color="text-purple-400" />
          </div>

          {user.followers_count > 0 && (
            <div className="flex items-center gap-2 text-white/40 text-sm mb-5">
              <Users size={14} />
              {formatNumber(user.followers_count)} followers
            </div>
          )}

          {/* Best Tweet */}
          {bestTweet && (
            <div className="border-t border-white/10 pt-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                🔥 Best Tweet
              </h3>
              <div className="glass-panel rounded-xl p-4">
                <p className="text-white/80 text-sm mb-3 whitespace-pre-wrap">{bestTweet.text}</p>
                
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-pink-400">❤️ {formatNumber(bestTweet.likes_count)}</span>
                  <span className="text-green-400">🔁 {formatNumber(bestTweet.retweets_count)}</span>
                  <span className="text-purple-400">👁️ {formatNumber(bestTweet.views_count)}</span>
                  <span className="text-blue-400">💬 {formatNumber(bestTweet.replies_count)}</span>
                </div>

                {bestTweet.created_at && (
                  <div className="mt-3 pt-3 border-t border-white/5 text-white/30 text-xs flex items-center gap-1">
                    <Calendar size={10} />
                    {formatDate(bestTweet.created_at)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Tweets */}
          {user.tweets?.length > 1 && (
            <div className="border-t border-white/10 pt-5 mt-5">
              <h3 className="text-white font-semibold mb-3">
                📝 All Tweets ({user.tweets.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {user.tweets.map((tweet, idx) => (
                  <a
                    key={tweet.id || idx}
                    href={tweet.url || `https://twitter.com/${user.username}/status/${tweet.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block glass-panel rounded-lg p-3 hover:bg-white/5"
                  >
                    <p className="text-white/70 text-xs line-clamp-2 mb-2">{tweet.text}</p>
                    <div className="flex gap-3 text-[10px] text-white/40 font-mono">
                      <span>❤️ {formatNumber(tweet.likes_count)}</span>
                      <span>🔁 {formatNumber(tweet.retweets_count)}</span>
                      <span>👁️ {formatNumber(tweet.views_count)}</span>
                      <span>💬 {formatNumber(tweet.replies_count)}</span>
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

function StatBox({ icon, value, label, color }) {
  return (
    <div className="glass-panel rounded-xl p-3 text-center">
      <div className={`${color} mb-1 flex justify-center`}>{icon}</div>
      <div className="text-lg font-bold text-white font-mono">{value}</div>
      <div className="text-white/40 text-[10px]">{label}</div>
    </div>
  );
}

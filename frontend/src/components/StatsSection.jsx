import { motion } from 'framer-motion';
import { Calendar, ExternalLink } from 'lucide-react';

export default function StatsSection({ stats }) {
  const fmt = (n) => !n ? '0' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n.toLocaleString();
  
  if (!stats) return null;

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const items = [
    { label: 'TWEETS', value: stats.total_tweets, color: 'text-blue-400' },
    { label: 'LIKES', value: stats.total_likes, color: 'text-pink-400' },
    { label: 'RETWEETS', value: stats.total_retweets, color: 'text-green-400' },
    { label: 'REPLIES', value: stats.total_replies, color: 'text-yellow-400' },
    { label: 'VIEWS', value: stats.total_views, color: 'text-purple-400' },
    { label: 'USERS', value: stats.unique_users, color: 'text-cyan-400' }
  ];

  return (
    <section className="py-8">
      <motion.div initial={{opacity:0}} whileInView={{opacity:1}} className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#AE0822]/10 rounded-full border border-[#AE0822]/30 mb-4">
          <Calendar size={16} className="text-[#AE0822]" />
          <span className="text-white/70 text-sm">Week of {formatDate(stats.week_start)}</span>
        </div>
        <h2 className="text-3xl font-bold text-white">Weekly Stats</h2>
        <p className="text-white/40 text-sm mt-1">Data resets every Monday</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((item, i) => (
          <motion.div 
            key={item.label} 
            initial={{opacity:0,y:20}} 
            whileInView={{opacity:1,y:0}} 
            transition={{delay:i*0.05}}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10 hover:border-[#AE0822]/30 transition-colors"
          >
            <p className="text-white/40 text-[10px] tracking-widest mb-2">{item.label}</p>
            <p className={`text-2xl md:text-3xl font-bold font-mono ${item.color}`}>{fmt(item.value)}</p>
          </motion.div>
        ))}
      </div>

      {stats.most_viewed_tweet && (
        <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} className="mt-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#AE0822] font-semibold text-sm flex items-center gap-2">
                🔥 Most Viewed Tweet
              </span>
              <span className="text-white/30 text-xs font-mono">{fmt(stats.most_viewed_tweet.views_count)} views</span>
            </div>
            <div className="flex items-start gap-3">
              <img 
                src={stats.most_viewed_tweet.profile_image_url || `https://ui-avatars.com/api/?name=${stats.most_viewed_tweet.name}&background=AE0822&color=fff`} 
                className="w-10 h-10 rounded-full" 
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white text-sm">{stats.most_viewed_tweet.name}</span>
                  <span className="text-white/40 text-xs font-mono">@{stats.most_viewed_tweet.username}</span>
                </div>
                <p className="text-white/70 text-sm line-clamp-2">{stats.most_viewed_tweet.text}</p>
                {stats.most_viewed_tweet.url && (
                  <a href={stats.most_viewed_tweet.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[#AE0822] text-xs hover:underline">
                    View Tweet <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}

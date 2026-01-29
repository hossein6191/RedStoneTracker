import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

export default function StatsSection({ stats, period }) {
  if (!stats) return null;

  const fmt = (n) => {
    if (!n) return '0';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  const labels = { '24h': '24 Hours', '7d': '7 Days', '15d': '15 Days', '30d': '30 Days' };

  const items = [
    { label: 'TWEETS', value: stats.total_tweets },
    { label: 'LIKES', value: stats.total_likes },
    { label: 'RETWEETS', value: stats.total_retweets },
    { label: 'REPLIES', value: stats.total_replies },
    { label: 'VIEWS', value: stats.total_views },
    { label: 'USERS', value: stats.unique_users }
  ];

  return (
    <section className="py-12">
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white">
          Stats for <span className="gradient-text">{labels[period]}</span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-5 text-center hover:scale-105 transition-transform"
          >
            <p className="text-white/40 text-[10px] tracking-widest mb-2">{item.label}</p>
            <p className="text-3xl font-bold gradient-text font-mono">{fmt(item.value)}</p>
          </motion.div>
        ))}
      </div>

      {stats.most_viewed_tweet && (
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="mt-8">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-rs-raspberry font-semibold text-sm">🔥 Most Viewed Tweet</span>
              <span className="text-white/30 text-xs font-mono">{fmt(stats.most_viewed_tweet.views_count)} views</span>
            </div>
            
            <div className="flex items-start gap-3">
              <img
                src={stats.most_viewed_tweet.profile_image_url || `https://ui-avatars.com/api/?name=${stats.most_viewed_tweet.name}&background=AE0822&color=fff`}
                alt=""
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white text-sm">{stats.most_viewed_tweet.name}</span>
                  <span className="text-white/40 text-xs font-mono">@{stats.most_viewed_tweet.username}</span>
                </div>
                <p className="text-white/70 text-sm line-clamp-2">{stats.most_viewed_tweet.text}</p>
                
                {stats.most_viewed_tweet.url && (
                  <a 
                    href={stats.most_viewed_tweet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-rs-raspberry text-xs hover:text-rs-red"
                  >
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

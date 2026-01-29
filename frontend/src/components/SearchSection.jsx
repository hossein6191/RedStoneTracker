import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, User, Loader2 } from 'lucide-react';

export default function SearchSection({ period, onUserClick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const click = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.length < 2) { setResults([]); setShow(false); return; }

    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&period=${period}`);
        const data = await res.json();
        if (data.success) { setResults(data.data || []); setShow(true); }
      } catch (e) {}
      setLoading(false);
    }, 300);
  }, [query, period]);

  const fmt = (n) => {
    if (!n) return '0';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
    return n.toString();
  };

  return (
    <section className="py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">🔍 Find Your Rank</h2>
        <p className="text-white/40 text-sm">Search any Twitter username</p>
      </motion.div>

      <div ref={ref} className="max-w-xl mx-auto relative">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShow(true)}
            placeholder="Enter username..."
            className="w-full pl-12 pr-12 py-4 glass-panel rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-rs-red/50"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); setShow(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {show && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 glass-card rounded-2xl overflow-hidden z-50 max-h-80 overflow-y-auto"
            >
              {results.map((u) => (
                <div
                  key={u.id}
                  onClick={() => { onUserClick?.(u.username); setShow(false); }}
                  className="p-4 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 flex items-center gap-3"
                >
                  {u.rank && (
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                      u.rank === 1 ? 'bg-yellow-500 text-yellow-900' :
                      u.rank === 2 ? 'bg-gray-400 text-gray-900' :
                      u.rank === 3 ? 'bg-amber-600 text-amber-100' :
                      u.rank <= 10 ? 'bg-rs-red text-white' :
                      'bg-white/10 text-white/60'
                    }`}>#{u.rank}</div>
                  )}
                  <img src={u.profile_image_url || `https://ui-avatars.com/api/?name=${u.name}&background=AE0822&color=fff`} alt="" className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate text-sm">{u.name}</p>
                    <p className="text-rs-raspberry text-xs font-mono">@{u.username}</p>
                  </div>
                  <div className="text-right text-xs font-mono shrink-0">
                    <p className="text-white">{fmt(u.total_views)} views</p>
                    <p className="text-white/40">{u.tweet_count || 0} tweets</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {show && query.length >= 2 && results.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 glass-card rounded-2xl p-8 text-center z-50"
            >
              <User className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">User not found</p>
              <p className="text-white/30 text-sm mt-1">This user hasn't tweeted about RedStone yet</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

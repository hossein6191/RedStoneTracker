import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, User, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function SearchSection({ onUserClick }) {
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
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) { setResults(data.data || []); setShow(true); }
      } catch (e) { console.error(e); }
      setLoading(false);
    }, 300);
  }, [query]);

  const fmt = (n) => !n ? '0' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n.toString();

  const handleClick = (username) => {
    setShow(false);
    setQuery('');
    onUserClick?.(username);
  };

  return (
    <section className="py-8">
      <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🔍 Find Your Rank</h2>
        <p className="text-white/40 text-sm">Search by username or display name</p>
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
            placeholder="Enter username or name..." 
            className="w-full pl-12 pr-12 py-4 bg-white/5 backdrop-blur-sm rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#AE0822]/50 border border-white/10" 
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
              initial={{opacity:0,y:10}} 
              animate={{opacity:1,y:0}} 
              exit={{opacity:0,y:10}} 
              className="absolute top-full left-0 right-0 mt-2 bg-[#1a0a0e]/95 backdrop-blur-xl rounded-2xl overflow-hidden z-50 max-h-80 overflow-y-auto border border-[#AE0822]/20"
            >
              {results.map((u) => (
                <div 
                  key={u.id} 
                  onClick={() => handleClick(u.username)} 
                  className="p-4 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {/* Rank badge */}
                    {u.has_tweets && u.rank ? (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        u.rank===1 ? 'bg-yellow-500 text-yellow-900' :
                        u.rank===2 ? 'bg-gray-400 text-gray-900' :
                        u.rank===3 ? 'bg-amber-700 text-amber-100' :
                        u.rank<=10 ? 'bg-[#AE0822] text-white' :
                        'bg-white/10 text-white/60'
                      }`}>#{u.rank}</div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/5">
                        {u.has_tweets ? <CheckCircle size={16} className="text-green-400" /> : <AlertCircle size={16} className="text-yellow-500" />}
                      </div>
                    )}
                    
                    <img src={u.profile_image_url || `https://ui-avatars.com/api/?name=${u.name}&background=AE0822&color=fff`} className="w-10 h-10 rounded-full shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{u.name}</p>
                      <p className="text-[#AE0822] text-xs font-mono">@{u.username}</p>
                    </div>
                    
                    <div className="text-right text-xs shrink-0">
                      {u.has_tweets ? (
                        <>
                          <p className="text-white font-mono">{fmt(u.total_views)} views</p>
                          <p className="text-white/40">{u.tweet_count} tweets</p>
                        </>
                      ) : (
                        <p className="text-yellow-500">No tweets</p>
                      )}
                    </div>
                  </div>
                  
                  {!u.has_tweets && (
                    <p className="text-yellow-500/70 text-[10px] mt-2 pl-[52px]">
                      ⚠️ No RedStone tweets this week
                    </p>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {show && query.length >= 2 && results.length === 0 && !loading && (
            <motion.div 
              initial={{opacity:0,y:10}} 
              animate={{opacity:1,y:0}} 
              exit={{opacity:0,y:10}} 
              className="absolute top-full left-0 right-0 mt-2 bg-[#1a0a0e]/95 backdrop-blur-xl rounded-2xl p-8 text-center z-50 border border-white/10"
            >
              <User className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 font-medium">User not found</p>
              <p className="text-white/30 text-sm mt-1">Try searching by Twitter username</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

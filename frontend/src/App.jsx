import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import StatsSection from './components/StatsSection';
import SearchSection from './components/SearchSection';
import LeaderboardSection from './components/LeaderboardSection';
import UserModal from './components/UserModal';
import Footer from './components/Footer';
import AnimatedBackground from './components/AnimatedBackground';

const PERIODS = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '15d', label: '15 Days' },
  { value: '30d', label: '30 Days' }
];

export default function App() {
  const [stats, setStats] = useState(null);
  const [top3, setTop3] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchData = useCallback(async (p = period) => {
    try {
      const [s, t, l] = await Promise.all([
        fetch(`/api/stats?period=${p}`).then(r => r.json()),
        fetch(`/api/top3?period=${p}`).then(r => r.json()),
        fetch(`/api/leaderboard?period=${p}&limit=200`).then(r => r.json())
      ]);
      if (s.success) { setStats(s.data); setLastUpdated(s.data.last_updated); }
      if (t.success) setTop3(t.data);
      if (l.success) setLeaderboard(l.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, []);

  const changePeriod = (p) => {
    setPeriod(p);
    setLoading(true);
    fetchData(p);
  };

  const openUser = async (username) => {
    const res = await fetch(`/api/user/${username}?period=${period}`);
    const data = await res.json();
    if (data.success) setSelectedUser(data.data);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10">
        <Header lastUpdated={lastUpdated} />
        
        <main className="container mx-auto px-4 pb-20 max-w-7xl">
          {/* Period Selector */}
          <div className="flex justify-center py-8">
            <div className="glass-panel rounded-2xl p-1.5 flex gap-1">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => changePeriod(p.value)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    period === p.value 
                      ? 'bg-gradient-to-r from-rs-red to-rs-red-light text-white shadow-lg' 
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center items-center min-h-[50vh]"
              >
                <div className="w-12 h-12 border-4 border-rs-red/20 border-t-rs-red rounded-full animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-20"
              >
                <HeroSection top3={top3} onUserClick={openUser} />
                <StatsSection stats={stats} period={period} />
                <SearchSection period={period} onUserClick={openUser} />
                <LeaderboardSection leaderboard={leaderboard} onUserClick={openUser} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <Footer />
      </div>

      <AnimatePresence>
        {selectedUser && <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
      </AnimatePresence>
    </div>
  );
}

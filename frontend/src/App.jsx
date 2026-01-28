import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import StatsSection from './components/StatsSection';
import SearchSection from './components/SearchSection';
import LeaderboardSection from './components/LeaderboardSection';
import UserModal from './components/UserModal';
import Footer from './components/Footer';
import Particles from './components/Particles';

const PERIODS = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '15d', label: '15D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'All' }
];

export default function App() {
  const [stats, setStats] = useState(null);
  const [top3, setTop3] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchData = useCallback(async (selectedPeriod = period) => {
    try {
      const [statsRes, top3Res, lbRes] = await Promise.all([
        fetch(`/api/stats?period=${selectedPeriod}`),
        fetch(`/api/top3?period=${selectedPeriod}`),
        fetch(`/api/leaderboard?period=${selectedPeriod}&limit=100`)
      ]);

      const [statsData, top3Data, lbData] = await Promise.all([
        statsRes.json(),
        top3Res.json(),
        lbRes.json()
      ]);

      if (statsData.success) {
        setStats(statsData.data);
        setLastUpdated(statsData.data.last_updated);
      }
      if (top3Data.success) setTop3(top3Data.data);
      if (lbData.success) setLeaderboard(lbData.data);
      
      setError(null);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, []);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setLoading(true);
    fetchData(newPeriod);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUserClick = async (username) => {
    try {
      const res = await fetch(`/api/user/${username}?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setSelectedUser(data.data);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0d0d12]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(174,8,34,0.08),transparent_60%)]" />
      <div className="noise-overlay" />
      <Particles />

      <div className="relative z-10">
        <Header 
          onRefresh={handleRefresh} 
          refreshing={refreshing}
          lastUpdated={lastUpdated}
        />
        
        <main className="container mx-auto px-4 pb-20 max-w-7xl">
          {/* Period Selector */}
          <div className="flex justify-center py-6">
            <div className="glass-panel rounded-2xl p-1.5 flex gap-1">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => handlePeriodChange(p.value)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    period === p.value 
                      ? 'bg-gradient-to-r from-rs-red to-rs-red-light text-white shadow-lg shadow-rs-red/30' 
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
              <LoadingState key="loading" />
            ) : error ? (
              <ErrorState key="error" message={error} onRetry={() => fetchData()} />
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-20"
              >
                <HeroSection top3={top3} period={period} onUserClick={handleUserClick} />
                <StatsSection stats={stats} period={period} />
                <SearchSection period={period} onUserClick={handleUserClick} />
                <LeaderboardSection leaderboard={leaderboard} period={period} onUserClick={handleUserClick} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <Footer />
      </div>

      <AnimatePresence>
        {selectedUser && (
          <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
    >
      <div className="relative">
        <div className="w-16 h-16 border-4 border-rs-red/20 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-rs-red rounded-full animate-spin" />
      </div>
      <p className="text-white/40 text-sm">Loading...</p>
    </motion.div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
    >
      <p className="text-white/50">{message}</p>
      <button onClick={onRetry} className="btn-primary">Try Again</button>
    </motion.div>
  );
}

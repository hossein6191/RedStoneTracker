import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import PriceBar from './components/PriceBar';
import HeroSection from './components/HeroSection';
import StatsSection from './components/StatsSection';
import SearchSection from './components/SearchSection';
import LeaderboardSection from './components/LeaderboardSection';
import UserModal from './components/UserModal';
import Footer from './components/Footer';
import HexBackground from './components/HexBackground';

export default function App() {
  const [stats, setStats] = useState(null);
  const [top3, setTop3] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [s, t, l, p] = await Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/top3').then(r => r.json()),
        fetch('/api/leaderboard').then(r => r.json()),
        fetch('/api/price').then(r => r.json())
      ]);
      if (s.success) setStats(s.data);
      if (t.success) setTop3(t.data);
      if (l.success) setLeaderboard(l.data);
      if (p.success) setPrice(p.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(async () => {
      const p = await fetch('/api/price').then(r => r.json());
      if (p.success) setPrice(p.data);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const openUser = async (username) => {
    try {
      const res = await fetch(`/api/user/${username}`);
      const data = await res.json();
      if (data.success) setSelectedUser(data.data);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0408]">
      <HexBackground />
      <div className="relative z-10">
        <Header />
        <PriceBar price={price} />
        
        <main className="container mx-auto px-4 pb-20 max-w-7xl">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="load" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex justify-center items-center min-h-[60vh]">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-[#AE0822]/20 border-t-[#AE0822] rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/50">Loading data...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="content" initial={{opacity:0}} animate={{opacity:1}} className="space-y-16">
                <HeroSection top3={top3} onUserClick={openUser} />
                <StatsSection stats={stats} />
                <SearchSection onUserClick={openUser} />
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

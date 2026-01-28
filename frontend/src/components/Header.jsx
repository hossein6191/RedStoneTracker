import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Menu, X } from 'lucide-react';

export default function Header({ onRefresh, refreshing, lastUpdated }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/5">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-rs-red/20 flex items-center justify-center">
              <img 
                src="/redstone-logo.png" 
                alt="RedStone" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '🔴';
                }}
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white">RedStone Tracker</h1>
              <p className="text-[10px] text-white/30 font-mono">Community Analytics</p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="hidden md:block text-xs text-white/30 font-mono">
                Updated: {formatDate(lastUpdated)}
              </span>
            )}
            
            <motion.button
              onClick={onRefresh}
              disabled={refreshing}
              className="btn-glass px-4 py-2 flex items-center gap-2 text-sm"
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}

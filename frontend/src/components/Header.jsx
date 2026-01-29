export default function Header({ lastUpdated }) {
  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/5">
      <div className="container mx-auto px-4 max-w-7xl h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-rs-red/20 flex items-center justify-center">
            <img src="/redstone-logo.png" alt="RS" className="w-8 h-8 object-contain" onError={(e) => e.target.outerHTML = '🔴'} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">RedStone Tracker</h1>
            <p className="text-[10px] text-white/30 font-mono">Community Analytics</p>
          </div>
        </div>

        {lastUpdated && (
          <div className="text-xs text-white/30 font-mono">
            Updated: {formatDate(lastUpdated)}
          </div>
        )}
      </div>
    </header>
  );
}

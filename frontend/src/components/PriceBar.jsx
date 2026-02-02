import { TrendingUp, TrendingDown } from 'lucide-react';

export default function PriceBar({ price }) {
  if (!price) return null;

  const isUp = price.change_24h >= 0;

  return (
    <div className="bg-[#AE0822]/10 border-b border-[#AE0822]/20">
      <div className="container mx-auto px-4 max-w-7xl py-2 flex items-center justify-center gap-4 text-sm">
        <span className="text-white/60">RED Price:</span>
        <span className="text-white font-bold font-mono">${price.usd?.toFixed(4) || '0.00'}</span>
        <span className={`flex items-center gap-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(price.change_24h || 0).toFixed(2)}%
        </span>
        <span className="text-white/30 text-xs">• Live from CoinGecko</span>
      </div>
    </div>
  );
}

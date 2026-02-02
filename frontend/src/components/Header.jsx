import { Hexagon } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#0a0408]/80 backdrop-blur-xl border-b border-[#AE0822]/20">
      <div className="container mx-auto px-4 max-w-7xl h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#AE0822]/20 flex items-center justify-center">
            <Hexagon className="w-6 h-6 text-[#AE0822]" fill="#AE0822" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">RedStone Tracker</h1>
            <p className="text-[10px] text-white/40">Weekly Community Stats</p>
          </div>
        </div>

        <a 
          href="https://app.eigenlayer.xyz/token/0xc43c6bfeda065fe2c4c11765bf838789bd0bb5de"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-gradient-to-r from-[#AE0822] to-[#E41939] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Hexagon className="w-4 h-4" />
          Stake RED
        </a>
      </div>
    </header>
  );
}

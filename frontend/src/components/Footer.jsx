import { Heart, ExternalLink } from 'lucide-react';

const LINKS = [
  { name: 'Website', url: 'https://redstone.finance' },
  { name: 'Twitter', url: 'https://twitter.com/redstone_defi' },
  { name: 'Discord', url: 'https://discord.gg/redstone' },
  { name: 'Docs', url: 'https://docs.redstone.finance' },
  { name: 'GitHub', url: 'https://github.com/redstone-finance' },
];

export default function Footer() {
  return (
    <footer className="border-t border-[#AE0822]/20 mt-16 bg-[#0a0408]/80">
      <div className="container mx-auto px-4 max-w-7xl py-10">

        {/* Official Links */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {LINKS.map(link => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/5 hover:bg-[#AE0822]/20 rounded-xl text-white/70 hover:text-white text-sm flex items-center gap-2 transition-colors border border-white/10 hover:border-[#AE0822]/30"
            >
              {link.name}
              <ExternalLink size={12} />
            </a>
          ))}
        </div>

        {/* RedStone branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#AE0822]/10 rounded-2xl border border-[#AE0822]/30">
            <img
              src="/redstone-logo.png.png"
              alt="RedStone"
              className="w-8 h-8 object-contain"
            />
            <div className="text-left">
              <p className="text-white font-bold">RedStone</p>
              <p className="text-white/50 text-xs">Modular Oracle for DeFi</p>
            </div>
          </div>
        </div>

        {/* Made by */}
        <a 
  href="https://x.com/HossseinRezaei"
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center gap-2 hover:opacity-90"
>
  <img
    src="/hellish-logo.jpg.jpg"
    alt="Hellish"
    className="w-5 h-5 rounded-full object-contain"
  />
  <span className="text-[#AE0822] font-semibold">
    Hellish
  </span>
</a>
  );
}

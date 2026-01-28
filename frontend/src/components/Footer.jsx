import { Heart, Code2, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-16">
      <div className="container mx-auto px-4 max-w-7xl py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Made By */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel">
            <Code2 size={14} className="text-rs-red" />
            <span className="text-white/50 text-sm">Made with</span>
            <Heart size={14} className="text-rs-red" fill="currentColor" />
            <span className="text-white/50 text-sm">by</span>
            <a 
              href="https://x.com/HossseinRezaei" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-rs-raspberry hover:text-rs-red font-semibold"
            >
              <img 
                src="/hellish-logo.png" 
                alt="Hellish" 
                className="w-5 h-5 rounded-full"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              Hellish
              <Sparkles size={12} className="text-yellow-500" />
            </a>
          </div>

          <p className="text-white/20 text-xs font-mono">
            🔴 RedStone • Modular Oracle for DeFi
          </p>
        </div>
      </div>
    </footer>
  );
}

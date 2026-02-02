export default function HexBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a0e] via-[#0a0408] to-[#0a0408]" />
      
      {/* Red glow top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#AE0822] opacity-20 blur-[150px] rounded-full" />
      
      {/* Hexagon grid */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
            <path d="M28 0 L56 14 L56 42 L28 56 L0 42 L0 14 Z" fill="none" stroke="#AE0822" strokeWidth="0.5" />
            <path d="M28 44 L56 58 L56 86 L28 100 L0 86 L0 58 Z" fill="none" stroke="#AE0822" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)" />
      </svg>
      
      {/* Center hexagon glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg width="400" height="400" viewBox="0 0 400 400" className="opacity-30">
          <defs>
            <radialGradient id="hexGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#AE0822" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#AE0822" stopOpacity="0" />
            </radialGradient>
          </defs>
          <polygon 
            points="200,50 350,125 350,275 200,350 50,275 50,125" 
            fill="url(#hexGlow)" 
            stroke="#AE0822" 
            strokeWidth="1"
          />
        </svg>
      </div>
      
      {/* Animated particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#AE0822] rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.5 + 0.2
            }}
          />
        ))}
      </div>
    </div>
  );
}

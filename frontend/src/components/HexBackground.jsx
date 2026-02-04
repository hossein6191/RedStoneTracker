import { useState, useEffect, useCallback } from 'react';

export default function HexBackground() {
  const [logos, setLogos] = useState([]);
  const [pops, setPops] = useState([]);

  // Create floating logo
  const createLogo = useCallback(() => {
    const id = Date.now() + Math.random();
    const fromTop = Math.random() > 0.5;
    
    return {
      id,
      x: Math.random() * 90 + 5, // 5-95%
      y: fromTop ? -10 : 110,
      direction: fromTop ? 1 : -1,
      speed: Math.random() * 0.3 + 0.2,
      size: Math.random() * 20 + 25, // 25-45px
      opacity: Math.random() * 0.3 + 0.15,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 2
    };
  }, []);

  // Initialize logos
  useEffect(() => {
    const initial = Array.from({ length: 12 }, createLogo).map((logo, i) => ({
      ...logo,
      y: Math.random() * 100 // Spread across screen initially
    }));
    setLogos(initial);
  }, [createLogo]);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setLogos(prev => {
        let updated = prev.map(logo => ({
          ...logo,
          y: logo.y + (logo.speed * logo.direction),
          rotation: logo.rotation + logo.rotationSpeed
        })).filter(logo => logo.y > -15 && logo.y < 115);

        // Add new logos if needed
        while (updated.length < 12) {
          updated.push(createLogo());
        }

        return updated;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [createLogo]);

  // Remove pop after animation
  useEffect(() => {
    if (pops.length > 0) {
      const timer = setTimeout(() => {
        setPops(prev => prev.slice(1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pops]);

  // Handle logo click
  const handlePop = (logo, e) => {
    e.stopPropagation();
    
    // Add pop effect
    setPops(prev => [...prev, {
      id: logo.id,
      x: logo.x,
      y: logo.y
    }]);

    // Remove clicked logo
    setLogos(prev => prev.filter(l => l.id !== logo.id));
  };

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a0e] via-[#0a0408] to-[#0f0507]" />
      
      {/* Subtle red glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#AE0822] opacity-10 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] bg-[#AE0822] opacity-5 blur-[100px] rounded-full" />
      
      {/* Floating logos */}
      {logos.map(logo => (
        <div
          key={logo.id}
          className="absolute cursor-pointer pointer-events-auto transition-transform hover:scale-125"
          style={{
            left: `${logo.x}%`,
            top: `${logo.y}%`,
            width: logo.size,
            height: logo.size,
            opacity: logo.opacity,
            transform: `rotate(${logo.rotation}deg)`,
          }}
          onClick={(e) => handlePop(logo, e)}
        >
          <img
            src="/redstone-logo.png.png"
            alt=""
            className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(174,8,34,0.5)]"
            draggable={false}
          />
        </div>
      ))}

      {/* Pop effects */}
      {pops.map(pop => (
        <div
          key={pop.id}
          className="absolute pointer-events-none"
          style={{
            left: `${pop.x}%`,
            top: `${pop.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Burst particles */}
          <div className="relative">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-[#AE0822] rounded-full animate-ping"
                style={{
                  animation: 'burst 0.6s ease-out forwards',
                  transform: `rotate(${i * 45}deg) translateX(20px)`,
                }}
              />
            ))}
          </div>
          
          {/* Gminers text */}
          <div 
            className="absolute text-[#AE0822] font-bold text-lg whitespace-nowrap"
            style={{
              animation: 'popText 1s ease-out forwards',
              textShadow: '0 0 20px rgba(174,8,34,0.8)',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            Gminers ⛏️
          </div>
        </div>
      ))}

      {/* CSS animations */}
      <style>{`
        @keyframes burst {
          0% {
            opacity: 1;
            transform: rotate(var(--rotate, 0deg)) translateX(0);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--rotate, 0deg)) translateX(50px);
          }
        }
        
        @keyframes popText {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(0) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translateX(-50%) translateY(-10px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-40px) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

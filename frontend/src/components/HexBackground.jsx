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
      x: Math.random() * 85 + 5,
      y: fromTop ? -10 : 110,
      direction: fromTop ? 1 : -1,
      speed: Math.random() * 0.3 + 0.2,
      size: Math.random() * 20 + 30,
      opacity: Math.random() * 0.3 + 0.2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 2
    };
  }, []);

  // Initialize logos
  useEffect(() => {
    const initial = Array.from({ length: 12 }, () => ({
      ...createLogo(),
      y: Math.random() * 100
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

        while (updated.length < 12) {
          updated.push(createLogo());
        }

        return updated;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [createLogo]);

  // Handle logo click - POP!
  const handlePop = (logo) => {
    // Add pop effect at logo position
    const newPop = {
      id: Date.now(),
      x: logo.x,
      y: logo.y
    };
    setPops(prev => [...prev, newPop]);

    // Remove clicked logo
    setLogos(prev => prev.filter(l => l.id !== logo.id));

    // Remove pop after 1.5 seconds
    setTimeout(() => {
      setPops(prev => prev.filter(p => p.id !== newPop.id));
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a0e] via-[#0a0408] to-[#0f0507]" />
      
      {/* Subtle red glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#AE0822] opacity-10 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] bg-[#AE0822] opacity-5 blur-[100px] rounded-full" />
      
      {/* Floating logos */}
      {logos.map(logo => (
        <div
          key={logo.id}
          onClick={() => handlePop(logo)}
          className="absolute cursor-pointer hover:scale-150 transition-transform duration-200"
          style={{
            left: `${logo.x}%`,
            top: `${logo.y}%`,
            width: logo.size,
            height: logo.size,
            opacity: logo.opacity,
            transform: `rotate(${logo.rotation}deg)`,
            zIndex: 5
          }}
        >
          <img
            src="/redstone-logo.png.png"
            alt=""
            className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(174,8,34,0.5)]"
            draggable={false}
            style={{ pointerEvents: 'none' }}
          />
        </div>
      ))}

      {/* Pop effects with Gminers text */}
      {pops.map(pop => (
        <div
          key={pop.id}
          className="absolute z-50"
          style={{
            left: `${pop.x}%`,
            top: `${pop.y}%`,
          }}
        >
          {/* Particles */}
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="absolute w-3 h-3 bg-[#AE0822] rounded-full"
              style={{
                animation: `particle-${i} 0.8s ease-out forwards`,
              }}
            />
          ))}
          
          {/* Gminers text */}
          <div 
            className="absolute left-1/2 text-2xl font-bold whitespace-nowrap z-50"
            style={{
              color: '#AE0822',
              textShadow: '0 0 20px #AE0822, 0 0 40px #AE0822',
              animation: 'gminers-pop 1.2s ease-out forwards',
            }}
          >
            Gminers ⛏️
          </div>
        </div>
      ))}

      {/* Animations */}
      <style>{`
        @keyframes particle-0 { 0% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(40px, -40px); } }
        @keyframes particle-1 { 0% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(50px, 0); } }
        @keyframes particle-2 { 0% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(40px, 40px); } }
        @keyframes particle-3 { 0% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(0, 50px); } }
        @keyframes particle-4 { 0% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(-40px, 40px); } }
        @keyframes particle-5 { 0% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(-50px, 0); } }
        @keyframes particle-6 { 0% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(-40px, -40px); } }
        @keyframes particle-7 { 0% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(0, -50px); } }
        
        @keyframes gminers-pop {
          0% { 
            opacity: 0; 
            transform: translateX(-50%) translateY(0) scale(0.3);
          }
          15% { 
            opacity: 1; 
            transform: translateX(-50%) translateY(-20px) scale(1.3);
          }
          30% {
            transform: translateX(-50%) translateY(-25px) scale(1);
          }
          100% { 
            opacity: 0; 
            transform: translateX(-50%) translateY(-60px) scale(0.8);
          }
        }
      `}</style>
    </div>
  );
}

import React, { useMemo } from 'react';

/**
 * LobbyDustMotes: Museum Light Dust Motes (Hạt bụi ánh sáng bảo tàng).
 * Simulates gentle golden dust particles drifting peacefully in the ambient hall light.
 */
export function LobbyDustMotes() {
  const motes = useMemo(() => {
    const list = [];
    let seed = 38419;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // 44 ambient dust motes scattered across the museum hall
    for (let i = 0; i < 44; i++) {
      const x = +(rng() * 96 + 2).toFixed(2);
      const y = +(rng() * 86 + 6).toFixed(2);
      const isSoftGlow = rng() < 0.35; // 35% are soft diffused orbs with subtle bokeh blur
      const size = isSoftGlow ? +(rng() * 3.5 + 4).toFixed(1) : +(rng() * 2.2 + 2).toFixed(1);
      const duration = +(rng() * 8 + 12).toFixed(2); // 12s to 20s for ultra-smooth calm drift
      const delay = +(rng() * 18).toFixed(2);
      const maxOpacity = +(rng() * 0.35 + 0.35).toFixed(2); // 0.35 to 0.70
      const dx1 = +(rng() * 32 - 16).toFixed(1);
      const dy1 = -(+(rng() * 25 + 30).toFixed(1));
      const dx2 = +(rng() * 36 - 18).toFixed(1);
      const dy2 = -(+(rng() * 30 + 65).toFixed(1));
      const dx3 = +(rng() * 26 - 13).toFixed(1);
      const dy3 = -(+(rng() * 30 + 105).toFixed(1));

      list.push({
        id: i,
        x,
        y,
        isSoftGlow,
        size,
        duration,
        delay,
        maxOpacity,
        dx1,
        dy1,
        dx2,
        dy2,
        dx3,
        dy3,
      });
    }
    return list;
  }, []);

  return (
    <div
      className="lobby-dust-motes-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 2,
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes museumDustMoteFloat {
          0% {
            transform: translate3d(0, 0, 0) scale(0.65);
            opacity: 0;
          }
          20% {
            opacity: var(--m-op, 0.5);
          }
          50% {
            transform: translate3d(var(--m-dx1, 14px), var(--m-dy1, -40px), 0) scale(1.15);
            opacity: var(--m-op, 0.5);
          }
          80% {
            opacity: calc(var(--m-op, 0.5) * 0.75);
          }
          100% {
            transform: translate3d(var(--m-dx2, -10px), var(--m-dy2, -90px), 0) scale(0.6);
            opacity: 0;
          }
        }
      `}</style>

      {motes.map((m) => (
        <span
          key={m.id}
          style={{
            position: 'absolute',
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: `${m.size}px`,
            height: `${m.size}px`,
            borderRadius: '50%',
            display: 'block',
            pointerEvents: 'none',
            '--m-op': m.maxOpacity,
            '--m-dx1': `${m.dx1}px`,
            '--m-dy1': `${m.dy1}px`,
            '--m-dx2': `${m.dx2}px`,
            '--m-dy2': `${m.dy2}px`,
            background: m.isSoftGlow
              ? 'radial-gradient(circle, rgba(255, 238, 175, 0.95) 0%, rgba(230, 190, 110, 0.5) 45%, rgba(212, 176, 106, 0) 75%)'
              : 'radial-gradient(circle, #FFFBEB 0%, #F6C844 50%, rgba(212, 176, 106, 0) 80%)',
            boxShadow: m.isSoftGlow
              ? '0 0 10px 2px rgba(245, 205, 110, 0.55)'
              : '0 0 6px 1.5px rgba(255, 225, 140, 0.75)',
            filter: m.isSoftGlow ? 'blur(0.8px)' : 'none',
            animation: `museumDustMoteFloat ${m.duration}s cubic-bezier(0.25, 1, 0.5, 1) infinite`,
            animationDelay: `-${m.delay}s`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}

export default LobbyDustMotes;


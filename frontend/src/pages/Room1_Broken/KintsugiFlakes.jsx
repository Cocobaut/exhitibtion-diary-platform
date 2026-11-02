import React, { useMemo } from 'react';

/**
 * KintsugiFlakes: Floating gold flakes & shimmering dust particles for Room 1 (Broken Pieces Exhibition).
 * Evokes the ancient Japanese art of Kintsugi (金継ぎ) - repairing fractures with precious gold.
 */
export function KintsugiFlakes() {
  const flakes = useMemo(() => {
    const list = [];
    let seed = 73921;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Generate 52 floating Kintsugi flakes across the exhibition space
    for (let i = 0; i < 52; i++) {
      const x = +(rng() * 96 + 2).toFixed(2);
      const y = +(rng() * 88 + 4).toFixed(2);
      const isShard = rng() < 0.42; // 42% are geometric gold leaf shards, 58% are soft gold dust specks
      const size = isShard ? +(rng() * 4.5 + 4).toFixed(1) : +(rng() * 2.8 + 2).toFixed(1);
      const duration = +(rng() * 7 + 10).toFixed(2); // 10s to 17s
      const delay = +(rng() * 14).toFixed(2);
      const maxOpacity = +(rng() * 0.35 + 0.45).toFixed(2); // 0.45 to 0.8
      const dx1 = +(rng() * 32 - 16).toFixed(1);
      const dy1 = +(rng() * 25 + 30).toFixed(1);
      const dx2 = +(rng() * 36 - 18).toFixed(1);
      const dy2 = +(rng() * 35 + 65).toFixed(1);
      const dx3 = +(rng() * 28 - 14).toFixed(1);
      const dy3 = +(rng() * 30 + 105).toFixed(1);
      const rot1 = Math.round(rng() * 120 + 40);
      const rot2 = Math.round(rng() * 160 + 160);
      const rot3 = Math.round(rng() * 120 + 320);

      list.push({
        id: i,
        x,
        y,
        isShard,
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
        rot1,
        rot2,
        rot3,
      });
    }
    return list;
  }, []);

  return (
    <div
      className="kintsugi-flakes-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 1,
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes kintsugiFlakeDrift {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(0.65);
            opacity: 0;
          }
          18% {
            opacity: var(--k-op, 0.7);
          }
          45% {
            transform: translate3d(var(--k-dx1, 16px), var(--k-dy1, 40px), 0) rotate(var(--k-rot1, 110deg)) scale(1.08);
            opacity: var(--k-op, 0.7);
          }
          75% {
            transform: translate3d(var(--k-dx2, -18px), var(--k-dy2, 80px), 0) rotate(var(--k-rot2, 230deg)) scale(0.95);
            opacity: calc(var(--k-op, 0.7) * 0.75);
          }
          100% {
            transform: translate3d(var(--k-dx3, 12px), var(--k-dy3, 120px), 0) rotate(var(--k-rot3, 360deg)) scale(0.55);
            opacity: 0;
          }
        }
      `}</style>

      {flakes.map((f) => (
        <span
          key={f.id}
          style={{
            position: 'absolute',
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            display: 'inline-block',
            pointerEvents: 'none',
            '--k-op': f.maxOpacity,
            '--k-dx1': `${f.dx1}px`,
            '--k-dy1': `${f.dy1}px`,
            '--k-dx2': `${f.dx2}px`,
            '--k-dy2': `${f.dy2}px`,
            '--k-dx3': `${f.dx3}px`,
            '--k-dy3': `${f.dy3}px`,
            '--k-rot1': `${f.rot1}deg`,
            '--k-rot2': `${f.rot2}deg`,
            '--k-rot3': `${f.rot3}deg`,
            animation: `kintsugiFlakeDrift ${f.duration}s cubic-bezier(0.25, 1, 0.5, 1) infinite`,
            animationDelay: `-${f.delay}s`,
            willChange: 'transform, opacity',
          }}
        >
          {f.isShard ? (
            <span
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #FFF8DC 0%, #F6C844 38%, #D49B24 72%, #8A5F08 100%)',
                clipPath: 'polygon(50% 0%, 100% 42%, 62% 100%, 0% 58%)',
                boxShadow: '0 0 6px 1px rgba(245, 199, 66, 0.65)',
                filter: 'drop-shadow(0 0 3px rgba(245, 199, 66, 0.75))',
              }}
            />
          ) : (
            <span
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #FFFBEB 0%, #F5C542 42%, rgba(212, 176, 106, 0) 78%)',
                boxShadow: '0 0 7px 1.5px rgba(245, 205, 90, 0.85)',
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}

export default KintsugiFlakes;


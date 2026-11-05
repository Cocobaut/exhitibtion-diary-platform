import React, { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * NotebookDustMotes: Golden Dust Motes & Star Particles (Hạt bụi vàng sổ tay kỷ vật).
 * Simulates delicate golden dust particles drifting peacefully in the notebook archive.
 */
export function NotebookDustMotes() {
  const { theme } = useTheme();
  const isPaper = theme === 'paper';

  const motes = useMemo(() => {
    const list = [];
    let seed = 74921;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // 38 ambient golden dust motes
    for (let i = 0; i < 38; i++) {
      const x = +(rng() * 96 + 2).toFixed(2);
      const y = +(rng() * 88 + 4).toFixed(2);
      const isGlowOrb = rng() < 0.38; // 38% are soft golden bokeh glowing orbs
      const size = isGlowOrb ? +(rng() * 3 + 3.5).toFixed(1) : +(rng() * 2 + 1.8).toFixed(1);
      const duration = +(rng() * 8 + 11).toFixed(2); // 11s to 19s smooth floating
      const delay = +(rng() * 14).toFixed(2);
      const maxOpacity = +(rng() * 0.4 + 0.35).toFixed(2); // 0.35 to 0.75
      const dx1 = +(rng() * 28 - 14).toFixed(1);
      const dy1 = -(+(rng() * 22 + 25).toFixed(1));
      const dx2 = +(rng() * 32 - 16).toFixed(1);
      const dy2 = -(+(rng() * 28 + 55).toFixed(1));
      const dx3 = +(rng() * 24 - 12).toFixed(1);
      const dy3 = -(+(rng() * 26 + 90).toFixed(1));

      list.push({
        id: i,
        x,
        y,
        isGlowOrb,
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
      className="notebook-dust-motes-layer"
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
        @keyframes notebookGoldenMoteFloat {
          0% {
            transform: translate3d(0, 0, 0) scale(0.65);
            opacity: 0;
          }
          18% {
            opacity: var(--nb-op, 0.55);
          }
          50% {
            transform: translate3d(var(--nb-dx1, 12px), var(--nb-dy1, -35px), 0) scale(1.18);
            opacity: var(--nb-op, 0.55);
          }
          75% {
            transform: translate3d(var(--nb-dx2, -8px), var(--nb-dy2, -65px), 0) scale(0.95);
            opacity: calc(var(--nb-op, 0.55) * 0.75);
          }
          100% {
            transform: translate3d(var(--nb-dx3, 6px), var(--nb-dy3, -95px), 0) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>

      {motes.map((m) => {
        const bg = isPaper
          ? m.isGlowOrb
            ? 'radial-gradient(circle, rgba(184, 137, 58, 0.85) 0%, rgba(184, 137, 58, 0.35) 45%, rgba(184, 137, 58, 0) 75%)'
            : 'radial-gradient(circle, #B8893A 0%, rgba(184, 137, 58, 0.4) 55%, rgba(184, 137, 58, 0) 80%)'
          : m.isGlowOrb
            ? 'radial-gradient(circle, rgba(255, 230, 150, 0.95) 0%, rgba(217, 168, 62, 0.55) 45%, rgba(217, 168, 62, 0) 75%)'
            : 'radial-gradient(circle, #FFE494 0%, #D4A838 55%, rgba(201, 154, 59, 0) 80%)';

        const shadow = isPaper
          ? '0 0 4px rgba(184, 137, 58, 0.4)'
          : '0 0 6px rgba(255, 225, 135, 0.75), 0 0 12px rgba(217, 168, 62, 0.4)';

        return (
          <span
            key={m.id}
            style={{
              position: 'absolute',
              left: `${m.x}%`,
              top: `${m.y}%`,
              width: `${m.size}px`,
              height: `${m.size}px`,
              borderRadius: '50%',
              background: bg,
              boxShadow: shadow,
              filter: m.isGlowOrb ? 'blur(0.4px)' : 'none',
              animation: `notebookGoldenMoteFloat ${m.duration}s cubic-bezier(0.25, 1, 0.5, 1) infinite`,
              animationDelay: `${m.delay}s`,
              '--nb-op': m.maxOpacity,
              '--nb-dx1': `${m.dx1}px`,
              '--nb-dy1': `${m.dy1}px`,
              '--nb-dx2': `${m.dx2}px`,
              '--nb-dy2': `${m.dy2}px`,
              '--nb-dx3': `${m.dx3}px`,
              '--nb-dy3': `${m.dy3}px`,
              willChange: 'transform, opacity',
            }}
          />
        );
      })}
    </div>
  );
}

export default NotebookDustMotes;


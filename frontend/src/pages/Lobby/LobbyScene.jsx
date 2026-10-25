import React, { useId } from 'react';
import { rng, f } from '../../utils/rng';
import { CATS, CAT_KEYS } from '../../data/mockData';

export const DOORS = [260, 682, 1104];
export const arch = (x, rad = 105) => `M${x - rad} 650 V335 A${rad} ${rad} 0 0 1 ${x + rad} 335 V650 Z`;

export function LobbyScene({ onDoorClick, onMailboxClick, onBenchClick }) {
  const compId = useId().replace(/:/g, '');
  const id = `lb_${compId}_`;
  const r = rng(31);

  // Door 1 inner
  const d1Inner = (
    <>
      <rect x={DOORS[0] - 110} y="220" width="220" height="440" fill={`url(#${id}d1)`} />
      <rect x={DOORS[0] - 110} y="585" width="220" height="70" fill="#B48A60" />
      {[
        [-72, 380, 46, 36, "#7E8A6E"],
        [-14, 360, 32, 48, "#A1342C"],
        [32, 388, 44, 32, "#45606E"]
      ].map(([dx, y, w, h, c], idx) => (
        <React.Fragment key={idx}>
          <rect x={DOORS[0] + dx - 3} y={y - 3} width={w + 6} height={h + 6} fill="#3E302B" />
          <rect x={DOORS[0] + dx} y={y} width={w} height={h} fill={c} />
        </React.Fragment>
      ))}
    </>
  );

  // Door 2 inner
  const d2Circles = [];
  for (let k = 0; k < 12; k++) {
    const lx = DOORS[1] - 85 + r() * 170;
    const ly = 260 + r() * 300;
    d2Circles.push(
      <React.Fragment key={k}>
        <circle cx={f(lx)} cy={f(ly)} r="10" fill="#FFC774" opacity="0.25" />
        <circle cx={f(lx)} cy={f(ly)} r={f(2.5 + r() * 2)} fill="#FFE3A8" />
      </React.Fragment>
    );
  }
  const d2Inner = (
    <>
      <rect x={DOORS[1] - 110} y="220" width="220" height="440" fill={`url(#${id}d2)`} />
      {d2Circles}
      <path d={`M${DOORS[1] - 110} 640 Q${DOORS[1]} 600 ${DOORS[1] + 110} 630 V660 H${DOORS[1] - 110}Z`} fill="#2A1214" />
    </>
  );

  // Door 3 inner
  const d3Circles = [];
  for (let k = 0; k < 70; k++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 80;
    const cat = CATS[CAT_KEYS[Math.floor(r() * 4)]];
    d3Circles.push(
      <circle
        key={k}
        cx={f(DOORS[2] + Math.cos(a) * d)}
        cy={f(450 + Math.sin(a) * d * 0.7)}
        r={f(2.4 + r() * 2)}
        fill={cat.c}
      />
    );
  }
  const d3Inner = (
    <>
      <rect x={DOORS[2] - 110} y="220" width="220" height="440" fill={`url(#${id}d3)`} />
      <circle cx={DOORS[2]} cy="440" r="110" fill="#F6DD8F" opacity="0.22" />
      <path
        d={`M${DOORS[2]} 650 V480 M${DOORS[2]} 540 L${DOORS[2] - 40} 490 M${DOORS[2]} 520 L${DOORS[2] + 44} 470 M${DOORS[2]} 500 L${DOORS[2] - 20} 450`}
        stroke="#4A3326"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {d3Circles}
    </>
  );

  const m = 471; // Mailbox x position
  const b = 893; // Bench x position

  return (
    <svg className="scene" viewBox="0 0 1364 900" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}cone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--gold)', stopOpacity: 0.34 }} />
          <stop offset="1" style={{ stopColor: 'var(--gold)', stopOpacity: 0 }} />
        </linearGradient>
        <radialGradient id={`${id}vig`} cx=".5" cy="0" r=".9">
          <stop offset="0" style={{ stopColor: 'var(--gold)', stopOpacity: 0.13 }} />
          <stop offset="1" style={{ stopColor: 'var(--gold)', stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id={`${id}d1`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6E2BF" />
          <stop offset="1" stopColor="#C79A6B" />
        </linearGradient>
        <linearGradient id={`${id}d2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B1424" />
          <stop offset=".6" stopColor="#7A2D33" />
          <stop offset="1" stopColor="#E09A62" />
        </linearGradient>
        <linearGradient id={`${id}d3`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2F3D31" />
          <stop offset="1" stopColor="#5E7A52" />
        </linearGradient>
        <radialGradient id={`${id}mg`}>
          <stop offset="0" style={{ stopColor: 'var(--gold)', stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: 'var(--gold)', stopOpacity: 0 }} />
        </radialGradient>

        <clipPath id={`${id}floor`}>
          <rect y="650" width="1364" height="250" />
        </clipPath>

        {DOORS.map((x, i) => (
          <clipPath key={i} id={`${id}c${i}`}>
            <path d={arch(x)} />
          </clipPath>
        ))}
      </defs>

      {/* Wall backdrop & vignette */}
      <rect width="1364" height="900" style={{ fill: 'var(--wall)' }} />
      <rect width="1364" height="900" fill={`url(#${id}vig)`} />
      <rect y="0" width="1364" height="12" style={{ fill: 'var(--wall3)' }} />

      {/* Horizon & pillars */}
      <rect y="540" width="1364" height="110" style={{ fill: 'var(--wall2)' }} opacity="0.55" />
      <path d="M0 540 H1364" style={{ stroke: 'var(--gold)' }} strokeOpacity="0.25" />

      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${60 + i * 113} 552 v86`} style={{ stroke: 'var(--wall3)' }} strokeOpacity="0.7" />
      ))}

      {/* Floor */}
      <rect y="650" width="1364" height="250" style={{ fill: 'var(--wall3)' }} />
      {Array.from({ length: 15 }, (_, i) => (
        <path
          key={i}
          d={`M682 380 L${-500 + i * 168} 900`}
          style={{ stroke: 'var(--onw)' }}
          strokeOpacity="0.035"
          clipPath={`url(#${id}floor)`}
        />
      ))}
      {[690, 735, 795, 870].map((y) => (
        <path key={y} d={`M0 ${y} H1364`} style={{ stroke: 'var(--onw)' }} strokeOpacity="0.04" />
      ))}

      {/* Doorways */}
      {DOORS.map((x, i) => (
        <g key={i} style={{ cursor: 'pointer' }} onClick={() => onDoorClick && onDoorClick(i + 1)}>
          <ellipse cx={x} cy="664" rx="160" ry="18" style={{ fill: 'var(--gold)' }} opacity="0.1" />
          <g clipPath={`url(#${id}c${i})`}>
            {i === 0 ? d1Inner : i === 1 ? d2Inner : d3Inner}
          </g>
          <path d={arch(x, 117)} fill="none" style={{ stroke: 'var(--gold)' }} strokeOpacity="0.3" strokeWidth="1.5" />
          <path d={arch(x)} fill="none" style={{ stroke: 'var(--gold)' }} strokeWidth="3" strokeOpacity="0.85" />
          <path d={`M${x} 210 l7 8 -7 8 -7 -8z`} style={{ fill: 'var(--gold)' }} />
          <path d={`M${x} 150 V172`} style={{ stroke: 'var(--gold)' }} strokeWidth="1.5" />
          <rect x={x - 18} y="172" width="36" height="6" rx="3" style={{ fill: 'var(--gold)' }} />
          <path d={`M${x - 14} 178 L${x + 14} 178 L${x + 150} 650 L${x - 150} 650 Z`} fill={`url(#${id}cone)`} />
        </g>
      ))}

      {/* Mailbox Machine on plinth */}
      <g style={{ cursor: 'pointer' }} onClick={onMailboxClick}>
        <circle className="pulse" cx={m} cy="560" r="96" fill={`url(#${id}mg)`} />
        <rect x={m - 40} y="650" width="80" height="120" style={{ fill: 'var(--wall2)', stroke: 'var(--gold)' }} strokeOpacity="0.35" />
        <rect x={m - 48} y="642" width="96" height="10" style={{ fill: 'var(--wall2)', stroke: 'var(--gold)' }} strokeOpacity="0.35" />
        <path d={`M${m - 38} 642 V566 Q${m - 38} 530 ${m} 530 Q${m + 38} 530 ${m + 38} 566 V642 Z`} style={{ fill: 'var(--acc)' }} />
        <path d={`M${m - 38} 566 Q${m - 38} 530 ${m} 530`} fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="3" />
        <g transform={`rotate(-9 ${m} 552)`}>
          <rect x={m - 17} y="532" width="34" height="24" rx="2" style={{ fill: 'var(--paper)' }} />
          <path d={`M${m - 17} 533 l17 12 17 -12`} fill="none" style={{ stroke: 'var(--gold)' }} strokeWidth="1.5" />
        </g>
        <rect x={m - 22} y="556" width="44" height="7" rx="3" fill="#2A1A14" />
        <rect x={m - 20} y="557" width="40" height="3" rx="1.5" style={{ fill: 'var(--gold)' }} opacity="0.9" />
        <text x={m} y="612" textAnchor="middle" fontSize="22" style={{ fill: 'var(--gold)' }}>✦</text>
      </g>

      {/* Bench with Diary */}
      <g style={{ cursor: 'pointer' }} onClick={onBenchClick}>
        <ellipse cx={b} cy="690" rx="120" ry="10" fill="#000" opacity="0.18" />
        <rect x={b - 95} y="624" width="190" height="13" rx="3" fill="#8A6A50" />
        <rect x={b - 95} y="637" width="190" height="5" fill="#6E523D" />
        <rect x={b - 82} y="642" width="10" height="44" fill="#6E523D" />
        <rect x={b + 72} y="642" width="10" height="44" fill="#6E523D" />
        <g transform={`rotate(-5 ${b + 12} 614)`}>
          <rect x={b - 20} y="604" width="64" height="20" rx="2" style={{ fill: 'var(--acc)' }} />
          <rect x={b - 16} y="604" width="6" height="20" style={{ fill: 'var(--gold)' }} />
        </g>
      </g>
    </svg>
  );
}

export default LobbyScene;

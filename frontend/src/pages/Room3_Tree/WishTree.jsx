import React, { useId } from 'react';
import { rng, f } from '../../utils/rng';
import { CATS, CAT_KEYS } from '../../data/mockData';

export const leafPath = (l, w) => `M0 0 Q${f(l * 0.45)} ${f(-w)} ${f(l)} 0 Q${f(l * 0.45)} ${f(w)} 0 0Z`;

export function WishTree({ filterCategory, selectedLeaf, onSelectLeaf }) {
  const compId = useId().replace(/:/g, '');
  const id = `wt_${compId}_`;
  const r = rng(3);

  const br = [];
  const tips = [];
  const cx = 682;
  const base = 812;

  function grow(x, y, len, ang, d) {
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    const bend = (r() - 0.5) * len * 0.3;
    const qx = (x + x2) / 2 + Math.cos(ang + Math.PI / 2) * bend;
    const qy = (y + y2) / 2 + Math.sin(ang + Math.PI / 2) * bend;
    br.push([`M${f(x)} ${f(y)} Q${f(qx)} ${f(qy)} ${f(x2)} ${f(y2)}`, Math.max(1.4, d * d * 0.5)]);
    if (d <= 3) tips.push([x2, y2]);
    if (d === 0) return;
    const n = d >= 6 ? 2 : (r() < 0.3 ? 3 : 2);
    const spread = d >= 6 ? 0.62 : 0.55;
    for (let i = 0; i < n; i++) {
      grow(
        x2,
        y2,
        len * (0.72 + r() * 0.12),
        ang + (i - (n - 1) / 2) * spread * (0.8 + r() * 0.5) + (r() - 0.5) * 0.22,
        d - 1
      );
    }
  }

  grow(cx, base, 150, -Math.PI / 2, 7);

  // Swaying leaves on branches
  const leaves = [];
  tips.forEach(([tx, ty], i) => {
    const n = 2 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const catKey = CAT_KEYS[Math.floor(r() * 4)];
      const dim = filterCategory && filterCategory !== catKey;
      const x = tx + (r() - 0.5) * 34;
      const y = ty + (r() - 0.5) * 28;
      const l = 13 + r() * 9;
      leaves.push(
        <g
          key={`${i}_${k}`}
          transform={`translate(${f(x)} ${f(y)}) rotate(${f(r() * 360)})`}
          opacity={dim ? 0.18 : 0.95}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectLeaf && onSelectLeaf({ x, y, catKey });
          }}
        >
          <path
            className="lf"
            style={{
              animationDelay: `-${f(r() * 5)}s`,
              animationDuration: `${f(4 + r() * 3)}s`,
            }}
            d={leafPath(l, l * 0.36)}
            fill={`url(#${id}${catKey})`}
          />
        </g>
      );
    }
  });

  // Ambient fireflies
  const flies = [];
  for (let i = 0; i < 26; i++) {
    flies.push(
      <circle
        key={i}
        className="ff"
        cx={f(250 + r() * 860)}
        cy={f(180 + r() * 560)}
        r={f(1.2 + r() * 1.8)}
        style={{ fill: 'var(--gold)', animationDelay: `-${f(r() * 3)}s` }}
      />
    );
  }

  // Falling leaves animation
  const fallingData = [
    [560, 330, "BO"],
    [820, 280, "KL"],
    [470, 420, "GN"],
    [900, 430, "CL"]
  ];
  const fall = fallingData.map(([x, y, c], i) => (
    <g key={i} className="fall" style={{ animationDelay: `-${i * 2.7}s` }}>
      <g transform={`translate(${x} ${y}) rotate(${i * 70})`}>
        <path d={leafPath(19, 7)} fill={`url(#${id}${c})`} />
      </g>
    </g>
  ));

  const branches = br.map(([d, w], idx) => (
    <path
      key={idx}
      d={d}
      fill="none"
      stroke={`url(#${id}b)`}
      strokeWidth={f(w)}
      strokeLinecap="round"
    />
  ));

  const roots = (
    <path
      d={`M${cx - 30} ${base} C ${cx - 60} ${base + 8}, ${cx - 110} ${base + 10}, ${cx - 150} ${base + 22} M${cx + 26} ${base} C ${cx + 70} ${base + 6}, ${cx + 120} ${base + 14}, ${cx + 160} ${base + 20}`}
      stroke="#5A3E2E"
      strokeWidth="9"
      strokeLinecap="round"
      fill="none"
    />
  );

  return (
    <svg className="scene" viewBox="0 0 1364 900" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5A3E2E" />
          <stop offset="0.55" stopColor="#8A6448" />
          <stop offset="1" stopColor="#4A3326" />
        </linearGradient>
        <radialGradient id={`${id}glow`}>
          <stop offset="0" style={{ stopColor: 'var(--gold)', stopOpacity: 0.34 }} />
          <stop offset="1" style={{ stopColor: 'var(--gold)', stopOpacity: 0 }} />
        </radialGradient>

        {CAT_KEYS.map((k) => (
          <linearGradient key={k} id={`${id}${k}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={CATS[k].c} />
            <stop offset="1" stopColor={CATS[k].hi} />
          </linearGradient>
        ))}
      </defs>

      {/* Background & Sky beam */}
      <rect width="1364" height="900" style={{ fill: 'var(--wall)' }} />
      <path d="M612 0 L752 0 L1080 820 L284 820 Z" style={{ fill: 'var(--gold)' }} opacity="0.05" />
      <rect y="800" width="1364" height="100" style={{ fill: 'var(--wall3)' }} />
      <ellipse cx="682" cy="812" rx="300" ry="22" fill="#000" opacity="0.2" />

      {/* Tree glow, trunk, branches & leaves */}
      <ellipse cx={cx} cy="430" rx="520" ry="360" fill={`url(#${id}glow)`} />
      {roots}
      {branches}
      {leaves}
      {fall}
      {flies}

      {/* Selected Leaf Glow Marker */}
      {selectedLeaf && (
        <g
          transform="translate(760 330) rotate(-30)"
          style={{ cursor: 'pointer' }}
          onClick={() => onSelectLeaf && onSelectLeaf(null)}
        >
          <path
            d={leafPath(46, 17)}
            fill="#94C590"
            stroke="#fff"
            strokeWidth="2.5"
            style={{ filter: 'drop-shadow(0 0 10px rgba(255,240,190,.9))' }}
          />
        </g>
      )}
    </svg>
  );
}

export default WishTree;

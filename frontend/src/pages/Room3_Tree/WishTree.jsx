import React, { useId, useMemo } from 'react';
import { rng, f } from '../../utils/rng';
import { CATS, CAT_KEYS } from '../../data/mockData';
import { toFrontendCategory, CATEGORY_MAP } from '../../services/room3Service';

export const leafPath = (l, w) =>
  `M0 0 Q${f(l * 0.45)} ${f(-w)} ${f(l)} 0 Q${f(l * 0.45)} ${f(w)} 0 0Z`;

// Deterministic hash for string ID
function stringToSeed(str) {
  let hash = 0;
  if (!str || str.length === 0) return 42;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function WishTree({
  leaves = [],
  filterCategory,
  selectedLeaf,
  onSelectLeaf,
}) {
  const compId = useId().replace(/:/g, '');
  const id = `wt_${compId}_`;
  const r = rng(3);

  // Generate branch skeleton
  const { br, tips } = useMemo(() => {
    const branches = [];
    const endTips = [];
    const cx = 682;
    const base = 812;
    const genR = rng(3);

    function grow(x, y, len, ang, d) {
      const x2 = x + Math.cos(ang) * len;
      const y2 = y + Math.sin(ang) * len;
      const bend = (genR() - 0.5) * len * 0.3;
      const qx = (x + x2) / 2 + Math.cos(ang + Math.PI / 2) * bend;
      const qy = (y + y2) / 2 + Math.sin(ang + Math.PI / 2) * bend;
      branches.push([
        `M${f(x)} ${f(y)} Q${f(qx)} ${f(qy)} ${f(x2)} ${f(y2)}`,
        Math.max(1.4, d * d * 0.5),
      ]);
      if (d <= 3) endTips.push([x2, y2]);
      if (d === 0) return;
      const n = d >= 6 ? 2 : genR() < 0.3 ? 3 : 2;
      const spread = d >= 6 ? 0.62 : 0.55;
      for (let i = 0; i < n; i++) {
        grow(
          x2,
          y2,
          len * (0.72 + genR() * 0.12),
          ang + (i - (n - 1) / 2) * spread * (0.8 + genR() * 0.5) + (genR() - 0.5) * 0.22,
          d - 1
        );
      }
    }

    grow(cx, base, 150, -Math.PI / 2, 7);
    return { br: branches, tips: endTips };
  }, []);

  // Map real leaves + ambient leaves onto branch tips
  const renderedLeaves = useMemo(() => {
    const list = [];
    const hasApiLeaves = Array.isArray(leaves) && leaves.length > 0;
    const tipCount = tips.length;
    if (tipCount === 0) return list;

    // 1. Map real API items first
    if (hasApiLeaves) {
      leaves.forEach((item, idx) => {
        const seed = stringToSeed(item.id || `leaf_${idx}`);
        const leafR = rng(seed);
        const tipIdx = idx % tipCount;
        const [tx, ty] = tips[tipIdx];

        const catKey = toFrontendCategory(item.tag_category);
        const dim = filterCategory && filterCategory !== catKey;
        const x = tx + (leafR() - 0.5) * 44;
        const y = ty + (leafR() - 0.5) * 36;
        const l = 15 + leafR() * 9;
        const isSelected = selectedLeaf?.id && selectedLeaf.id === item.id;

        list.push(
          <g
            key={item.id || `leaf_${idx}`}
            transform={`translate(${f(x)} ${f(y)}) rotate(${f(leafR() * 360)})`}
            opacity={dim ? 0.15 : isSelected ? 1 : 0.95}
            style={{
              cursor: 'pointer',
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectLeaf &&
                onSelectLeaf({
                  ...item,
                  x,
                  y,
                  catKey,
                });
            }}
          >
            <title>{`${item.title} — ${item.author_display_name || 'Người lạ'}`}</title>
            <path
              className="lf"
              style={{
                animationDelay: `-${f(leafR() * 5)}s`,
                animationDuration: `${f(4 + leafR() * 3)}s`,
                stroke: isSelected ? '#FFFFFF' : 'none',
                strokeWidth: isSelected ? 2.5 : 0,
                filter: isSelected
                  ? 'drop-shadow(0 0 12px rgba(255,245,210,1))'
                  : 'none',
              }}
              d={leafPath(l, l * 0.36)}
              fill={`url(#${id}${catKey})`}
            />
          </g>
        );
      });
    }

    // 2. Supplement with lush ambient leaves so the tree always looks majestic
    const ambientR = rng(45);
    const ambientCount = Math.max(24, 80 - (hasApiLeaves ? leaves.length : 0));
    tips.forEach(([tx, ty], tipIdx) => {
      const perTip = Math.max(1, Math.floor(ambientCount / tipCount));
      for (let k = 0; k < perTip; k++) {
        const catKey = CAT_KEYS[Math.floor(ambientR() * 4)];
        const dim = filterCategory && filterCategory !== catKey;
        const x = tx + (ambientR() - 0.5) * 38;
        const y = ty + (ambientR() - 0.5) * 30;
        const l = 13 + ambientR() * 8;

        list.push(
          <g
            key={`amb_${tipIdx}_${k}`}
            transform={`translate(${f(x)} ${f(y)}) rotate(${f(ambientR() * 360)})`}
            opacity={dim ? 0.12 : 0.88}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectLeaf &&
                onSelectLeaf({
                  x,
                  y,
                  catKey,
                  title: 'Gửi bạn đang cố gắng',
                  author_display_name: 'Người gieo mầm',
                  tag_category: catKey,
                  content:
                    'Mỗi bước đi dù chậm cũng đưa bạn tới gần hơn với đích đến. Hãy kiên nhẫn với chính mình.',
                });
            }}
          >
            <path
              className="lf"
              style={{
                animationDelay: `-${f(ambientR() * 5)}s`,
                animationDuration: `${f(4 + ambientR() * 3)}s`,
              }}
              d={leafPath(l, l * 0.36)}
              fill={`url(#${id}${catKey})`}
            />
          </g>
        );
      }
    });

    return list;
  }, [leaves, filterCategory, selectedLeaf, tips, id, onSelectLeaf]);

  // Ambient fireflies
  const flies = useMemo(() => {
    const list = [];
    const flyR = rng(21);
    for (let i = 0; i < 28; i++) {
      list.push(
        <circle
          key={i}
          className="ff"
          cx={f(240 + flyR() * 880)}
          cy={f(170 + flyR() * 580)}
          r={f(1.2 + flyR() * 1.8)}
          style={{ fill: 'var(--gold)', animationDelay: `-${f(flyR() * 3)}s` }}
        />
      );
    }
    return list;
  }, []);

  // Falling leaves animation
  const fallingData = [
    [560, 330, 'BO'],
    [820, 280, 'KL'],
    [470, 420, 'GN'],
    [900, 430, 'CL'],
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

  const cx = 682;
  const base = 812;
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
          <stop offset="0" style={{ stopColor: 'var(--gold)', stopOpacity: 0.36 }} />
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
      <path
        d="M612 0 L752 0 L1080 820 L284 820 Z"
        style={{ fill: 'var(--gold)' }}
        opacity="0.05"
      />
      <rect y="800" width="1364" height="100" style={{ fill: 'var(--wall3)' }} />
      <ellipse cx="682" cy="812" rx="300" ry="22" fill="#000" opacity="0.2" />

      {/* Tree glow, trunk, branches & leaves */}
      <ellipse cx={cx} cy="430" rx="520" ry="360" fill={`url(#${id}glow)`} />
      {roots}
      {branches}
      {renderedLeaves}
      {fall}
      {flies}

      {/* Selected Leaf Glow Marker */}
      {selectedLeaf && (
        <g
          transform={`translate(${selectedLeaf.x || 760} ${selectedLeaf.y || 330}) rotate(-30)`}
          style={{ cursor: 'pointer' }}
          onClick={() => onSelectLeaf && onSelectLeaf(null)}
        >
          <path
            d={leafPath(46, 17)}
            fill={CATEGORY_MAP[toFrontendCategory(selectedLeaf.tag_category)]?.color || '#94C590'}
            stroke="#fff"
            strokeWidth="2.5"
            style={{ filter: 'drop-shadow(0 0 14px rgba(255,240,190,0.95))' }}
          />
        </g>
      )}
    </svg>
  );
}

export default WishTree;

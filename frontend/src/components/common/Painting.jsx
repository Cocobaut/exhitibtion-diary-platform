import React, { useId } from 'react';
import { rng, f } from '../../utils/rng';

export function Painting({ seed = 100, kind = 'window', className = '' }) {
  const compId = useId().replace(/:/g, '');
  const r = rng(seed);
  const id = `paint_${compId}_${seed}_`;

  const lg = (n, a, b, vertical = true) => (
    <linearGradient
      key={n}
      id={`${id}${n}`}
      x1="0"
      y1="0"
      x2={vertical ? 0 : 1}
      y2={vertical ? 1 : 0}
    >
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  );

  let content = null;

  if (kind === 'hills') {
    const sky = [
      ["#E8D5BC", "#F2E3CC"],
      ["#D9DCD3", "#EFE6D6"],
      ["#E6CFC4", "#F2E2D3"]
    ][Math.floor(r() * 3)];
    const L = [
      ["#BFA582", "#93795D", "#5F4B3B"],
      ["#A9B39A", "#7E8A6E", "#4F5A45"],
      ["#C9A19A", "#9C716B", "#5E3F3C"]
    ][Math.floor(r() * 3)];
    const sx = 60 + r() * 180;
    content = (
      <>
        <defs>{lg("s", sky[0], sky[1])}</defs>
        <rect width="300" height="190" fill={`url(#${id}s)`} />
        <circle cx={f(sx)} cy="62" r="26" fill="#F1C98A" />
        <path
          d={`M0 120 C80 ${f(70 + r() * 30)},180 ${f(100 + r() * 20)},300 ${f(80 + r() * 30)} V190H0Z`}
          fill={L[0]}
        />
        <path
          d={`M0 150 C100 ${f(110 + r() * 25)},200 ${f(150 + r() * 10)},300 ${f(120 + r() * 20)} V190H0Z`}
          fill={L[1]}
        />
        <path
          d={`M0 175 C90 ${f(150 + r() * 15)},210 ${f(170 + r() * 10)},300 ${f(160 + r() * 10)} V190H0Z`}
          fill={L[2]}
        />
      </>
    );
  } else if (kind === 'window') {
    content = (
      <>
        <rect width="300" height="190" fill="#4E3F3A" />
        <rect x="0" y="150" width="300" height="40" fill="#3B2F2B" />
        <rect x="168" y="28" width="84" height="104" fill="#F2DDB0" />
        <path d="M210 28V132 M168 80H252" stroke="#3A2D29" strokeWidth="5" />
        <rect x="164" y="24" width="92" height="112" fill="none" stroke="#3A2D29" strokeWidth="6" />
        <path d="M168 150 L252 150 L226 190 L96 190 Z" fill="#F2DDB0" opacity=".26" />
        <g fill="#2A201D">
          <rect x="58" y="118" width="54" height="7" rx="2" />
          <rect x="60" y="72" width="7" height="50" />
          <rect x="60" y="124" width="5" height="34" />
          <rect x="104" y="124" width="5" height="34" />
        </g>
      </>
    );
  } else if (kind === 'rain') {
    const drops = [];
    for (let i = 0; i < 46; i++) {
      const x = r() * 320;
      const y = r() * 170;
      drops.push(<path key={i} d={`M${f(x)} ${f(y)} l-6 16`} />);
    }
    content = (
      <>
        <defs>{lg("s", "#7F8C95", "#B8BEBB")}</defs>
        <rect width="300" height="190" fill={`url(#${id}s)`} />
        <rect y="150" width="300" height="40" fill="#566064" />
        <g stroke="#EEF2F3" strokeWidth="1.2" opacity=".5">{drops}</g>
        <ellipse cx="150" cy="166" rx="34" ry="5" fill="#3E4649" opacity=".6" />
        <path d="M118 112 Q150 80 182 112 Z" fill="#A1342C" />
        <path d="M150 112 V146" stroke="#2E2A2A" strokeWidth="2.5" />
        <circle cx="150" cy="121" r="6.5" fill="#2E2A2A" />
        <rect x="142" y="127" width="16" height="34" rx="6" fill="#2E2A2A" />
      </>
    );
  } else if (kind === 'door') {
    content = (
      <>
        <rect width="300" height="190" fill="#6E5546" />
        <rect y="150" width="300" height="40" fill="#4A3830" />
        <rect x="116" y="38" width="70" height="112" fill="#F5D9A0" />
        <path d="M186 38 L214 30 L214 158 L186 150 Z" fill="#5A3D30" />
        <path d="M116 150 L186 150 L290 190 L40 190 Z" fill="#F5D9A0" opacity=".42" />
        <circle cx="151" cy="104" r="6" fill="#3B2A24" />
        <rect x="144" y="110" width="14" height="40" rx="5" fill="#3B2A24" />
      </>
    );
  } else if (kind === 'boat') {
    const refl = [];
    for (let i = 0; i < 6; i++) {
      refl.push(
        <path
          key={i}
          d={`M${f(120 + r() * 50)} ${f(140 + i * 8)} h${f(20 + r() * 30)}`}
        />
      );
    }
    content = (
      <>
        <defs>
          {lg("s", "#D8C2A6", "#EBDDC7")}
          {lg("w", "#45606E", "#22343E")}
        </defs>
        <rect width="300" height="110" fill={`url(#${id}s)`} />
        <circle cx="232" cy="46" r="18" fill="#F6E7C8" />
        <rect y="110" width="300" height="80" fill={`url(#${id}w)`} />
        <g stroke="#E9DCC6" strokeWidth="1.5" opacity=".35">{refl}</g>
        <path d="M108 118 L192 118 L176 133 L124 133 Z" fill="#F3EDE2" />
        <path d="M150 80 L150 118 L180 118 Z" fill="#F3EDE2" />
      </>
    );
  } else if (kind === 'moon') {
    const stars = [];
    for (let i = 0; i < 26; i++) {
      stars.push(
        <circle
          key={i}
          cx={f(r() * 300)}
          cy={f(r() * 110)}
          r={f(0.6 + r())}
          fill="#F4ECDA"
          opacity={f(0.4 + r() * 0.5)}
        />
      );
    }
    content = (
      <>
        <defs>{lg("s", "#2B2940", "#5A4D68")}</defs>
        <rect width="300" height="190" fill={`url(#${id}s)`} />
        {stars}
        <circle cx="212" cy="56" r="24" fill="#EFE0BE" />
        <path d="M0 160 C90 136,200 150,300 140 V190H0Z" fill="#1E1C2B" />
        <path
          d="M90 150 V108 M90 124 L74 110 M90 118 L104 102 M90 132 L102 124"
          stroke="#1E1C2B"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </>
    );
  } else {
    // field
    content = (
      <>
        <defs>{lg("s", "#EBCB8F", "#F3E2BE")}</defs>
        <rect width="300" height="190" fill={`url(#${id}s)`} />
        <circle cx="150" cy="122" r="44" fill="#E9A15E" opacity=".85" />
        <path d="M0 130 C100 116,200 126,300 118 V190H0Z" fill="#8E7F43" />
        <path d="M0 160 C110 146,210 158,300 150 V190H0Z" fill="#6B5F2A" />
        <path d="M92 150 V128" stroke="#3E3A1C" strokeWidth="2" />
        <circle cx="92" cy="125" r="5" fill="#A1342C" />
      </>
    );
  }

  return (
    <svg
      viewBox="0 0 300 190"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: 'block', width: '100%', height: '100%' }}
      className={className}
      aria-hidden="true"
    >
      {content}
      <filter id={`${id}g`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 .25  0 0 0 0 .18  0 0 0 0 .12  0 0 0 .2 0" />
      </filter>
      <rect width="300" height="190" filter={`url(#${id}g)`} />
    </svg>
  );
}

export default Painting;

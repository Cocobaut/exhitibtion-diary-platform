import React, { useId } from 'react';
import { rng, f } from '../../utils/rng';
import { CATS, CAT_KEYS } from '../../data/mockData';

export const DOORS = [260, 682, 1104];
export const arch = (x, rad = 105) => `M${x - rad} 650 V335 A${rad} ${rad} 0 0 1 ${x + rad} 335 V650 Z`;

/**
 * Ambient Museum Backdrop
 * Renders the atmospheric hall: wall with vignette, colonnade strip, horizon boundary line, and perspective wood floor.
 */
export function LobbyBackdrop() {
  const compId = useId().replace(/:/g, '');
  const id = `lbbg_${compId}_`;

  return (
    <div className="lobby-backdrop-layer" aria-hidden="true">
      {/* Upper Wall Section */}
      <div className="lobby-wall-bg">
        {/* Colonnade Strip along the lower part of the wall */}
        <div className="lobby-colonnade-strip">
          {Array.from({ length: 22 }, (_, i) => (
            <span key={i} className="colonnade-pillar" />
          ))}
        </div>
      </div>

      {/* Horizon Boundary Line - exact meeting line between wall and dark floor */}
      <div className="lobby-horizon-boundary" />

      {/* Lower Dark Floor Section */}
      <div className="lobby-floor-bg">
        <svg
          className="lobby-floor-planks-svg"
          viewBox="0 0 1920 300"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`${id}floorFade`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2c1e18" />
              <stop offset="100%" stopColor="#19110d" />
            </linearGradient>
          </defs>
          <rect width="1920" height="300" fill={`url(#${id}floorFade)`} />

          {/* Converging perspective plank lines */}
          {Array.from({ length: 23 }, (_, i) => (
            <path
              key={i}
              d={`M960 -60 L${-500 + i * 135} 300`}
              stroke="var(--onw)"
              strokeOpacity="0.04"
              strokeWidth="1.5"
            />
          ))}

          {/* Horizontal floor seams */}
          {[40, 95, 165, 245].map((y) => (
            <path
              key={y}
              d={`M0 ${y} H1920`}
              stroke="var(--onw)"
              strokeOpacity="0.035"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

/**
 * DoorArch Component
 * Renders an enlarged archway with spotlight, gold ornamental borders, and room-specific vector artwork.
 * Baseline ends exactly at y=450 for flush contact with horizon boundary.
 */
export function DoorArch({ roomNum }) {
  const compId = useId().replace(/:/g, '');
  const id = `da_${compId}_`;
  const r = rng(roomNum * 47);

  // Door 1 (Triển lãm Đổ vỡ)
  const renderRoom1Inner = () => (
    <>
      <rect x="15" y="60" width="210" height="390" fill={`url(#${id}d1)`} />
      <rect x="15" y="385" width="210" height="65" fill="#B48A60" />
      {/* 3 picture frames with broken exhibition art */}
      {[
        [-58, 215, 48, 38, "#7E8A6E"],
        [-4, 195, 34, 50, "#A1342C"],
        [44, 222, 46, 34, "#45606E"]
      ].map(([dx, y, w, h, c], idx) => (
        <React.Fragment key={idx}>
          <rect x={120 + dx - 3} y={y - 3} width={w + 6} height={h + 6} fill="#3E302B" rx="1" />
          <rect x={120 + dx} y={y} width={w} height={h} fill={c} rx="1" />
        </React.Fragment>
      ))}
    </>
  );

  // Door 2 (Bầu trời Lồng đèn)
  const renderRoom2Inner = () => {
    const lanterns = [];
    for (let k = 0; k < 15; k++) {
      const lx = 35 + r() * 170;
      const ly = 85 + r() * 290;
      lanterns.push(
        <React.Fragment key={k}>
          <circle cx={f(lx)} cy={f(ly)} r="12" fill="#FFC774" opacity="0.28" />
          <circle cx={f(lx)} cy={f(ly)} r={f(2.8 + r() * 2.2)} fill="#FFE3A8" />
        </React.Fragment>
      );
    }
    return (
      <>
        <rect x="15" y="60" width="210" height="390" fill={`url(#${id}d2)`} />
        {lanterns}
        <path d="M15 435 Q120 395 225 425 V450 H15Z" fill="#2A1214" />
      </>
    );
  };

  // Door 3 (Cây Thông điệp)
  const renderRoom3Inner = () => {
    const leaves = [];
    for (let k = 0; k < 72; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 80;
      const cat = CATS[CAT_KEYS[Math.floor(r() * 4)]];
      leaves.push(
        <circle
          key={k}
          cx={f(120 + Math.cos(a) * d)}
          cy={f(245 + Math.sin(a) * d * 0.72)}
          r={f(2.6 + r() * 2)}
          fill={cat.c}
        />
      );
    }
    return (
      <>
        <rect x="15" y="60" width="210" height="390" fill={`url(#${id}d3)`} />
        <circle cx="120" cy="235" r="95" fill="#F6DD8F" opacity="0.24" />
        <path
          d="M120 450 V275 M120 335 L82 285 M120 315 L158 265 M120 295 L100 245"
          stroke="#4A3326"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {leaves}
      </>
    );
  };

  return (
    <svg
      className="door-arch-svg"
      viewBox="0 0 240 450"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}cone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.36" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>

        <linearGradient id={`${id}d1`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F6E2BF" />
          <stop offset="100%" stopColor="#C79A6B" />
        </linearGradient>

        <linearGradient id={`${id}d2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2B1424" />
          <stop offset="60%" stopColor="#7A2D33" />
          <stop offset="100%" stopColor="#E09A62" />
        </linearGradient>

        <linearGradient id={`${id}d3`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2F3D31" />
          <stop offset="100%" stopColor="#5E7A52" />
        </linearGradient>

        {/* Arch Clip Path (radius 105, center x 120, baseline y 450) */}
        <clipPath id={`${id}archClip`}>
          <path d="M15 450 V135 A105 105 0 0 1 225 135 V450 Z" />
        </clipPath>
      </defs>

      {/* Ground Contact Ellipse Glow */}
      <ellipse cx="120" cy="448" rx="108" ry="8" fill="var(--gold)" opacity="0.14" />

      {/* Inner Artwork */}
      <g clipPath={`url(#${id}archClip)`}>
        {roomNum === 1
          ? renderRoom1Inner()
          : roomNum === 2
          ? renderRoom2Inner()
          : renderRoom3Inner()}
      </g>

      {/* Outer Arch Border */}
      <path
        d="M5 450 V135 A115 115 0 0 1 235 135 V450 Z"
        fill="none"
        stroke="var(--gold)"
        strokeOpacity="0.32"
        strokeWidth="1.5"
      />

      {/* Main Arch Border */}
      <path
        d="M15 450 V135 A105 105 0 0 1 225 135 V450 Z"
        fill="none"
        stroke="var(--gold)"
        strokeOpacity="0.88"
        strokeWidth="3"
      />

      {/* Pendant Lamp & Diamond Finial */}
      <path d="M120 0 V15" stroke="var(--gold)" strokeWidth="1.5" />
      <rect x="105" y="15" width="30" height="6" rx="3" fill="var(--gold)" />
      <path d="M120 28 l6 7 -6 7 -6 -7z" fill="var(--gold)" />

      {/* Spotlight Cone */}
      <path d="M108 21 L132 21 L235 450 L5 450 Z" fill={`url(#${id}cone)`} />
    </svg>
  );
}

/**
 * MailboxGraphic Component
 * Red vintage mailbox machine on a stone plinth with baseline flush at y=250.
 */
export function MailboxGraphic() {
  const compId = useId().replace(/:/g, '');
  const id = `mb_${compId}_`;

  return (
    <svg
      className="mailbox-svg"
      viewBox="0 0 160 250"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}glow`}>
          <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Pulsing Aura */}
      <circle className="pulse" cx="80" cy="65" r="58" fill={`url(#${id}glow)`} />

      {/* Plinth Base touching y=250 */}
      <rect
        x="40"
        y="145"
        width="80"
        height="105"
        fill="var(--wall2)"
        stroke="var(--gold)"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <rect
        x="32"
        y="137"
        width="96"
        height="10"
        rx="2"
        fill="var(--wall2)"
        stroke="var(--gold)"
        strokeOpacity="0.35"
        strokeWidth="1"
      />

      {/* Mailbox Dome */}
      <path
        d="M42 137 V65 Q42 28 80 28 Q118 28 118 65 V137 Z"
        fill="var(--acc)"
      />
      {/* Curved Gloss Highlight */}
      <path
        d="M42 65 Q42 28 80 28"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.22"
        strokeWidth="3"
      />

      {/* Letter Envelope peeking out */}
      <g transform="rotate(-9 80 50)">
        <rect x="63" y="30" width="34" height="24" rx="2" fill="var(--paper)" />
        <path d="M63 31 l17 12 17 -12" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
      </g>

      {/* Mail Slot */}
      <rect x="58" y="55" width="44" height="7" rx="3" fill="#2A1A14" />
      <rect x="60" y="56" width="40" height="3" rx="1.5" fill="var(--gold)" opacity="0.9" />

      {/* Gold Star */}
      <text x="80" y="110" textAnchor="middle" fontSize="22" fill="var(--gold)">
        ✦
      </text>
    </svg>
  );
}

/**
 * BenchGraphic Component
 * Wooden bench with leather diary notebook touching baseline at y=142.
 */
export function BenchGraphic() {
  return (
    <svg
      className="bench-svg"
      viewBox="0 0 220 142"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Ground Shadow */}
      <ellipse cx="110" cy="136" rx="95" ry="6" fill="#000000" opacity="0.25" />

      {/* Bench Seat Planks */}
      <rect x="15" y="70" width="190" height="13" rx="3" fill="#8A6A50" />
      <rect x="15" y="83" width="190" height="5" fill="#6E523D" />

      {/* Bench Legs */}
      <rect x="28" y="88" width="10" height="48" fill="#6E523D" />
      <rect x="182" y="88" width="10" height="48" fill="#6E523D" />

      {/* Leather Diary on bench */}
      <g transform="rotate(-5 122 60)">
        <rect x="90" y="50" width="64" height="20" rx="2" fill="var(--acc)" />
        <rect x="94" y="50" width="6" height="20" fill="var(--gold)" />
      </g>
    </svg>
  );
}

/**
 * Legacy full LobbyScene (retained for backward compatibility and LoginPage scrim background)
 */
export function LobbyScene({ onDoorClick, onMailboxClick, onBenchClick }) {
  return (
    <div className="abs inset-0" style={{ width: '100%', height: '100%', position: 'absolute' }}>
      <LobbyBackdrop />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '30px',
          paddingBottom: '60px',
        }}
      >
        <div style={{ width: '220px', cursor: 'pointer' }} onClick={() => onDoorClick && onDoorClick(1)}>
          <DoorArch roomNum={1} />
        </div>
        <div style={{ width: '120px', cursor: 'pointer' }} onClick={onMailboxClick}>
          <MailboxGraphic />
        </div>
        <div style={{ width: '220px', cursor: 'pointer' }} onClick={() => onDoorClick && onDoorClick(2)}>
          <DoorArch roomNum={2} />
        </div>
        <div style={{ width: '150px', cursor: 'pointer' }} onClick={onBenchClick}>
          <BenchGraphic />
        </div>
        <div style={{ width: '220px', cursor: 'pointer' }} onClick={() => onDoorClick && onDoorClick(3)}>
          <DoorArch roomNum={3} />
        </div>
      </div>
    </div>
  );
}

export default LobbyScene;

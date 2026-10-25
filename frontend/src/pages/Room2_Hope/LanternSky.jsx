import React, { useId, useState, useRef } from 'react';
import { rng, f } from '../../utils/rng';
import { SYM, SYM_KEYS, MOCK_LANTERN_LETTERS } from '../../data/mockData';

export function poly(pts) {
  return "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L");
}

export function SingleLantern({
  x,
  y,
  sc = 1,
  seed = 100,
  kind,
  color,
  op = 1,
  isMine = false,
  onClick,
  titleText = "Nhấn hoặc kéo xuống để đọc thư",
}) {
  const compId = useId().replace(/:/g, '');
  const r = rng(seed);
  const lanternKind = kind || SYM_KEYS[Math.floor(r() * SYM_KEYS.length)];
  const id = `lt_${compId}_${seed}_`;
  const body = color || ["#FFE3A8", "#FFD9B0", "#FFE7C2", "#F9CFA0"][Math.floor(r() * 4)];
  const sym = SYM[lanternKind]().map(([a, b]) => [a * 11, b * 11 - 1]);

  const [isHovered, setIsHovered] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const currentDragRef = useRef(0);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    startYRef.current = clientY;
    startXRef.current = clientX;
    currentDragRef.current = 0;
    setIsDragging(true);

    const onPointerMove = (moveEvent) => {
      const curX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const curY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const diffY = curY - startYRef.current;

      if (diffY > 0) {
        const visualOffset = Math.min(diffY * 1.2, 220);
        currentDragRef.current = diffY;
        setDragOffset(visualOffset);
      } else {
        currentDragRef.current = 0;
        setDragOffset(0);
      }
    };

    const onPointerUp = (upEvent) => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      const finalDiffY = currentDragRef.current;
      const curX = upEvent.changedTouches ? upEvent.changedTouches[0].clientX : (upEvent.clientX ?? startXRef.current);
      const curY = upEvent.changedTouches ? upEvent.changedTouches[0].clientY : (upEvent.clientY ?? startYRef.current);
      const totalDist = Math.hypot(curX - startXRef.current, curY - startYRef.current);

      setIsDragging(false);
      setDragOffset(0);

      // Trigger if pulled down >= 25px OR if it was a quick click (< 8px total movement)
      if (finalDiffY >= 25 || totalDist < 8) {
        if (onClick) onClick();
      }
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  };

  const currentScale = sc * (isDragging ? 1.25 : (isHovered ? 1.15 : 1));
  const currentY = y + dragOffset;

  return (
    <g
      className="ln"
      style={{
        animationDelay: isDragging ? '0s' : `-${f(r() * 6)}s`,
        cursor: isDragging ? 'grabbing' : 'grab',
        filter: isDragging
          ? 'drop-shadow(0 0 24px rgba(255,230,150,1))'
          : (isHovered ? 'drop-shadow(0 0 18px rgba(255,220,130,0.9))' : 'none'),
        transition: isDragging ? 'none' : 'filter 0.2s ease',
        userSelect: 'none',
      }}
      onMouseEnter={() => !isDragging && setIsHovered(true)}
      onMouseLeave={() => !isDragging && setIsHovered(false)}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
    >
      <title>{titleText}</title>

      {/* Tether line when pulled down */}
      {dragOffset > 8 && (
        <line
          x1={f(x)}
          y1={f(y)}
          x2={f(x)}
          y2={f(currentY - 20 * sc)}
          stroke="rgba(255, 215, 130, 0.6)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      )}

      <g
        transform={`translate(${f(x)} ${f(currentY)}) scale(${f(currentScale)}) rotate(${f(
          (r() - 0.5) * 8 + (dragOffset > 0 ? dragOffset * 0.08 : 0)
        )})`}
        opacity={isDragging ? 1 : (isHovered ? 1 : op)}
        style={{
          transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
        }}
      >
        <defs>
          <radialGradient id={`g${id}`}>
            <stop offset="0" stopColor="#FFF1C9" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#FFC774" stopOpacity="0.42" />
            <stop offset="1" stopColor="#FF9A4A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`b${id}`} cx=".5" cy=".6">
            <stop offset="0" stopColor="#FFF6DD" />
            <stop offset="0.6" stopColor={body} />
            <stop offset="1" stopColor="#E58F4C" />
          </radialGradient>
        </defs>

        <circle r="62" fill={`url(#g${id})`} />
        <path d="M-20 -26 Q0 -34 20 -26 L24 22 Q0 32 -24 22 Z" fill={`url(#b${id})`} />
        <path d="M-20 -26 Q0 -34 20 -26" fill="none" stroke="#A85A2E" strokeWidth="2" />
        <rect x="-8" y="24" width="16" height="5" rx="2" fill="#7A3B1E" opacity="0.8" />
        <path
          d={poly(sym)}
          fill="none"
          stroke="#7F1916"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Small pull-down arrow visual indicator on hover / drag */}
        {(isHovered || isDragging) && (
          <g transform="translate(0, 36)" opacity="0.9">
            <circle r="9" fill="rgba(40,16,20,0.75)" />
            <path d="M-4 -2 L0 3 L4 -2" fill="none" stroke="#FFE3A8" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        )}
      </g>
    </g>
  );
}

export function LanternSky({ isLanded = false, onOpenLandedModal }) {
  const compId = useId().replace(/:/g, '');
  const r = rng(88);

  // Background Lanterns with individual letter data and click/drag handlers
  const backgroundLanterns = [];
  for (let i = 0; i < 64; i++) {
    const d = r();
    const x = r() * 1364;
    const y = 170 + r() * 480;
    if (isLanded && Math.abs(x - 682) < 300 && y > 360) continue;

    // Pick a mock letter for this lantern
    const letter = MOCK_LANTERN_LETTERS[(i % (MOCK_LANTERN_LETTERS.length - 1)) + 1];

    backgroundLanterns.push(
      <SingleLantern
        key={i}
        x={x}
        y={y}
        sc={0.18 + d * 0.55}
        seed={600 + i}
        op={0.45 + d * 0.55}
        titleText={`Lồng đèn của ${letter.author} · Nhấn hoặc kéo xuống để đọc`}
        onClick={() => onOpenLandedModal && onOpenLandedModal(letter)}
      />
    );
  }

  // Background Stars
  const stars = [];
  for (let i = 0; i < 70; i++) {
    const rr = rng(i + 3);
    stars.push(
      <circle
        key={i}
        cx={f(rr() * 1364)}
        cy={f(rr() * 380)}
        r={f(rr() * 1.3 + 0.3)}
        fill="#FFF1DC"
        opacity={f(rr() * 0.6 + 0.2)}
      />
    );
  }

  return (
    <svg className="scene" viewBox="0 0 1364 900" aria-hidden="true">
      <defs>
        <linearGradient id={`dusk_${compId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B1424" />
          <stop offset="0.45" stopColor="#6E2A33" />
          <stop offset="0.8" stopColor="#C9784F" />
          <stop offset="1" stopColor="#EDBE86" />
        </linearGradient>
      </defs>

      <rect width="1364" height="900" fill={`url(#dusk_${compId})`} />
      {stars}
      {backgroundLanterns}

      {/* User's Own High-flying Personal Lantern */}
      {!isLanded && (
        <SingleLantern
          x={1010}
          y={205}
          sc={0.95}
          seed={4321}
          kind="heart"
          color="#FFF0D2"
          isMine={true}
          titleText="Lồng đèn riêng của bạn · Nhấn để kéo xuống mở thư"
          onClick={() => onOpenLandedModal && onOpenLandedModal(MOCK_LANTERN_LETTERS[0])}
        />
      )}

      {/* Ground and Pagoda silhouette */}
      <path d="M0 790 Q 340 750 682 770 T 1364 760 L1364 900 L0 900 Z" fill="#3A1A1C" />
      <path d="M1130 780 L1130 690 Q1130 640 1180 636 Q1230 640 1230 690 L1230 780 Z" fill="#2A1214" />
      <path
        d="M1158 730 L1158 702 Q1158 682 1180 680 Q1202 682 1202 702 L1202 730 Z"
        fill="#FFCF7A"
        opacity="0.85"
      />
    </svg>
  );
}

export default LanternSky;

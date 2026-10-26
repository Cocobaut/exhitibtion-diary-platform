import React, { useId, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { rng, f } from '../../utils/rng';
import { CATS, CAT_KEYS } from '../../data/mockData';
import { toFrontendCategory, CATEGORY_MAP } from '../../services/room3Service';
import { useLanguage } from '../../context/LanguageContext';

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
  hoveredLeaf,
  onHoverLeaf,
  onOpenLeafModal,
  onDrawRandomLeaf,
}) {
  const { language } = useLanguage();
  const compId = useId().replace(/:/g, '');
  const id = `wt_${compId}_`;

  // Tree sway and shake animation state
  const [swayAngle, setSwayAngle] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [fallingParticles, setFallingParticles] = useState([]);

  // Interactive Slider State (located beside tree trunk on the right)
  const [sliderX, setSliderX] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const sliderDragStart = useRef(0);
  const hasTriggeredDraw = useRef(false);
  const maxSlideDistance = 94; // Compact half-size track slide range

  const nextParticleId = useRef(1);

  // Exact coordinates for balanced, fully visible tree with prominent trunk & roots
  const cx = 600;
  const base = 590; // Soil contact boundary
  const crotchY = 400; // Main trunk height ~190px (1.5x taller than previous 125px)

  // Generate 100% interconnected branch skeleton: every branch starts at its parent's exact endpoint
  const { br, tips } = useMemo(() => {
    const branches = [];
    const endTips = [];
    const genR = rng(23);

    // Tier 0: Sculpted trunk (190px tall, majestic oak proportions)
    branches.push([
      `M${cx} ${base} Q${cx - 6} 495 ${cx} ${crotchY}`,
      44, // Sturdy oak trunk
    ]);

    // Tier 1: 4 Primary Limbs starting EXACTLY at main crotch (cx, crotchY)
    const t1Endpoints = [
      { startX: cx, startY: crotchY, endX: cx - 135, endY: 330, ctrlX: cx - 68, ctrlY: 370, width: 28 },
      { startX: cx, startY: crotchY, endX: cx - 46, endY: 295, ctrlX: cx - 23, ctrlY: 350, width: 24 },
      { startX: cx, startY: crotchY, endX: cx + 46, endY: 295, ctrlX: cx + 23, ctrlY: 350, width: 24 },
      { startX: cx, startY: crotchY, endX: cx + 135, endY: 330, ctrlX: cx + 68, ctrlY: 370, width: 28 },
    ];

    t1Endpoints.forEach((limb) => {
      branches.push([
        `M${limb.startX} ${limb.startY} Q${limb.ctrlX} ${limb.ctrlY} ${limb.endX} ${limb.endY}`,
        limb.width,
      ]);
    });

    // Recursive child branch grower: child branches ALWAYS start at parent's (startX, startY)
    function growBoughs(startX, startY, len, ang, depth) {
      const endX = startX + Math.cos(ang) * len;
      const endY = startY + Math.sin(ang) * len;
      const bend = (genR() - 0.5) * len * 0.26;
      const qx = (startX + endX) / 2 + Math.cos(ang + Math.PI / 2) * bend;
      const qy = (startY + endY) / 2 + Math.sin(ang + Math.PI / 2) * bend;

      // Scaled stroke width
      const w = Math.max(4.5, depth * depth * 0.95);
      branches.push([
        `M${f(startX)} ${f(startY)} Q${f(qx)} ${f(qy)} ${f(endX)} ${f(endY)}`,
        w,
      ]);

      // Tips for leaf attachment
      if (depth <= 2) {
        endTips.push([endX, endY]);
      }

      if (depth <= 1) return;

      // Children branches: all begin at this branch's end point (endX, endY)
      const count = depth >= 3 ? (genR() < 0.35 ? 3 : 2) : 2;
      const spread = depth >= 3 ? 0.60 : 0.48;

      for (let i = 0; i < count; i++) {
        const angleOffset = (i - (count - 1) / 2) * spread * (0.85 + genR() * 0.3);
        growBoughs(
          endX,
          endY,
          len * (0.68 + genR() * 0.12),
          ang + angleOffset + (genR() - 0.5) * 0.12,
          depth - 1
        );
      }
    }

    // Tier 2: Directly connected to Tier 1 endpoints
    // Left Limb (endX: cx - 135, endY: 330)
    growBoughs(cx - 135, 330, 68, -Math.PI * 0.78, 3);
    growBoughs(cx - 135, 330, 58, -Math.PI * 0.58, 3);

    // Center-Left Limb (endX: cx - 46, endY: 295)
    growBoughs(cx - 46, 295, 65, -Math.PI * 0.62, 3);
    growBoughs(cx - 46, 295, 58, -Math.PI * 0.48, 3);

    // Center-Right Limb (endX: cx + 46, endY: 295)
    growBoughs(cx + 46, 295, 58, -Math.PI * 0.52, 3);
    growBoughs(cx + 46, 295, 65, -Math.PI * 0.38, 3);

    // Right Limb (endX: cx + 135, endY: 330)
    growBoughs(cx + 135, 330, 58, -Math.PI * 0.42, 3);
    growBoughs(cx + 135, 330, 68, -Math.PI * 0.22, 3);

    // Mid-limb connected branches (growing seamlessly from midpoints of major limbs)
    growBoughs(cx - 72, 350, 54, -Math.PI * 0.82, 2);
    growBoughs(cx + 72, 350, 54, -Math.PI * 0.18, 2);

    return { br: branches, tips: endTips };
  }, [base, crotchY]);

  // Spawn dynamic falling leaf particles
  const spawnLeafParticles = useCallback((count = 2) => {
    if (tips.length === 0) return;
    const catKeys = ['KL', 'CL', 'BO', 'GN'];
    const newItems = [];

    for (let i = 0; i < count; i++) {
      const tip = tips[Math.floor(Math.random() * tips.length)];
      const drift = (Math.random() - 0.5) * 140;
      const catKey = catKeys[Math.floor(Math.random() * catKeys.length)];

      newItems.push({
        id: nextParticleId.current++,
        x: tip[0] + (Math.random() - 0.5) * 16,
        y: tip[1] + (Math.random() - 0.5) * 16,
        catKey,
        drift,
        rotation: Math.floor(Math.random() * 360),
      });
    }

    setFallingParticles((prev) => [...prev.slice(-16), ...newItems]);
  }, [tips]);

  // Clean up completed particles
  useEffect(() => {
    if (fallingParticles.length === 0) return;
    const timer = setTimeout(() => {
      setFallingParticles((prev) => prev.filter((p) => Date.now() - p.id < 2200));
    }, 1800);
    return () => clearTimeout(timer);
  }, [fallingParticles]);

  // Trigger random leaf draw action with tree wobble and leaf burst
  const triggerDrawSuccess = useCallback(() => {
    setIsShaking(true);
    setSwayAngle(0);
    spawnLeafParticles(8);

    if (leaves && leaves.length > 0 && onDrawRandomLeaf) {
      const randomItem = leaves[Math.floor(Math.random() * leaves.length)];
      onDrawRandomLeaf(randomItem);
    }

    setTimeout(() => {
      setIsShaking(false);
    }, 500);
  }, [leaves, onDrawRandomLeaf, spawnLeafParticles]);

  // Interactive Slider Handlers (Right side of trunk)
  const handleSliderPointerDown = (clientX) => {
    setIsSliding(true);
    sliderDragStart.current = clientX - sliderX;
    hasTriggeredDraw.current = false;
  };

  const handleSliderPointerMove = (clientX) => {
    if (!isSliding) return;
    const currentOffset = Math.max(0, Math.min(maxSlideDistance, clientX - sliderDragStart.current));
    setSliderX(currentOffset);

    const progress = currentOffset / maxSlideDistance;
    const computedAngle = Math.max(-5, Math.min(5, progress * 4.2));
    setSwayAngle(computedAngle);

    if (progress > 0.35 && Math.random() < 0.2) {
      spawnLeafParticles(1);
    }

    // Auto complete if dragged past 85%
    if (progress >= 0.85 && !hasTriggeredDraw.current) {
      hasTriggeredDraw.current = true;
      setIsSliding(false);
      setSliderX(maxSlideDistance);

      triggerDrawSuccess();

      setTimeout(() => {
        setSliderX(0);
        setSwayAngle(0);
      }, 600);
    }
  };

  const handleSliderPointerUp = () => {
    if (!isSliding) return;
    setIsSliding(false);

    if (sliderX >= maxSlideDistance * 0.72 && !hasTriggeredDraw.current) {
      hasTriggeredDraw.current = true;
      triggerDrawSuccess();
    }

    // Spring back smoothly
    setSliderX(0);
    setSwayAngle(0);
  };

  // Direct click on slider track to auto-slide & draw
  const handleSliderTrackClick = () => {
    if (isSliding || isShaking) return;
    setSliderX(maxSlideDistance);
    setSwayAngle(3.5);
    spawnLeafParticles(3);

    setTimeout(() => {
      triggerDrawSuccess();
      setTimeout(() => {
        setSliderX(0);
        setSwayAngle(0);
      }, 500);
    }, 250);
  };

  // Exactly 1 leaf per record from DB (100% Data-Driven)
  const renderedLeaves = useMemo(() => {
    const list = [];
    const count = leaves.length;
    if (count === 0 || tips.length === 0) return list;

    const tipCount = tips.length;

    leaves.forEach((item, idx) => {
      const seed = stringToSeed(item.id || `leaf_${idx}`);
      const leafR = rng(seed);
      // Distribute evenly across branch tips
      const tipIdx = idx % tipCount;
      const [tx, ty] = tips[tipIdx];

      const catKey = toFrontendCategory(item.tag_category);
      const dim = filterCategory && filterCategory !== catKey;
      const x = tx + (leafR() - 0.5) * 30;
      const y = ty + (leafR() - 0.5) * 24;
      const l = 19 + leafR() * 5; // Beautiful visible size
      const isHovered = hoveredLeaf?.id && hoveredLeaf.id === item.id;

      list.push(
        <g
          key={item.id || `leaf_${idx}`}
          transform={`translate(${f(x)} ${f(y)}) rotate(${f(leafR() * 360)})`}
          opacity={dim ? 0.12 : 1}
          style={{
            cursor: dim ? 'default' : 'pointer',
            pointerEvents: dim ? 'none' : 'auto',
            filter: dim
              ? 'blur(1.6px) grayscale(0.5)'
              : isHovered
              ? 'drop-shadow(0 0 14px rgba(255,245,210,1))'
              : 'drop-shadow(0 2px 5px rgba(0,0,0,0.22))',
            transition: 'opacity 0.3s ease, filter 0.3s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          className="group"
          onMouseEnter={() => {
            if (dim) return;
            onHoverLeaf &&
              onHoverLeaf({
                ...item,
                x,
                y,
                catKey,
              });
          }}
          onMouseLeave={() => {
            if (dim) return;
            onHoverLeaf && onHoverLeaf(null);
          }}
          onClick={(e) => {
            if (dim) return;
            e.stopPropagation();
            onHoverLeaf && onHoverLeaf(null); // Clear preview when opening modal
            if (onOpenLeafModal) {
              onOpenLeafModal({
                ...item,
                x,
                y,
                catKey,
              });
            }
          }}
        >
          <title>{`${item.title} — ${item.author_display_name || (language === 'en' ? 'Stranger' : 'Người lạ')}`}</title>
          {/* Main Leaf Body with hover zoom */}
          <path
            className="transition-transform duration-200 hover:scale-125"
            style={{
              animationDelay: `-${f(leafR() * 5)}s`,
              animationDuration: `${f(4 + leafR() * 3)}s`,
              stroke: isHovered ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
              strokeWidth: isHovered ? 2.4 : 0.8,
            }}
            d={leafPath(l, l * 0.42)}
            fill={`url(#${id}${catKey})`}
          />
          {/* Subtle Central Leaf Vein */}
          <path
            d={`M0 0 L${f(l * 0.72)} 0`}
            stroke="rgba(0, 0, 0, 0.18)"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        </g>
      );
    });

    return list;
  }, [leaves, filterCategory, hoveredLeaf, tips, id, onHoverLeaf, onOpenLeafModal, language]);

  // Sturdy root buttresses resting safely on the ground line (well within viewBox height)
  const roots = (
    <g>
      {/* Ground shadow beneath trunk */}
      <ellipse cx={cx} cy={base + 4} rx="240" ry="10" fill="#000" opacity="0.32" />

      {/* Primary root flares */}
      <path
        d={`M${cx - 20} ${base - 8} Q${cx - 65} ${base + 2} ${cx - 130} ${base + 5}`}
        stroke="#4A3326"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${cx + 18} ${base - 8} Q${cx + 65} ${base + 2} ${cx + 130} ${base + 5}`}
        stroke="#4A3326"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />
      {/* Secondary roots extending into the dark earth */}
      <path
        d={`M${cx - 10} ${base - 4} Q${cx - 40} ${base + 3} ${cx - 75} ${base + 5}`}
        stroke="#5A3E2E"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${cx + 10} ${base - 4} Q${cx + 40} ${base + 3} ${cx + 75} ${base + 5}`}
        stroke="#5A3E2E"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );

  const branches = br.map(([d, w], idx) => (
    <path
      key={idx}
      d={d}
      fill="none"
      stroke={`url(#${id}bark)`}
      strokeWidth={f(w)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ));

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      onMouseLeave={() => {
        // Automatically hide hover preview card when cursor leaves tree area
        onHoverLeaf && onHoverLeaf(null);
        handleSliderPointerUp();
      }}
      onMouseMove={(e) => handleSliderPointerMove(e.clientX)}
      onMouseUp={handleSliderPointerUp}
      onTouchMove={(e) => {
        if (e.touches[0]) handleSliderPointerMove(e.touches[0].clientX);
      }}
      onTouchEnd={handleSliderPointerUp}
    >
      {/* Interactive Compact Slider on the Right of Tree Trunk (Half-size) */}
      <div
        className="tree-draw-slider"
        style={{
          position: 'absolute',
          right: 'clamp(16px, 4.5vw, 80px)',
          bottom: '22px',
          zIndex: 25,
          width: '130px',
          height: '38px',
          borderRadius: '999px',
          background: 'rgba(32, 20, 14, 0.88)',
          border: '1.2px solid rgba(212, 176, 106, 0.5)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          padding: '3px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={handleSliderTrackClick}
        title={language === 'en' ? 'Slide or click to draw a wish' : 'Trượt hoặc nhấn để rút thông điệp'}
      >
        {/* Shimmering Track Guide Text */}
        <span
          style={{
            position: 'absolute',
            left: '36px',
            right: '8px',
            textAlign: 'center',
            fontSize: '10.5px',
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: '#EAD7BA',
            opacity: isSliding ? Math.max(0.15, 1 - sliderX / 60) : 0.85,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {isSliding
            ? (language === 'en' ? 'Release!' : 'Thả ra!')
            : (language === 'en' ? 'Draw wish →' : 'Rút lá →')}
        </span>

        {/* Golden Slider Knob */}
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            handleSliderPointerDown(e.clientX);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            if (e.touches[0]) handleSliderPointerDown(e.touches[0].clientX);
          }}
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ECC880 0%, #A67830 100%)',
            border: '1.5px solid #FFF5DC',
            boxShadow: isSliding
              ? '0 0 14px rgba(236,200,128,0.9), 0 4px 10px rgba(0,0,0,0.5)'
              : '0 2px 8px rgba(0,0,0,0.4)',
            transform: `translateX(${sliderX}px)`,
            transition: isSliding ? 'none' : 'transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '13px',
            cursor: isSliding ? 'grabbing' : 'grab',
            zIndex: 2,
          }}
          title={language === 'en' ? 'Drag to draw wish' : 'Kéo để rút thông điệp'}
        >
          🍃
        </div>
      </div>

      {/* Main Tree SVG Element: fits snugly and shows full trunk & base */}
      <svg
        className={isShaking ? 'tree-shaking' : ''}
        viewBox="0 0 1200 620"
        preserveAspectRatio="xMidYMax meet"
        style={{
          width: 'auto',
          maxWidth: '100%',
          height: '100%',
          maxHeight: '100%',
          display: 'block',
          margin: '0 auto',
          transform: isShaking
            ? undefined
            : `rotate(${Math.max(-5, Math.min(5, swayAngle))}deg)`,
          transformOrigin: '50% 95%',
          transition: isSliding ? 'none' : 'transform 0.5s cubic-bezier(0.17, 0.89, 0.32, 1.28)',
        }}
        aria-label="Cây Thông Điệp Tri Ân & Động Viên"
      >
        <defs>
          {/* Bark Gradient (Deep oak trunk) */}
          <linearGradient id={`${id}bark`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3E291E" />
            <stop offset="0.32" stopColor="#5E3E2E" />
            <stop offset="0.68" stopColor="#7F5640" />
            <stop offset="1" stopColor="#342117" />
          </linearGradient>

          {/* Unified Celestial Canopy Aura (Soft golden radial halo) */}
          <radialGradient id={`${id}unifiedAura`} cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#FFF2D4" stopOpacity="0.45" />
            <stop offset="35%" stopColor="#E5B974" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#C9934B" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#C9934B" stopOpacity="0" />
          </radialGradient>

          {/* Emotional Pastel Gradients for Leaves */}
          {CAT_KEYS.map((k) => (
            <linearGradient key={k} id={`${id}${k}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={CATS[k].c} />
              <stop offset="1" stopColor={CATS[k].hi} />
            </linearGradient>
          ))}
        </defs>

        {/* Unified harmonious light aura behind tree canopy */}
        <ellipse cx={cx} cy="290" rx="460" ry="210" fill={`url(#${id}unifiedAura)`} />

        {/* Tree Roots & Massive Sculpted Branches */}
        {roots}
        {branches}

        {/* 100% Data-Driven Leaves from Database */}
        {renderedLeaves}

        {/* Falling Leaves Particles */}
        {fallingParticles.map((p) => (
          <g
            key={`fp_${p.id}`}
            className="falling-leaf-particle"
            style={{
              '--fall-drift': `${p.drift}px`,
            }}
            transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`}
          >
            <path d={leafPath(20, 8)} fill={`url(#${id}${p.catKey})`} />
          </g>
        ))}

        {/* Hover Leaf Marker Highlight */}
        {hoveredLeaf && (
          <g
            transform={`translate(${hoveredLeaf.x || cx} ${hoveredLeaf.y || 260}) rotate(-25)`}
            style={{ pointerEvents: 'none' }}
          >
            <path
              d={leafPath(40, 16)}
              fill={CATEGORY_MAP[toFrontendCategory(hoveredLeaf.tag_category)]?.color || '#94C590'}
              stroke="#FFF"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 0 16px rgba(255,245,210,1))' }}
            />
          </g>
        )}
      </svg>
    </div>
  );
}

export default WishTree;

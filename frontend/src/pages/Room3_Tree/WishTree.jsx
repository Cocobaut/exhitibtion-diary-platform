import React, {
  useId,
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
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

export const WishTree = forwardRef(function WishTree(
  {
    leaves = [],
    filterCategory,
    hoveredLeaf,
    onHoverLeaf,
    onOpenLeafModal,
    onDrawRandomLeaf,
    isModalOpen = false,
  },
  ref
) {
  const { language } = useLanguage();
  const compId = useId().replace(/:/g, '');
  const id = `wt_${compId}_`;

  // Tree shake animation state
  const [isShaking, setIsShaking] = useState(false);
  const [fallingParticles, setFallingParticles] = useState([]);
  const [fallingDrawnLeaf, setFallingDrawnLeaf] = useState(null);

  // Responsive mode detection: Desktop (> 1024px) vs Compact (Tablet Portrait, Mobile Landscape, Mobile Portrait <= 1024px)
  const [screenMode, setScreenMode] = useState(() => {
    if (typeof window === 'undefined') return { isComputer: true, isLandscape: false };
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLand = w > h && (h <= 520 || w <= 896);
    return {
      isComputer: w > 1024 && !isLand,
      isLandscape: isLand,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLand = w > h && (h <= 520 || w <= 896);
      setScreenMode({
        isComputer: w > 1024 && !isLand,
        isLandscape: isLand,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const nextParticleId = useRef(1);

  // Coordinates for balanced tree with prominent trunk & roots
  const cx = 600;
  const base = 590; // Soil contact boundary
  const crotchY = 400; // Main trunk height ~190px (majestic oak proportions)

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
  const spawnLeafParticles = useCallback((count = 4) => {
    if (tips.length === 0) return;
    const catKeys = ['KL', 'CL', 'BO', 'GN'];
    const newItems = [];

    for (let i = 0; i < count; i++) {
      const tip = tips[Math.floor(Math.random() * tips.length)];
      const drift = (Math.random() - 0.5) * 160;
      const catKey = catKeys[Math.floor(Math.random() * catKeys.length)];

      newItems.push({
        id: nextParticleId.current++,
        x: tip[0] + (Math.random() - 0.5) * 20,
        y: tip[1] + (Math.random() - 0.5) * 16,
        catKey,
        drift,
        rotation: Math.floor(Math.random() * 360),
      });
    }

    setFallingParticles((prev) => [...prev.slice(-20), ...newItems]);
  }, [tips]);

  // Clean up completed particles
  useEffect(() => {
    if (fallingParticles.length === 0) return;
    const timer = setTimeout(() => {
      setFallingParticles((prev) => prev.filter((p) => Date.now() - p.id < 2200));
    }, 1800);
    return () => clearTimeout(timer);
  }, [fallingParticles]);

  // Trigger random leaf draw action with tree wobble and leaf fall animation
  const triggerDrawSuccess = useCallback(() => {
    if (isShaking || fallingDrawnLeaf) return;
    setIsShaking(true);
    spawnLeafParticles(10);

    const randomItem =
      leaves && leaves.length > 0
        ? leaves[Math.floor(Math.random() * leaves.length)]
        : {
            id: 'random',
            title: language === 'en' ? 'A Whisper of Hope' : 'Lời Thì Thầm Của Hy Vọng',
            content:
              language === 'en'
                ? 'Even the quietest leaf on this ancient tree carries strength. You are never alone in what you feel.'
                : 'Mỗi chiếc lá trên cây cổ thụ này đều mang theo sự kiên cường. Bạn không hề đơn độc với những cảm xúc của mình.',
            author_name: language === 'en' ? 'A quiet friend' : 'Một người bạn ẩn danh',
            tag_category: 'HEALING',
          };

    // Pick start position from upper branches
    const startTip = tips.length > 0 ? tips[Math.floor(Math.random() * tips.length)] : [cx, 260];
    const catKey = toFrontendCategory(randomItem.tag_category);

    setFallingDrawnLeaf({
      item: randomItem,
      startX: startTip[0],
      startY: startTip[1],
      catKey,
    });

    setTimeout(() => {
      setFallingDrawnLeaf(null);
      setIsShaking(false);
      if (onDrawRandomLeaf) {
        onDrawRandomLeaf(randomItem);
      }
    }, 1350);
  }, [isShaking, fallingDrawnLeaf, leaves, language, onDrawRandomLeaf, spawnLeafParticles, tips, cx]);

  useImperativeHandle(
    ref,
    () => ({
      triggerDraw: triggerDrawSuccess,
    }),
    [triggerDrawSuccess]
  );

  // Exactly 1 leaf per record from DB (100% Data-Driven Organic Leaves)
  const renderedLeaves = useMemo(() => {
    const list = [];
    const count = leaves.length;
    if (count === 0 || tips.length === 0) return list;

    const tipCount = tips.length;

    leaves.forEach((item, idx) => {
      const seed = stringToSeed(item.id || `leaf_${idx}`);
      const leafR = rng(seed);
      // Distribute evenly across branch tips
      const tipIdx = (idx * 7 + (seed % 17)) % tipCount;
      const [tx, ty] = tips[tipIdx];

      const catKey = toFrontendCategory(item.tag_category);
      const dim = filterCategory && filterCategory !== catKey;
      const x = tx + (leafR() - 0.5) * 32;
      const y = ty + (leafR() - 0.5) * 26;
      const l = 19 + leafR() * 6; // Visible natural size
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
          {/* Expanded Touch Target for iPad & Mobile Touch Ergonomics */}
          <circle r="26" fill="transparent" style={{ pointerEvents: 'all' }} />
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

  // Sturdy root buttresses resting safely on the ground line
  const roots = (
    <g className="tree-roots-group">
      {/* Ground shadow beneath trunk */}
      <ellipse
        cx={cx}
        cy={base + 4}
        rx={!screenMode.isComputer ? (screenMode.isLandscape ? 460 : 355) : 240}
        ry="12"
        fill="#000"
        opacity={!screenMode.isComputer ? 0.42 : 0.32}
      />

      {/* Primary root flares extending out to base boundaries */}
      <path
        d={
          !screenMode.isComputer
            ? screenMode.isLandscape
              ? `M${cx - 24} ${base - 10} Q${cx - 260} ${base + 2} 145 ${base + 5}`
              : `M${cx - 24} ${base - 10} Q${cx - 160} ${base + 2} 248 ${base + 5}`
            : `M${cx - 20} ${base - 8} Q${cx - 65} ${base + 2} ${cx - 130} ${base + 5}`
        }
        stroke="#4A3326"
        strokeWidth={!screenMode.isComputer ? 24 : 18}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={
          !screenMode.isComputer
            ? screenMode.isLandscape
              ? `M${cx + 22} ${base - 10} Q${cx + 260} ${base + 2} 1055 ${base + 5}`
              : `M${cx + 22} ${base - 10} Q${cx + 160} ${base + 2} 952 ${base + 5}`
            : `M${cx + 18} ${base - 8} Q${cx + 65} ${base + 2} ${cx + 130} ${base + 5}`
        }
        stroke="#4A3326"
        strokeWidth={!screenMode.isComputer ? 24 : 18}
        strokeLinecap="round"
        fill="none"
      />

      {/* Secondary roots extending into the dark earth */}
      <path
        d={
          !screenMode.isComputer
            ? screenMode.isLandscape
              ? `M${cx - 14} ${base - 5} Q${cx - 140} ${base + 3} 340 ${base + 5}`
              : `M${cx - 14} ${base - 5} Q${cx - 100} ${base + 3} 390 ${base + 5}`
            : `M${cx - 10} ${base - 4} Q${cx - 40} ${base + 3} ${cx - 75} ${base + 5}`
        }
        stroke="#5A3E2E"
        strokeWidth={!screenMode.isComputer ? 15 : 10}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={
          !screenMode.isComputer
            ? screenMode.isLandscape
              ? `M${cx + 14} ${base - 5} Q${cx + 140} ${base + 3} 860 ${base + 5}`
              : `M${cx + 14} ${base - 5} Q${cx + 100} ${base + 3} 810 ${base + 5}`
            : `M${cx + 10} ${base - 4} Q${cx + 40} ${base + 3} ${cx + 75} ${base + 5}`
        }
        stroke="#5A3E2E"
        strokeWidth={!screenMode.isComputer ? 15 : 10}
        strokeLinecap="round"
        fill="none"
      />

      {/* Tertiary roots anchoring into deep soil on compact view */}
      {!screenMode.isComputer && (
        <>
          <path
            d={`M${cx - 8} ${base - 2} Q${cx - 50} ${base + 4} ${cx - 95} ${base + 5}`}
            stroke="#3E291E"
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M${cx + 8} ${base - 2} Q${cx + 50} ${base + 4} ${cx + 95} ${base + 5}`}
            stroke="#3E291E"
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
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
      className="wish-tree-wrapper"
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
      }}
    >
      <style>{`
        @keyframes flutterLeafDown {
          0% {
            transform: translate(var(--leaf-start-x), var(--leaf-start-y)) rotate(0deg) scale(0.9);
            filter: drop-shadow(0 0 8px rgba(255, 240, 180, 0.85));
            opacity: 0.95;
          }
          25% {
            transform: translate(calc(var(--leaf-start-x) - 45px), calc(var(--leaf-start-y) + 95px)) rotate(-28deg) scale(1.08);
            filter: drop-shadow(0 0 15px rgba(255, 235, 160, 0.95));
          }
          50% {
            transform: translate(calc(var(--leaf-start-x) + 38px), calc(var(--leaf-start-y) + 210px)) rotate(24deg) scale(1.18);
            filter: drop-shadow(0 0 20px rgba(255, 240, 170, 1));
          }
          75% {
            transform: translate(calc(600px + (var(--leaf-start-x) - 600px) * 0.3 - 20px), 370px) rotate(-16deg) scale(1.24);
            filter: drop-shadow(0 0 24px rgba(255, 245, 180, 1));
          }
          100% {
            transform: translate(calc(600px + (var(--leaf-start-x) - 600px) * 0.1), 540px) rotate(8deg) scale(1.28);
            filter: drop-shadow(0 0 30px rgba(255, 250, 190, 1));
            opacity: 1;
          }
        }
        .falling-drawn-leaf {
          animation: flutterLeafDown 1.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          pointer-events: none;
        }
      `}</style>

      {/* Main Tree SVG Element: fits snugly and shows full trunk & base */}
      <svg
        className={`wish-tree-svg ${isShaking ? 'tree-shaking' : ''}`}
        onClick={(e) => {
          // Touching or clicking on the tree triggers the draw wish leaf fall experience
          if (!isShaking && !fallingDrawnLeaf) {
            triggerDrawSuccess();
          }
        }}
        viewBox={
          !screenMode.isComputer
            ? screenMode.isLandscape
              ? '135 90 930 515'
              : '240 70 720 535'
            : '0 0 1200 620'
        }
        preserveAspectRatio={
          !screenMode.isComputer && screenMode.isLandscape
            ? 'xMidYMax slice'
            : 'xMidYMax meet'
        }
        style={{
          width: !screenMode.isComputer ? '100%' : 'auto',
          maxWidth: '100%',
          height: '100%',
          maxHeight: '100%',
          display: 'block',
          margin: '0 auto',
          cursor: isShaking ? 'default' : 'pointer',
          transformOrigin: '50% 95%',
        }}
        aria-label="Cây Thông Điệp Tri Ân & Động Viên - Bấm vào cây để rút lá"
      >
        <defs>
          {/* Bark Gradient (Deep oak trunk) */}
          <linearGradient id={`${id}bark`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3E291E" />
            <stop offset="32%" stopColor="#5E3E2E" />
            <stop offset="68%" stopColor="#7F5640" />
            <stop offset="100%" stopColor="#342117" />
          </linearGradient>

          {/* Unified Celestial Canopy Aura (Soft golden radial halo) */}
          <radialGradient id={`${id}unifiedAura`} cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#FFF2D4" stopOpacity="0.45" />
            <stop offset="35%" stopColor="#E5B974" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#C9934B" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#C9934B" stopOpacity="0" />
          </radialGradient>

          {/* Glowing Halo for Drawn Leaf */}
          <radialGradient id={`${id}leafGlowHalo`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF7D6" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#E5B974" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#E5B974" stopOpacity="0" />
          </radialGradient>

          {/* Emotional Pastel Gradients for Leaves */}
          {CAT_KEYS.map((k) => (
            <linearGradient key={k} id={`${id}${k}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={CATS[k].c} />
              <stop offset="100%" stopColor={CATS[k].hi} />
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

        {/* Falling Ambient Leaves Particles */}
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

        {/* Animated Falling Lucky Leaf fluttering down when tree is clicked / wish is drawn */}
        {fallingDrawnLeaf && (
          <g
            className="falling-drawn-leaf"
            style={{
              '--leaf-start-x': `${f(fallingDrawnLeaf.startX)}px`,
              '--leaf-start-y': `${f(fallingDrawnLeaf.startY)}px`,
            }}
          >
            {/* Glowing Celestial Halo */}
            <circle cx="16" cy="0" r="28" fill={`url(#${id}leafGlowHalo)`} />
            {/* Main Drawn Leaf */}
            <path
              d={leafPath(36, 15)}
              fill={`url(#${id}${fallingDrawnLeaf.catKey})`}
              stroke="#FFFFFF"
              strokeWidth="2.2"
              style={{ filter: 'drop-shadow(0 0 16px rgba(255, 245, 200, 1))' }}
            />
            {/* Central Leaf Vein */}
            <path
              d="M0 0 L26 0"
              stroke="rgba(255, 255, 255, 0.75)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>
        )}

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
});

export default WishTree;

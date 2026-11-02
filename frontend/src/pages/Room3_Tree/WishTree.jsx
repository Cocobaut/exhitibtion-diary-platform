import React, { useId, useMemo, useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { rng, f } from '../../utils/rng';
import { toFrontendCategory, CATEGORY_MAP } from '../../services/room3Service';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

// Theme-adaptive palettes for Sacred Tanzaku Tree (Thân cây + Tán lá tương thích hoàn hảo với 4 nền)
const TREE_THEMES = {
  museum: {
    // 1. Bảo tàng chiều (Nâu đất ấm #564640): Cổ thụ Ngân Hạnh (Ginkgo) Vàng Hổ Phách & Thân Gỗ Mun Ánh Đồng
    bark: [
      { offset: '0%', color: '#2C1A12' },
      { offset: '25%', color: '#4E3120' },
      { offset: '55%', color: '#754C32' },
      { offset: '80%', color: '#8F6041' },
      { offset: '100%', color: '#24150E' },
    ],
    roots: [
      { offset: '0%', color: '#1C100B' },
      { offset: '35%', color: '#2C1A12' },
      { offset: '70%', color: '#4E3120' },
      { offset: '100%', color: '#1C100B' },
    ],
    foliageDeep: [
      { offset: '0%', color: '#5C3E14', opacity: 0.92 },
      { offset: '65%', color: '#3E2A0C', opacity: 0.88 },
      { offset: '100%', color: '#281A06', opacity: 0.82 },
    ],
    foliageMid: [
      { offset: '0%', color: '#E2B352', opacity: 0.90 },
      { offset: '55%', color: '#AB7A24', opacity: 0.86 },
      { offset: '100%', color: '#664614', opacity: 0.80 },
    ],
    aura: [
      { offset: '0%', color: '#FFF4D4', opacity: 0.38 },
      { offset: '40%', color: '#D9A84E', opacity: 0.18 },
      { offset: '75%', color: '#5C3E14', opacity: 0.04 },
      { offset: '100%', color: '#1B120C', opacity: 0 },
    ],
    mossGlow: [
      { offset: '0%', color: '#523418', opacity: 0.45 },
      { offset: '50%', color: '#301D0C', opacity: 0.22 },
      { offset: '100%', color: '#1A0F06', opacity: 0 },
    ],
  },
  moss: {
    // 2. Rêu cổ (Xanh rêu xám trầm #434D46): Cổ thụ Ngọc Bích & Thân Gỗ Gạch Nung Đất Ấm (Terracotta Wood)
    bark: [
      { offset: '0%', color: '#301A14' },
      { offset: '25%', color: '#542F23' },
      { offset: '55%', color: '#7D4735' },
      { offset: '80%', color: '#A05F47' },
      { offset: '100%', color: '#261510' },
    ],
    roots: [
      { offset: '0%', color: '#22120E' },
      { offset: '35%', color: '#381F18' },
      { offset: '70%', color: '#583226' },
      { offset: '100%', color: '#1D0F0B' },
    ],
    foliageDeep: [
      { offset: '0%', color: '#182E22', opacity: 0.92 },
      { offset: '65%', color: '#112118', opacity: 0.88 },
      { offset: '100%', color: '#0B150F', opacity: 0.82 },
    ],
    foliageMid: [
      { offset: '0%', color: '#669278', opacity: 0.90 },
      { offset: '55%', color: '#436652', opacity: 0.86 },
      { offset: '100%', color: '#253B30', opacity: 0.80 },
    ],
    aura: [
      { offset: '0%', color: '#EBFAF1', opacity: 0.34 },
      { offset: '40%', color: '#7BB090', opacity: 0.16 },
      { offset: '75%', color: '#253B30', opacity: 0.04 },
      { offset: '100%', color: '#0E1612', opacity: 0 },
    ],
    mossGlow: [
      { offset: '0%', color: '#2B3E34', opacity: 0.45 },
      { offset: '50%', color: '#1A2620', opacity: 0.22 },
      { offset: '100%', color: '#0E1511', opacity: 0 },
    ],
  },
  plum: {
    // 3. Mận chín (Tím mận hoài niệm #4F3E4B): Anh Đào Sương Mai (Pastel Sakura Rose) & Thân Gỗ Trầm Khói
    bark: [
      { offset: '0%', color: '#231720' },
      { offset: '25%', color: '#392634' },
      { offset: '55%', color: '#51374A' },
      { offset: '80%', color: '#6A4961' },
      { offset: '100%', color: '#1D121B' },
    ],
    roots: [
      { offset: '0%', color: '#181016' },
      { offset: '35%', color: '#271923' },
      { offset: '70%', color: '#412A3B' },
      { offset: '100%', color: '#181016' },
    ],
    foliageDeep: [
      { offset: '0%', color: '#5B374B', opacity: 0.92 },
      { offset: '65%', color: '#3E2333', opacity: 0.88 },
      { offset: '100%', color: '#24121E', opacity: 0.82 },
    ],
    foliageMid: [
      { offset: '0%', color: '#ECC3D5', opacity: 0.92 },
      { offset: '55%', color: '#BB859E', opacity: 0.88 },
      { offset: '100%', color: '#774962', opacity: 0.80 },
    ],
    aura: [
      { offset: '0%', color: '#FFF3FA', opacity: 0.36 },
      { offset: '40%', color: '#E0A7BE', opacity: 0.18 },
      { offset: '75%', color: '#5B374B', opacity: 0.05 },
      { offset: '100%', color: '#1E1018', opacity: 0 },
    ],
    mossGlow: [
      { offset: '0%', color: '#432637', opacity: 0.45 },
      { offset: '50%', color: '#271621', opacity: 0.22 },
      { offset: '100%', color: '#130B10', opacity: 0 },
    ],
  },
  paper: {
    // 4. Giấy cũ (Nền sáng ngả vàng #E6D7C1): Tranh Thủy Mặc Xanh Trà (Tea Green Wash) & Thân Mực Nho Sumi-e
    bark: [
      { offset: '0%', color: '#2E221A' },
      { offset: '25%', color: '#473427' },
      { offset: '55%', color: '#624A3A' },
      { offset: '80%', color: '#7A5B47' },
      { offset: '100%', color: '#251A13' },
    ],
    roots: [
      { offset: '0%', color: '#231812' },
      { offset: '35%', color: '#36271D' },
      { offset: '70%', color: '#4D382B' },
      { offset: '100%', color: '#231812' },
    ],
    foliageDeep: [
      { offset: '0%', color: '#42523F', opacity: 0.88 },
      { offset: '65%', color: '#303C2D', opacity: 0.84 },
      { offset: '100%', color: '#21291F', opacity: 0.78 },
    ],
    foliageMid: [
      { offset: '0%', color: '#9AB195', opacity: 0.88 },
      { offset: '55%', color: '#718B6B', opacity: 0.84 },
      { offset: '100%', color: '#4D6247', opacity: 0.78 },
    ],
    aura: [
      { offset: '0%', color: '#FCFBF5', opacity: 0.45 },
      { offset: '40%', color: '#DDE6D6', opacity: 0.25 },
      { offset: '75%', color: '#718B6B', opacity: 0.06 },
      { offset: '100%', color: '#CDB79A', opacity: 0 },
    ],
    mossGlow: [
      { offset: '0%', color: '#786854', opacity: 0.28 },
      { offset: '50%', color: '#4A3F32', opacity: 0.14 },
      { offset: '100%', color: '#2B231A', opacity: 0 },
    ],
  },
};

// Export leafPath and petalPath for external modal previews
export const leafPath = (l = 30, w = 12) =>
  `M0 0 Q${f(l * 0.45)} ${f(-w)} ${f(l)} 0 Q${f(l * 0.45)} ${f(w)} 0 0Z`;

export const petalPath = (w = 6, h = 10) =>
  `M0 ${-h / 2} C${w} ${-h / 3} ${w} ${h / 3} 0 ${h / 2} C${-w} ${h / 3} ${-w} ${-h / 3} 0 ${-h / 2} Z`;

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

/**
 * Cây Cổ Thụ Thẻ Ước Nguyện Nhật Bản (Sacred Tanzaku Tree):
 * - Cành cây cổ thụ to lớn, vươn rộng rõ ràng, tự nhiên, không bị che khuất.
 * - Loại bỏ hoàn toàn các khối tròn hồng trắng nhân tạo.
 * - Các thẻ ước nguyện Tanzaku treo rủ từ các cành cây trải đều cân đối.
 */
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
  const { theme: currentTheme = 'museum' } = useTheme();
  const activeTreeTheme = TREE_THEMES[currentTheme] || TREE_THEMES.museum;
  const compId = useId().replace(/:/g, '');
  const id = `wt_${compId}_`;

  // Tree sway and shake animation state
  const [swayAngle, setSwayAngle] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [fallingWishTag, setFallingWishTag] = useState(null);

  // Exact coordinates for balanced, fully visible tree with prominent trunk & roots
  const cx = 600;
  const base = 590; // Ground line
  const crotchY = 390; // Sturdy trunk height ~200px

  // Generate interconnected branch skeleton (rendered prominently in full view)
  const { br, tips } = useMemo(() => {
    const branches = [];
    const endTips = [];
    const genR = rng(23);

    // Tier 0: Ancient sculpted trunk (sturdy oak proportions)
    branches.push([
      `M${cx} ${base} Q${cx - 6} 490 ${cx} ${crotchY}`,
      46,
    ]);

    // Tier 1: 4 Primary Limbs starting at crotch (cx, crotchY)
    const t1Endpoints = [
      { startX: cx, startY: crotchY, endX: cx - 145, endY: 325, ctrlX: cx - 72, ctrlY: 365, width: 29 },
      { startX: cx, startY: crotchY, endX: cx - 48, endY: 285, ctrlX: cx - 24, ctrlY: 345, width: 25 },
      { startX: cx, startY: crotchY, endX: cx + 48, endY: 285, ctrlX: cx + 24, ctrlY: 345, width: 25 },
      { startX: cx, startY: crotchY, endX: cx + 145, endY: 325, ctrlX: cx + 72, ctrlY: 365, width: 29 },
    ];

    t1Endpoints.forEach((limb) => {
      branches.push([
        `M${limb.startX} ${limb.startY} Q${limb.ctrlX} ${limb.ctrlY} ${limb.endX} ${limb.endY}`,
        limb.width,
      ]);
    });

    // Recursive child branch grower
    function growBoughs(startX, startY, len, ang, depth) {
      const endX = startX + Math.cos(ang) * len;
      const endY = startY + Math.sin(ang) * len;
      const bend = (genR() - 0.5) * len * 0.28;
      const qx = (startX + endX) / 2 + Math.cos(ang + Math.PI / 2) * bend;
      const qy = (startY + endY) / 2 + Math.sin(ang + Math.PI / 2) * bend;

      const w = Math.max(4, depth * depth * 0.95);
      branches.push([
        `M${f(startX)} ${f(startY)} Q${f(qx)} ${f(qy)} ${f(endX)} ${f(endY)}`,
        w,
      ]);

      if (depth <= 2) {
        endTips.push([endX, endY]);
      }

      if (depth <= 1) return;

      const count = depth >= 3 ? (genR() < 0.4 ? 3 : 2) : 2;
      const spread = depth >= 3 ? 0.62 : 0.48;

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

    // Tier 2: Directly connected boughs spreading majestically across the canvas
    growBoughs(cx - 145, 325, 75, -Math.PI * 0.82, 3);
    growBoughs(cx - 145, 325, 65, -Math.PI * 0.62, 3);

    growBoughs(cx - 48, 285, 70, -Math.PI * 0.65, 3);
    growBoughs(cx - 48, 285, 62, -Math.PI * 0.48, 3);

    growBoughs(cx + 48, 285, 62, -Math.PI * 0.52, 3);
    growBoughs(cx + 48, 285, 70, -Math.PI * 0.35, 3);

    growBoughs(cx + 145, 325, 65, -Math.PI * 0.38, 3);
    growBoughs(cx + 145, 325, 75, -Math.PI * 0.18, 3);

    // Mid-limb side branches
    growBoughs(cx - 80, 350, 58, -Math.PI * 0.85, 2);
    growBoughs(cx + 80, 350, 58, -Math.PI * 0.15, 2);

    return { br: branches, tips: endTips };
  }, [base, crotchY]);

  // Ambient Tanzaku Strips (shown only if very few user leaves exist to ensure lively look)
  const ambientTanzaku = useMemo(() => {
    if (tips.length === 0 || leaves.length >= 6) return [];
    const list = [];
    const r = rng(88812);
    const chosenTips = tips.filter((_, idx) => idx % 6 === 2).slice(0, 6);
    const catKeys = ['KL', 'CL', 'BO', 'GN'];

    chosenTips.forEach(([tx, ty], idx) => {
      const ax = tx + (r() - 0.5) * 20;
      const ay = ty + (r() - 0.5) * 12;
      const cordLen = 16 + r() * 14;
      const ox = ax;
      const oy = ay + cordLen;
      const catKey = catKeys[idx % catKeys.length];
      const w = 18;
      const h = 40;
      const swayDur = (3.6 + r() * 2).toFixed(2);
      const swayDel = (r() * 3.2).toFixed(2);

      list.push({ id: `amb_tanzaku_${idx}`, ax, ay, ox, oy, w, h, catKey, swayDur, swayDel });
    });
    return list;
  }, [tips, leaves.length]);

  // Trigger random wish draw action:
  // 1. Shakes tree
  // 2. A Tanzaku card flutters from branches ALL THE WAY DOWN TO THE GROUND (1.38s)
  // 3. ONLY WHEN IT TOUCHES THE GROUND does the read modal open!
  const triggerDrawSuccess = useCallback(() => {
    if (isShaking) return;
    setIsShaking(true);
    setSwayAngle(0);

    // Pick a random wish to animate falling down
    const items = leaves && leaves.length > 0 ? leaves : [
      {
        id: 'whisper_default',
        title: language === 'en' ? 'A Whisper of Hope' : 'Lời Thì Thầm Của Hy Vọng',
        content: language === 'en' ? 'Every branch carries strength. You are never alone.' : 'Mỗi cành cây đều mang theo sức mạnh. Bạn không hề đơn độc.',
        author_display_name: language === 'en' ? 'A quiet friend' : 'Một người bạn ẩn danh',
        tag_category: 'CL',
      }
    ];

    const randomItem = items[Math.floor(Math.random() * items.length)];
    const startX = cx + (Math.random() - 0.5) * 120;
    const startY = 225 + Math.random() * 45;
    const catKey = toFrontendCategory(randomItem.tag_category);

    setFallingWishTag({
      item: randomItem,
      startX,
      startY,
      catKey,
    });

    // Wait until the wish card falls completely to the ground (1.38s)
    setTimeout(() => {
      setFallingWishTag(null);
      setIsShaking(false);
      if (onDrawRandomLeaf) {
        onDrawRandomLeaf(randomItem);
      }
    }, 1380);
  }, [isShaking, leaves, language, onDrawRandomLeaf, cx]);

  useImperativeHandle(
    ref,
    () => ({
      triggerDraw: triggerDrawSuccess,
    }),
    [triggerDrawSuccess]
  );

  // Each visitor message is a vertical Japanese Tanzaku Wish Strip distributed evenly across branches
  const renderedTanzaku = useMemo(() => {
    const list = [];
    const count = leaves.length;
    if (count === 0 || tips.length === 0) return list;

    const tipCount = tips.length;

    leaves.forEach((item, idx) => {
      const seed = stringToSeed(item.id || `tanzaku_${idx}`);
      const leafR = rng(seed);

      // Distribute evenly across left, center, right boughs (coprime stride + seed)
      const tipIdx = (idx * 7 + (seed % 19)) % tipCount;
      const [tx, ty] = tips[tipIdx];

      const catKey = toFrontendCategory(item.tag_category);
      const dim = filterCategory && filterCategory !== catKey;

      // Anchor point on branch
      const ax = tx + (leafR() - 0.5) * 28;
      const ay = ty + (leafR() - 0.5) * 16;

      // Silk cord drop length
      const cordLen = 16 + leafR() * 16;
      const ox = ax;
      const oy = ay + cordLen;
      const w = 20;
      const h = 44;

      const isHovered = hoveredLeaf?.id && hoveredLeaf.id === item.id;
      const swayDuration = (3.6 + leafR() * 2).toFixed(2);
      const swayDelay = (leafR() * 3).toFixed(2);

      list.push(
        <g
          key={item.id || `tanzaku_${idx}`}
          className="tanzaku-sway-group group"
          style={{
            '--anchor-x': `${f(ax)}px`,
            '--anchor-y': `${f(ay)}px`,
            '--sway-duration': `${swayDuration}s`,
            '--sway-delay': `${swayDelay}s`,
            cursor: dim ? 'default' : 'pointer',
            pointerEvents: dim ? 'none' : 'auto',
            opacity: dim ? 0.15 : 1,
            transition: 'opacity 0.3s ease, filter 0.3s ease',
          }}
          onMouseEnter={() => {
            if (dim) return;
            onHoverLeaf &&
              onHoverLeaf({
                ...item,
                x: ox,
                y: oy + h / 2,
                ox,
                oy: oy + h / 2,
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
            onHoverLeaf && onHoverLeaf(null);
            if (onOpenLeafModal) {
              onOpenLeafModal({
                ...item,
                x: ox,
                y: oy + h / 2,
                ox,
                oy: oy + h / 2,
                catKey,
              });
            }
          }}
        >
          <title>{`${item.title} — ${item.author_display_name || (language === 'en' ? 'Stranger' : 'Người lạ')}`}</title>

          {/* Traditional vermilion silk hanging cord tied to branch */}
          <line
            x1={f(ax)}
            y1={f(ay)}
            x2={f(ox)}
            y2={f(oy + 3)}
            stroke="#D14343"
            strokeWidth="1.2"
          />

          {/* Small tie knot on branch */}
          <circle
            cx={f(ax)}
            cy={f(ay)}
            r="1.8"
            fill="#D14343"
          />

          {/* Tiny golden eyelet ring where cord threads through */}
          <circle
            cx={f(ox)}
            cy={f(oy + 3.5)}
            r="1.4"
            fill="none"
            stroke="#E5B95C"
            strokeWidth="0.8"
          />

          {/* Tanzaku Paper Strip with hover scale */}
          <g
            className="transition-transform duration-200"
            style={{
              transformOrigin: `${f(ox)}px ${f(oy)}px`,
              transform: isHovered ? 'scale(1.26)' : 'scale(1)',
              filter: isHovered
                ? 'drop-shadow(0 0 16px rgba(255, 235, 150, 0.95)) drop-shadow(0 8px 16px rgba(0,0,0,0.45))'
                : 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35))',
            }}
          >
            {/* Washi Paper Body */}
            <rect
              x={f(ox - w / 2)}
              y={f(oy)}
              width={w}
              height={h}
              rx="2.5"
              fill={`url(#${id}washiPaper)`}
              stroke={isHovered ? '#FFFFFF' : 'rgba(215, 195, 160, 0.7)'}
              strokeWidth={isHovered ? 1.6 : 0.8}
            />

            {/* Top Category Colored Header Banner */}
            <rect
              x={f(ox - w / 2)}
              y={f(oy)}
              width={w}
              height="7"
              rx="2.5"
              fill={`url(#${id}${catKey}Header)`}
            />
            <rect
              x={f(ox - w / 2)}
              y={f(oy + 4)}
              width={w}
              height="3"
              fill={`url(#${id}${catKey}Header)`}
            />

            {/* Central Vertical Wish Calligraphy Strokes */}
            <line
              x1={f(ox)}
              y1={f(oy + 11)}
              x2={f(ox)}
              y2={f(oy + 29)}
              stroke="rgba(55, 38, 28, 0.55)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <line
              x1={f(ox + 3.6)}
              y1={f(oy + 14)}
              x2={f(ox + 3.6)}
              y2={f(oy + 25)}
              stroke="rgba(55, 38, 28, 0.35)"
              strokeWidth="0.8"
              strokeLinecap="round"
            />

            {/* Traditional Red Hanko Seal Stamp at bottom */}
            <rect
              x={f(ox - 1)}
              y={f(oy + h - 8.5)}
              width="6"
              height="5.5"
              rx="1"
              fill="#C0392B"
              opacity="0.85"
            />

            {/* Hanging Silk Tassel at bottom */}
            <line
              x1={f(ox)}
              y1={f(oy + h)}
              x2={f(ox)}
              y2={f(oy + h + 8)}
              stroke="#D14343"
              strokeWidth="1"
            />
            <circle
              cx={f(ox)}
              cy={f(oy + h + 8)}
              r="1.4"
              fill="#E5B95C"
            />
          </g>
        </g>
      );
    });

    return list;
  }, [leaves, filterCategory, hoveredLeaf, tips, id, onHoverLeaf, onOpenLeafModal, language]);

  // Sturdy ancient root buttresses spreading wider and firmly anchored into the earth
  const roots = (
    <g>
      {/* Soft twilight ground glow under trunk base */}
      <ellipse cx={cx} cy={base + 4} rx="340" ry="18" fill={`url(#${id}mossGlow)`} />

      {/* Broad, majestic root buttresses flaring gracefully out to both sides */}
      {/* Primary massive left root flare */}
      <path
        d={`M${cx - 15} ${base - 32} Q${cx - 75} ${base - 10} ${cx - 195} ${base + 4}`}
        stroke={`url(#${id}roots)`}
        strokeWidth="26"
        strokeLinecap="round"
        fill="none"
      />
      {/* Primary massive right root flare */}
      <path
        d={`M${cx + 15} ${base - 32} Q${cx + 75} ${base - 10} ${cx + 195} ${base + 4}`}
        stroke={`url(#${id}roots)`}
        strokeWidth="26"
        strokeLinecap="round"
        fill="none"
      />
      {/* Secondary outer left root extending wider */}
      <path
        d={`M${cx - 28} ${base - 18} Q${cx - 110} ${base - 2} ${cx - 240} ${base + 6}`}
        stroke={`url(#${id}roots)`}
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
      />
      {/* Secondary outer right root extending wider */}
      <path
        d={`M${cx + 28} ${base - 18} Q${cx + 110} ${base - 2} ${cx + 240} ${base + 6}`}
        stroke={`url(#${id}roots)`}
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
      />
      {/* Central grounded taproot flares */}
      <path
        d={`M${cx - 8} ${base - 12} Q${cx - 45} ${base + 1} ${cx - 95} ${base + 6}`}
        stroke={`url(#${id}roots)`}
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${cx + 8} ${base - 12} Q${cx + 45} ${base + 1} ${cx + 95} ${base + 6}`}
        stroke={`url(#${id}roots)`}
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );

  // All branches prominently rendered in full view
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

  // Soft Dusky Pink/Plum Canopy Clouds ("màu hồng mờ mờ" giữ lại phía sau cành cây)
  const canopyClouds = [
    // Layer 1: Core background masses
    { key: 'c1', cx: cx, cy: 220, rx: 240, ry: 135, fill: `url(#${id}foliageDeep)`, opacity: 0.88 },
    { key: 'c2', cx: cx - 185, cy: 240, rx: 180, ry: 115, fill: `url(#${id}foliageDeep)`, opacity: 0.84 },
    { key: 'c3', cx: cx + 185, cy: 240, rx: 180, ry: 115, fill: `url(#${id}foliageDeep)`, opacity: 0.84 },
    { key: 'c4', cx: cx - 300, cy: 280, rx: 140, ry: 95, fill: `url(#${id}foliageDeep)`, opacity: 0.78 },
    { key: 'c5', cx: cx + 300, cy: 280, rx: 140, ry: 95, fill: `url(#${id}foliageDeep)`, opacity: 0.78 },

    // Layer 2: Mid-tier soft dusky rose clouds (không có các khối tròn hồng trắng)
    { key: 'c6', cx: cx - 75, cy: 190, rx: 160, ry: 100, fill: `url(#${id}foliageMid)`, opacity: 0.86 },
    { key: 'c7', cx: cx + 75, cy: 190, rx: 160, ry: 100, fill: `url(#${id}foliageMid)`, opacity: 0.86 },
    { key: 'c8', cx: cx - 205, cy: 220, rx: 140, ry: 90, fill: `url(#${id}foliageMid)`, opacity: 0.82 },
    { key: 'c9', cx: cx + 205, cy: 220, rx: 140, ry: 90, fill: `url(#${id}foliageMid)`, opacity: 0.82 },
    { key: 'c10', cx: cx - 110, cy: 270, rx: 150, ry: 90, fill: `url(#${id}foliageMid)`, opacity: 0.80 },
    { key: 'c11', cx: cx + 110, cy: 270, rx: 150, ry: 90, fill: `url(#${id}foliageMid)`, opacity: 0.80 },
    { key: 'c12', cx: cx, cy: 150, rx: 140, ry: 85, fill: `url(#${id}foliageMid)`, opacity: 0.88 },
  ];

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
        onHoverLeaf && onHoverLeaf(null);
      }}
    >
      <style>{`
        @keyframes tanzakuSway {
          0%, 100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(3.5deg);
          }
        }
        .tanzaku-sway-group {
          animation: tanzakuSway var(--sway-duration, 4s) ease-in-out infinite;
          animation-delay: var(--sway-delay, 0s);
          transform-origin: var(--anchor-x) var(--anchor-y);
        }

        @keyframes flutterTagDown {
          0% {
            transform: translate(var(--tag-start-x), var(--tag-start-y)) rotate(0deg) scale(0.95);
            opacity: 1;
            filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35));
          }
          28% {
            transform: translate(calc(var(--tag-start-x) + 32px), calc(var(--tag-start-y) + 100px)) rotate(14deg) scale(1.05);
            filter: drop-shadow(0 0 14px rgba(255, 230, 140, 0.8));
          }
          60% {
            transform: translate(calc(var(--tag-start-x) - 24px), calc(var(--tag-start-y) + 210px)) rotate(-12deg) scale(1.15);
            filter: drop-shadow(0 0 18px rgba(255, 235, 150, 0.9));
          }
          88% {
            transform: translate(calc(600px + (var(--tag-start-x) - 600px) * 0.25), 510px) rotate(4deg) scale(1.22);
            filter: drop-shadow(0 0 22px rgba(255, 240, 160, 1));
          }
          100% {
            /* Touches the ground safely at the base */
            transform: translate(calc(600px + (var(--tag-start-x) - 600px) * 0.1), 555px) rotate(0deg) scale(1.25);
            filter: drop-shadow(0 0 28px rgba(255, 245, 180, 1));
          }
        }
        .falling-drawn-tag {
          animation: flutterTagDown 1.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          pointer-events: none;
        }

        @keyframes fireflyDrift {
          0%, 100% {
            transform: translate(0, 0) scale(0.85);
            opacity: 0.35;
          }
          50% {
            transform: translate(var(--ff-drift-x), var(--ff-drift-y)) scale(1.3);
            opacity: 0.98;
          }
        }
        .firefly-node {
          animation: fireflyDrift var(--ff-duration) ease-in-out infinite;
          animation-delay: var(--ff-delay);
          pointer-events: none;
        }
      `}</style>

      {/* Main Japanese Sacred Tanzaku Tree SVG */}
      <svg
        className={isShaking ? 'tree-shaking' : ''}
        onClick={(e) => {
          // Touching or clicking on the tree triggers the draw wish experience
          if (!isShaking && !fallingWishTag) {
            triggerDrawSuccess();
          }
        }}
        viewBox="0 0 1200 620"
        preserveAspectRatio="xMidYMax meet"
        style={{
          width: 'auto',
          maxWidth: '100%',
          height: '100%',
          maxHeight: '100%',
          display: 'block',
          margin: '0 auto',
          cursor: isShaking ? 'default' : 'pointer',
          transform: isShaking
            ? undefined
            : `rotate(${Math.max(-5, Math.min(5, swayAngle))}deg)`,
          transformOrigin: '50% 95%',
          transition: 'transform 0.5s cubic-bezier(0.17, 0.89, 0.32, 1.28)',
        }}
        aria-label="Cây Thẻ Ước Nguyện Cổ Thụ - Bấm vào cây để rút thông điệp"
      >
        <defs>
          {/* Theme-Adaptive Bark Gradient */}
          <linearGradient id={`${id}bark`} x1="0" y1="0" x2="1" y2="0">
            {activeTreeTheme.bark.map((b, i) => (
              <stop key={i} offset={b.offset} stopColor={b.color} />
            ))}
          </linearGradient>

          {/* Theme-Adaptive Celestial Aura behind Tree */}
          <radialGradient id={`${id}unifiedAura`} cx="50%" cy="45%" r="50%">
            {activeTreeTheme.aura.map((a, i) => (
              <stop key={i} offset={a.offset} stopColor={a.color} stopOpacity={a.opacity} />
            ))}
          </radialGradient>

          {/* Theme-Adaptive Deep Foliage Gradient */}
          <radialGradient id={`${id}foliageDeep`} cx="45%" cy="40%" r="60%">
            {activeTreeTheme.foliageDeep.map((f, i) => (
              <stop key={i} offset={f.offset} stopColor={f.color} stopOpacity={f.opacity} />
            ))}
          </radialGradient>

          {/* Theme-Adaptive Mid Foliage Gradient */}
          <radialGradient id={`${id}foliageMid`} cx="40%" cy="35%" r="60%">
            {activeTreeTheme.foliageMid.map((f, i) => (
              <stop key={i} offset={f.offset} stopColor={f.color} stopOpacity={f.opacity} />
            ))}
          </radialGradient>

          {/* Authentic Washi Paper Strip Texture Gradient */}
          <linearGradient id={`${id}washiPaper`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFDF7" />
            <stop offset="50%" stopColor="#FAF4E8" />
            <stop offset="100%" stopColor="#F5ECE0" />
          </linearGradient>

          {/* Falling Sakura Petal Gradient */}
          <linearGradient id={`${id}sakuraPetal`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF0F5" />
            <stop offset="60%" stopColor="#F8B4C8" />
            <stop offset="100%" stopColor="#E26D8B" />
          </linearGradient>

          {/* Firefly Light Halo */}
          <radialGradient id={`${id}fireflyHalo`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE082" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#FFCA28" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFA000" stopOpacity="0" />
          </radialGradient>

          {/* Theme-Adaptive Ground Glow */}
          <radialGradient id={`${id}mossGlow`} cx="50%" cy="50%" r="50%">
            {activeTreeTheme.mossGlow.map((m, i) => (
              <stop key={i} offset={m.offset} stopColor={m.color} stopOpacity={m.opacity} />
            ))}
          </radialGradient>

          {/* Theme-Adaptive Roots Gradient */}
          <linearGradient id={`${id}roots`} x1="0" y1="0" x2="1" y2="0">
            {activeTreeTheme.roots.map((r, i) => (
              <stop key={i} offset={r.offset} stopColor={r.color} />
            ))}
          </linearGradient>

          {/* Category-Specific Header Banners for Tanzaku Strips */}
          {/* KL: Khích lệ - Rose Coral */}
          <linearGradient id={`${id}KLHeader`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF6B8B" />
            <stop offset="100%" stopColor="#FF8E53" />
          </linearGradient>

          {/* CL: Chữa lành - Golden Amber */}
          <linearGradient id={`${id}CLHeader`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F39C12" />
            <stop offset="100%" stopColor="#F1C40F" />
          </linearGradient>

          {/* BO: Biết ơn - Matcha Jade */}
          <linearGradient id={`${id}BOHeader`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2ECC71" />
            <stop offset="100%" stopColor="#1ABC9C" />
          </linearGradient>

          {/* GN: Góc nhìn - Twilight Amethyst */}
          <linearGradient id={`${id}GNHeader`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#9B59B6" />
            <stop offset="100%" stopColor="#8E44AD" />
          </linearGradient>
        </defs>

        {/* 1. Celestial Soft Starlight Halo behind Tree */}
        <ellipse cx={cx} cy="275" rx="510" ry="235" fill={`url(#${id}unifiedAura)`} />

        {/* 2. Soft Cloud Canopy (Theme-adaptive styling) */}
        <g style={{ filter: currentTheme === 'paper' ? 'drop-shadow(0 6px 16px rgba(45, 55, 40, 0.22))' : 'drop-shadow(0 6px 20px rgba(15, 10, 8, 0.45))' }}>
          {canopyClouds.map((c) => (
            <ellipse
              key={c.key}
              cx={c.cx}
              cy={c.cy}
              rx={c.rx}
              ry={c.ry}
              fill={c.fill}
              opacity={c.opacity}
            />
          ))}
        </g>

        {/* 3. Ground Roots anchored firmly into the earth */}
        {roots}

        {/* 4. Ancient Tree Branches & Boughs (clearly visible in front of the soft pink canopy) */}
        <g style={{ filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.5))' }}>
          {branches}
        </g>

        {/* 5. Ambient Tanzaku Strips (if sparse) */}
        {ambientTanzaku.map((t) => (
          <g
            key={t.id}
            className="tanzaku-sway-group"
            style={{
              '--anchor-x': `${f(t.ax)}px`,
              '--anchor-y': `${f(t.ay)}px`,
              '--sway-duration': `${t.swayDur}s`,
              '--sway-delay': `${t.swayDel}s`,
              pointerEvents: 'none',
              opacity: 0.75,
            }}
          >
            <line
              x1={f(t.ax)}
              y1={f(t.ay)}
              x2={f(t.ox)}
              y2={f(t.oy + 3)}
              stroke="#D14343"
              strokeWidth="1"
            />
            <rect
              x={f(t.ox - t.w / 2)}
              y={f(t.oy)}
              width={t.w}
              height={t.h}
              rx="2"
              fill={`url(#${id}washiPaper)`}
              stroke="rgba(215, 195, 160, 0.55)"
              strokeWidth="0.7"
            />
            <rect
              x={f(t.ox - t.w / 2)}
              y={f(t.oy)}
              width={t.w}
              height="6"
              rx="2"
              fill={`url(#${id}${t.catKey}Header)`}
            />
            <line
              x1={f(t.ox)}
              y1={f(t.oy + 10)}
              x2={f(t.ox)}
              y2={f(t.oy + 26)}
              stroke="rgba(55, 38, 28, 0.4)"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <rect
              x={f(t.ox - 1)}
              y={f(t.oy + t.h - 7)}
              width="5"
              height="4.5"
              rx="0.8"
              fill="#C0392B"
              opacity="0.8"
            />
            <line
              x1={f(t.ox)}
              y1={f(t.oy + t.h)}
              x2={f(t.ox)}
              y2={f(t.oy + t.h + 7)}
              stroke="#D14343"
              strokeWidth="0.9"
            />
          </g>
        ))}

        {/* 7. 100% Data-Driven Message Tanzaku Wish Strips hanging directly from branches */}
        {renderedTanzaku}

        {/* 8. Animated Falling Wish Tag fluttering down when tree is clicked / wish is drawn */}
        {fallingWishTag && (
          <g
            className="falling-drawn-tag"
            style={{
              '--tag-start-x': `${f(fallingWishTag.startX)}px`,
              '--tag-start-y': `${f(fallingWishTag.startY)}px`,
            }}
          >
            {/* Washi Paper Body */}
            <rect
              x="-10"
              y="0"
              width="20"
              height="44"
              rx="2.5"
              fill={`url(#${id}washiPaper)`}
              stroke="#FFFFFF"
              strokeWidth="1.6"
            />
            {/* Top Category Colored Header Banner */}
            <rect
              x="-10"
              y="0"
              width="20"
              height="7"
              rx="2.5"
              fill={`url(#${id}${fallingWishTag.catKey}Header)`}
            />
            {/* Central Vertical Calligraphy Strokes */}
            <line x1="0" y1="11" x2="0" y2="29" stroke="rgba(55, 38, 28, 0.55)" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="3.6" y1="14" x2="3.6" y2="25" stroke="rgba(55, 38, 28, 0.35)" strokeWidth="0.8" strokeLinecap="round" />
            {/* Red Hanko Stamp Seal */}
            <rect x="-1" y="35.5" width="6" height="5.5" rx="1" fill="#C0392B" opacity="0.85" />
            {/* Hanging Silk Tassel */}
            <line x1="0" y1="44" x2="0" y2="52" stroke="#D14343" strokeWidth="1.2" />
            <circle cx="0" cy="52" r="1.6" fill="#E5B95C" />
          </g>
        )}

        {/* 9. Hover Tanzaku Marker Highlight */}
        {hoveredLeaf && (
          <g
            transform={`translate(${hoveredLeaf.ox || hoveredLeaf.x || cx} ${hoveredLeaf.oy || hoveredLeaf.y || 260})`}
            style={{ pointerEvents: 'none' }}
          >
            <rect
              x="-15"
              y="-28"
              width="30"
              height="56"
              rx="4"
              fill="none"
              stroke="#FFFBE6"
              strokeWidth="2.2"
              strokeDasharray="4 2"
              style={{ filter: 'drop-shadow(0 0 16px rgba(255, 230, 140, 1))' }}
            />
          </g>
        )}
      </svg>
    </div>
  );
});

export default WishTree;

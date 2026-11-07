import React, { useId, useState, useEffect, useRef, useMemo } from 'react';
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
  isOpened = false,
  isLocked = false,
  activeFilter = 'all',
  isSearchActive = false,
  isSearchMatch = false,
  onClick,
  titleText = "Nhấn hoặc kéo xuống để đọc thư",
}) {
  const compId = useId().replace(/:/g, '');
  const r = rng(seed);
  const lanternKind = kind || SYM_KEYS[Math.floor(r() * SYM_KEYS.length)];
  const id = `lt_${compId}_${seed}_`;

  const [isHovered, setIsHovered] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const currentDragRef = useRef(0);

  // Visual Theme calculation: 'mine' (Red/Burgundy) vs 'all' (Warm Amber/Orange) vs 'dimmed'
  // Quy tắc người dùng:
  // - Khi ở tab "tất cả": nếu art thỏa search thì đổi màu đèn thành đèn giống tab "của tôi" (red/crimson). Không xóa đèn khác.
  // - Khi ở tab "của tôi": đổi màu đèn kết quả search trả về thành màu cam như tab tất cả (amber/orange). Không xóa đèn khác.
  // - Xóa hết keyword: trả về màu như cũ.
  const visualTheme = useMemo(() => {
    if (isSearchActive) {
      if (activeFilter === 'all') {
        return isSearchMatch ? 'mine' : 'all';
      }
      if (activeFilter === 'mine') {
        if (isMine) {
          return isSearchMatch ? 'all' : 'mine';
        }
        return 'dimmed';
      }
    }
    // Chế độ không tìm kiếm
    if (activeFilter === 'mine') {
      return isMine ? 'mine' : 'dimmed';
    }
    return 'all';
  }, [isSearchActive, isSearchMatch, activeFilter, isMine]);

  const isCrimsonTheme = visualTheme === 'mine';
  const isAmberSearchMatch = isSearchActive && isSearchMatch && visualTheme === 'all';
  const isMatch = visualTheme !== 'dimmed';

  const handlePointerDown = (e) => {
    if (!isMatch) return;
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
      const curX = upEvent.changedTouches
        ? upEvent.changedTouches[0].clientX
        : upEvent.clientX ?? startXRef.current;
      const curY = upEvent.changedTouches
        ? upEvent.changedTouches[0].clientY
        : upEvent.clientY ?? startYRef.current;
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

  const body =
    (isCrimsonTheme
      ? "#FF8585"
      : isAmberSearchMatch
      ? "#FFD9B0"
      : color ||
        (isMine
          ? "#FFF3D6"
          : ["#FFE3A8", "#FFD9B0", "#FFE7C2", "#F9CFA0"][Math.floor(r() * 4)]));

  const sym = (SYM[lanternKind] ? SYM[lanternKind]() : SYM.star()).map(([a, b]) => [
    a * 11,
    b * 11 - 1,
  ]);

  const currentScale = sc * (
    isDragging
      ? 1.28
      : isHovered
      ? 1.22
      : isSearchActive && isSearchMatch
      ? 1.34
      : isCrimsonTheme
      ? 1.08
      : isMatch
      ? 1
      : 0.94
  );
  const currentY = y + dragOffset;

  // Filter effect calculation
  let computedFilter = 'none';
  if (!isMatch) {
    computedFilter = 'blur(2.2px) brightness(0.55)';
  } else if (isDragging) {
    computedFilter = isCrimsonTheme
      ? 'drop-shadow(0 0 28px rgba(255, 80, 80, 1))'
      : 'drop-shadow(0 0 26px rgba(255, 235, 160, 1))';
  } else if (isHovered) {
    computedFilter = isCrimsonTheme
      ? 'drop-shadow(0 0 24px rgba(230, 45, 45, 1))'
      : 'drop-shadow(0 0 20px rgba(255, 220, 130, 0.95))';
  } else if (isSearchActive && isSearchMatch) {
    computedFilter = isCrimsonTheme
      ? 'drop-shadow(0 0 26px rgba(245, 45, 45, 1)) drop-shadow(0 0 10px rgba(255, 120, 120, 0.9))'
      : 'drop-shadow(0 0 26px rgba(255, 175, 45, 1)) drop-shadow(0 0 10px rgba(255, 225, 130, 0.95))';
  } else if (isCrimsonTheme) {
    // Red Burgundy / Crimson Glow for matching state
    computedFilter = 'drop-shadow(0 0 16px rgba(195, 36, 42, 0.92)) drop-shadow(0 0 6px rgba(255, 95, 95, 0.85))';
  } else if (isMine) {
    computedFilter = 'drop-shadow(0 0 14px rgba(255, 230, 170, 0.85))';
  } else {
    computedFilter = 'drop-shadow(0 0 8px rgba(255, 215, 130, 0.45))';
  }

  const computedOpacity = !isMatch
    ? 0.22
    : isDragging || isHovered || (isSearchActive && isSearchMatch)
    ? 1
    : isSearchActive
    ? 0.72
    : op;

  return (
    <g
      className="ln"
      style={{
        animationDelay: isDragging ? '0s' : `-${f(r() * 6)}s`,
        cursor: !isMatch ? 'default' : isDragging ? 'grabbing' : 'grab',
        filter: computedFilter,
        opacity: computedOpacity,
        pointerEvents: !isMatch ? 'none' : 'auto',
        transition: isDragging
          ? 'none'
          : 'opacity 0.4s ease-in-out, filter 0.4s ease-in-out, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
      }}
      onMouseEnter={() => isMatch && !isDragging && setIsHovered(true)}
      onMouseLeave={() => isMatch && !isDragging && setIsHovered(false)}
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
          stroke={isCrimsonTheme ? 'rgba(255, 100, 100, 0.75)' : 'rgba(255, 215, 130, 0.6)'}
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      )}

      <g
        transform={`translate(${f(x)} ${f(currentY)}) scale(${f(currentScale)}) rotate(${f(
          (r() - 0.5) * 8 + (dragOffset > 0 ? dragOffset * 0.08 : 0)
        )})`}
        style={{
          transition: isDragging
            ? 'none'
            : 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <defs>
          <radialGradient id={`g${id}`}>
            {isCrimsonTheme ? (
              <>
                <stop offset="0%" stopColor="#FFF0EB" stopOpacity="0.98" />
                <stop offset="45%" stopColor="#FF6B6B" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#B51D24" stopOpacity="0" />
              </>
            ) : isAmberSearchMatch ? (
              <>
                <stop offset="0%" stopColor="#FFF4D0" stopOpacity="0.98" />
                <stop offset="45%" stopColor="#FFA64D" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#D45B00" stopOpacity="0" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FFF1C9" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#FFC774" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#FF9A4A" stopOpacity="0" />
              </>
            )}
          </radialGradient>
          <radialGradient id={`b${id}`} cx=".5" cy=".6">
            {isCrimsonTheme ? (
              <>
                <stop offset="0%" stopColor="#FFF3E8" />
                <stop offset="60%" stopColor="#D9383E" />
                <stop offset="100%" stopColor="#871015" />
              </>
            ) : isAmberSearchMatch ? (
              <>
                <stop offset="0%" stopColor="#FFF6DE" />
                <stop offset="55%" stopColor="#FFB356" />
                <stop offset="100%" stopColor="#B84E14" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FFF6DD" />
                <stop offset="60%" stopColor={body} />
                <stop offset="100%" stopColor="#E58F4C" />
              </>
            )}
          </radialGradient>
        </defs>

        <circle r="62" fill={`url(#g${id})`} />
        <path d="M-20 -26 Q0 -34 20 -26 L24 22 Q0 32 -24 22 Z" fill={`url(#b${id})`} />
        <path
          d="M-20 -26 Q0 -34 20 -26"
          fill="none"
          stroke={isCrimsonTheme ? "#8C181D" : "#A85A2E"}
          strokeWidth="2"
        />
        <rect
          x="-8"
          y="24"
          width="16"
          height="5"
          rx="2"
          fill={isCrimsonTheme ? "#6A0A0E" : "#7A3B1E"}
          opacity="0.85"
        />
        <path
          d={poly(sym)}
          fill="none"
          stroke={isCrimsonTheme ? "#FFF0EB" : isAmberSearchMatch ? "#FFF2DD" : "#7F1916"}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Small pull-down arrow visual indicator on hover / drag */}
        {(isHovered || isDragging) && isMatch && (
          <g transform="translate(0, 36)" opacity="0.95">
            <circle r="9" fill={isCrimsonTheme ? "rgba(70,12,18,0.9)" : "rgba(40,16,20,0.85)"} />
            <path
              d="M-4 -2 L0 3 L4 -2"
              fill="none"
              stroke={isCrimsonTheme ? "#FFD0D0" : "#FFE3A8"}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
        )}
      </g>
    </g>
  );
}

// Simple deterministic hash for string IDs
function stringToSeed(str) {
  let hash = 0;
  if (!str || str.length === 0) return 42;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function LanternSky({
  isLanded = false,
  lanterns = [],
  personalLantern = null,
  activeFilter = 'all',
  matchedLanternIds = new Set(),
  isSearchActive = false,
  searchQuery = '',
  onOpenLandedModal,
  // Khi đang tìm kiếm thì tắt lồng đèn trang trí để chỉ còn kết quả thật
  showAmbient = true,
}) {
  const compId = useId().replace(/:/g, '');

  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1364,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isCompact = viewport.width <= 1024;
  const vbHeight = 900;
  const vbWidth = isCompact
    ? Math.max(360, Math.round(900 * (viewport.width / Math.max(300, viewport.height))))
    : 1364;

  // Door position tailored for responsive viewports
  const doorCenterX = isCompact
    ? Math.round(Math.min(vbWidth - 70, Math.max(110, vbWidth * 0.78)))
    : 1180;

  // Lantern size multiplier to preserve visual dimensions across portrait & landscape
  const lanternScaleMultiplier = isCompact
    ? (viewport.height < 520 ? Math.min(2.0, 750 / viewport.height) : 1)
    : 1;

  // Generate stars once across vbWidth
  const stars = useMemo(() => {
    const list = [];
    const count = isCompact ? 50 : 85;
    const maxX = isCompact ? vbWidth : 1364;
    for (let i = 0; i < count; i++) {
      const rr = rng(i + 12);
      list.push(
        <circle
          key={`star_${i}`}
          cx={f(rr() * maxX)}
          cy={f(rr() * 440)}
          r={f(rr() * 1.35 + 0.3)}
          fill="#FFF1DC"
          opacity={f(rr() * 0.65 + 0.2)}
        />
      );
    }
    return list;
  }, [vbWidth, isCompact]);

  // Compute positioned lanterns combining active API items + ambient background
  const renderedLanterns = useMemo(() => {
    const items = [];
    const hasApiItems = Array.isArray(lanterns) && lanterns.length > 0;
    const widthSpan = isCompact ? Math.max(100, vbWidth - 70) : 1264;
    const minX = isCompact ? 35 : 50;

    if (hasApiItems) {
      // Map API lanterns into canvas positions
      lanterns.forEach((item, idx) => {
        const seed = stringToSeed(item.id || `api_${idx}`);
        const r = rng(seed);
        const d = r();
        const x = minX + r() * widthSpan;
        const y = 160 + r() * 470;

        if (isLanded) {
          const centerX = isCompact ? vbWidth * 0.5 : 682;
          const exclusionZone = isCompact ? 200 : 280;
          if (Math.abs(x - centerX) < exclusionZone && y > 350) return;
        }

        const authorName = item.author_display_name || 'Người gửi ẩn danh';
        const titleText = `${item.title || 'Lồng đèn hy vọng'} — ${authorName} · Kéo xuống hoặc nhấn để đọc`;

        const isMine = Boolean(item.is_mine || item.isMine || activeFilter === 'mine');
        const isOpened = Boolean(item.is_opened || item.status === 'OPENED' || item.statusNote?.includes('đã mở'));
        const isLocked = Boolean(item.status === 'LOCKED' || item.status === 'WAITING' || (item.remaining_seconds && item.remaining_seconds > 0) || !item.is_opened);

        const isSearchMatch = isSearchActive && item.id
          ? (matchedLanternIds?.has ? (matchedLanternIds.has(String(item.id)) || (item.artwork_id && matchedLanternIds.has(String(item.artwork_id)))) : false)
          : false;

        items.push(
          <SingleLantern
            key={item.id || `api_${idx}`}
            x={x}
            y={y}
            sc={isCompact ? (0.24 + d * 0.54) * lanternScaleMultiplier : (0.24 + d * 0.54)}
            seed={seed}
            kind={item.symbol || 'star'}
            op={0.55 + d * 0.45}
            isMine={isMine}
            isOpened={isOpened}
            isLocked={isLocked}
            activeFilter={activeFilter}
            isSearchActive={isSearchActive}
            isSearchMatch={isSearchMatch}
            titleText={titleText}
            onClick={() => onOpenLandedModal && onOpenLandedModal(item)}
          />
        );
      });
    }

    // Always ensure at least 48 lanterns for breathtaking visual depth on desktop (never delete other lanterns during search)
    const ambientCount = Math.max(0, (isCompact ? 28 : 48) - (hasApiItems ? lanterns.length : 0));
    const ambientSpan = isCompact ? Math.max(100, vbWidth - 70) : 1284;
    const ambientMinX = isCompact ? 30 : 40;

    for (let i = 0; i < ambientCount; i++) {
      const r = rng(600 + i);
      const d = r();
      const x = ambientMinX + r() * ambientSpan;
      const y = 170 + r() * 480;

      if (isLanded) {
        const centerX = isCompact ? vbWidth * 0.5 : 682;
        const exclusionZone = isCompact ? 200 : 280;
        if (Math.abs(x - centerX) < exclusionZone && y > 350) continue;
      }

      const fallbackLetter =
        MOCK_LANTERN_LETTERS[(i % (MOCK_LANTERN_LETTERS.length - 1)) + 1];

      // Assign deterministic open/locked states to ambient lanterns
      const ambientOpened = i % 2 === 0;
      const ambientLocked = i % 2 !== 0;

      const isSearchMatch = isSearchActive && fallbackLetter.id
        ? (matchedLanternIds?.has ? matchedLanternIds.has(String(fallbackLetter.id)) : false)
        : false;

      items.push(
        <SingleLantern
          key={`ambient_${i}`}
          x={x}
          y={y}
          sc={isCompact ? (0.18 + d * 0.5) * lanternScaleMultiplier : (0.18 + d * 0.5)}
          seed={700 + i}
          op={0.4 + d * 0.5}
          isMine={false}
          isOpened={ambientOpened}
          isLocked={ambientLocked}
          activeFilter={activeFilter}
          isSearchActive={isSearchActive}
          isSearchMatch={isSearchMatch}
          titleText={`Lồng đèn hy vọng · Nhấn hoặc kéo xuống để đọc`}
          onClick={() => onOpenLandedModal && onOpenLandedModal(fallbackLetter)}
        />
      );
    }

    // Ensure matched search lanterns are placed on top in SVG order
    if (isSearchActive) {
      const normal = [];
      const matched = [];
      items.forEach((elem) => {
        if (elem.props.isSearchMatch) {
          matched.push(elem);
        } else {
          normal.push(elem);
        }
      });
      return [...normal, ...matched];
    }

    return items;
  }, [
    lanterns,
    isLanded,
    activeFilter,
    matchedLanternIds,
    isSearchActive,
    onOpenLandedModal,
    vbWidth,
    isCompact,
    lanternScaleMultiplier,
    showAmbient,
  ]);

  const personalIsOpened = Boolean(personalLantern?.is_opened);
  const personalIsLocked = Boolean(personalLantern && !personalLantern.is_opened);
  const personalX = isCompact ? Math.round(vbWidth * 0.72) : 1010;

  const activePersonalId = personalLantern?.id || null;
  const isPersonalSearchMatch = Boolean(
    isSearchActive &&
    activePersonalId &&
    matchedLanternIds?.has &&
    (matchedLanternIds.has(String(activePersonalId)) || (personalLantern?.artwork_id && matchedLanternIds.has(String(personalLantern.artwork_id))))
  );

  return (
    <svg
      className="scene"
      viewBox={isCompact ? `0 0 ${vbWidth} 900` : "0 0 1364 900"}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`dusk_${compId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2B1424" />
          <stop offset="45%" stopColor="#6E2A33" />
          <stop offset="80%" stopColor="#C9784F" />
          <stop offset="100%" stopColor="#EDBE86" />
        </linearGradient>
      </defs>

      <rect width={isCompact ? vbWidth : 1364} height="900" fill={`url(#dusk_${compId})`} />
      {stars}
      {renderedLanterns}

      {/* User's Own High-flying Personal Lantern (chỉ hiển thị khi đã đăng nhập và thực sự có lồng đèn cá nhân) */}
      {!isLanded && Boolean(personalLantern) && (
        <SingleLantern
          x={personalX}
          y={215}
          sc={isCompact ? 0.96 * lanternScaleMultiplier : 0.96}
          seed={4321}
          kind={personalLantern.symbol || 'heart'}
          isMine={true}
          isOpened={personalIsOpened}
          isLocked={personalIsLocked}
          activeFilter={activeFilter}
          isSearchActive={isSearchActive}
          isSearchMatch={isPersonalSearchMatch}
          titleText={`Lồng đèn của bạn: "${personalLantern.title}" · Nhấn để kéo xuống mở thư`}
          onClick={() => onOpenLandedModal && onOpenLandedModal(personalLantern)}
        />
      )}

      {/* Ground and Pagoda silhouette with smooth curve */}
      {isCompact ? (
        <>
          <path
            d={`M0 780 Q ${vbWidth * 0.25} 740 ${vbWidth * 0.5} 760 T ${vbWidth} 750 L${vbWidth} 900 L0 900 Z`}
            fill="#3A1A1C"
          />
          {/* Pagoda Doorway Silhouette (always visible at bottom) */}
          <path
            d={`M${doorCenterX - 50} 780 L${doorCenterX - 50} 690 Q${doorCenterX - 50} 640 ${doorCenterX} 636 Q${doorCenterX + 50} 640 ${doorCenterX + 50} 690 L${doorCenterX + 50} 780 Z`}
            fill="#2A1214"
          />
          {/* Pagoda Lit Arch Inner Window */}
          <path
            d={`M${doorCenterX - 22} 730 L${doorCenterX - 22} 702 Q${doorCenterX - 22} 682 ${doorCenterX} 680 Q${doorCenterX + 22} 682 ${doorCenterX + 22} 702 L${doorCenterX + 22} 730 Z`}
            fill="#FFCF7A"
            opacity="0.85"
          />
        </>
      ) : (
        <>
          <path d="M0 780 Q 340 740 682 760 T 1364 750 L1364 900 L0 900 Z" fill="#3A1A1C" />
          <path
            d="M1130 780 L1130 690 Q1130 640 1180 636 Q1230 640 1230 690 L1230 780 Z"
            fill="#2A1214"
          />
          <path
            d="M1158 730 L1158 702 Q1158 682 1180 680 Q1202 682 1202 702 L1202 730 Z"
            fill="#FFCF7A"
            opacity="0.85"
          />
        </>
      )}
    </svg>
  );
}

export default LanternSky;

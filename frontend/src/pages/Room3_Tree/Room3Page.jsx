import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { CustomFilterDropdown } from '../../components/common/CustomFilterDropdown';
import { WishTree } from './WishTree';
import { ReadLeafModal } from './ReadLeafModal';
import { HangLeafModal } from './HangLeafModal';
import { room3Service, CATEGORY_MAP, toFrontendCategory } from '../../services/room3Service';
import { useAuth } from '../../context/AuthContext';
import { useGuestGuard } from '../../context/GuestGuardContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { matchesSearchQuery } from '../../utils/searchUtils';
import { HighlightText } from '../../components/common/HighlightText';

/**
 * StarrySky component covering almost the entire screen with twinkling stars.
 * The stars stand completely still in fixed positions, only twinkling in place.
 */
function StarrySky() {
  const { theme } = useTheme();
  const isPaper = theme === 'paper';

  const stars = useMemo(() => {
    const list = [];
    let seed = 42891;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Stars distributed across the night sky (excluding the left corner completely)
    for (let i = 0; i < 110; i++) {
      const x = +(rng() * 97.6 + 1.2).toFixed(2);
      const y = +(rng() * 90.0 + 1.5).toFixed(2);
      const isSparkle = rng() < 0.38; // 38% are 4-pointed diamond sparkle stars, 62% are soft glowing starlight dots
      const size = isSparkle ? +(rng() * 6 + 7).toFixed(1) : +(rng() * 2.8 + 1.8).toFixed(1);
      const duration = +(rng() * 2.4 + 2.2).toFixed(2);
      const delay = +(rng() * 5).toFixed(2);

      // Clean top-left corner completely: remove all stars in x < 24% and y < 65%, or near the left edge x < 8%
      if ((x < 24 && y < 65) || x < 8) {
        continue;
      }

      list.push({
        id: i,
        x,
        y,
        isSparkle,
        size,
        duration,
        delay,
      });
    }
    return list;
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: '48px',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 1,
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes twinkleStarInPlace {
          0%, 100% {
            opacity: 0.12;
            transform: scale(0.35);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.18);
          }
        }
      `}</style>
      {stars.map((st) => (
        <span
          key={st.id}
          style={{
            position: 'absolute',
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: `${st.size}px`,
            height: `${st.size}px`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            animation: `twinkleStarInPlace ${st.duration}s ease-in-out infinite`,
            animationDelay: `-${st.delay}s`,
            transformOrigin: 'center center',
          }}
        >
          {st.isSparkle ? (
            <svg
              viewBox="0 0 24 24"
              width={st.size}
              height={st.size}
              style={{
                filter: isPaper
                  ? 'drop-shadow(0 0 5px rgba(184, 115, 51, 0.85))'
                  : 'drop-shadow(0 0 5px rgba(255, 240, 180, 0.9))',
                overflow: 'visible',
              }}
            >
              <path
                d="M12 0 Q12 12 24 12 Q12 12 12 24 Q12 12 0 12 Q12 12 12 0 Z"
                fill={isPaper ? '#B87333' : '#FFFCE8'}
              />
            </svg>
          ) : (
            <span
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: isPaper
                  ? 'radial-gradient(circle, #E0A653 0%, #B87333 60%, #945729 100%)'
                  : '#FFEAA0',
                boxShadow: isPaper
                  ? '0 0 7px 2px rgba(184, 115, 51, 0.7)'
                  : '0 0 7px 1.5px rgba(255, 235, 160, 0.95)',
                display: 'block',
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}

export function Room3Page({
  onOpenNotifications,
  onOpenThemeModal,
  onSaveToNotebook,
  notebookItems = [],
  initialLeafId = null,
  onClearInitialLeaf,
}) {
  const { user, isGuest } = useAuth();
  const { guardAction } = useGuestGuard();
  const { t, language, original } = useLanguage();

  const [filterCategory, setFilterCategory] = useState(null); // null = all, 'KL'|'CL'|'BO'|'GN'
  const [filterMine, setFilterMine] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [matchedLeafIds, setMatchedLeafIds] = useState(new Set());
  const isSearchActive = Boolean(debouncedSearch && debouncedSearch.trim().length > 0);

  const [leaves, setLeaves] = useState([]);
  const [totalLeaves, setTotalLeaves] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [hoveredLeaf, setHoveredLeaf] = useState(null);
  const [modalLeaf, setModalLeaf] = useState(null);
  const [showReadModal, setShowReadModal] = useState(false);
  const [showHangModal, setShowHangModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const wishTreeRef = useRef(null);
  const searchTimerRef = useRef(null);

  // Debounce search input
  const handleSearchChange = (val) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val.trim());
    }, 300);
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  // Load category meta & total leaves count
  const loadCategoriesMeta = useCallback(async () => {
    try {
      const res = await room3Service.getLeafCategories();
      const data = res?.data || res;
      if (data) {
        if (typeof data.total_leaves === 'number') {
          setTotalLeaves(data.total_leaves);
        }
      }
    } catch (err) {
      console.warn('Could not load leaf categories meta:', err);
    }
  }, []);

  // Load base leaves on tree
  const loadLeaves = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await room3Service.getLeaves({
        category: filterCategory,
        filter: filterMine ? 'mine' : 'all',
        mine: filterMine,
        limit: 100,
      });
      const data = res?.data || res;
      const items = data?.items || [];
      setLeaves(items);
      if (data?.total_ribbons !== undefined) {
        setTotalLeaves(data.total_ribbons);
      }
    } catch (err) {
      console.warn('Could not load leaves from API, using fallback:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterCategory, filterMine]);

  // Handle dynamic search matching without removing other leaves from the tree
  useEffect(() => {
    const q = debouncedSearch.trim();
    if (!q) {
      setMatchedLeafIds(new Set());
      return;
    }

    let isMounted = true;
    (async () => {
      const matched = new Set();

      // 1. Backend search query
      try {
        const res = await room3Service.searchLeaves({
          q,
          category: filterCategory,
          scope: filterMine ? 'mine' : 'all',
          limit: 100,
        });
        const data = res?.data || res;
        const items = data?.items || [];
        items.forEach((it) => {
          if (it?.id !== undefined && it?.id !== null) {
            matched.add(String(it.id));
          }
        });
      } catch (err) {
        console.warn('Backend leaf search fallback to local match:', err);
      }

      // 2. Client-side matching across loaded leaves
      leaves.forEach((it) => {
        if (!it) return;
        const isMatch =
          matchesSearchQuery(it.title, q) ||
          matchesSearchQuery(it.title_vi, q) ||
          matchesSearchQuery(it.title_en, q) ||
          matchesSearchQuery(it.content, q) ||
          matchesSearchQuery(it.content_vi, q) ||
          matchesSearchQuery(it.content_en, q) ||
          matchesSearchQuery(it.short_content, q) ||
          matchesSearchQuery(it.author_display_name, q);

        if (isMatch && it.id !== undefined && it.id !== null) {
          matched.add(String(it.id));
        }
      });

      if (isMounted) {
        setMatchedLeafIds(matched);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, filterCategory, filterMine, leaves]);

  useEffect(() => {
    loadCategoriesMeta();
  }, [loadCategoriesMeta]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const handleOpenReadModal = (leaf) => {
    setHoveredLeaf(null); // Clear hover card immediately!
    if (leaf) setModalLeaf(leaf);
    setShowReadModal(true);
  };

  // Mở chi tiết chiếc lá khi chuyển hướng từ thông báo
  useEffect(() => {
    if (!initialLeafId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await room3Service.getLeafDetail(initialLeafId);
        const detail = res?.data || res;
        if (!cancelled && detail) {
          handleOpenReadModal(detail);
        }
      } catch (err) {
        if (!cancelled) {
          handleOpenReadModal({ id: initialLeafId });
        }
      } finally {
        if (!cancelled && onClearInitialLeaf) {
          onClearInitialLeaf();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialLeafId, onClearInitialLeaf]);

  const handleCloseReadModal = () => {
    setShowReadModal(false);
    setModalLeaf(null);
    setHoveredLeaf(null); // Ensure no floating card remains!
  };

  const handleReactionUpdated = (artworkId, newReactions) => {
    if (!artworkId || !newReactions) return;
    setLeaves((prev) =>
      prev.map((it) => (it.id === artworkId ? { ...it, reactions: newReactions } : it))
    );
  };

  const handleLeafHanged = (newLeaf) => {
    triggerToast(
      '✦ Đã gửi! Bạn sẽ nhận thông báo khi lá được treo lên cây.'
    );
    loadCategoriesMeta();
    loadLeaves();
  };

  const handleDrawRandomLeaf = (randomLeaf) => {
    if (!randomLeaf) return;
    setHoveredLeaf(null); // Clear any hover card
    setModalLeaf(randomLeaf);
    setShowReadModal(true);
    triggerToast(
      language === 'en'
        ? '✦ The Wish Tree gifted you an inspiring message! ✦'
        : '✦ Bạn vừa rút được một thông điệp ý nghĩa! ✦'
    );
  };

  const handleDrawWishClick = () => {
    if (wishTreeRef.current?.triggerDraw) {
      wishTreeRef.current.triggerDraw();
    } else if (leaves && leaves.length > 0) {
      const lucky = leaves[Math.floor(Math.random() * leaves.length)];
      handleDrawRandomLeaf(lucky);
    } else {
      handleDrawRandomLeaf({
        id: 'random',
        title: language === 'en' ? 'A Whisper of Hope' : 'Lời Thì Thầm Của Hy Vọng',
        content:
          language === 'en'
            ? 'Even the quietest leaf on this ancient tree carries strength. You are never alone in what you feel.'
            : 'Mỗi chiếc lá trên cây cổ thụ này đều mang theo sự kiên cường. Bạn không hề đơn độc với những cảm xúc của mình.',
        author_name: language === 'en' ? 'A quiet friend' : 'Một người bạn ẩn danh',
      });
    }
  };

  const hoveredCatConfig = hoveredLeaf
    ? CATEGORY_MAP[toFrontendCategory(hoveredLeaf.tag_category)] || CATEGORY_MAP.CL
    : CATEGORY_MAP.CL;

  return (
    <div className="stage room3-stage w-full h-full max-h-screen overflow-hidden relative flex flex-col justify-between select-none">
      {/* Full-Screen Ambient Starfield Twinkling In Place */}
      <StarrySky />

      {/* Top Header & Navigation */}
      <div className="w-full shrink-0 relative z-30">
        <TopNav
          roomNo="03"
          roomName={t('r3_name')}
          searchPlaceholder={t('r3_search_placeholder')}
          searchValue={search}
          onSearchChange={handleSearchChange}
          onOpenNotifications={onOpenNotifications}
          onOpenThemeModal={onOpenThemeModal}
        />

        {/* Filter Chips & Action Row */}
        <div className="chips-row">
          {/* Desktop Chips */}
          <div className="chips desktop-only-chips no-scrollbar" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <span
              className={`chip glass ${!filterCategory && !filterMine ? 'on' : ''}`}
              onClick={() => {
                setFilterCategory(null);
                setFilterMine(false);
              }}
              style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {language === 'en' ? 'All' : 'Tất cả'}
            </span>

            {Object.keys(CATEGORY_MAP).map((k) => {
              const item = CATEGORY_MAP[k];
              const isSelected = filterCategory === k && !filterMine;
              const categoryName = language === 'en'
                ? (k === 'KL' ? 'Encouragement' : k === 'CL' ? 'Healing' : k === 'BO' ? 'Gratitude' : 'Perspective')
                : item.name;

              return (
                <span
                  key={k}
                  className={`chip glass ${isSelected ? 'on' : ''}`}
                  onClick={() => {
                    setFilterCategory(k);
                    setFilterMine(false);
                  }}
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <i className="dot" style={{ background: item.color }} />
                  {categoryName}
                </span>
              );
            })}

            <span
              className={`chip glass ${filterMine ? 'on' : ''}`}
              onClick={() => {
                guardAction(() => {
                  setFilterMine(true);
                  setFilterCategory(null);
                }, 'xem thông điệp của tôi');
              }}
              style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {language === 'en' ? 'Mine' : 'Của tôi'}
            </span>

            {isLoading && (
              <span className="muted" style={{ fontSize: '13px', marginLeft: '6px', whiteSpace: 'nowrap' }}>
                {language === 'en' ? 'Loading...' : 'Đang tải...'}
              </span>
            )}
          </div>

          {/* Mobile/Tablet Dropdown (customized with same format as desktop .chip.glass.on) */}
          <div className="mobile-filter-wrapper">
            <CustomFilterDropdown
              options={[
                { value: 'all', label: language === 'en' ? 'All wishes' : 'Tất cả' },
                { value: 'KL', label: language === 'en' ? 'Encouragement' : 'Khích lệ', dotColor: CATEGORY_MAP.KL?.color },
                { value: 'CL', label: language === 'en' ? 'Healing' : 'Chữa lành', dotColor: CATEGORY_MAP.CL?.color },
                { value: 'BO', label: language === 'en' ? 'Gratitude' : 'Biết ơn', dotColor: CATEGORY_MAP.BO?.color },
                { value: 'GN', label: language === 'en' ? 'Perspective' : 'Góc nhìn', dotColor: CATEGORY_MAP.GN?.color },
                { value: 'mine', label: language === 'en' ? 'My wishes' : 'Của tôi' },
              ]}
              value={filterMine ? 'mine' : (filterCategory || 'all')}
              onChange={(val) => {
                if (val === 'mine') {
                  guardAction(() => {
                    setFilterMine(true);
                    setFilterCategory(null);
                  }, 'xem thông điệp của tôi');
                } else if (val === 'all') {
                  setFilterMine(false);
                  setFilterCategory(null);
                } else {
                  setFilterMine(false);
                  setFilterCategory(val);
                }
              }}
            />
          </div>

          <div className="row r3-action-buttons">
            {/* Chức năng rút lá (draw wish) với icon viền rỗng nằm ngang với hang message */}
            <button
              type="button"
              className="btn glass shrink-0 r3-btn-draw"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                color: 'var(--onw)',
                borderColor: 'rgba(212, 176, 106, 0.45)',
                cursor: 'pointer',
              }}
              onClick={handleDrawWishClick}
              title={language === 'en' ? 'Draw a wish from the tree' : 'Rút một thông điệp từ Cây'}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'block', flexShrink: 0 }}
                aria-hidden="true"
              >
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
              <span>{language === 'en' ? 'Draw wish' : 'Rút lá'}</span>
            </button>

            <button
              type="button"
              className="btn main shrink-0 r3-btn-hang"
              style={{ whiteSpace: 'nowrap' }}
              onClick={() => {
                guardAction(() => setShowHangModal(true), 'treo thông điệp lên Cây');
              }}
            >
              {t('r3_btn_hang')}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="abs"
          style={{
            top: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            background: 'rgba(38, 28, 20, 0.94)',
            border: '1px solid var(--gold)',
            color: '#FFF0D2',
            padding: '10px 24px',
            borderRadius: '999px',
            fontSize: '14px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Center Tree Viewport Container strictly confined below header and above soil */}
      <div
        className="room3-tree-container"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '138px',
          bottom: '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        <WishTree
          ref={wishTreeRef}
          leaves={leaves}
          filterCategory={filterCategory}
          matchedLeafIds={matchedLeafIds}
          isSearchActive={isSearchActive}
          searchQuery={debouncedSearch}
          hoveredLeaf={hoveredLeaf}
          onHoverLeaf={setHoveredLeaf}
          onOpenLeafModal={handleOpenReadModal}
          onDrawRandomLeaf={handleDrawRandomLeaf}
          isModalOpen={showReadModal}
        />
      </div>

      {/* Floating Hover Leaf Tooltip Card: only shown while hovering a leaf AND modal is NOT open */}
      {!showReadModal && hoveredLeaf && (
        <div
          className="abs"
          onClick={() => handleOpenReadModal(hoveredLeaf)}
          style={{
            left: `${Math.min(1060, Math.max(120, (hoveredLeaf.x || 600) + 24))}px`,
            top: `${Math.min(480, Math.max(150, (hoveredLeaf.y || 260) - 20))}px`,
            zIndex: 35,
            background: 'var(--paper)',
            color: 'var(--ink)',
            borderRadius: '14px',
            padding: '10px 16px',
            boxShadow: '0 16px 36px rgba(0,0,0,.35)',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            border: '1px solid var(--line)',
            transition: 'all 0.18s ease',
          }}
        >
          <div
            className="row"
            style={{
              gap: '6px',
              fontSize: '12.5px',
              color: hoveredCatConfig.color,
              fontWeight: 600,
            }}
          >
            <i className="dot" style={{ background: hoveredCatConfig.color }} />
            {language === 'en'
              ? (toFrontendCategory(hoveredLeaf.tag_category) === 'KL'
                ? 'Encouragement'
                : toFrontendCategory(hoveredLeaf.tag_category) === 'CL'
                ? 'Healing'
                : toFrontendCategory(hoveredLeaf.tag_category) === 'BO'
                ? 'Gratitude'
                : 'Perspective')
              : hoveredCatConfig.name}
          </div>
          <b
            className="serif"
            style={{
              fontSize: '18px',
              display: 'block',
              margin: '3px 0 2px',
              maxWidth: '260px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <HighlightText
              text={original(hoveredLeaf, 'title') || (language === 'en' ? 'To you who are trying' : 'Gửi bạn đang cố gắng')}
              query={debouncedSearch}
            />
          </b>
          <div className="muted" style={{ fontSize: '12.5px' }}>
            {hoveredLeaf.author_display_name || (language === 'en' ? 'Stranger' : 'Người lạ')} · {language === 'en' ? 'click to read' : 'nhấn để đọc'}
          </div>
        </div>
      )}

      {/* Footer: Enchanted Twilight Garden Bank */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '46px',
          background: 'linear-gradient(180deg, var(--wall3) 0%, rgba(18, 14, 11, 0.92) 100%)',
          borderTop: '1px solid var(--line)',
          zIndex: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            left: '15%',
            right: '15%',
            height: '10px',
            background: 'radial-gradient(ellipse at center, rgba(212, 176, 106, 0.22) 0%, rgba(212, 176, 106, 0) 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Modals */}
      <ReadLeafModal
        isOpen={showReadModal}
        leafData={modalLeaf}
        searchQuery={debouncedSearch}
        onClose={handleCloseReadModal}
        onReactionUpdated={handleReactionUpdated}
        onSaveToNotebook={onSaveToNotebook}
        notebookItems={notebookItems}
      />

      <HangLeafModal
        isOpen={showHangModal}
        onClose={() => setShowHangModal(false)}
        onHangLeaf={handleLeafHanged}
      />
    </div>
  );
}

export default Room3Page;

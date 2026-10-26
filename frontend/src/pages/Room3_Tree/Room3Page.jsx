import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { WishTree } from './WishTree';
import { ReadLeafModal } from './ReadLeafModal';
import { HangLeafModal } from './HangLeafModal';
import { room3Service, CATEGORY_MAP, toFrontendCategory } from '../../services/room3Service';
import { useAuth } from '../../context/AuthContext';
import { useGuestGuard } from '../../context/GuestGuardContext';
import { useLanguage } from '../../context/LanguageContext';

/**
 * StarrySky component covering almost the entire screen with twinkling stars.
 * The stars stand completely still in fixed positions, only twinkling in place.
 */
function StarrySky() {
  const stars = useMemo(() => {
    const list = [];
    let seed = 42891;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // 110 stars distributed across almost the entire screen (1% to 99% width, 1% to 92% height)
    for (let i = 0; i < 110; i++) {
      const x = +(rng() * 97.6 + 1.2).toFixed(2);
      const y = +(rng() * 90.0 + 1.5).toFixed(2);
      const isSparkle = rng() < 0.38; // 38% are 4-pointed diamond sparkle stars, 62% are soft glowing starlight dots
      const size = isSparkle ? +(rng() * 6 + 7).toFixed(1) : +(rng() * 2.8 + 1.8).toFixed(1);
      const duration = +(rng() * 2.4 + 2.2).toFixed(2);
      const delay = +(rng() * 5).toFixed(2);

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
                filter: 'drop-shadow(0 0 5px rgba(255, 240, 180, 0.9))',
                overflow: 'visible',
              }}
            >
              <path
                d="M12 0 Q12 12 24 12 Q12 12 12 24 Q12 12 0 12 Q12 12 12 0 Z"
                fill="#FFFCE8"
              />
            </svg>
          ) : (
            <span
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#FFEAA0',
                boxShadow: '0 0 7px 1.5px rgba(255, 235, 160, 0.95)',
                display: 'block',
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}

export function Room3Page({ onOpenNotifications, onOpenThemeModal }) {
  const { user, isGuest } = useAuth();
  const { guardAction } = useGuestGuard();
  const { t, language, localize } = useLanguage();

  const [filterCategory, setFilterCategory] = useState(null); // null = all, 'KL'|'CL'|'BO'|'GN'
  const [filterMine, setFilterMine] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [leaves, setLeaves] = useState([]);
  const [totalLeaves, setTotalLeaves] = useState(862);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const [hoveredLeaf, setHoveredLeaf] = useState(null);
  const [modalLeaf, setModalLeaf] = useState(null);
  const [showReadModal, setShowReadModal] = useState(false);
  const [showHangModal, setShowHangModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
        if (Array.isArray(data.categories)) {
          const counts = {};
          data.categories.forEach((c) => {
            const frontKey = toFrontendCategory(c.category);
            counts[frontKey] = c.total_count ?? 0;
          });
          setCategoryCounts(counts);
        }
      }
    } catch (err) {
      console.warn('Could not load leaf categories meta:', err);
    }
  }, []);

  // Load leaves on tree
  const loadLeaves = useCallback(async () => {
    setIsLoading(true);
    try {
      if (debouncedSearch) {
        const res = await room3Service.searchLeaves({
          q: debouncedSearch,
          category: filterCategory,
          scope: filterMine ? 'mine' : 'all',
          limit: 100,
        });
        const data = res?.data || res;
        const items = data?.items || [];
        setLeaves(items);
        if (data?.pagination?.total_hits !== undefined) {
          setTotalLeaves(data.pagination.total_hits);
        }
      } else {
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
      }
    } catch (err) {
      console.warn('Could not load leaves from API, using fallback:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterCategory, filterMine, debouncedSearch]);

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
      '✦ Thông điệp đã gửi duyệt. Bạn sẽ nhận thông báo khi lá được treo lên cây!'
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

  const hoveredCatConfig = hoveredLeaf
    ? CATEGORY_MAP[toFrontendCategory(hoveredLeaf.tag_category)] || CATEGORY_MAP.CL
    : CATEGORY_MAP.CL;

  return (
    <div className="stage w-full h-full max-h-screen overflow-hidden relative flex flex-col justify-between select-none">
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
          <div className="chips no-scrollbar" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
              const count = categoryCounts[k];
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
                  {count !== undefined && count > 0 && (
                    <span style={{ opacity: 0.7, fontSize: '11.5px', marginLeft: '3px' }}>
                      ({count})
                    </span>
                  )}
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

          <button
            type="button"
            className="btn main shrink-0"
            style={{ whiteSpace: 'nowrap' }}
            onClick={() => {
              guardAction(() => setShowHangModal(true), 'treo thông điệp lên Cây');
            }}
          >
            {t('r3_btn_hang')}
          </button>
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
          leaves={leaves}
          filterCategory={filterCategory}
          hoveredLeaf={hoveredLeaf}
          onHoverLeaf={setHoveredLeaf}
          onOpenLeafModal={handleOpenReadModal}
          onDrawRandomLeaf={handleDrawRandomLeaf}
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
            {localize(hoveredLeaf, 'title') || (language === 'en' ? 'To you who are trying' : 'Gửi bạn đang cố gắng')}
          </b>
          <div className="muted" style={{ fontSize: '12.5px' }}>
            {hoveredLeaf.author_display_name || (language === 'en' ? 'Stranger' : 'Người lạ')} · {language === 'en' ? 'click to read' : 'nhấn để đọc'}
          </div>
        </div>
      )}

      {/* Footer: Dark Floor Soil Strip Pinned at Bottom */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '48px',
          background: '#261A13',
          borderTop: '1px solid rgba(70, 49, 34, 0.6)',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontSize: '13.5px',
            color: 'var(--onw2)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {language === 'en'
            ? `${totalLeaves.toLocaleString('en-US')} encouraging words on tree · hover a leaf to preview, click to read`
            : `${totalLeaves.toLocaleString('vi-VN')} lời động viên đang treo trên cây · rê chuột vào một chiếc lá để xem, nhấn để đọc`}
        </div>
      </div>

      {/* Modals */}
      <ReadLeafModal
        isOpen={showReadModal}
        leafData={modalLeaf}
        onClose={handleCloseReadModal}
        onReactionUpdated={handleReactionUpdated}
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

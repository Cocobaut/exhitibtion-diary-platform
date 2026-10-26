import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { WishTree } from './WishTree';
import { ReadLeafModal } from './ReadLeafModal';
import { HangLeafModal } from './HangLeafModal';
import { room3Service, CATEGORY_MAP, toFrontendCategory } from '../../services/room3Service';
import { useAuth } from '../../context/AuthContext';

export function Room3Page({ onOpenNotifications, onOpenThemeModal }) {
  const { user } = useAuth();

  const [filterCategory, setFilterCategory] = useState(null); // null = all, 'KL'|'CL'|'BO'|'GN'
  const [filterMine, setFilterMine] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [leaves, setLeaves] = useState([]);
  const [totalLeaves, setTotalLeaves] = useState(862);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const [selectedLeaf, setSelectedLeaf] = useState(null);
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

  const handleSelectLeaf = (leaf) => {
    setSelectedLeaf(leaf);
  };

  const handleOpenReadModal = (leaf) => {
    if (leaf) setSelectedLeaf(leaf);
    setShowReadModal(true);
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

  const selectedCatConfig = selectedLeaf
    ? CATEGORY_MAP[toFrontendCategory(selectedLeaf.tag_category)] || CATEGORY_MAP.CL
    : CATEGORY_MAP.CL;

  return (
    <div className="stage">
      <WishTree
        leaves={leaves}
        filterCategory={filterCategory}
        selectedLeaf={selectedLeaf}
        onSelectLeaf={handleSelectLeaf}
      />

      {/* Top Header */}
      <TopNav
        roomNo="03"
        roomName="Cây Thông điệp"
        searchPlaceholder="Tìm lời động viên theo từ khoá hoặc bút danh…"
        searchValue={search}
        onSearchChange={handleSearchChange}
        onOpenNotifications={onOpenNotifications}
        onOpenThemeModal={onOpenThemeModal}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="abs"
          style={{
            top: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            background: 'rgba(38, 28, 20, 0.92)',
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

      {/* Filter Chips & Action */}
      <div className="chips-row">
        <div className="chips">
          <span
            className={`chip glass ${!filterCategory && !filterMine ? 'on' : ''}`}
            onClick={() => {
              setFilterCategory(null);
              setFilterMine(false);
            }}
            style={{ cursor: 'pointer' }}
          >
            Tất cả
          </span>

          {Object.keys(CATEGORY_MAP).map((k) => {
            const item = CATEGORY_MAP[k];
            const isSelected = filterCategory === k && !filterMine;
            const count = categoryCounts[k];
            return (
              <span
                key={k}
                className={`chip glass ${isSelected ? 'on' : ''}`}
                onClick={() => {
                  setFilterCategory(k);
                  setFilterMine(false);
                }}
                style={{ cursor: 'pointer' }}
              >
                <i className="dot" style={{ background: item.color }} />
                {item.name}
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
              setFilterMine(true);
              setFilterCategory(null);
            }}
            style={{ cursor: 'pointer' }}
          >
            Của tôi
          </span>

          {isLoading && (
            <span className="muted" style={{ fontSize: '13px', marginLeft: '6px' }}>
              Đang tải...
            </span>
          )}
        </div>

        <button
          type="button"
          className="btn main"
          onClick={() => setShowHangModal(true)}
        >
          ✦ Treo thông điệp
        </button>
      </div>

      {/* Floating Hover Leaf Tooltip Card */}
      {selectedLeaf && (
        <div
          className="abs"
          onClick={() => handleOpenReadModal(selectedLeaf)}
          style={{
            left: `${Math.min(1080, Math.max(120, (selectedLeaf.x || 760) + 32))}px`,
            top: `${Math.min(680, Math.max(140, (selectedLeaf.y || 330) - 30))}px`,
            zIndex: 15,
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
              color: selectedCatConfig.color,
              fontWeight: 600,
            }}
          >
            <i className="dot" style={{ background: selectedCatConfig.color }} />
            {selectedCatConfig.name}
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
            {selectedLeaf.title || 'Gửi bạn đang cố gắng'}
          </b>
          <div className="muted" style={{ fontSize: '12.5px' }}>
            {selectedLeaf.author_display_name || 'Người lạ'} · nhấn để đọc
          </div>
        </div>
      )}

      {/* Footer Counter */}
      <div className="counter">
        {totalLeaves.toLocaleString('vi-VN')} lời động viên đang treo trên cây · rê chuột vào một chiếc lá để xem, nhấn để đọc
      </div>

      {/* Modals */}
      <ReadLeafModal
        isOpen={showReadModal}
        leafData={selectedLeaf}
        onClose={() => setShowReadModal(false)}
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

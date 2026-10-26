import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { ArtworkCard } from './ArtworkCard';
import { ArtworkDetailModal } from './ArtworkDetailModal';
import { SubmitArtworkModal } from './SubmitArtworkModal';
import { ConfirmSubmitModal } from './ConfirmSubmitModal';
import { ArtworkPreparedModal } from './ArtworkPreparedModal';
import { useAuth } from '../../context/AuthContext';
import { useGuestGuard } from '../../context/GuestGuardContext';
import { useLanguage } from '../../context/LanguageContext';
import { room1Service } from '../../services/room1Service';

export function Room1Page({ onOpenNotifications, onOpenThemeModal }) {
  const { isAuthenticated, isGuest } = useAuth();
  const { guardAction } = useGuestGuard();
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState('all'); // 'all', 'mine', 'reacted', 'most_sympathy'
  const [search, setSearch] = useState('');
  const [artworks, setArtworks] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPreparedModal, setShowPreparedModal] = useState(false);
  const [tempSubmission, setTempSubmission] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const searchDebounceRef = useRef(null);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  // Tải danh sách tác phẩm từ backend (trang đầu tiên)
  const fetchArtworks = useCallback(async (currentFilter = filter, currentSearch = search) => {
    setIsLoading(true);
    setErrorMsg('');
    setPage(1);

    try {
      if (currentSearch && currentSearch.trim().length > 0) {
        // Tìm kiếm có từ khóa
        const scope = currentFilter === 'mine' ? 'mine' : 'all';
        const res = await room1Service.searchArtworks({
          q: currentSearch.trim(),
          scope,
          page: 1,
          limit: 12,
        });
        const items = res?.items || (Array.isArray(res) ? res : []);
        setArtworks(items);
        const totalHits = res?.pagination?.total_hits ?? items.length;
        setHasMore(items.length < totalHits);
      } else {
        // Duyệt theo filter thông thường
        if ((currentFilter === 'mine' || currentFilter === 'reacted') && !isAuthenticated) {
          setArtworks([]);
          setHasMore(false);
          setIsLoading(false);
          return;
        }

        const res = await room1Service.getArtworks({
          filter: currentFilter,
          page: 1,
          limit: 12,
        });
        const items = res?.items || (Array.isArray(res) ? res : []);
        setArtworks(items);
        const totalPages = res?.pagination?.total_pages ?? 1;
        setHasMore(1 < totalPages);
      }
    } catch (err) {
      if (err.errorCode === 'UNAUTHORIZED' || err.status === 401) {
        setErrorMsg(language === 'en' ? 'Please log in to view artworks for this filter.' : 'Vui lòng đăng nhập để xem tác phẩm theo bộ lọc này.');
      } else {
        setErrorMsg(err.message || (language === 'en' ? 'Could not load artworks.' : 'Không thể tải danh sách tác phẩm.'));
      }
      setArtworks([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [filter, search, isAuthenticated, language]);

  // Tải thêm tác phẩm khi cuộn đến mỏ neo (Infinite scroll)
  const loadMoreArtworks = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    const nextPage = page + 1;
    try {
      if (search && search.trim().length > 0) {
        const scope = filter === 'mine' ? 'mine' : 'all';
        const res = await room1Service.searchArtworks({
          q: search.trim(),
          scope,
          page: nextPage,
          limit: 12,
        });
        const items = res?.items || [];
        if (items.length > 0) {
          setArtworks((prev) => [...prev, ...items]);
          setPage(nextPage);
          const totalHits = res?.pagination?.total_hits ?? 0;
          setHasMore(artworks.length + items.length < totalHits);
        } else {
          setHasMore(false);
        }
      } else {
        const res = await room1Service.getArtworks({
          filter,
          page: nextPage,
          limit: 12,
        });
        const items = res?.items || [];
        if (items.length > 0) {
          setArtworks((prev) => [...prev, ...items]);
          setPage(nextPage);
          const totalPages = res?.pagination?.total_pages ?? nextPage;
          setHasMore(nextPage < totalPages);
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.warn('Error loading more artworks:', err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, hasMore, page, filter, search, artworks.length]);

  // Thiết lập IntersectionObserver cho sentinel
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadMoreArtworks();
        }
      },
      { rootMargin: '200px' }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loadMoreArtworks, hasMore, isLoading, isLoadingMore]);

  // Gọi khi filter thay đổi
  useEffect(() => {
    fetchArtworks(filter, search);
  }, [filter, fetchArtworks]);

  // Debounce 300ms khi gõ tìm kiếm
  const handleSearchChange = (value) => {
    setSearch(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      fetchArtworks(filter, value);
    }, 300);
  };

  // Cập nhật cảm xúc trên thẻ
  const handleSelectReaction = async (artworkId, reactionType) => {
    guardAction(async () => {
      try {
        const res = await room1Service.toggleReaction(artworkId, reactionType);
        if (res) {
          setArtworks((prev) =>
            prev.map((item) => {
              if (item.id === artworkId) {
                return {
                  ...item,
                  my_reaction: res.current_reaction,
                  user_reaction: res.current_reaction,
                  reactions_count: res.reactions_count || item.reactions_count,
                  reactions: res.reactions || item.reactions,
                };
              }
              return item;
            })
          );
        }
      } catch (err) {
        console.warn('Không thể gửi cảm xúc:', err);
      }
    }, 'bày tỏ sự đồng cảm');
  };

  // Callback khi cập nhật reaction trong modal chi tiết
  const handleReactionUpdated = (artworkId, { my_reaction, reactions }) => {
    setArtworks((prev) =>
      prev.map((item) => {
        if (item.id === artworkId) {
          return {
            ...item,
            my_reaction,
            user_reaction: my_reaction,
            reactions,
            total_reactions: reactions?.total ?? item.total_reactions,
          };
        }
        return item;
      })
    );
  };

  // Bước 1: Khởi động gửi tác phẩm
  const handleStartSubmit = (formData) => {
    guardAction(() => {
      setTempSubmission(formData);
      setShowSubmitModal(false);
      setShowConfirmModal(true);
      setSubmitError('');
    }, 'trưng bày tác phẩm đổ vỡ');
  };

  // Bước 2: Xác nhận gửi tác phẩm (POST /api/v1/rooms/1/artworks)
  const handleConfirmSubmit = async () => {
    if (!tempSubmission) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await room1Service.createArtwork({
        title: tempSubmission.title,
        short_content: tempSubmission.summary,
        content: tempSubmission.story,
        is_anonymous: tempSubmission.isAnonymous,
      });

      setIsSubmitting(false);
      setShowConfirmModal(false);
      setShowPreparedModal(true);
      fetchArtworks(filter, search);
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError(err.message || 'Không thể gửi tác phẩm. Vui lòng thử lại.');
    }
  };

  return (
    <div className="stage">
      {/* Top Header */}
      <TopNav
        roomNo="01"
        roomName={t('r1_name')}
        searchPlaceholder={t('r1_search_placeholder')}
        searchValue={search}
        onSearchChange={handleSearchChange}
        onOpenNotifications={onOpenNotifications}
        onOpenThemeModal={onOpenThemeModal}
      />

      {/* Filter Chips & Action */}
      <div className="chips-row">
        <div className="chips">
          <span
            className={`chip glass ${filter === 'all' ? 'on' : ''}`}
            onClick={() => setFilter('all')}
          >
            {t('r1_filter_all')}
          </span>
          <span
            className={`chip glass ${filter === 'mine' ? 'on' : ''}`}
            onClick={() => {
              guardAction(() => setFilter('mine'), 'xem tác phẩm của tôi');
            }}
          >
            {t('r1_filter_mine')}
          </span>
          <span
            className={`chip glass ${filter === 'reacted' ? 'on' : ''}`}
            onClick={() => {
              guardAction(() => setFilter('reacted'), 'xem tác phẩm bạn đã thả cảm xúc');
            }}
          >
            {t('r1_filter_reacted')}
          </span>
          <span
            className={`chip glass ${filter === 'most_sympathy' ? 'on' : ''}`}
            onClick={() => setFilter('most_sympathy')}
          >
            {t('r1_filter_most_sympathy')}
          </span>
        </div>

        <button
          type="button"
          className="btn main"
          onClick={() => {
            guardAction(() => setShowSubmitModal(true), 'trưng bày tác phẩm đổ vỡ');
          }}
        >
          {t('r1_btn_submit')}
        </button>
      </div>

      {/* Gallery of Works with bespoke custom scrollbar extending to screen edge */}
      <div className="gallery custom-scrollbar" style={{ minHeight: '380px' }}>
        {isLoading ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--ink2)',
              fontStyle: 'italic',
            }}
          >
            {language === 'en' ? 'Lighting up the exhibition room...' : 'Đang thắp sáng phòng triển lãm...'}
          </div>
        ) : errorMsg ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--acc)',
            }}
          >
            {errorMsg}
          </div>
        ) : (filter === 'mine' || filter === 'reacted') && !isAuthenticated ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--ink2)',
            }}
          >
            <div className="hand" style={{ fontSize: '24px', marginBottom: '6px' }}>
              {language === 'en' ? 'a sanctuary for gentle thoughts' : 'chốn lưu giữ những nỗi niềm'}
            </div>
            <div>
              {filter === 'mine'
                ? (language === 'en'
                    ? 'Please log in to view the artworks you have submitted to Room 1.'
                    : 'Vui lòng đăng nhập để xem các tác phẩm bạn đã gửi gắm tại Phòng 1.')
                : (language === 'en'
                    ? 'Please log in to view the artworks you have reacted to.'
                    : 'Vui lòng đăng nhập để xem các tác phẩm bạn đã thả cảm xúc.')}
            </div>
          </div>
        ) : artworks.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--ink2)',
            }}
          >
            <div className="hand" style={{ fontSize: '24px', marginBottom: '6px' }}>
              {language === 'en' ? 'no matching artworks found' : 'chưa có tác phẩm nào phù hợp'}
            </div>
            <div>
              {language === 'en'
                ? 'Try changing filters or search terms.'
                : 'Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm nhé.'}
            </div>
          </div>
        ) : (
          <>
            {artworks.map((work, idx) => (
              <ArtworkCard
                key={work.id || idx}
                artwork={work}
                index={idx}
                onClick={() => {
                  if (work.status !== 'PENDING' && work.status !== 'REJECTED') {
                    setSelectedArtwork(work);
                  }
                }}
                onSelectReaction={handleSelectReaction}
              />
            ))}

            {/* Infinite Scroll Sentinel */}
            <div
              ref={sentinelRef}
              style={{
                gridColumn: '1 / -1',
                height: '24px',
                pointerEvents: 'none',
              }}
            />

            {isLoadingMore && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '20px 12px',
                  color: 'var(--ink2)',
                  fontStyle: 'italic',
                }}
              >
                {t('r1_loading_more')}
              </div>
            )}

            {!hasMore && artworks.length > 0 && !isLoading && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '24px 16px',
                  color: 'var(--ink2)',
                  opacity: 0.8,
                  fontSize: '13.5px',
                  letterSpacing: '0.04em',
                }}
              >
                {t('r1_all_loaded')}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <ArtworkDetailModal
        isOpen={Boolean(selectedArtwork)}
        artwork={selectedArtwork}
        onClose={() => setSelectedArtwork(null)}
        onReactionUpdated={handleReactionUpdated}
      />

      <SubmitArtworkModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSubmit={handleStartSubmit}
      />

      <ConfirmSubmitModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        isSubmitting={isSubmitting}
        errorMsg={submitError}
      />

      <ArtworkPreparedModal
        isOpen={showPreparedModal}
        onClose={() => setShowPreparedModal(false)}
        onViewMyArtworks={() => {
          setShowPreparedModal(false);
          setFilter('mine');
        }}
      />
    </div>
  );
}

export default Room1Page;

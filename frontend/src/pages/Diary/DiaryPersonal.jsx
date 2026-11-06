import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Painting } from '../../components/common/Painting';
import { Icon } from '../../components/common/Icons';
import { diaryService } from '../../services/diaryService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const DiaryPersonal = React.forwardRef(function DiaryPersonal(
  {
    onOpenWriteModal,
    searchQuery = '',
    refreshTrigger = 0,
    filterScope = 'all',
    activeDiaryId = null,
    onSelectDiary,
    onEntriesLoaded,
    onPaginationChange,
  },
  ref
) {
  const { user } = useAuth();
  const { language, original } = useLanguage();

  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_LIMIT = 15;
  const sentinelRef = useRef(null);

  const isFetchingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const onEntriesLoadedRef = useRef(onEntriesLoaded);
  onEntriesLoadedRef.current = onEntriesLoaded;
  const onPaginationChangeRef = useRef(onPaginationChange);
  onPaginationChangeRef.current = onPaginationChange;

  // On desktop landscape computer & portrait computer (> 1024px): select first entry. On tablet/mobile: null initially (no white box shown initially!)
  const [isComputerMode, setIsComputerMode] = useState(
    typeof window !== 'undefined' ? window.innerWidth > 1024 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsComputerMode(window.innerWidth > 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [selectedIdx, setSelectedIdx] = useState(
    typeof window !== 'undefined' && window.innerWidth > 1024 ? 0 : null
  );
  const [expandedId, setExpandedId] = useState(null);
  const [activeDetail, setActiveDetail] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'detail' for responsive screens

  // Load initial personal diaries or search results
  const loadEntries = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingList(true);
    pageRef.current = 1;
    setPage(1);
    hasMoreRef.current = false;
    setHasMore(false);
    try {
      let items = [];
      if (searchQuery.trim()) {
        const res = await diaryService.searchDiaries({
          q: searchQuery.trim(),
          scope: 'mine',
          page: 1,
          limit: PAGE_LIMIT,
        });
        const data = res?.data || res;
        items = data?.items || [];
      } else {
        const res = await diaryService.getMyDiaries({ view_mode: 'timeline', page: 1, limit: PAGE_LIMIT });
        const data = res?.data || res;
        items = data?.items || [];
      }
      setEntries(items);
      const more = items.length >= PAGE_LIMIT;
      hasMoreRef.current = more;
      setHasMore(more);
      onEntriesLoadedRef.current?.(items);
      onPaginationChangeRef.current?.({ hasMore: more, isLoadingMore: false });
    } catch (err) {
      console.warn('Error loading personal diaries from API:', err);
    } finally {
      setIsLoadingList(false);
      isFetchingRef.current = false;
    }
  }, [searchQuery]);

  // Infinite Scroll: Load more entries
  const loadMoreEntries = useCallback(async () => {
    if (isFetchingRef.current || !hasMoreRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);
    onPaginationChangeRef.current?.({ hasMore: hasMoreRef.current, isLoadingMore: true });
    try {
      const nextPage = pageRef.current + 1;
      let newItems = [];
      if (searchQuery.trim()) {
        const res = await diaryService.searchDiaries({
          q: searchQuery.trim(),
          scope: 'mine',
          page: nextPage,
          limit: PAGE_LIMIT,
        });
        const data = res?.data || res;
        newItems = data?.items || [];
      } else {
        const res = await diaryService.getMyDiaries({
          view_mode: 'timeline',
          page: nextPage,
          limit: PAGE_LIMIT,
        });
        const data = res?.data || res;
        newItems = data?.items || [];
      }

      if (newItems.length > 0) {
        let updatedList = [];
        setEntries((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const filtered = newItems.filter((e) => !existingIds.has(e.id));
          updatedList = [...prev, ...filtered];
          return updatedList;
        });
        pageRef.current = nextPage;
        setPage(nextPage);
        const more = newItems.length >= PAGE_LIMIT;
        hasMoreRef.current = more;
        setHasMore(more);
        onEntriesLoadedRef.current?.(updatedList);
        onPaginationChangeRef.current?.({ hasMore: more, isLoadingMore: false });
      } else {
        hasMoreRef.current = false;
        setHasMore(false);
        onPaginationChangeRef.current?.({ hasMore: false, isLoadingMore: false });
      }
    } catch (err) {
      console.warn('Error loading more diaries:', err);
      hasMoreRef.current = false;
      setHasMore(false);
      onPaginationChangeRef.current?.({ hasMore: false, isLoadingMore: false });
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [searchQuery]);

  // Expose imperative handle for external controls (like the dropdown list)
  React.useImperativeHandle(ref, () => ({
    loadMore: loadMoreEntries,
    hasMore,
    isLoadingMore,
  }), [loadMoreEntries, hasMore, isLoadingMore]);

  // IntersectionObserver for infinite scrolling sentinel
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const scrollContainer = document.getElementById('diary-timeline-container');
    const el = sentinelRef.current;
    if (!el) return;

    const isScrollable = scrollContainer && window.getComputedStyle(scrollContainer).overflowY === 'auto';
    const observer = new IntersectionObserver(
      (entriesArr) => {
        if (entriesArr[0].isIntersecting && hasMoreRef.current && !isFetchingRef.current) {
          loadMoreEntries();
        }
      },
      { root: isScrollable ? scrollContainer : null, rootMargin: '120px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMoreEntries]);

  // Global scroll listener fallback if window/stage is scrolling
  useEffect(() => {
    if (isComputerMode) return;
    const handleGlobalScroll = () => {
      if (!hasMoreRef.current || isFetchingRef.current) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      if (documentHeight - scrollY - windowHeight < 160) {
        loadMoreEntries();
      }
    };
    window.addEventListener('scroll', handleGlobalScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleGlobalScroll);
  }, [isComputerMode, loadMoreEntries]);

  // Scroll listener on timeline container as additional safeguard
  const handleTimelineScroll = useCallback(
    (e) => {
      if (!hasMoreRef.current || isFetchingRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop - clientHeight < 150) {
        loadMoreEntries();
      }
    },
    [loadMoreEntries]
  );

  useEffect(() => {
    loadEntries();
  }, [loadEntries, refreshTrigger]);

  // When activeDiaryId is selected from the dropdown list next to All entries:
  useEffect(() => {
    if (activeDiaryId) {
      if (!isComputerMode) {
        setExpandedId(activeDiaryId);
      } else {
        setExpandedId(null);
      }
      const foundIdx = entries.findIndex((e) => e.id === activeDiaryId);
      if (foundIdx !== -1) {
        setSelectedIdx(foundIdx);
      }
      setTimeout(() => {
        const el = document.getElementById(`diary-entry-${activeDiaryId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 60);
    }
  }, [activeDiaryId, entries, isComputerMode]);

  const activeEntry = selectedIdx !== null ? (entries[selectedIdx] || null) : null;

  // Load detail of active entry
  useEffect(() => {
    if (!activeEntry?.id) {
      setActiveDetail(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDetail(true);
    diaryService
      .getMyDiaryDetail(activeEntry.id)
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || res;
        setActiveDetail(data);
      })
      .catch((err) => {
        console.warn('Could not load diary detail, using list item:', err);
        if (isMounted) setActiveDetail(activeEntry);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeEntry?.id]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    try {
      await diaryService.deleteDiary(confirmDeleteId);
      if (expandedId === confirmDeleteId) {
        setExpandedId(null);
        if (onSelectDiary) onSelectDiary(null);
      }
      setConfirmDeleteId(null);
      loadEntries();
    } catch (err) {
      console.error('Error deleting diary:', err);
      alert('Chưa xoá được, bạn thử lại nhé.');
    } finally {
      setIsDeleting(false);
    }
  };

  const parseDateParts = (dateStr) => {
    if (!dateStr) return { day: '25', weekday: language === 'en' ? 'Today' : 'Hôm nay', monthYear: language === 'en' ? 'Oct · 2026' : 'Tháng 10 · 2026' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { day: '25', weekday: language === 'en' ? 'Today' : 'Hôm nay', monthYear: language === 'en' ? 'Oct · 2026' : 'Tháng 10 · 2026' };

      const daysOfWeek = language === 'en'
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        : ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
      const day = String(d.getDate()).padStart(2, '0');
      const weekday = daysOfWeek[d.getDay()];
      const monthYear = language === 'en'
        ? `Month ${d.getMonth() + 1} · ${d.getFullYear()}`
        : `Tháng ${d.getMonth() + 1} · ${d.getFullYear()}`;
      return { day, weekday, monthYear };
    } catch {
      return { day: '25', weekday: language === 'en' ? 'Today' : 'Hôm nay', monthYear: language === 'en' ? 'Oct · 2026' : 'Tháng 10 · 2026' };
    }
  };

  const currentDisplay = activeDetail || activeEntry;
  const activeDateInfo = parseDateParts(currentDisplay?.entry_date || currentDisplay?.created_at);

  return (
    <>
      {/* Left Timeline */}
      <div
        id="diary-timeline-container"
        className={`custom-scrollbar diary-scroll diary-timeline-col ${isComputerMode ? 'abs' : ''} ${mobileTab === 'detail' ? 'mobile-hidden' : ''}`}
        onScroll={handleTimelineScroll}
        style={
          isComputerMode
            ? {
                left: '30px',
                top: '148px',
                width: '420px',
                bottom: 0,
                overflowY: 'auto',
                paddingRight: '10px',
                paddingBottom: '30px',
              }
            : {}
        }
      >
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--onw)',
            margin: '6px 0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{language === 'en' ? 'Timeline' : 'Dòng thời gian'}</span>
          {isLoadingList && (
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 'normal' }}>
              {language === 'en' ? 'Loading...' : 'Đang tải...'}
            </span>
          )}
        </div>

        {entries.length === 0 && !isLoadingList && (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              background: 'var(--glass)',
              border: '1px solid var(--glass-line)',
              borderRadius: '14px',
              color: 'var(--onw2)',
              fontSize: '14.5px',
              margin: '16px 0',
              lineHeight: 1.6,
            }}
          >
            {language === 'en' ? (
              <>No diary entries yet. Click <b>"✦ New Entry"</b> to capture today’s moment</>
            ) : (
              <>Chưa có trang nhật ký nào. Bấm <b>"✦ Viết nhật ký mới"</b> để lưu giữ khoảnh khắc hôm nay</>
            )}
          </div>
        )}

        {entries
          .filter((entry) => {
            if (filterScope === 'private') return !entry.is_public;
            if (filterScope === 'public') return entry.is_public;
            return true;
          })
          .map((entry, idx) => {
            const isSelected = selectedIdx === idx;
            const isExpanded = expandedId === entry.id;
            const { day, weekday, monthYear } = parseDateParts(entry.entry_date || entry.created_at);

            return (
              <div
                key={entry.id || idx}
                id={`diary-entry-${entry.id}`}
                className={`row diary-entry-card ${isSelected ? 'diary-entry-card-active' : ''} ${!isComputerMode && isExpanded ? 'diary-entry-card-expanded' : ''}`}
                onClick={() => {
                  setSelectedIdx(idx);
                  if (onSelectDiary) {
                    onSelectDiary(entry.id);
                  }

                  if (!isComputerMode) {
                    // Trên 3 giao diện tableportrait, mobile-landscape và mobile portrait:
                    // Bấm vô mở rộng ô trắng content bên dưới
                    const nextExpandedId = isExpanded ? null : entry.id;
                    setExpandedId(nextExpandedId);
                  } else {
                    // Trên landscape computer và portrait computer:
                    // Không hiển thị ô content bên dưới khi bấm vô (nội dung hiển thị ở Right Reading Notebook)
                    setExpandedId(null);
                  }
                }}
                style={{
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '14px',
                  borderRadius: '14px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  background: (!isComputerMode && isExpanded) || (isComputerMode && isSelected) ? 'rgba(255, 255, 255, 0.08)' : 'var(--glass)',
                  color: 'inherit',
                  border: (!isComputerMode && isExpanded) || (isComputerMode && isSelected) ? '1.5px solid var(--gold, #E6C280)' : '1.5px solid rgba(230, 194, 128, 0.55)',
                  boxShadow: (!isComputerMode && isExpanded) || (isComputerMode && isSelected) ? '0 8px 24px rgba(230, 194, 128, 0.25)' : '0 2px 10px rgba(0,0,0,.18)',
                  transition: 'all 0.25s ease',
                  '--mood-aura': 'var(--gold, #E6C280)',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', width: '100%' }}>
                  <div style={{ textAlign: 'center', width: '44px', flex: 'none' }}>
                    <div
                      className="serif"
                      style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1 }}
                    >
                      {day}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '2px' }}>
                      {weekday}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="row"
                      style={{ gap: '6px', fontSize: '12.5px', opacity: 0.85 }}
                    >
                      <span style={{ marginLeft: 'auto' }} className="row">
                        {!entry.is_public ? (
                          <span className="row" style={{ gap: '4px' }}>
                            <Icon name="lock" size={13} /> {language === 'en' ? 'Only me' : 'Chỉ mình tôi'}
                          </span>
                        ) : !entry.is_approved ? (
                          <span className="badge b-wait" style={{ fontSize: '11px' }}>
                            {language === 'en' ? 'Pending approval' : 'Đang chờ duyệt'}
                          </span>
                        ) : (
                          <span className="row" style={{ gap: '4px', color: '#4E7A4A' }}>
                            <Icon name="globe" size={13} /> {language === 'en' ? 'Public' : 'Công khai'}
                          </span>
                        )}
                      </span>
                    </div>
                    <b
                      style={{
                        display: 'block',
                        fontSize: '16px',
                        marginTop: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {original(entry, 'title') || (language === 'en' ? 'Untitled' : 'Không tiêu đề')}
                    </b>
                    <div
                      style={{
                        fontSize: '13px',
                        opacity: 0.75,
                        whiteSpace: (!isComputerMode && isExpanded) ? 'normal' : 'nowrap',
                        overflow: (!isComputerMode && isExpanded) ? 'visible' : 'hidden',
                        textOverflow: (!isComputerMode && isExpanded) ? 'clip' : 'ellipsis',
                        marginTop: '2px',
                      }}
                    >
                      {original(entry, 'snippet') || original(entry, 'content') || (language === 'en' ? 'Private diary entry...' : 'Trang nhật ký riêng tư...')}
                    </div>
                  </div>
                </div>

                {/* Ô MÀU TRẮNG HIỆN RA NGAY DƯỚI BUTTON DIARY ĐÓ KHI BẤM VÔ (Chỉ trên 3 giao diện tablet/mobile) */}
                {!isComputerMode && isExpanded && (
                  <div
                    className="mobile-diary-expanded mobile-diary-white-box"
                    style={{
                      width: '100%',
                      marginTop: '14px',
                      padding: '18px 20px',
                      background: 'var(--paper, #FDFBF7)',
                      color: 'var(--ink, #2C1B14)',
                      borderRadius: '12px',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28)',
                      border: '1.5px solid var(--gold, #E6C280)',
                      borderLeft: '5px solid var(--gold, #E6C280)',
                      animation: 'softPageCurlFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                      boxSizing: 'border-box',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Meta date row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        borderBottom: '1px solid rgba(44, 27, 20, 0.1)',
                        paddingBottom: '8px',
                        marginBottom: '12px',
                        fontSize: '12.5px',
                        color: '#6E5245',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>
                          {language === 'en'
                            ? `${weekday}, day ${day} · ${monthYear}`
                            : `${weekday}, ngày ${day} · ${monthYear}`}
                        </span>
                      </div>

                      <div>
                        {!entry.is_public ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <Icon name="lock" size={13} /> {language === 'en' ? 'Only me' : 'Chỉ mình tôi'}
                          </span>
                        ) : !entry.is_approved ? (
                          <span className="badge b-wait" style={{ fontSize: '11px' }}>
                            {language === 'en' ? 'Pending approval' : 'Đang chờ duyệt'}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4E7A4A', fontSize: '12px' }}>
                            <Icon name="globe" size={13} /> {language === 'en' ? 'Public' : 'Công khai'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontFamily: 'var(--serif)',
                        fontSize: '20px',
                        fontWeight: 700,
                        color: 'var(--ink, #2C1B14)',
                        margin: '0 0 10px',
                        lineHeight: 1.3,
                      }}
                    >
                      {original(entry, 'title') || (language === 'en' ? 'Untitled' : 'Không tiêu đề')}
                    </h3>

                    {/* Full Content */}
                    <div
                      style={{
                        fontFamily: 'var(--serif)',
                        fontSize: '15px',
                        lineHeight: 1.8,
                        whiteSpace: 'pre-line',
                        color: '#3A2016',
                        marginBottom: '14px',
                      }}
                    >
                      {original(entry, 'content') || original(entry, 'snippet')}
                    </div>

                    {/* Drawing if present */}
                    {entry.drawing_data && (
                      <div style={{ margin: '12px 0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <Painting drawingData={entry.drawing_data} height={180} />
                      </div>
                    )}

                    {/* Media images if present */}
                    {entry.media_urls && entry.media_urls.length > 0 && (
                      <div style={{ margin: '12px 0', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {entry.media_urls.map((url, imgIdx) => (
                          <div
                            key={imgIdx}
                            style={{
                              border: '6px solid #fff',
                              boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                              borderRadius: '4px',
                              maxWidth: '220px',
                              overflow: 'hidden',
                            }}
                          >
                            <img src={url} alt="Lưu niệm" style={{ width: '100%', height: 'auto', display: 'block' }} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions bar inside the white box */}
                    <div className="row" style={{ gap: '10px', justifyContent: 'flex-end', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(44, 27, 20, 0.08)' }}>
                      <button
                        type="button"
                        className="btn line sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenWriteModal && onOpenWriteModal(entry);
                        }}
                      >
                        <Icon name="edit" size={14} />
                        <span>{language === 'en' ? 'Edit' : 'Sửa'}</span>
                      </button>

                      <button
                        type="button"
                        className="btn line sm"
                        style={{ color: '#A1342C', borderColor: 'rgba(161, 52, 44, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(entry.id);
                        }}
                      >
                        <Icon name="x" size={14} />
                        <span>{language === 'en' ? 'Delete' : 'Xoá'}</span>
                      </button>

                      <button
                        type="button"
                        className="btn glass sm"
                        style={{ background: 'rgba(44, 27, 20, 0.08)', color: 'var(--ink)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(null);
                          if (onSelectDiary) onSelectDiary(null);
                        }}
                      >
                        {language === 'en' ? 'Collapse ▲' : 'Thu gọn ▲'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        {/* Infinite Scroll Sentinel: Only render when hasMore is true and entries exist */}
        {hasMore && entries.length >= PAGE_LIMIT && (
          <div
            ref={sentinelRef}
            style={{
              height: '32px',
              margin: '10px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLoadingMore && (
              <div
                style={{
                  fontSize: '12.5px',
                  color: 'var(--gold, #E6C280)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '16px',
                  background: 'rgba(230, 194, 128, 0.12)',
                  border: '1px solid rgba(230, 194, 128, 0.3)',
                }}
              >
                <span className="diary-mood-dot-breathing" style={{ width: '8px', height: '8px', background: 'var(--gold, #E6C280)', borderRadius: '50%' }} />
                {language === 'en' ? 'Loading more entries...' : 'Đang tải thêm nhật ký...'}
              </div>
            )}
          </div>
        )}

        {!hasMore && entries.length > 4 && (
          <div
            style={{
              textAlign: 'center',
              padding: '14px 10px',
              fontSize: '11.5px',
              color: 'var(--onw2, #999)',
              letterSpacing: '0.04em',
            }}
          >
            ✦ {language === 'en' ? 'All moments captured' : 'Đã hiển thị tất cả nhật ký'} ✦
          </div>
        )}
      </div>

      {/* Right Reading Notebook (Chỉ hiển thị trên máy tính desktop và khi có ít nhất 1 nhật ký) */}
      {entries.length > 0 && currentDisplay && (
        <div
          key={currentDisplay.id || selectedIdx}
          className={`abs custom-scrollbar diary-scroll diary-page-curl diary-page-col ${mobileTab === 'list' ? 'mobile-hidden' : ''}`}
          style={{
            left: '480px',
            right: 0,
            top: '148px', // Dịch xuống dưới chips-row (148px)
            bottom: 0,
            background: 'var(--paper)',
            color: 'var(--ink)',
            borderRadius: '6px 0 0 0',
            border: '1.5px solid var(--gold, #E6C280)',
            boxShadow: '0 24px 50px rgba(0,0,0,.35)',
            padding: '36px clamp(32px, 4vw, 56px) 48px',
            overflowY: 'auto',
          }}
        >
          {/* Mobile Back Button */}
          <div className="mobile-only-header" style={{ marginBottom: '16px' }}>
            <button
              type="button"
              className="btn line sm"
              onClick={() => setMobileTab('list')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              ← {language === 'en' ? 'Back to entries list' : 'Quay lại danh sách nhật ký'}
            </button>
          </div>
          {/* Red/Gold Book Spine Left Margin */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '14px',
              background: 'linear-gradient(to bottom, var(--gold, #E6C280), var(--acc, #8A2D24))',
              borderRadius: '6px 0 0 6px',
            }}
          />

          <div className="row between">
            <div className="row muted" style={{ gap: '10px' }}>
              <span>
                {language === 'en'
                  ? `${activeDateInfo.weekday}, day ${activeDateInfo.day} · ${activeDateInfo.monthYear}`
                  : `${activeDateInfo.weekday}, ngày ${activeDateInfo.day} · ${activeDateInfo.monthYear}`}
              </span>
            </div>

            <span className="row muted" style={{ gap: '14px' }}>
              <button
                type="button"
                className="iconbtn"
                title={language === 'en' ? 'Edit this page' : 'Chỉnh sửa trang này'}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                onClick={() => onOpenWriteModal && onOpenWriteModal(currentDisplay)}
              >
                <Icon name="edit" size={17} />
              </button>
              <button
                type="button"
                className="iconbtn"
                title={language === 'en' ? 'Delete this page' : 'Xóa trang này'}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#A1342C' }}
                onClick={() => setConfirmDeleteId(currentDisplay.id)}
              >
                <Icon name="x" size={18} />
              </button>
              <span className="row" style={{ gap: '4px' }}>
                {!currentDisplay.is_public ? (
                  <>
                    <Icon name="lock" size={17} /> {language === 'en' ? 'Only me' : 'Chỉ mình tôi'}
                  </>
                ) : !currentDisplay.is_approved ? (
                  <span className="badge b-wait">{language === 'en' ? 'Pending' : 'Chờ duyệt'}</span>
                ) : (
                  <>
                    <Icon name="globe" size={17} /> {language === 'en' ? 'Public' : 'Công khai'}
                  </>
                )}
              </span>
            </span>
          </div>

          <h2 style={{ fontSize: '34px', margin: '12px 0 14px' }}>
            {original(currentDisplay, 'title') || (language === 'en' ? 'Untitled' : 'Không tiêu đề')}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: currentDisplay.media_urls?.length > 0 ? '1fr 260px' : '1fr',
              gap: '30px',
            }}
          >
            <div
              className="book"
              style={{
                fontSize: '17px',
                lineHeight: '34px',
                whiteSpace: 'pre-wrap',
                color: '#3A2016',
              }}
            >
              {isLoadingDetail
                ? (language === 'en' ? 'Loading...' : 'Đang tải...')
                : (original(currentDisplay, 'content') || original(currentDisplay, 'snippet'))}
            </div>

            {currentDisplay.media_urls && currentDisplay.media_urls.length > 0 && (
              <div>
                <div
                  style={{
                    border: '8px solid #fff',
                    boxShadow: '0 8px 20px rgba(0,0,0,.18)',
                    transform: 'rotate(2deg)',
                    overflow: 'hidden',
                    borderRadius: '4px',
                    maxHeight: '220px',
                  }}
                >
                  <img
                    src={currentDisplay.media_urls[0]}
                    alt="Lưu niệm nhật ký"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div
                  className="hand muted"
                  style={{ textAlign: 'center', marginTop: '10px', fontSize: '18px' }}
                >
                  ảnh chụp lưu niệm
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fallback khi có nhật ký nhưng chưa chọn trang nào trên desktop */}
      {entries.length > 0 && !currentDisplay && (
        <div
          className="abs diary-page-col"
          style={{
            left: '480px',
            right: '30px',
            top: '148px',
            bottom: '30px',
            background: 'var(--paper)',
            borderRadius: '6px 18px 18px 6px',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)',
            boxShadow: '0 24px 50px rgba(0,0,0,.35)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Icon name="book" size={48} />
            <div style={{ fontSize: '18px', marginTop: '12px' }}>
              {language === 'en' ? 'Select a diary entry to read' : 'Hãy chọn một trang nhật ký để đọc'}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Delete */}
      {confirmDeleteId && (
        <>
          <div className="scrim" onClick={() => setConfirmDeleteId(null)} />
          <div
            className="panel"
            style={{ width: '420px', textAlign: 'center', padding: '24px' }}
          >
            <Icon name="trash" size={32} />
            <h3 style={{ margin: '12px 0 6px' }}>Xoá trang nhật ký này?</h3>
            <div className="muted" style={{ fontSize: '14px', marginBottom: '20px' }}>
              Trang này sẽ bị xoá vĩnh viễn.
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirmDeleteId(null)}
                disabled={isDeleting}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="btn main"
                style={{ background: '#A1342C' }}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xoá...' : 'Xác nhận xoá'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
});

export default DiaryPersonal;

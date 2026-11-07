import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { CustomFilterDropdown } from '../../components/common/CustomFilterDropdown';
import { Icon } from '../../components/common/Icons';
import { NotebookDustMotes } from './NotebookDustMotes';
import { notebookService } from '../../services/notebookService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { HighlightText } from '../../components/common/HighlightText';

// Hiển thị ngày lưu dạng 28/10/2026 thay vì chuỗi ISO thô
function formatSavedAt(value, language) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return language === 'en' ? 'Recently' : 'Gần đây';
  return d.toLocaleDateString(language === 'en' ? 'en-GB' : 'vi-VN');
}

function getSourceLabel(item, language) {
  if (item?.sourceLabel) return item.sourceLabel;
  if (item?.source === 'mailbox') return language === 'en' ? 'Mailbox' : 'Hòm thư';
  if (item?.source === 'room1') return language === 'en' ? 'Artwork · Room 1' : 'Tác phẩm · Phòng 1';
  if (item?.source === 'room3') return language === 'en' ? 'Wish Leaf · Room 3' : 'Chiếc lá nguyện ước · Phòng 3';
  return language === 'en' ? 'Landed lantern · Room 2' : 'Lồng đèn hạ xuống · Phòng 2';
}

function getSourceIcon(item) {
  if (item?.icon) return item.icon;
  if (item?.source === 'mailbox') return 'sparkle';
  if (item?.source === 'room1') return 'r1';
  if (item?.source === 'room3') return 'r3';
  return 'r2';
}

export function NotebookPage({
  notebookItems = [],
  onRemoveItem,
  onSyncItems,
  onOpenNotifications,
  onOpenThemeModal,
}) {
  const { user } = useAuth();
  const { language, localize, original, t } = useLanguage();
  // Hòm thư là lời nhắn ban quản trị soạn sẵn hai thứ tiếng; còn lại là lời gốc của người viết
  const itemText = (it, field) => (it?.source === 'mailbox' ? localize(it, field) : original(it, field));

  const [filter, setFilter] = useState('all'); // 'all', 'mailbox', 'lantern', 'room1', 'room3'
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [serverItems, setServerItems] = useState([]);
  // true khi API sổ tay đã phản hồi (kể cả rỗng hoặc lỗi)
  const [serverLoaded, setServerLoaded] = useState(false);
  // true khi không gọi được API: lúc đó mới dùng bản lưu cục bộ
  const [serverError, setServerError] = useState(false);
  const syncItemsRef = useRef(onSyncItems);
  syncItemsRef.current = onSyncItems;
  const [isLoading, setIsLoading] = useState(false);
  const [readingItem, setReadingItem] = useState(null);
  const [expandedNotebookId, setExpandedNotebookId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const searchTimerRef = useRef(null);

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
    }, 3500);
  };

  // 1. Fetch unified notebook items from backend if user is logged in
  const loadNotebook = useCallback(async () => {
    if (!user) {
      setServerLoaded(true);
      return;
    }
    setIsLoading(true);
    try {
      const res = await notebookService.getNotebook({
        source: 'all',
        search: debouncedSearch,
        limit: 50,
      });
      const data = res?.data || res;
      if (data && Array.isArray(data.items)) {
        const mapped = data.items.map((it) => ({
          id: it.id,
          source: it.source,
          sourceLabel: it.source_label || (
            it.source === 'mailbox' ? (language === 'en' ? 'Mailbox' : 'Hòm thư') :
            it.source === 'room1' ? (language === 'en' ? 'Artwork · Room 1' : 'Tác phẩm · Phòng 1') :
            it.source === 'room3' ? (language === 'en' ? 'Wish Leaf · Room 3' : 'Chiếc lá nguyện ước · Phòng 3') :
            (language === 'en' ? 'Landed lantern · Room 2' : 'Lồng đèn hạ xuống · Phòng 2')
          ),
          badgeClass: it.badge_class || (it.source === 'mailbox' || it.source === 'room1' ? 'b-ok' : 'b-wait'),
          icon: it.icon || (
            it.source === 'mailbox' ? 'sparkle' :
            it.source === 'room1' ? 'r1' :
            it.source === 'room3' ? 'r3' : 'r2'
          ),
          title: it.title,
          title_vi: it.title_vi,
          title_en: it.title_en,
          content: it.content,
          content_vi: it.content_vi,
          content_en: it.content_en,
          author: it.author || (language === 'en' ? 'Stranger' : 'Người lạ'),
          category: it.category,
          symbol: it.symbol || 'heart',
          savedAt: formatSavedAt(it.saved_at, language),
          source_id: it.source_id,
          artwork_id: it.artwork_id,
          draw_id: it.draw_id,
          media_url: it.media_url,
        }));
        setServerItems(mapped);
        setServerLoaded(true);
        setServerError(false);
      }
      setServerLoaded(true);
    } catch (err) {
      console.warn('Could not load unified notebook from API, using local storage:', err);
      setServerError(true);
      setServerLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, user, language]);

  useEffect(() => {
    loadNotebook();
  }, [loadNotebook]);

  // 2. Kết hợp thông minh giữa serverItems và notebookItems:
  // Luôn bảo toàn các mục người dùng đã lưu trong local storage mà server chưa có hoặc không lưu (ví dụ mock, offline).
  const useServer = Boolean(user && serverLoaded && !serverError);
  const activeItems = React.useMemo(() => {
    if (!serverLoaded) {
      return notebookItems || [];
    }

    const merged = [...serverItems];
    const serverSourceIds = new Set(
      serverItems.map((it) => it.source_id || it.artwork_id || it.id).filter(Boolean)
    );
    const serverContents = new Set(
      serverItems.map((it) => (it.content || '').trim()).filter(Boolean)
    );

    (notebookItems || []).forEach((localIt) => {
      const localId = localIt.source_id || localIt.artwork_id || localIt.id;
      const localContent = (localIt.content || '').trim();

      const alreadyExists =
        (localId && serverSourceIds.has(localId)) ||
        (localContent && serverContents.has(localContent));

      if (!alreadyExists) {
        merged.push(localIt);
      }
    });

    return merged;
  }, [serverLoaded, serverItems, notebookItems]);

  // 3. Lọc danh sách theo filter chip và ô tìm kiếm
  const displayItems = React.useMemo(() => {
    return activeItems.filter((item) => {
      if (filter === 'mailbox' && item.source !== 'mailbox') return false;
      if (filter === 'lantern' && item.source !== 'lantern') return false;
      if (filter === 'room1' && item.source !== 'room1') return false;
      if (filter === 'room3' && item.source !== 'room3') return false;

      if (debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        const matchContent = item.content && item.content.toLowerCase().includes(term);
        const matchTitle = item.title && item.title.toLowerCase().includes(term);
        const matchAuthor = item.author && item.author.toLowerCase().includes(term);
        const matchCategory = item.category && item.category.toLowerCase().includes(term);
        return matchContent || matchTitle || matchAuthor || matchCategory;
      }
      return true;
    });
  }, [activeItems, filter, debouncedSearch]);

  const handleRemove = async (e, item) => {
    e.stopPropagation();

    const previousServerItems = serverItems;
    // 1. Gỡ bỏ tức thì trên giao diện và local storage
    if (onRemoveItem) {
      onRemoveItem(item);
    }
    const targetSourceId = item.source_id || item.artwork_id;
    setServerItems((prev) =>
      prev.filter((it) => it.id !== item.id && (!targetSourceId || it.source_id !== targetSourceId))
    );

    // 2. Gỡ bỏ trên máy chủ backend
    try {
      await notebookService.removeNotebookItem(item);
    } catch (err) {
      console.warn('Backend unsave failed:', err);
      if (useServer) {
        setServerItems(previousServerItems);
        triggerToast(
          language === 'en'
            ? 'Could not remove this item. Please try again.'
            : 'Chưa gỡ được mục này. Bạn thử lại nhé.'
        );
        return;
      }
    }

    if (onRemoveItem) {
      onRemoveItem(item.id);
    }
    triggerToast(language === 'en' ? 'Removed from notebook' : 'Đã gỡ mục này khỏi sổ tay');
  };

  return (
    <div className="stage" style={{ background: 'var(--wall)' }}>
      {/* Golden Dust Motes & Star Particles */}
      <NotebookDustMotes />

      {/* Top Header */}
      <TopNav
        roomNo="NOTEBOOK"
        tagLabel={language === 'en' ? 'Saved for you' : 'Lưu cho riêng bạn'}
        roomName={t('nav_notebook')}
        searchPlaceholder={language === 'en' ? 'Search your notebook…' : 'Tìm trong sổ tay…'}
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
            background: 'rgba(28, 18, 14, 0.92)',
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

      {/* Filter Chips */}
      <div className="chips-row">
        {/* Desktop Chips */}
        <div className="chips desktop-only-chips" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <span
            className={`chip glass ${filter === 'all' ? 'on' : ''}`}
            onClick={() => setFilter('all')}
            style={{ cursor: 'pointer' }}
          >
            {language === 'en' ? 'All' : 'Tất cả'}
          </span>
          <span
            className={`chip glass ${filter === 'mailbox' ? 'on' : ''}`}
            onClick={() => setFilter('mailbox')}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="sparkle" size={14} /> {language === 'en' ? 'Mailbox' : 'Hòm thư'}
          </span>
          <span
            className={`chip glass ${filter === 'room1' ? 'on' : ''}`}
            onClick={() => setFilter('room1')}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="r1" size={14} /> {language === 'en' ? 'Room 1' : 'Phòng 1'}
          </span>
          <span
            className={`chip glass ${filter === 'lantern' ? 'on' : ''}`}
            onClick={() => setFilter('lantern')}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="r2" size={14} /> {language === 'en' ? 'Room 2' : 'Phòng 2'}
          </span>
          <span
            className={`chip glass ${filter === 'room3' ? 'on' : ''}`}
            onClick={() => setFilter('room3')}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="r3" size={14} /> {language === 'en' ? 'Room 3' : 'Phòng 3'}
          </span>
          {isLoading && (
            <span className="muted" style={{ fontSize: '13px', marginLeft: '6px' }}>
              {language === 'en' ? 'Loading...' : 'Đang tải...'}
            </span>
          )}
        </div>

        {/* Mobile/Tablet Dropdown (customized with same format as desktop .chip.glass.on) */}
        <div className="mobile-filter-wrapper">
          <CustomFilterDropdown
            options={[
              { value: 'all', label: language === 'en' ? 'All' : 'Tất cả' },
              { value: 'mailbox', label: language === 'en' ? 'Mailbox' : 'Hòm thư', icon: 'sparkle' },
              { value: 'room1', label: language === 'en' ? 'Room 1' : 'Phòng 1', icon: 'r1' },
              { value: 'lantern', label: language === 'en' ? 'Room 2' : 'Phòng 2', icon: 'r2' },
              { value: 'room3', label: language === 'en' ? 'Room 3' : 'Phòng 3', icon: 'r3' },
            ]}
            value={filter}
            onChange={(val) => setFilter(val)}
          />
        </div>

        <div className="notebook-counter muted" style={{ fontSize: '13px', flexShrink: 0 }}>
          {displayItems.length} {language === 'en' ? 'items' : 'mục'}
        </div>
      </div>

      {/* Notebook Cards Container */}
      <div
        className="abs custom-scrollbar notebook-scroll"
        style={{
          left: 0,
          right: 0,
          top: '144px',
          bottom: 0,
          overflowY: 'auto',
          padding: '0 clamp(24px, 4vw, 48px) 44px',
        }}
      >
        {displayItems.length === 0 ? (
          isLoading ? (
            <div className="muted" style={{ textAlign: 'center', padding: '60px 20px', fontSize: '15px' }}>
              {language === 'en' ? 'Loading your notebook…' : 'Đang tải sổ tay…'}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--onw2)',
              }}
            >
              <div style={{ fontSize: '40px', color: 'var(--gold)', marginBottom: '12px' }}>✦</div>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: '24px', color: 'var(--onw)' }}>
                {language === 'en' ? 'Your notebook is empty' : 'Sổ tay còn trống'}
              </h3>
              <p className="book" style={{ maxWidth: '480px', margin: '0 auto', fontSize: '15px' }}>
                {language === 'en'
                  ? 'When you find a message you like, tap "Save to notebook" to keep it here.'
                  : 'Gặp lời nhắn nào bạn thích, bấm "Lưu vào sổ tay" để giữ lại ở đây.'}
              </p>
            </div>
          )
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '20px',
            }}
          >
            {displayItems.map((item, idx) => {
              const itemKey = item.id || `nb_item_${idx}`;
              const isExpanded = expandedNotebookId === (item.id || itemKey);

              return (
                <div
                  key={itemKey}
                  onClick={() => {
                    if (window.innerWidth <= 1024) {
                      setExpandedNotebookId((prev) => (prev === (item.id || itemKey) ? null : (item.id || itemKey)));
                    } else {
                      setReadingItem(item);
                    }
                  }}
                  className={`notebook-polaroid-card ${isExpanded ? 'notebook-card-expanded' : ''}`}
                  style={{
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    borderRadius: '16px',
                    padding: '22px 24px 18px',
                    boxShadow: isExpanded ? '0 16px 36px rgba(0,0,0,.35)' : '0 12px 30px rgba(0,0,0,.25)',
                    border: isExpanded ? '1px solid var(--gold, #E6C280)' : '1px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    cursor: 'pointer',
                    transform: 'none',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {/* Header: Source badge & Date */}
                  <div className="row between" style={{ marginBottom: '12px' }}>
                    <span className={`badge ${item.badgeClass || 'b-ok'}`}>
                      <Icon name={getSourceIcon(item)} size={13} />
                      {getSourceLabel(item, language)}
                    </span>
                    <span className="muted" style={{ fontSize: '12.5px' }}>
                      {item.savedAt || formatSavedAt(item.saved_at, language)}
                    </span>
                  </div>

                  {/* Optional Letter Title */}
                  {(item.title || item.title_en || item.title_vi) && (
                    <div
                      className="book"
                      style={{
                        fontStyle: 'italic',
                        color: 'var(--acc)',
                        fontSize: '19px',
                        fontWeight: 600,
                        marginBottom: '8px',
                      }}
                    >
                      <HighlightText text={itemText(item, 'title')} query={debouncedSearch} />
                    </div>
                  )}

                  {/* Optional Artwork Media preview */}
                  {item.media_url && (
                    <div
                      style={{
                        width: '100%',
                        height: isExpanded ? '240px' : '130px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        marginBottom: '10px',
                        background: '#1A1210',
                        transition: 'height 0.25s ease',
                      }}
                    >
                      <img
                        src={item.media_url}
                        alt={item.title || 'Artwork'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div
                    className="book"
                    style={{
                      fontSize: '15.5px',
                      lineHeight: 1.7,
                      flex: 1,
                      marginBottom: '14px',
                      whiteSpace: 'pre-line',
                      overflow: isExpanded ? 'visible' : 'hidden',
                      display: isExpanded ? 'block' : '-webkit-box',
                      WebkitLineClamp: isExpanded ? 'unset' : 5,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    <HighlightText text={itemText(item, 'content')} query={debouncedSearch} />
                  </div>

                  {/* Author & Footer Actions */}
                  <div
                    className="row between"
                    style={{
                      borderTop: '1px solid var(--line)',
                      paddingTop: '12px',
                      marginTop: 'auto',
                    }}
                  >
                    <span className="hand" style={{ fontSize: '18px', color: '#5C341F' }}>
                      - {item.author}
                    </span>

                    <div className="row" style={{ gap: '8px' }}>
                      {isExpanded && (
                        <button
                          type="button"
                          className="btn glass sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedNotebookId(null);
                          }}
                        >
                          {language === 'en' ? 'Close' : 'Thu gọn'}
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn ghost sm"
                        title="Bỏ lưu khỏi sổ tay"
                        onClick={(e) => handleRemove(e, item)}
                        style={{
                          color: 'var(--ink2)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon name="x" size={14} /> Bỏ lưu
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reading Detail Modal */}
      {readingItem && (
        <>
          <div className="scrim" onClick={() => setReadingItem(null)} />
          <div
            className="panel wax-seal-modal"
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '600px',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#FBF4E6',
              boxShadow: '0 28px 70px rgba(0,0,0,0.45)',
              padding: '32px 42px 34px',
              borderRadius: '16px',
              border: '1px solid rgba(201, 154, 59, 0.4)',
            }}
          >
            <span
              className="x"
              onClick={() => setReadingItem(null)}
              role="button"
              tabIndex={0}
            >
              <Icon name="x" size={22} />
            </span>

            {/* Wax Seal Stamp (Mở phong ấn sáp / Thư hạ cánh) */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div
                className="wax-seal-stamp"
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #A8241E 0%, #6E120D 100%)',
                  boxShadow: '0 4px 14px rgba(110, 18, 13, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.25), inset 0 -2px 4px rgba(0, 0, 0, 0.4)',
                  border: '2px solid #C99A3B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFECB3',
                }}
                title={language === 'en' ? 'Wax Seal' : 'Con dấu sáp kỷ niệm'}
              >
                <Icon name={readingItem.icon || 'sparkle'} size={20} />
              </div>
            </div>

            <div className="row between" style={{ marginBottom: '14px' }}>
              <span className={`badge ${readingItem.badgeClass || 'b-ok'}`}>
                <Icon name={getSourceIcon(readingItem)} size={13} />
                {getSourceLabel(readingItem, language)}
              </span>
              <span className="muted" style={{ fontSize: '13px' }}>
                {readingItem.savedAt}
              </span>
            </div>

            {(readingItem.title || readingItem.title_en || readingItem.title_vi) && (
              <h2
                className="book"
                style={{
                  fontStyle: 'italic',
                  color: 'var(--acc)',
                  fontSize: '24px',
                  fontWeight: 700,
                  margin: '4px 0 14px',
                }}
              >
                <HighlightText text={itemText(readingItem, 'title')} query={debouncedSearch} />
              </h2>
            )}

            {readingItem.media_url && (
              <div
                style={{
                  width: '100%',
                  maxHeight: '260px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginBottom: '16px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  background: '#1A1210',
                }}
              >
                <img
                  src={readingItem.media_url}
                  alt={readingItem.title || 'Artwork'}
                  style={{ width: '100%', height: '100%', maxHeight: '260px', objectFit: 'cover' }}
                />
              </div>
            )}

            <div
              className="book wax-letter-body"
              style={{
                fontSize: '17px',
                lineHeight: 1.85,
                whiteSpace: 'pre-wrap',
                color: '#3A2016',
                margin: '14px 0 20px',
              }}
            >
              <HighlightText text={itemText(readingItem, 'content')} query={debouncedSearch} />
            </div>

            <div
              className="row between"
              style={{
                borderTop: '1px solid var(--line)',
                paddingTop: '16px',
                marginTop: '20px',
              }}
            >
              <span className="hand" style={{ fontSize: '22px', color: '#5C341F' }}>
                — {readingItem.author || (language === 'en' ? 'Stranger' : 'Người lạ')}
              </span>

              <button
                type="button"
                className="btn line sm"
                onClick={(e) => {
                  handleRemove(e, readingItem);
                  setReadingItem(null);
                }}
              >
                <Icon name="x" size={14} /> {language === 'en' ? 'Remove from notebook' : 'Bỏ lưu khỏi sổ tay'}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default NotebookPage;

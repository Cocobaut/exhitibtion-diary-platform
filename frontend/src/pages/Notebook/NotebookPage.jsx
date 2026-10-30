import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { Icon } from '../../components/common/Icons';
import { notebookService } from '../../services/notebookService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

// Hiển thị ngày lưu dạng 28/10/2026 thay vì chuỗi ISO thô
function formatSavedAt(value, language) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return language === 'en' ? 'Recently' : 'Gần đây';
  return d.toLocaleDateString(language === 'en' ? 'en-GB' : 'vi-VN');
}

export function NotebookPage({
  notebookItems = [],
  onRemoveItem,
  onOpenNotifications,
  onOpenThemeModal,
}) {
  const { user } = useAuth();
  const { language, localize, original, t } = useLanguage();
  // Hòm thư là lời nhắn ban quản trị soạn sẵn hai thứ tiếng; còn lại là lời gốc của người viết
  const itemText = (it, field) => (it?.source === 'mailbox' ? localize(it, field) : original(it, field));

  const [filter, setFilter] = useState('all'); // 'all', 'mailbox', 'lantern'
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [serverItems, setServerItems] = useState([]);
  // true khi API sổ tay trả lời thành công (kể cả danh sách rỗng)
  const [serverLoaded, setServerLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [readingItem, setReadingItem] = useState(null);
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

  // Fetch unified notebook items from backend if user is logged in
  const loadNotebook = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await notebookService.getNotebook({
        source: filter,
        search: debouncedSearch,
        limit: 50,
      });
      const data = res?.data || res;
      if (data) {
        if (Array.isArray(data.items)) {
          const mapped = data.items.map((it) => ({
            id: it.id,
            source: it.source,
            sourceLabel: it.source_label || (it.source === 'mailbox' ? (language === 'en' ? 'Mailbox' : 'Hòm thư') : (language === 'en' ? 'Landed lantern · Room 2' : 'Lồng đèn hạ xuống · Phòng 2')),
            badgeClass: it.badge_class || (it.source === 'mailbox' ? 'b-ok' : 'b-wait'),
            icon: it.icon || (it.source === 'mailbox' ? 'sparkle' : 'r2'),
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
          }));
          setServerItems(mapped);
          setServerLoaded(true);
        }
      }
    } catch (err) {
      console.warn('Could not load unified notebook from API, using local storage:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filter, debouncedSearch, user]);

  useEffect(() => {
    loadNotebook();
  }, [loadNotebook]);

  // Ưu tiên dữ liệu server; chỉ dùng bản lưu cục bộ khi không gọi được API
  const useServer = Boolean(user && serverLoaded);
  const activeItems = useServer ? serverItems : notebookItems;

  // Filter client-side if using local items
  const displayItems = useServer
    ? serverItems
    : activeItems.filter((item) => {
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

  const handleRemove = async (e, item) => {
    e.stopPropagation();

    // Optimistic removal locally
    if (onRemoveItem) {
      onRemoveItem(item.id);
    }
    setServerItems((prev) => prev.filter((it) => it.id !== item.id));

    // Call service to unsave from backend
    try {
      await notebookService.removeNotebookItem(item);
    } catch (err) {
      console.warn('Backend unsave failed:', err);
    }

    triggerToast(language === 'en' ? 'Removed from notebook' : 'Đã gỡ mục này khỏi sổ tay');
  };

  return (
    <div className="stage" style={{ background: 'var(--wall)' }}>
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
        <div className="chips" style={{ flexWrap: 'wrap', gap: '8px' }}>
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
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '20px',
            }}
          >
            {displayItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setReadingItem(item)}
                style={{
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  borderRadius: '16px',
                  padding: '22px 24px 18px',
                  boxShadow: '0 12px 30px rgba(0,0,0,.25)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 18px 40px rgba(0,0,0,.32)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,.25)';
                }}
              >
                {/* Header: Source badge & Date */}
                <div className="row between" style={{ marginBottom: '12px' }}>
                  <span className={`badge ${item.badgeClass || 'b-ok'}`}>
                    <Icon name={item.icon || 'sparkle'} size={13} />
                    {item.sourceLabel || (item.source === 'mailbox' ? (language === 'en' ? 'Mailbox' : 'Hòm thư') : (language === 'en' ? 'Landed lantern · Room 2' : 'Lồng đèn hạ xuống · Phòng 2'))}
                  </span>
                  <span className="muted" style={{ fontSize: '12.5px' }}>
                    {item.savedAt}
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
                    {itemText(item, 'title')}
                  </div>
                )}

                {/* Optional Artwork Media preview */}
                {item.media_url && (
                  <div
                    style={{
                      width: '100%',
                      height: '130px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '10px',
                      background: '#1A1210',
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
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {itemText(item, 'content')}
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
            ))}
          </div>
        )}
      </div>

      {/* Reading Detail Modal */}
      {readingItem && (
        <>
          <div className="scrim" onClick={() => setReadingItem(null)} />
          <div
            className="panel"
            style={{
              width: '600px',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#FBF4E6',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
              padding: '34px 42px',
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

            <div className="row between" style={{ marginBottom: '14px' }}>
              <span className={`badge ${readingItem.badgeClass || 'b-ok'}`}>
                <Icon name={readingItem.icon || 'sparkle'} size={13} />
                {readingItem.sourceLabel || (readingItem.source === 'mailbox' ? (language === 'en' ? 'Mailbox' : 'Hòm thư') : (language === 'en' ? 'Landed lantern · Room 2' : 'Lồng đèn hạ xuống · Phòng 2'))}
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
                {itemText(readingItem, 'title')}
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
              className="book"
              style={{
                fontSize: '17px',
                lineHeight: 1.85,
                whiteSpace: 'pre-wrap',
                color: '#3A2016',
                margin: '14px 0 20px',
              }}
            >
              {itemText(readingItem, 'content')}
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

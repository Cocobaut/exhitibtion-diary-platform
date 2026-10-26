import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { Icon } from '../../components/common/Icons';
import { notebookService } from '../../services/notebookService';
import { useAuth } from '../../context/AuthContext';

export function NotebookPage({
  notebookItems = [],
  onRemoveItem,
  onOpenNotifications,
  onOpenThemeModal,
}) {
  const { user } = useAuth();

  const [filter, setFilter] = useState('all'); // 'all', 'mailbox', 'lantern'
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [serverItems, setServerItems] = useState([]);
  const [serverCounts, setServerCounts] = useState({ all: 0, mailbox: 0, lantern: 0 });
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
            sourceLabel: it.source_label || (it.source === 'mailbox' ? 'Hòm thư' : 'Lồng đèn hạ xuống · Phòng 2'),
            badgeClass: it.badge_class || (it.source === 'mailbox' ? 'b-ok' : 'b-wait'),
            icon: it.icon || (it.source === 'mailbox' ? 'sparkle' : 'r2'),
            title: it.title,
            content: it.content,
            author: it.author || 'Người lạ',
            category: it.category,
            symbol: it.symbol || 'heart',
            savedAt: it.saved_at || 'Gần đây',
            source_id: it.source_id,
            artwork_id: it.artwork_id,
            draw_id: it.draw_id,
          }));
          setServerItems(mapped);
        }
        if (data.pagination?.counts) {
          setServerCounts(data.pagination.counts);
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

  // Merge items: use serverItems if available, otherwise fallback to local notebookItems
  const activeItems = user && serverItems.length > 0 ? serverItems : notebookItems;

  const mailboxCount =
    serverCounts.mailbox || activeItems.filter((i) => i.source === 'mailbox').length;
  const lanternCount =
    serverCounts.lantern || activeItems.filter((i) => i.source === 'lantern').length;
  const totalCount =
    serverCounts.all || activeItems.length;

  // Filter client-side if using local items
  const displayItems = (user && serverItems.length > 0)
    ? serverItems
    : activeItems.filter((item) => {
        if (filter === 'mailbox' && item.source !== 'mailbox') return false;
        if (filter === 'lantern' && item.source !== 'lantern') return false;

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

    triggerToast('Đã gỡ mục này khỏi sổ tay');
  };

  return (
    <div className="stage" style={{ background: 'var(--wall)' }}>
      {/* Top Header */}
      <TopNav
        roomNo="SỔ TAY"
        roomName="Sổ tay Ký ức"
        searchPlaceholder="Tìm kiếm thông điệp, thư đã lưu…"
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
        <div className="chips">
          <span
            className={`chip glass ${filter === 'all' ? 'on' : ''}`}
            onClick={() => setFilter('all')}
            style={{ cursor: 'pointer' }}
          >
            Tất cả ({totalCount})
          </span>
          <span
            className={`chip glass ${filter === 'mailbox' ? 'on' : ''}`}
            onClick={() => setFilter('mailbox')}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="sparkle" size={14} /> Từ Hòm thư ({mailboxCount})
          </span>
          <span
            className={`chip glass ${filter === 'lantern' ? 'on' : ''}`}
            onClick={() => setFilter('lantern')}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="r2" size={14} /> Từ Lồng đèn ({lanternCount})
          </span>
          {isLoading && (
            <span className="muted" style={{ fontSize: '13px', marginLeft: '6px' }}>
              Đang tải...
            </span>
          )}
        </div>
      </div>

      {/* Notebook Cards Container */}
      <div
        className="abs"
        style={{
          left: '30px',
          right: '30px',
          top: '144px',
          bottom: '30px',
          overflowY: 'auto',
          paddingBottom: '30px',
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
              Sổ tay hiện đang trống
            </h3>
            <p className="book" style={{ maxWidth: '480px', margin: '0 auto', fontSize: '15px' }}>
              Bạn có thể rút thông điệp ở Hòm thư sảnh chính hoặc mở những bức thư Lồng đèn hạ xuống ở
              Phòng 2 và bấm "Lưu vào sổ tay" để lưu giữ tại đây.
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
                    {item.sourceLabel || (item.source === 'mailbox' ? 'Hòm thư' : 'Lồng đèn hạ xuống · Phòng 2')}
                  </span>
                  <span className="muted" style={{ fontSize: '12.5px' }}>
                    {item.savedAt}
                  </span>
                </div>

                {/* Optional Letter Title */}
                {item.title && (
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
                    {item.title}
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
                  {item.content}
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
                {readingItem.sourceLabel || (readingItem.source === 'mailbox' ? 'Hòm thư' : 'Lồng đèn hạ xuống · Phòng 2')}
              </span>
              <span className="muted" style={{ fontSize: '13px' }}>
                {readingItem.savedAt}
              </span>
            </div>

            {readingItem.title && (
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
                {readingItem.title}
              </h2>
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
              {readingItem.content}
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
                — {readingItem.author}
              </span>

              <button
                type="button"
                className="btn line sm"
                onClick={(e) => {
                  handleRemove(e, readingItem);
                  setReadingItem(null);
                }}
              >
                <Icon name="x" size={14} /> Bỏ lưu khỏi sổ tay
              </button>
            </div>
          </div>
        </>
      )}

      {/* Counter */}
      <div className="counter">
        <i>Sổ tay lưu lại những dòng chữ nâng đỡ bạn trên từng chặng đường.</i>
      </div>
    </div>
  );
}

export default NotebookPage;

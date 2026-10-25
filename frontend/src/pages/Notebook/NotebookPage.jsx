import React, { useState } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { Icon } from '../../components/common/Icons';

export function NotebookPage({
  notebookItems = [],
  onRemoveItem,
  onOpenNotifications,
  onOpenThemeModal,
}) {
  const [filter, setFilter] = useState('all'); // 'all', 'mailbox', 'lantern'
  const [search, setSearch] = useState('');
  const [readingItem, setReadingItem] = useState(null);

  const mailboxCount = notebookItems.filter((i) => i.source === 'mailbox').length;
  const lanternCount = notebookItems.filter((i) => i.source === 'lantern').length;

  const filteredItems = notebookItems.filter((item) => {
    // Filter by source
    if (filter === 'mailbox' && item.source !== 'mailbox') return false;
    if (filter === 'lantern' && item.source !== 'lantern') return false;

    // Search query
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchContent = item.content && item.content.toLowerCase().includes(term);
      const matchTitle = item.title && item.title.toLowerCase().includes(term);
      const matchAuthor = item.author && item.author.toLowerCase().includes(term);
      const matchCategory = item.category && item.category.toLowerCase().includes(term);
      return matchContent || matchTitle || matchAuthor || matchCategory;
    }
    return true;
  });

  return (
    <div className="stage" style={{ background: 'var(--wall)' }}>
      {/* Top Header */}
      <TopNav
        roomNo="SỔ TAY"
        roomName="Sổ tay Ký ức"
        searchPlaceholder="Tìm kiếm thông điệp, thư đã lưu…"
        searchValue={search}
        onSearchChange={setSearch}
        onOpenNotifications={onOpenNotifications}
        onOpenThemeModal={onOpenThemeModal}
      />

      {/* Filter Chips */}
      <div className="chips-row">
        <div className="chips">
          <span
            className={`chip glass ${filter === 'all' ? 'on' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất cả ({notebookItems.length})
          </span>
          <span
            className={`chip glass ${filter === 'mailbox' ? 'on' : ''}`}
            onClick={() => setFilter('mailbox')}
          >
            <Icon name="sparkle" size={14} /> Từ Hòm thư ({mailboxCount})
          </span>
          <span
            className={`chip glass ${filter === 'lantern' ? 'on' : ''}`}
            onClick={() => setFilter('lantern')}
          >
            <Icon name="r2" size={14} /> Từ Lồng đèn ({lanternCount})
          </span>
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
        {filteredItems.length === 0 ? (
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
            {filteredItems.map((item) => (
              <div
                key={item.id}
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
                  transition: 'transform 0.15s ease',
                }}
              >
                {/* Header: Source badge & Date */}
                <div className="row between" style={{ marginBottom: '12px' }}>
                  <span className={`badge ${item.badgeClass || 'b-ok'}`}>
                    <Icon name={item.icon || 'sparkle'} size={13} />
                    {item.sourceLabel}
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
                  <span className="hand" style={{ fontSize: '18px', color: 'var(--ink)' }}>
                    - {item.author}
                  </span>

                  <button
                    type="button"
                    className="btn ghost sm"
                    title="Bỏ lưu khỏi sổ tay"
                    onClick={() => onRemoveItem && onRemoveItem(item.id)}
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

      {/* Counter */}
      <div className="counter">
        <i>Sổ tay lưu lại những dòng chữ nâng đỡ bạn trên từng chặng đường.</i>
      </div>
    </div>
  );
}

export default NotebookPage;

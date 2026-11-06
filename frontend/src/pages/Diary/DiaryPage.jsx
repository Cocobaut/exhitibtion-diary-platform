import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '../../components/common/Icons';
import { CustomFilterDropdown } from '../../components/common/CustomFilterDropdown';
import { DiaryPersonal } from './DiaryPersonal';
import { WriteDiaryModal } from './WriteDiaryModal';
import { useLanguage } from '../../context/LanguageContext';

export function DiaryPage({
  onOpenNotifications,
  onOpenThemeModal,
  initialDiaryTarget = null,
  onClearInitialDiary,
}) {
  const { language, setLanguage, original, t } = useLanguage();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterScope, setFilterScope] = useState('all'); // 'all', 'private', 'public'
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [entries, setEntries] = useState([]);
  const [activeDiaryId, setActiveDiaryId] = useState(null);
  const [diaryPagination, setDiaryPagination] = useState({ hasMore: false, isLoadingMore: false });
  const diaryPersonalRef = useRef(null);

  const handleEntriesLoaded = useCallback((items) => {
    setEntries((prev) => {
      if (
        prev.length === items.length &&
        prev.every((e, i) => e.id === items[i]?.id)
      ) {
        return prev;
      }
      return items;
    });
  }, []);

  const handlePaginationChange = useCallback((pag) => {
    setDiaryPagination((prev) => {
      if (prev.hasMore === pag.hasMore && prev.isLoadingMore === pag.isLoadingMore) {
        return prev;
      }
      return pag;
    });
  }, []);

  const searchTimerRef = useRef(null);

  useEffect(() => {
    if (initialDiaryTarget && onClearInitialDiary) {
      onClearInitialDiary();
    }
  }, [initialDiaryTarget, onClearInitialDiary]);

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
    }, 4000);
  };

  const handleOpenWrite = (entryToEdit = null) => {
    setEditingEntry(entryToEdit);
    setShowWriteModal(true);
  };

  const handleSaveDiary = () => {
    triggerToast(language === 'en' ? '✦ Saved to your diary.' : '✦ Đã lưu vào nhật ký của bạn.');
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="stage diary-stage" style={{ background: 'var(--wall)' }}>
      {/* Diary Header */}
      <div className="top">
        <div className="room-tag">
          <small>{language === 'en' ? 'Private space' : 'Không gian riêng'}</small>
          <b>{language === 'en' ? 'Personal Diary' : 'Nhật ký cá nhân'}</b>
        </div>

        <div className="search glass">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder={language === 'en' ? 'Search in your diary…' : 'Tìm trong nhật ký của bạn…'}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="tr">
          <button
            type="button"
            className="iconbtn glass topnav-theme-btn"
            title={language === 'en' ? 'Color theme' : 'Bảng màu'}
            onClick={onOpenThemeModal}
          >
            <Icon name="palette" size={20} />
          </button>

          <div className="lang glass topnav-lang-btn" style={{ cursor: 'pointer', userSelect: 'none' }}>
            <b
              className={language === 'vi' ? 'on' : ''}
              onClick={() => setLanguage('vi')}
              style={{ cursor: 'pointer' }}
            >
              VI
            </b>
            <b
              className={language === 'en' ? 'on' : ''}
              onClick={() => setLanguage('en')}
              style={{ cursor: 'pointer' }}
            >
              EN
            </b>
          </div>

          <button
            type="button"
            className="iconbtn glass topnav-bell-btn"
            title={language === 'en' ? 'Notifications' : 'Thông báo'}
            onClick={onOpenNotifications}
          >
            <Icon name="bell" size={20} />
          </button>
        </div>
      </div>

      {/* Sub-header row under room title */}
      <div className="chips-row">
        {/* Desktop Chips */}
        <div className="chips desktop-only-chips">
          <span
            className={`chip glass ${filterScope === 'all' ? 'on' : ''}`}
            onClick={() => setFilterScope('all')}
            style={{ cursor: 'pointer' }}
          >
            {language === 'en' ? 'All' : 'Tất cả'}
          </span>
          <span
            className={`chip glass ${filterScope === 'private' ? 'on' : ''}`}
            onClick={() => setFilterScope('private')}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="lock" size={13} /> {language === 'en' ? 'Only me' : 'Chỉ mình tôi'}
          </span>
          {/* Public button with disabled effect and no-click */}
          <span
            className="chip glass public-disabled-chip"
            style={{
              opacity: 0.45,
              filter: 'grayscale(60%)',
              cursor: 'not-allowed',
              userSelect: 'none',
              borderStyle: 'dashed',
            }}
            title={language === 'en' ? 'Public feature is currently disabled' : 'Tính năng công khai tạm thời bị khóa'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Icon name="globe" size={13} /> {language === 'en' ? 'Public' : 'Công khai'}
          </span>
        </div>

        {/* Mobile/Tablet Dropdown (customized with same format as desktop .chip.glass.on) */}
        <div className="mobile-filter-wrapper">
          <CustomFilterDropdown
            options={[
              { value: 'all', label: language === 'en' ? 'All entries' : 'Tất cả nhật ký' },
              { value: 'private', label: language === 'en' ? 'Only me' : 'Chỉ mình tôi', icon: 'lock' },
              {
                value: 'public',
                label: language === 'en' ? 'Public' : 'Công khai',
                icon: 'globe',
                disabled: true,
              },
            ]}
            value={filterScope}
            onChange={(val) => {
              if (val !== 'public') setFilterScope(val);
            }}
          />

          {/* Kế chức năng All entries: Button list chứa danh sách các diary (Xóa logo cuốn sách, thêm phân trang vô cực) */}
          {entries.length > 0 && (
            <CustomFilterDropdown
              options={[
                { value: '', label: language === 'en' ? 'Diary list' : 'Danh sách nhật ký' },
                ...entries
                  .filter((entry) => {
                    if (filterScope === 'private') return !entry.is_public;
                    if (filterScope === 'public') return entry.is_public;
                    return true;
                  })
                  .map((e) => {
                    const d = e.entry_date ? new Date(e.entry_date) : new Date(e.created_at);
                    const dateStr = !isNaN(d.getTime()) ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : '';
                    const titleStr = original(e, 'title') || (language === 'en' ? 'Untitled' : 'Không tiêu đề');
                    return {
                      value: String(e.id),
                      label: `${dateStr ? dateStr + ' · ' : ''}${titleStr.length > 15 ? titleStr.slice(0, 15) + '…' : titleStr}`,
                      dotColor: 'var(--gold, #E6C280)',
                    };
                  }),
              ]}
              value={activeDiaryId ? String(activeDiaryId) : ''}
              onLoadMore={() => diaryPersonalRef.current?.loadMore?.()}
              hasMore={diaryPagination.hasMore}
              isLoadingMore={diaryPagination.isLoadingMore}
              onChange={(val) => {
                if (val) {
                  setActiveDiaryId(Number(val) || val);
                } else {
                  setActiveDiaryId(null);
                }
              }}
            />
          )}
        </div>

        <button
          type="button"
          className="btn main diary-btn-write"
          onClick={() => handleOpenWrite(null)}
        >
          {language === 'en' ? '✦ New Entry' : '✦ Viết nhật ký mới'}
        </button>
      </div>

      {/* Floating Toast Notification */}
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

      {/* Main Content: 100% Personal Diary */}
      <DiaryPersonal
        ref={diaryPersonalRef}
        onOpenWriteModal={handleOpenWrite}
        searchQuery={debouncedSearch}
        refreshTrigger={refreshTrigger}
        filterScope={filterScope}
        activeDiaryId={activeDiaryId}
        onSelectDiary={setActiveDiaryId}
        onEntriesLoaded={handleEntriesLoaded}
        onPaginationChange={handlePaginationChange}
      />

      {/* Write / Edit Diary Modal */}
      <WriteDiaryModal
        isOpen={showWriteModal}
        editData={editingEntry}
        onClose={() => {
          setShowWriteModal(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveDiary}
      />
    </div>
  );
}

export default DiaryPage;

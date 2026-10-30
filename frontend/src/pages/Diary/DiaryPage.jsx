import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../components/common/Icons';
import { DiaryPersonal } from './DiaryPersonal';
import { DiaryCommunity } from './DiaryCommunity';
import { WriteDiaryModal } from './WriteDiaryModal';
import { useLanguage } from '../../context/LanguageContext';

export function DiaryPage({
  onOpenNotifications,
  onOpenThemeModal,
  initialDiaryTarget = null,
  onClearInitialDiary,
}) {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState(0); // 0: Bản thân, 1: Cộng đồng
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  const searchTimerRef = useRef(null);

  useEffect(() => {
    if (!initialDiaryTarget) return;
    if (initialDiaryTarget.tab === 'community') {
      setActiveTab(1);
      if (!initialDiaryTarget.id && onClearInitialDiary) {
        onClearInitialDiary();
      }
    } else {
      setActiveTab(0);
      if (onClearInitialDiary) {
        onClearInitialDiary();
      }
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

  const handleSaveDiary = (savedData) => {
    triggerToast(
      savedData?.is_public
        ? (language === 'en' ? '✦ Saved! It will appear in Community once approved.' : '✦ Đã lưu! Trang sẽ hiện ở Cộng đồng sau khi được duyệt.')
        : (language === 'en' ? '✦ Saved.' : '✦ Đã lưu.')
    );
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="stage" style={{ background: 'var(--wall)' }}>
      {/* Diary Header */}
      <div className="top">
        <div className="room-tag">
          <small>{language === 'en' ? 'Private space' : 'Không gian riêng'}</small>
          <b>{language === 'en' ? 'Diary' : 'Nhật ký'}</b>
        </div>

        <div className="row" style={{ gap: '12px', flex: 1, justifyContent: 'center' }}>
          <div
            className="seg glass"
            style={{ background: 'var(--glass)', borderColor: 'var(--glass-line)' }}
          >
            <span
              className={activeTab === 0 ? 'on' : ''}
              onClick={() => setActiveTab(0)}
              style={{
                background: activeTab === 0 ? 'var(--paper)' : 'transparent',
                color: activeTab === 0 ? 'var(--ink)' : 'var(--onw2)',
                cursor: 'pointer',
              }}
            >
              <Icon name="lock" size={14} /> {language === 'en' ? 'Personal' : 'Bản thân'}
            </span>
            <span
              className={activeTab === 1 ? 'on' : ''}
              onClick={() => setActiveTab(1)}
              style={{
                background: activeTab === 1 ? 'var(--paper)' : 'transparent',
                color: activeTab === 1 ? 'var(--ink)' : 'var(--onw2)',
                cursor: 'pointer',
              }}
            >
              <Icon name="globe" size={14} /> {language === 'en' ? 'Community' : 'Cộng đồng'}
            </span>
          </div>

          <div className="search glass" style={{ maxWidth: '320px' }}>
            <Icon name="search" size={18} />
            <input
              type="text"
              placeholder={
                language === 'en'
                  ? (activeTab === 0 ? 'Search in your diary…' : 'Search in community diary…')
                  : (activeTab === 0 ? 'Tìm trong nhật ký của bạn…' : 'Tìm trong nhật ký cộng đồng…')
              }
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="row" style={{ gap: '10px' }}>
          <button
            type="button"
            className="btn main"
            onClick={() => handleOpenWrite(null)}
          >
            <Icon name="edit" size={16} /> {language === 'en' ? '✦ New Entry' : '✦ Viết nhật ký mới'}
          </button>

          <button
            type="button"
            className="iconbtn glass"
            title={language === 'en' ? 'Color theme' : 'Bảng màu'}
            onClick={onOpenThemeModal}
          >
            <Icon name="palette" size={20} />
          </button>

          <div className="lang glass">
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
            className="iconbtn glass"
            title={language === 'en' ? 'Notifications' : 'Thông báo'}
            onClick={onOpenNotifications}
          >
            <Icon name="bell" size={20} />
          </button>
        </div>
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

      {/* Main Tab Content */}
      {activeTab === 0 ? (
        <DiaryPersonal
          onOpenWriteModal={handleOpenWrite}
          searchQuery={debouncedSearch}
          refreshTrigger={refreshTrigger}
        />
      ) : (
        <DiaryCommunity
          searchQuery={debouncedSearch}
          initialDiaryId={initialDiaryTarget?.tab === 'community' ? initialDiaryTarget.id : null}
          onClearInitialDiary={onClearInitialDiary}
        />
      )}

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

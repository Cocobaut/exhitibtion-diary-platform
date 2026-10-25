import React, { useState } from 'react';
import { Icon } from '../../components/common/Icons';
import { DiaryPersonal } from './DiaryPersonal';
import { DiaryCommunity } from './DiaryCommunity';
import { WriteDiaryModal } from './WriteDiaryModal';

export function DiaryPage({ onOpenNotifications, onOpenThemeModal }) {
  const [activeTab, setActiveTab] = useState(0); // 0: Bản thân, 1: Cộng đồng
  const [search, setSearch] = useState('');
  const [showWriteModal, setShowWriteModal] = useState(false);

  return (
    <div className="stage" style={{ background: 'var(--wall)' }}>
      {/* Diary Header */}
      <div className="top">
        <div className="room-tag">
          <small>Không gian riêng</small>
          <b>Nhật ký</b>
        </div>

        <div className="row" style={{ gap: '12px', flex: 1, justifyContent: 'center' }}>
          <div className="seg glass" style={{ background: 'var(--glass)', borderColor: 'var(--glass-line)' }}>
            <span
              className={activeTab === 0 ? 'on' : ''}
              onClick={() => setActiveTab(0)}
              style={{
                background: activeTab === 0 ? 'var(--paper)' : 'transparent',
                color: activeTab === 0 ? 'var(--ink)' : 'var(--onw2)',
              }}
            >
              <Icon name="lock" size={14} /> Bản thân
            </span>
            <span
              className={activeTab === 1 ? 'on' : ''}
              onClick={() => setActiveTab(1)}
              style={{
                background: activeTab === 1 ? 'var(--paper)' : 'transparent',
                color: activeTab === 1 ? 'var(--ink)' : 'var(--onw2)',
              }}
            >
              <Icon name="globe" size={14} /> Cộng đồng
            </span>
          </div>

          <div className="search glass" style={{ maxWidth: '320px' }}>
            <Icon name="search" size={18} />
            <input
              type="text"
              placeholder="Tìm trong nhật ký…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="row" style={{ gap: '10px' }}>
          <button
            type="button"
            className="btn main"
            onClick={() => setShowWriteModal(true)}
          >
            <Icon name="edit" size={16} /> Viết nhật ký mới
          </button>

          <button
            type="button"
            className="iconbtn glass"
            title="Bảng màu"
            onClick={onOpenThemeModal}
          >
            <Icon name="palette" size={20} />
          </button>

          <div className="lang glass">
            <b className="on">VI</b>
            <b>EN</b>
          </div>

          <button
            type="button"
            className="iconbtn glass"
            title="Thông báo"
            onClick={onOpenNotifications}
          >
            <Icon name="bell" size={20} />
            <span className="n">3</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 0 ? (
        <DiaryPersonal onOpenWriteModal={() => setShowWriteModal(true)} />
      ) : (
        <DiaryCommunity />
      )}

      {/* Write Diary Modal */}
      <WriteDiaryModal
        isOpen={showWriteModal}
        onClose={() => setShowWriteModal(false)}
        onSave={(data) => {
          console.log('Saved diary entry:', data);
        }}
      />
    </div>
  );
}

export default DiaryPage;

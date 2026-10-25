import React, { useState } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { Icon } from '../../components/common/Icons';
import { MOCK_LANTERN_LETTERS } from '../../data/mockData';
import { LanternSky } from './LanternSky';
import { ReleaseLanternModal } from './ReleaseLanternModal';
import { LanternLandedModal } from './LanternLandedModal';

export function Room2Page({ onOpenNotifications, onOpenThemeModal, onNavigate, onSaveToNotebook }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showLandedModal, setShowLandedModal] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState(MOCK_LANTERN_LETTERS[0]);

  const handleOpenLantern = (letter) => {
    setSelectedLetter(letter || MOCK_LANTERN_LETTERS[0]);
    setShowLandedModal(true);
  };

  const handlePullDownRandom = () => {
    const letters = MOCK_LANTERN_LETTERS;
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    handleOpenLantern(randomLetter);
  };

  return (
    <div className="stage night">
      <LanternSky
        isLanded={showLandedModal}
        onOpenLandedModal={handleOpenLantern}
      />

      {/* Top Header */}
      <TopNav
        roomNo="02"
        roomName="Bầu trời Lồng đèn"
        searchPlaceholder="Tìm lồng đèn theo từ khoá hoặc bút danh…"
        searchValue={search}
        onSearchChange={setSearch}
        onOpenNotifications={onOpenNotifications}
        onOpenThemeModal={onOpenThemeModal}
      />

      {/* Filter Chips & Action */}
      <div className="chips-row">
        <div className="chips">
          {["Tất cả", "Của tôi", "Lồng đèn đã mở", "Đang chờ ngày hạ xuống"].map((chipName) => (
            <span
              key={chipName}
              className={`chip glass ${filter === chipName ? 'on' : ''}`}
              onClick={() => setFilter(chipName)}
            >
              {chipName}
            </span>
          ))}
        </div>

        <button
          type="button"
          className="btn main"
          onClick={() => setShowReleaseModal(true)}
        >
          ✦ Thả lồng đèn
        </button>
      </div>

      {/* Personal Flying Lantern Countdown Widget */}
      {!showLandedModal && (
        <div
          className="abs"
          onClick={() => handleOpenLantern(MOCK_LANTERN_LETTERS[0])}
          title="Nhấn để kéo lồng đèn của bạn xuống"
          style={{
            left: '1060px',
            top: '168px',
            width: '250px',
            zIndex: 7,
            background: 'rgba(30,12,18,.72)',
            border: '1px solid rgba(255,235,220,.22)',
            borderRadius: '14px',
            padding: '12px 14px',
            color: '#F6E9DD',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
        >
          <div className="row" style={{ gap: '6px', fontSize: '13px', color: '#F2C9A8' }}>
            <Icon name="lock" size={14} /> Lồng đèn riêng của bạn
          </div>
          <div className="serif" style={{ fontSize: '19px', fontWeight: 700, margin: '2px 0 8px' }}>
            Gửi mình của năm 2030
          </div>
          <div className="row" style={{ gap: '6px' }}>
            {[
              ["1460", "ngày"],
              ["04", "giờ"],
              ["12", "phút"],
              ["09", "giây"]
            ].map(([n, u]) => (
              <div
                key={u}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  background: 'rgba(255,240,225,.08)',
                  borderRadius: '8px',
                  padding: '4px 0',
                }}
              >
                <b style={{ fontSize: '17px' }}>{n}</b>
                <div style={{ fontSize: '10.5px', color: '#D9BBA8' }}>{u}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12.5px', color: '#D9BBA8', marginTop: '8px' }}>
            Hạ xuống lúc 09:00, 24.10.2030 (nhấn để mở)
          </div>
        </div>
      )}

      {/* Interactive "Kéo xuống để đọc" Tag */}
      {!showLandedModal && (
        <div
          className="abs"
          style={{ left: '300px', top: '470px', zIndex: 7 }}
          onClick={handlePullDownRandom}
        >
          <span
            className="glass"
            style={{
              padding: '6px 16px',
              borderRadius: '999px',
              fontFamily: 'var(--hand)',
              fontSize: '18px',
              cursor: 'pointer',
              userSelect: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ color: 'var(--gold)' }}>✦</span> nhấn hoặc kéo lồng đèn xuống để đọc ↓
          </span>
        </div>
      )}

      {/* Footer Counter */}
      <div className="counter">
        3.402 lồng đèn đang bay · 128 lồng đèn đã hạ xuống năm nay
      </div>

      {/* Modals */}
      <ReleaseLanternModal
        isOpen={showReleaseModal}
        onClose={() => setShowReleaseModal(false)}
        onRelease={(data) => {
          console.log('Released lantern:', data);
        }}
      />

      <LanternLandedModal
        isOpen={showLandedModal}
        letterData={selectedLetter}
        onClose={() => setShowLandedModal(false)}
        onSaveToNotebook={onSaveToNotebook}
        onReplyFuture={() => {
          setShowLandedModal(false);
          setShowReleaseModal(true);
        }}
      />
    </div>
  );
}

export default Room2Page;

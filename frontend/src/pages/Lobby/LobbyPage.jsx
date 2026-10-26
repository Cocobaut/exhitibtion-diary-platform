import React, { useRef } from 'react';
import { Logo } from '../../components/common/Logo';
import { TopNav } from '../../components/layout/TopNav';
import {
  LobbyBackdrop,
  DoorArch,
  MailboxGraphic,
  BenchGraphic,
} from './LobbyScene';
import { useAuth } from '../../context/AuthContext';
import { useGuestGuard } from '../../context/GuestGuardContext';
import { useLanguage } from '../../context/LanguageContext';

export function LobbyPage({
  onNavigate,
  onOpenMailbox,
  onOpenNotifications,
  onOpenThemeModal,
}) {
  const { user, isGuest } = useAuth();
  const { guardAction } = useGuestGuard();
  const { t, language } = useLanguage();
  const showcaseRef = useRef(null);

  // Câu chào song ngữ
  const displayName = user?.nickname || user?.username || '';
  const greetingText = isGuest
    ? t('lobby_greeting_guest')
    : displayName
    ? t('lobby_greeting_user', { name: displayName })
    : t('lobby_greeting_guest');

  const rooms = [
    {
      roomNum: 1,
      no: '01',
      badge: t('lobby_room01_badge'),
      name: t('lobby_room01_title'),
      count: t('lobby_room01_count'),
      route: 'r1',
    },
    {
      roomNum: 2,
      no: '02',
      badge: t('lobby_room02_badge'),
      name: t('lobby_room02_title'),
      count: t('lobby_room02_count'),
      route: 'r2',
    },
    {
      roomNum: 3,
      no: '03',
      badge: t('lobby_room03_badge'),
      name: t('lobby_room03_title'),
      count: t('lobby_room03_count'),
      route: 'r3',
    },
  ];

  const scrollToItem = (idx) => {
    if (!showcaseRef.current) return;
    const items = showcaseRef.current.children;
    if (items && items[idx]) {
      items[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const handleMailboxClick = () => {
    guardAction(() => {
      if (onOpenMailbox) onOpenMailbox();
    }, 'rút một thông điệp từ Hòm thư');
  };

  const handleDiaryClick = () => {
    guardAction(() => {
      if (onNavigate) onNavigate('diary');
    }, 'mở Nhật ký cá nhân');
  };

  return (
    <div className="lobby-stage">
      {/* 1. Ambient Museum Hall Backdrop (Wall, Horizon boundary, Dark Floor) */}
      <LobbyBackdrop />

      {/* 2. Top Header Bar spanning full width, with utility buttons pinned right */}
      <header className="lobby-header-bar">
        <TopNav
          greeting={greetingText}
          onOpenNotifications={onOpenNotifications}
          onOpenThemeModal={onOpenThemeModal}
        />
        <div className="lobby-logo-wrapper">
          <Logo onClick={() => onNavigate('home')} />
        </div>
      </header>

      {/* Mobile Quick Navigator Pills */}
      <div className="lobby-mobile-quicknav" aria-label="Điều hướng nhanh phòng">
        <button type="button" onClick={() => scrollToItem(0)}>{t('lobby_quick_r1')}</button>
        <button type="button" onClick={() => scrollToItem(1)}>{t('lobby_quick_mailbox')}</button>
        <button type="button" onClick={() => scrollToItem(2)}>{t('lobby_quick_r2')}</button>
        <button
          type="button"
          style={isGuest ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          onClick={() => {
            if (isGuest) {
              guardAction(null, t('nav_diary'));
            } else {
              scrollToItem(3);
            }
          }}
        >
          {t('lobby_quick_diary')} {isGuest && '🔒'}
        </button>
        <button type="button" onClick={() => scrollToItem(4)}>{t('lobby_quick_r3')}</button>
      </div>

      {/* 3. Main Units Row:
             - Top box (arches & objects) rests exactly on the horizon line
             - Bottom box (cards & badges) rests in the dark floor area
      */}
      <main className="lobby-units-row" ref={showcaseRef}>
        {/* Unit 1: Cửa vòm 01 & Thẻ Phòng 01 */}
        <section
          className="lobby-unit door-unit"
          onClick={() => onNavigate(rooms[0].route)}
          role="button"
          tabIndex={0}
          title={rooms[0].name}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate(rooms[0].route)}
        >
          <div className="unit-top-box door-arch-box">
            <DoorArch roomNum={1} />
          </div>
          <div className="unit-bottom-box door-card-box">
            <div className="door-info-card">
              <div className="door-card-badge">{rooms[0].badge}</div>
              <h2 className="door-card-title">{rooms[0].name}</h2>
              <div className="door-card-count">{rooms[0].count}</div>
            </div>
          </div>
        </section>

        {/* Unit 2: Hòm thư đỏ & Nhãn tương tác */}
        <section
          className="lobby-unit item-unit mailbox-unit"
          onClick={handleMailboxClick}
          role="button"
          tabIndex={0}
          title={t('lobby_mailbox_badge')}
          onKeyDown={(e) => e.key === 'Enter' && handleMailboxClick()}
        >
          <div className="unit-top-box item-graphic-box mailbox-graphic-box">
            <MailboxGraphic />
          </div>
          <div className="unit-bottom-box item-badge-box">
            <div className="interactive-badge-pill">
              <span className="badge-star">✦</span>
              <span>{t('lobby_mailbox_badge')}</span>
            </div>
          </div>
        </section>

        {/* Unit 3: Cửa vòm 02 & Thẻ Phòng 02 */}
        <section
          className="lobby-unit door-unit"
          onClick={() => onNavigate(rooms[1].route)}
          role="button"
          tabIndex={0}
          title={rooms[1].name}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate(rooms[1].route)}
        >
          <div className="unit-top-box door-arch-box">
            <DoorArch roomNum={2} />
          </div>
          <div className="unit-bottom-box door-card-box">
            <div className="door-info-card">
              <div className="door-card-badge">{rooms[1].badge}</div>
              <h2 className="door-card-title">{rooms[1].name}</h2>
              <div className="door-card-count">{rooms[1].count}</div>
            </div>
          </div>
        </section>

        {/* Unit 4: Ghế gỗ & Nhãn Nhật ký (Bị vô hiệu hóa khi ở chế độ Khách vãng lai) */}
        <section
          className={`lobby-unit item-unit bench-unit ${
            isGuest ? 'opacity-40 cursor-not-allowed filter grayscale-[40%]' : ''
          }`}
          style={
            isGuest
              ? {
                  opacity: 0.45,
                  cursor: 'not-allowed',
                  filter: 'grayscale(40%)',
                }
              : {}
          }
          onClick={handleDiaryClick}
          role="button"
          tabIndex={0}
          title={isGuest ? `${t('lobby_diary_badge')} (${t('login_required')})` : t('lobby_diary_badge')}
          onKeyDown={(e) => e.key === 'Enter' && handleDiaryClick()}
        >
          <div className="unit-top-box item-graphic-box bench-graphic-box">
            <BenchGraphic />
          </div>
          <div className="unit-bottom-box item-badge-box">
            <div
              className="interactive-badge-pill"
              style={isGuest ? { cursor: 'not-allowed' } : {}}
            >
              <span>{t('lobby_diary_badge')}</span>
              {isGuest && <span style={{ fontSize: '11px', marginLeft: '4px' }}>🔒</span>}
            </div>
          </div>
        </section>

        {/* Unit 5: Cửa vòm 03 & Thẻ Phòng 03 */}
        <section
          className="lobby-unit door-unit"
          onClick={() => onNavigate(rooms[2].route)}
          role="button"
          tabIndex={0}
          title={rooms[2].name}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate(rooms[2].route)}
        >
          <div className="unit-top-box door-arch-box">
            <DoorArch roomNum={3} />
          </div>
          <div className="unit-bottom-box door-card-box">
            <div className="door-info-card">
              <div className="door-card-badge">{rooms[2].badge}</div>
              <h2 className="door-card-title">{rooms[2].name}</h2>
              <div className="door-card-count">{rooms[2].count}</div>
            </div>
          </div>
        </section>
      </main>

      {/* 4. Footer Inspiration Quote in dark floor area */}
      <footer className="lobby-footer-bar">
        <i>{t('lobby_quote')}</i>
      </footer>
    </div>
  );
}

export default LobbyPage;

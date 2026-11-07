import React, { useRef, useState, useEffect } from 'react';
import { Logo } from '../../components/common/Logo';
import { TopNav } from '../../components/layout/TopNav';
import {
  LobbyBackdrop,
  DoorArch,
  MailboxGraphic,
  BenchGraphic,
} from './LobbyScene';
import { LobbyDustMotes } from './LobbyDustMotes';
import { LobbyBubbleNav } from './LobbyBubbleNav';
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

  // Nhận diện kích thước compact (tablet portrait & mobile)
  const [isCompact, setIsCompact] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsCompact(window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Câu chào song ngữ: Trên tablet portrait & mobile thu gọn còn "Hello [Name]" / "Chào [Tên]"
  const displayName = user?.nickname || user?.username || '';
  const greetingText = isCompact
    ? displayName
      ? t('lobby_greeting_compact_user', { name: displayName })
      : t('lobby_greeting_compact_guest')
    : isGuest
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
    const targetMap = [
      showcaseRef.current.querySelector('.r1-unit'),
      showcaseRef.current.querySelector('.mailbox-unit'),
      showcaseRef.current.querySelector('.r2-unit'),
      showcaseRef.current.querySelector('.bench-unit'),
      showcaseRef.current.querySelector('.r3-unit'),
    ];
    if (targetMap[idx]) {
      targetMap[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const handleMailboxClick = () => {
    if (onOpenMailbox) onOpenMailbox();
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

      {/* Museum Light Dust Motes */}
      <LobbyDustMotes />

      {/* 2. Top Header Bar spanning full width, with utility buttons pinned right */}
      <header className="lobby-header-bar">
        <TopNav
          greeting={greetingText}
          belowGreeting={
            <div className="lobby-logo-sub-wrapper compact-only-logo">
              <Logo onClick={() => onNavigate('home')} />
            </div>
          }
          onOpenNotifications={onOpenNotifications}
          onOpenThemeModal={onOpenThemeModal}
        />
        <div className="lobby-logo-wrapper desktop-only-logo">
          <Logo onClick={() => onNavigate('home')} />
        </div>
      </header>

      {/* Mobile & Tablet Floating Bubble Navigator */}
      <LobbyBubbleNav
        rooms={rooms}
        onNavigate={onNavigate}
        onOpenMailbox={handleMailboxClick}
        onOpenDiary={handleDiaryClick}
        scrollToItem={scrollToItem}
        isGuest={isGuest}
        guardAction={guardAction}
        t={t}
        language={language}
      />

      {/* 3. Main Units Row:
             - Desktop: display: contents renders all 5 units interlaced in 1 horizontal row
             - Compact viewports:
               * lobby-rooms-floating-group: Room 01, 02, 03 centered in upper-middle wall zone
               * lobby-grounded-items-group: Mailbox & Diary standing directly on the yellow horizon line
      */}
      <main className="lobby-units-row" ref={showcaseRef}>
        {/* Nhóm 1: 3 Cửa sổ hình chữ nhật lơ lửng bồng bềnh (Room 01, 02, 03) */}
        <div className="lobby-rooms-floating-group">
          {/* Unit 1: Ô cửa sổ hình chữ nhật 01 & Thẻ Phòng 01 */}
          <section
            className="lobby-unit door-unit r1-unit floating-window-unit"
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

          {/* Unit 3: Ô cửa sổ hình chữ nhật 02 & Thẻ Phòng 02 */}
          <section
            className="lobby-unit door-unit r2-unit floating-window-unit"
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

          {/* Unit 5: Ô cửa sổ hình chữ nhật 03 & Thẻ Phòng 03 */}
          <section
            className="lobby-unit door-unit r3-unit floating-window-unit"
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
        </div>

        {/* Nhóm 2: Hòm thư & Ghế Nhật ký tiếp đất ngay mép đường kẻ vàng */}
        <div className="lobby-grounded-items-group">
          {/* Unit 2: Hòm thư đỏ & Nhãn tương tác */}
          <section
            className="lobby-unit item-unit mailbox-unit grounded-item-unit"
            onClick={handleMailboxClick}
            role="button"
            tabIndex={0}
            title={t('lobby_mailbox_badge')}
            onKeyDown={(e) => e.key === 'Enter' && handleMailboxClick()}
          >
            <div className="unit-top-box item-graphic-box mailbox-graphic-box">
              <MailboxGraphic />
            </div>
            <div className="unit-bottom-box item-badge-box mailbox-badge-box">
              <div className="interactive-badge-pill mailbox-badge-pill">
                <span className="badge-star">✦</span>
                <span className="badge-text">{t('lobby_mailbox_badge')}</span>
              </div>
            </div>
          </section>

          {/* Unit 4: Ghế gỗ & Nhãn Nhật ký */}
          <section
            className={`lobby-unit item-unit bench-unit grounded-item-unit ${
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
            <div className="unit-bottom-box item-badge-box bench-badge-box">
              <div
                className="interactive-badge-pill bench-badge-pill"
                style={isGuest ? { cursor: 'not-allowed' } : {}}
              >
                <span className="badge-text">{t('lobby_diary_badge')}</span>
                {isGuest && <span style={{ fontSize: '11px', marginLeft: '4px' }}>🔒</span>}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* 4. Footer Inspiration Quote in dark floor area */}
      <footer className="lobby-footer-bar">
        <p className="lobby-footer-quote">{t('lobby_quote')}</p>
      </footer>
    </div>
  );
}

export default LobbyPage;

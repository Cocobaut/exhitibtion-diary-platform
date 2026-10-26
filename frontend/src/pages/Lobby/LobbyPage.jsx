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

export function LobbyPage({
  onNavigate,
  onOpenMailbox,
  onOpenNotifications,
  onOpenThemeModal,
}) {
  const { user } = useAuth();
  const displayName = user?.nickname || user?.username || 'bạn';
  const showcaseRef = useRef(null);

  const rooms = [
    {
      roomNum: 1,
      no: '01',
      name: 'Triển lãm Đổ vỡ',
      count: '1.284 tác phẩm',
      route: 'r1',
    },
    {
      roomNum: 2,
      no: '02',
      name: 'Bầu trời Lồng đèn',
      count: '3.402 lồng đèn đang bay',
      route: 'r2',
    },
    {
      roomNum: 3,
      no: '03',
      name: 'Cây Thông điệp',
      count: '862 lời động viên',
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

  return (
    <div className="lobby-stage">
      {/* 1. Ambient Museum Hall Backdrop (Wall, Horizon boundary, Dark Floor) */}
      <LobbyBackdrop />

      {/* 2. Top Header Bar spanning full width, with utility buttons pinned right */}
      <header className="lobby-header-bar">
        <TopNav
          greeting={`Chào ${displayName}, hôm nay bạn muốn ghé đâu?`}
          onOpenNotifications={onOpenNotifications}
          onOpenThemeModal={onOpenThemeModal}
        />
        <div className="lobby-logo-wrapper">
          <Logo onClick={() => onNavigate('home')} />
        </div>
      </header>

      {/* Mobile Quick Navigator Pills */}
      <div className="lobby-mobile-quicknav" aria-label="Điều hướng nhanh phòng">
        <button type="button" onClick={() => scrollToItem(0)}>Phòng 01</button>
        <button type="button" onClick={() => scrollToItem(1)}>Hòm thư</button>
        <button type="button" onClick={() => scrollToItem(2)}>Phòng 02</button>
        <button type="button" onClick={() => scrollToItem(3)}>Sổ tay</button>
        <button type="button" onClick={() => scrollToItem(4)}>Phòng 03</button>
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
          title="Ghé thăm Phòng 01: Triển lãm Đổ vỡ"
          onKeyDown={(e) => e.key === 'Enter' && onNavigate(rooms[0].route)}
        >
          <div className="unit-top-box door-arch-box">
            <DoorArch roomNum={1} />
          </div>
          <div className="unit-bottom-box door-card-box">
            <div className="door-info-card">
              <div className="door-card-badge">PHÒNG {rooms[0].no}</div>
              <h2 className="door-card-title">{rooms[0].name}</h2>
              <div className="door-card-count">{rooms[0].count}</div>
            </div>
          </div>
        </section>

        {/* Unit 2: Hòm thư đỏ & Nhãn tương tác */}
        <section
          className="lobby-unit item-unit mailbox-unit"
          onClick={onOpenMailbox}
          role="button"
          tabIndex={0}
          title="Mở Hòm thư · rút một thông điệp"
          onKeyDown={(e) => e.key === 'Enter' && onOpenMailbox()}
        >
          <div className="unit-top-box item-graphic-box mailbox-graphic-box">
            <MailboxGraphic />
          </div>
          <div className="unit-bottom-box item-badge-box">
            <div className="interactive-badge-pill">
              <span className="badge-star">✦</span>
              <span>hòm thư · rút một thông điệp</span>
            </div>
          </div>
        </section>

        {/* Unit 3: Cửa vòm 02 & Thẻ Phòng 02 */}
        <section
          className="lobby-unit door-unit"
          onClick={() => onNavigate(rooms[1].route)}
          role="button"
          tabIndex={0}
          title="Ghé thăm Phòng 02: Bầu trời Lồng đèn"
          onKeyDown={(e) => e.key === 'Enter' && onNavigate(rooms[1].route)}
        >
          <div className="unit-top-box door-arch-box">
            <DoorArch roomNum={2} />
          </div>
          <div className="unit-bottom-box door-card-box">
            <div className="door-info-card">
              <div className="door-card-badge">PHÒNG {rooms[1].no}</div>
              <h2 className="door-card-title">{rooms[1].name}</h2>
              <div className="door-card-count">{rooms[1].count}</div>
            </div>
          </div>
        </section>

        {/* Unit 4: Ghế gỗ & Nhãn Nhật ký */}
        <section
          className="lobby-unit item-unit bench-unit"
          onClick={() => onNavigate('diary')}
          role="button"
          tabIndex={0}
          title="Mở Nhật ký của bạn"
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('diary')}
        >
          <div className="unit-top-box item-graphic-box bench-graphic-box">
            <BenchGraphic />
          </div>
          <div className="unit-bottom-box item-badge-box">
            <div className="interactive-badge-pill">
              <span>nhật ký của bạn</span>
            </div>
          </div>
        </section>

        {/* Unit 5: Cửa vòm 03 & Thẻ Phòng 03 */}
        <section
          className="lobby-unit door-unit"
          onClick={() => onNavigate(rooms[2].route)}
          role="button"
          tabIndex={0}
          title="Ghé thăm Phòng 03: Cây Thông điệp"
          onKeyDown={(e) => e.key === 'Enter' && onNavigate(rooms[2].route)}
        >
          <div className="unit-top-box door-arch-box">
            <DoorArch roomNum={3} />
          </div>
          <div className="unit-bottom-box door-card-box">
            <div className="door-info-card">
              <div className="door-card-badge">PHÒNG {rooms[2].no}</div>
              <h2 className="door-card-title">{rooms[2].name}</h2>
              <div className="door-card-count">{rooms[2].count}</div>
            </div>
          </div>
        </section>
      </main>

      {/* 4. Footer Inspiration Quote in dark floor area */}
      <footer className="lobby-footer-bar">
        <i>Bạn hơn cả thành tích của mình.</i>
      </footer>
    </div>
  );
}

export default LobbyPage;

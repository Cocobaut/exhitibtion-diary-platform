import React from 'react';
import { Logo } from '../../components/common/Logo';
import { TopNav } from '../../components/layout/TopNav';
import { LobbyScene, DOORS } from './LobbyScene';

export function LobbyPage({ onNavigate, onOpenMailbox, onOpenNotifications, onOpenThemeModal }) {
  const plaques = [
    { x: DOORS[0], no: "01", name: "Triển lãm Đổ vỡ", count: "1.284 tác phẩm", route: "r1" },
    { x: DOORS[1], no: "02", name: "Bầu trời Lồng đèn", count: "3.402 lồng đèn đang bay", route: "r2" },
    { x: DOORS[2], no: "03", name: "Cây Thông điệp", count: "862 lời động viên", route: "r3" },
  ];

  return (
    <div className="stage">
      <LobbyScene
        onDoorClick={(roomNum) => onNavigate(`r${roomNum}`)}
        onMailboxClick={onOpenMailbox}
        onBenchClick={() => onNavigate('diary')}
      />

      {/* Museum Logo */}
      <div className="abs" style={{ left: 0, right: 0, top: '40px', textAlign: 'center', zIndex: 5 }}>
        <Logo onClick={() => onNavigate('home')} />
      </div>

      {/* Top Greeting & Controls */}
      <TopNav
        greeting="Chào Linh, hôm nay bạn muốn ghé đâu?"
        onOpenNotifications={onOpenNotifications}
        onOpenThemeModal={onOpenThemeModal}
      />

      {/* Doorway Plaques */}
      {plaques.map((p) => (
        <div
          key={p.no}
          className="abs"
          onClick={() => onNavigate(p.route)}
          style={{
            left: `${p.x - 108}px`,
            top: '672px',
            width: '216px',
            textAlign: 'center',
            background: 'var(--paper)',
            color: 'var(--ink)',
            borderRadius: '6px',
            padding: '8px 10px 9px',
            boxShadow: '0 10px 26px rgba(0,0,0,.28)',
            zIndex: 4,
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontWeight: 600,
              letterSpacing: '.26em',
              fontSize: '11px',
              color: 'var(--acc)',
            }}
          >
            PHÒNG {p.no}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: '19px', lineHeight: 1.2 }}>
            {p.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink2)' }}>{p.count}</div>
        </div>
      ))}

      {/* Floating Interactive Tags */}
      <div
        className="abs glass"
        onClick={onOpenMailbox}
        style={{
          left: '471px',
          top: '784px',
          transform: 'translateX(-50%)',
          padding: '5px 14px 6px',
          borderRadius: '999px',
          fontFamily: 'var(--hand)',
          fontSize: '18px',
          whiteSpace: 'nowrap',
          zIndex: 4,
          cursor: 'pointer',
        }}
      >
        <span style={{ color: 'var(--gold)' }}>✦</span> hòm thư · rút một thông điệp
      </div>

      <div
        className="abs glass"
        onClick={() => onNavigate('diary')}
        style={{
          left: '893px',
          top: '704px',
          transform: 'translateX(-50%)',
          padding: '5px 14px 6px',
          borderRadius: '999px',
          fontFamily: 'var(--hand)',
          fontSize: '18px',
          whiteSpace: 'nowrap',
          zIndex: 4,
          cursor: 'pointer',
        }}
      >
        nhật ký của bạn
      </div>

      {/* Footer Quote */}
      <div className="counter">
        <i>Bạn hơn cả thành tích của mình.</i>
      </div>
    </div>
  );
}

export default LobbyPage;

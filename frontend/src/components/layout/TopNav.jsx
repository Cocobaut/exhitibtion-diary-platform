import React from 'react';
import { Icon } from '../common/Icons';

export function TopNav({
  roomNo,
  roomName,
  greeting,
  searchPlaceholder,
  searchValue = '',
  onSearchChange,
  unreadCount = 3,
  onOpenNotifications,
  onOpenThemeModal,
  rightAddon
}) {
  return (
    <div className="top">
      {roomNo ? (
        <div className="room-tag">
          <small>Phòng {roomNo}</small>
          <b>{roomName}</b>
        </div>
      ) : greeting ? (
        <div className="hand" style={{ fontSize: '24px' }}>
          {greeting}
        </div>
      ) : (
        <div />
      )}

      {searchPlaceholder && (
        <div className="search glass">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
        </div>
      )}

      <div className="tr">
        {rightAddon}
        
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
          {unreadCount > 0 && <span className="n">{unreadCount}</span>}
        </button>
      </div>
    </div>
  );
}

export default TopNav;

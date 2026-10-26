import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';

export function TopNav({
  roomNo,
  roomName,
  greeting,
  searchPlaceholder,
  searchValue = '',
  onSearchChange,
  unreadCount: propUnreadCount,
  onOpenNotifications,
  onOpenThemeModal,
  rightAddon,
}) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(propUnreadCount ?? 0);

  const fetchCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await notificationService.getUnreadCount();
      if (res && typeof res.unread_count === 'number') {
        setUnreadCount(res.unread_count);
      }
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (propUnreadCount !== undefined) {
      setUnreadCount(propUnreadCount);
    } else {
      fetchCount();
    }
  }, [propUnreadCount, fetchCount]);

  useEffect(() => {
    const handleNotifUpdate = () => {
      fetchCount();
    };

    window.addEventListener('notifications:updated', handleNotifUpdate);
    const interval = setInterval(fetchCount, 45000);

    return () => {
      window.removeEventListener('notifications:updated', handleNotifUpdate);
      clearInterval(interval);
    };
  }, [fetchCount]);

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

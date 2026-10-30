import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';
import { useGuestGuard } from '../../context/GuestGuardContext';
import { useLanguage } from '../../context/LanguageContext';
import { notificationService } from '../../services/notificationService';

export function TopNav({
  roomNo,
  tagLabel,
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
  const { isAuthenticated, isGuest } = useAuth();
  const { guardAction, openLoginModal } = useGuestGuard();
  const { language, setLanguage, t } = useLanguage();
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
          <small>{tagLabel || (language === 'en' ? `Room ${roomNo}` : `Phòng ${roomNo}`)}</small>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (isGuest || !isAuthenticated)) {
                e.preventDefault();
                openLoginModal(language === 'en' ? 'search exhibition items' : 'tìm kiếm nội dung triển lãm');
              }
            }}
          />
        </div>
      )}

      <div className="tr">
        {rightAddon}

        <button
          type="button"
          className="iconbtn glass"
          title={t('theme_palette')}
          onClick={onOpenThemeModal}
        >
          <Icon name="palette" size={20} />
        </button>

        <div className="lang glass" style={{ cursor: 'pointer', userSelect: 'none' }}>
          <b
            className={language === 'vi' ? 'on' : ''}
            onClick={() => setLanguage('vi')}
            title="Tiếng Việt"
          >
            VI
          </b>
          <b
            className={language === 'en' ? 'on' : ''}
            onClick={() => setLanguage('en')}
            title="English"
          >
            EN
          </b>
        </div>

        <button
          type="button"
          className="iconbtn glass"
          title={t('notifications')}
          onClick={() => {
            guardAction(() => {
              if (onOpenNotifications) onOpenNotifications();
            }, language === 'en' ? 'view notifications' : 'xem thông báo');
          }}
        >
          <Icon name="bell" size={20} />
          {unreadCount > 0 && <span className="n">{unreadCount}</span>}
        </button>
      </div>
    </div>
  );
}

export default TopNav;

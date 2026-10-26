import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';

export function NotificationDropdown({ isOpen, onClose, onActionClick }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tải danh sách thông báo từ API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await notificationService.getNotifications({ page: 1, limit: 20 });
      const items = res?.items || (Array.isArray(res) ? res : []);
      setNotifications(items);
    } catch (err) {
      setErrorMsg('Không thể tải thông báo. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  if (!isOpen) return null;

  // Đánh dấu 1 thông báo là đã đọc
  const handleItemClick = async (item) => {
    if (!item.is_read) {
      try {
        await notificationService.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        window.dispatchEvent(new CustomEvent('notifications:updated'));
      } catch (err) {
        console.warn('Lỗi khi đánh dấu thông báo đã đọc:', err);
      }
    }

    if (onActionClick) {
      const ctaText = getActionCta(item);
      onActionClick(ctaText, item);
    }
    onClose && onClose();
  };

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new CustomEvent('notifications:updated'));
    } catch (err) {
      console.warn('Lỗi khi đánh dấu tất cả đã đọc:', err);
    }
  };

  const getActionCta = (item) => {
    const type = item.type || '';
    if (type.includes('LANTERN') || type === 'LANTERN_LANDED') {
      return 'Xem thư lồng đèn';
    }
    if (type.includes('ARTWORK') || type === 'ARTWORK_APPROVED' || type === 'ARTWORK_REJECTED') {
      return 'Xem ở Phòng 1';
    }
    if (type.includes('DIARY') || type === 'INTERACTION' || type === 'COMMENT') {
      return 'Xem nhật ký';
    }
    return 'Xem chi tiết';
  };

  const getBadgeAndIcon = (type) => {
    switch (type) {
      case 'ARTWORK_APPROVED':
        return { badge: 'b-ok', icon: 'sparkle' };
      case 'ARTWORK_REJECTED':
        return { badge: 'b-priv', icon: 'shield' };
      case 'LANTERN_LANDED':
        return { badge: 'b-wait', icon: 'bookmark' };
      case 'INTERACTION':
      case 'COMMENT':
        return { badge: 'b-ok', icon: 'sparkle' };
      default:
        return { badge: 'b-wait', icon: 'bell' };
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div className="scrim" style={{ background: 'transparent' }} onClick={onClose} />
      <div
        className="abs"
        style={{
          right: '30px',
          top: '78px',
          width: '430px',
          maxWidth: '92vw',
          maxHeight: '80vh',
          zIndex: 32,
          background: 'var(--paper)',
          color: 'var(--ink)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0,0,0,.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          className="row between"
          style={{
            padding: '16px 18px 12px',
            borderBottom: '1px solid var(--line)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <b className="serif" style={{ fontSize: '22px' }}>
              Thông báo
            </b>
            {notifications.some((n) => !n.is_read) && (
              <span
                style={{
                  background: 'var(--acc)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '1px 7px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {notifications.filter((n) => !n.is_read).length} mới
              </span>
            )}
          </div>

          {isAuthenticated && notifications.some((n) => !n.is_read) && (
            <span
              className="muted"
              style={{
                fontSize: '13px',
                cursor: 'pointer',
                color: 'var(--acc)',
                fontWeight: 600,
              }}
              onClick={handleMarkAllRead}
            >
              Đánh dấu tất cả là đã đọc
            </span>
          )}
        </div>

        {/* List Content */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {!isAuthenticated ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--ink2)' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>✦</div>
              <div>Vui lòng đăng nhập để nhận thông báo từ bảo tàng.</div>
            </div>
          ) : isLoading ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--ink2)' }}>
              Đang tải danh sách thông báo...
            </div>
          ) : errorMsg ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--acc)' }}>
              {errorMsg}
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink2)' }}>
              <div className="hand" style={{ fontSize: '22px', marginBottom: '4px' }}>
                mọi thứ đang thật yên ả
              </div>
              <div style={{ fontSize: '13.5px' }}>Chưa có thông báo nào mới dành cho bạn.</div>
            </div>
          ) : (
            notifications.map((item) => {
              const { badge, icon } = getBadgeAndIcon(item.type);
              const cta = getActionCta(item);

              return (
                <div
                  key={item.id}
                  className="row"
                  onClick={() => handleItemClick(item)}
                  style={{
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '13px 18px',
                    borderBottom: '1px solid var(--line)',
                    background: !item.is_read ? 'rgba(201, 154, 59, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <span
                    className={`badge ${badge}`}
                    style={{
                      width: '34px',
                      height: '34px',
                      padding: 0,
                      justifyContent: 'center',
                      borderRadius: '50%',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <Icon name={icon} size={16} />
                  </span>

                  <div style={{ flex: 1 }}>
                    {item.title && (
                      <div
                        style={{
                          fontWeight: !item.is_read ? 700 : 600,
                          fontSize: '14.5px',
                          color: 'var(--ink)',
                          marginBottom: '2px',
                        }}
                      >
                        {item.title}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '13.5px',
                        lineHeight: 1.5,
                        color: !item.is_read ? 'var(--ink)' : 'var(--ink2)',
                      }}
                    >
                      {item.message}
                    </div>

                    <div
                      className="row between"
                      style={{ marginTop: '6px', fontSize: '12px', color: 'var(--ink2)' }}
                    >
                      <span>{formatTime(item.created_at)}</span>
                      {cta && (
                        <span
                          style={{
                            color: 'var(--acc)',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {cta} →
                        </span>
                      )}
                    </div>
                  </div>

                  {!item.is_read && (
                    <i
                      className="dot"
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--acc)',
                        marginTop: '6px',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

export default NotificationDropdown;

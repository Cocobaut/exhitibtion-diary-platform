import React from 'react';
import { NOTIFICATIONS_DATA } from '../../data/mockData';
import { Icon } from '../common/Icons';

export function NotificationDropdown({ isOpen, onClose, onActionClick }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="scrim" style={{ background: 'transparent' }} onClick={onClose} />
      <div
        className="abs"
        style={{
          right: '30px',
          top: '78px',
          width: '420px',
          zIndex: 32,
          background: 'var(--paper)',
          color: 'var(--ink)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0,0,0,.4)',
          overflow: 'hidden',
        }}
      >
        <div className="row between" style={{ padding: '16px 18px 10px' }}>
          <b className="serif" style={{ fontSize: '22px' }}>Thông báo</b>
          <span className="muted" style={{ fontSize: '13px', cursor: 'pointer' }}>
            Đánh dấu tất cả là đã đọc
          </span>
        </div>

        {NOTIFICATIONS_DATA.map((item, idx) => (
          <div
            key={idx}
            className="row"
            style={{
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 18px',
              borderTop: '1px solid var(--line)',
              background: item.unread ? '#FFF8EC' : 'transparent',
            }}
          >
            <span
              className={`badge ${item.badge}`}
              style={{
                width: '34px',
                height: '34px',
                padding: 0,
                justifyContent: 'center',
                borderRadius: '50%',
                flexShrink: 0,
              }}
            >
              <Icon name={item.icon} size={17} />
            </span>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14.5px', lineHeight: 1.45 }}>{item.text}</div>
              <div className="row between" style={{ marginTop: '4px' }}>
                <span className="muted" style={{ fontSize: '12.5px' }}>{item.time}</span>
                {item.cta && (
                  <button
                    type="button"
                    onClick={() => {
                      onActionClick && onActionClick(item.cta);
                      onClose();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--acc)',
                      fontWeight: 'bold',
                    }}
                  >
                    {item.cta} →
                  </button>
                )}
              </div>
            </div>

            {item.unread && (
              <i className="dot" style={{ background: 'var(--acc)', marginTop: '6px' }} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default NotificationDropdown;

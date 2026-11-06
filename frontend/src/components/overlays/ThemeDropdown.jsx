import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { THEMES } from '../../data/mockData';
import { Icon } from '../common/Icons';
import { userService } from '../../services/userService';

export function ThemeDropdown({ isOpen, onClose }) {
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop Scrim */}
      <div
        className="scrim"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(22, 14, 11, 0.62)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          zIndex: 1000,
        }}
        onClick={onClose}
      />

      {/* Centered Theme Modal Panel */}
      <div
        className="panel custom-scrollbar theme-modal-panel"
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          width: 'min(420px, 90vw)',
          maxHeight: 'min(88dvh, 520px)',
          overflowY: 'auto',
          background: 'var(--paper)',
          color: 'var(--ink)',
          borderRadius: '20px',
          border: '1.5px solid var(--gold, #E6C280)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.5)',
          padding: '24px 22px 16px',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <b className="serif" style={{ fontSize: '22px', color: 'var(--ink)' }}>
            {language === 'en' ? 'Color Themes' : 'Bảng màu'}
          </b>
          <span
            className="x"
            onClick={onClose}
            role="button"
            tabIndex={0}
            style={{
              cursor: 'pointer',
              fontSize: '22px',
              color: 'var(--ink2)',
              lineHeight: 1,
              padding: '2px 6px',
              userSelect: 'none',
            }}
          >
            ×
          </span>
        </div>
        <div className="muted" style={{ fontSize: '13px', marginBottom: '14px' }}>
          {language === 'en'
            ? 'Saved to your account, applied across all exhibition rooms.'
            : 'Lưu theo tài khoản, áp dụng cho mọi phòng.'}
        </div>

        {THEMES.map((th) => {
          const isSelected = theme === th.key;
          return (
            <div
              key={th.key}
              className="row"
              onClick={async () => {
                setTheme(th.key);
                try {
                  const token = localStorage.getItem('access_token');
                  if (token) {
                    await userService.updateProfile({ theme_preference: th.key });
                  }
                } catch {
                  // offline fallback
                }
                onClose && onClose();
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                gap: '12px',
                cursor: 'pointer',
                marginBottom: '8px',
                background: isSelected ? 'rgba(230, 194, 128, 0.18)' : 'transparent',
                outline: isSelected ? '2px solid var(--acc)' : '1px solid rgba(0, 0, 0, 0.08)',
                transition: 'all 0.18s ease',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  width: '95px',
                  height: '28px',
                  flex: 'none',
                  border: '1px solid var(--line)',
                }}
              >
                {th.swatches.map((color, idx) => (
                  <i key={idx} style={{ flex: 1, backgroundColor: color }} />
                ))}
              </span>

              <span style={{ flex: 1 }}>
                <b style={{ fontSize: '14.5px', color: 'var(--ink)' }}>
                  {language === 'en' ? (th.name_en || th.name) : (th.name_vi || th.name)}
                </b>
                <div className="muted" style={{ fontSize: '12px', lineHeight: 1.3 }}>
                  {language === 'en' ? (th.desc_en || th.desc) : (th.desc_vi || th.desc)}
                </div>
              </span>

              {isSelected && (
                <span style={{ color: 'var(--acc)' }}>
                  <Icon name="check" size={20} strokeWidth={2.2} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default ThemeDropdown;

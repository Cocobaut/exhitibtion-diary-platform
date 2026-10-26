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
      <div className="scrim" style={{ background: 'transparent' }} onClick={onClose} />
      <div
        className="abs"
        style={{
          right: '150px',
          top: '78px',
          width: '380px',
          zIndex: 32,
          background: 'var(--paper)',
          color: 'var(--ink)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0,0,0,.4)',
          padding: '16px 16px 10px',
        }}
      >
        <b className="serif" style={{ fontSize: '22px' }}>
          {language === 'en' ? 'Color Themes' : 'Bảng màu'}
        </b>
        <div className="muted" style={{ fontSize: '13px', marginBottom: '10px' }}>
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
                padding: '10px',
                borderRadius: '12px',
                gap: '12px',
                cursor: 'pointer',
                marginBottom: '6px',
                background: isSelected ? '#FFF6E8' : 'transparent',
                outline: isSelected ? '2px solid var(--acc)' : 'none',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  width: '110px',
                  height: '30px',
                  flex: 'none',
                  border: '1px solid var(--line)',
                }}
              >
                {th.swatches.map((color, idx) => (
                  <i key={idx} style={{ flex: 1, backgroundColor: color }} />
                ))}
              </span>

              <span style={{ flex: 1 }}>
                <b style={{ fontSize: '15px' }}>
                  {language === 'en' ? (th.name_en || th.name) : (th.name_vi || th.name)}
                </b>
                <div className="muted" style={{ fontSize: '12.5px' }}>
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

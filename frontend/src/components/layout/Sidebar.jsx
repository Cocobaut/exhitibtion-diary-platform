import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';
import { useGuestGuard } from '../../context/GuestGuardContext';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/authService';
import { AccountSettingsModal } from '../../pages/Profile/AccountSettingsModal';

export function Sidebar({ currentRoute, onNavigate, isAdmin = true, user = null }) {
  const { logout, isAuthenticated, isGuest, user: authUser } = useAuth();
  const { guardAction, openLoginModal } = useGuestGuard();
  const { t, language } = useLanguage();
  const currentUser = user || authUser;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const menuRef = useRef(null);

  const navItems = [
    { key: 'home', icon: 'home', label: t('nav_lobby'), requireAuth: false },
    { key: 'r1', icon: 'r1', label: t('nav_room1'), requireAuth: false },
    { key: 'r2', icon: 'r2', label: t('nav_room2'), requireAuth: false },
    { key: 'r3', icon: 'r3', label: t('nav_room3'), requireAuth: false },
    { key: 'diary', icon: 'diary', label: t('nav_diary'), requireAuth: true },
    { key: 'notebook', icon: 'bookmark', label: t('nav_notebook'), requireAuth: true },
  ];

  const displayName = isGuest
    ? t('nav_guest')
    : currentUser?.nickname || currentUser?.username || (language === 'en' ? 'User' : 'Khách');
  const initialLetter = isGuest ? (language === 'en' ? 'G' : 'K') : displayName.charAt(0).toUpperCase();

  // Đóng popover khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMenuOpen]);

  const handleAvatarClick = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    setIsMenuOpen(false);
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Lỗi khi đăng xuất trên máy chủ:', err);
    }
    logout();
    onNavigate('login');
  };

  return (
    <>
      <nav className="side">
      <div className="mark" onClick={() => onNavigate('home')} title="Về Sảnh chính">
        ✦
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
        }}
      >
        {navItems.map((item) => {
          const isLocked = isGuest && item.requireAuth;

          return (
            <button
              key={item.key}
              type="button"
              className={`side-btn ${currentRoute === item.key ? 'on' : ''} ${
                isLocked ? 'opacity-40 cursor-not-allowed filter grayscale-[40%]' : ''
              }`}
              style={
                isLocked
                  ? {
                      opacity: 0.4,
                      cursor: 'not-allowed',
                      filter: 'grayscale(40%)',
                    }
                  : {}
              }
              title={isLocked ? `${item.label} (Cần đăng nhập)` : item.label}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                  e.stopPropagation();
                  guardAction(
                    null,
                    item.key === 'diary' ? 'truy cập Nhật ký cá nhân' : 'truy cập Bộ sưu tập / Sổ tay'
                  );
                  return;
                }
                setIsMenuOpen(false);
                onNavigate(item.key);
              }}
            >
              <Icon name={item.icon} size={22} />
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  justifyContent: 'center',
                }}
              >
                {item.label}
                {isLocked && <span style={{ fontSize: '10px' }}>🔒</span>}
              </span>
            </button>
          );
        })}

        {!isGuest && isAdmin && (
          <button
            type="button"
            className={`side-btn ${currentRoute === 'admin' ? 'on' : ''}`}
            onClick={() => {
              setIsMenuOpen(false);
              onNavigate('admin');
            }}
          >
            <Icon name="shield" size={22} />
            <span>{t('nav_admin')}</span>
          </button>
        )}

        {!isGuest && (currentUser?.role === 'OWNER' || String(currentUser?.role).toUpperCase() === 'OWNER') && (
          <button
            type="button"
            className={`side-btn ${currentRoute === 'owner' ? 'on' : ''}`}
            onClick={() => {
              setIsMenuOpen(false);
              onNavigate('owner');
            }}
            title="Bảng Chủ sở hữu (Owner)"
          >
            <Icon name="crown" size={22} />
            <span>Owner</span>
          </button>
        )}
      </div>

      {/* Spacer pushes the account avatar to the very bottom */}
      <div className="grow" style={{ flex: 1, minHeight: '8px' }} />

      <div
        style={{
          width: '32px',
          height: '1px',
          background: 'var(--glass-line)',
          margin: '6px 0',
          flexShrink: 0,
        }}
      />

      {/* Avatar Button at the very bottom */}
      <div
        className="av"
        onClick={handleAvatarClick}
        title={isAuthenticated ? `Tài khoản (${displayName})` : 'Đăng nhập'}
        style={{
          overflow: 'hidden',
          marginTop: 'auto',
          marginBottom: '4px',
          flexShrink: 0,
        }}
      >
        {currentUser?.avatar_url ? (
          <img
            src={currentUser.avatar_url}
            alt={displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          initialLetter
        )}
      </div>

      {/* Popover Account Menu */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            left: '84px',
            bottom: '16px',
            background: 'var(--paper)',
            color: 'var(--ink)',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.32)',
            border: '1px solid var(--line)',
            zIndex: 100,
            minWidth: '220px',
            textAlign: 'left',
            animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--acc)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 600,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initialLetter
              )}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '15px',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--ink2)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {isGuest ? (language === 'en' ? 'Visitor' : 'Khách vãng lai') : `@${currentUser?.username || 'user'}`}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'inline-block',
              marginTop: '8px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              background: isGuest ? 'rgba(110, 90, 78, 0.12)' : isAdmin ? 'rgba(201, 154, 59, 0.16)' : 'rgba(110, 90, 78, 0.12)',
              color: isGuest ? 'var(--ink2)' : isAdmin ? 'var(--gold)' : 'var(--ink2)',
            }}
          >
            {isGuest ? 'GUEST' : (currentUser?.role || 'USER')}
          </div>

          <div
            style={{
              height: '1px',
              background: 'var(--line)',
              margin: '12px 0 10px',
            }}
          />

          {isGuest || !isAuthenticated ? (
            <>
              {/* Lựa chọn 1: Mở form login */}
              <button
                type="button"
                className="btn main"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  justifyContent: 'center',
                  marginBottom: '8px',
                }}
                onClick={() => {
                  setIsMenuOpen(false);
                  openLoginModal(language === 'en' ? 'log in to your account' : 'đăng nhập tài khoản');
                }}
              >
                {language === 'en' ? 'Log in' : 'Đăng nhập'}
              </button>

              {/* Lựa chọn 2: Logout */}
              <button
                type="button"
                className="btn line"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13.5px',
                  color: 'var(--acc)',
                  borderColor: 'rgba(161, 52, 44, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  justifyContent: 'center',
                }}
                onClick={handleLogout}
              >
                {language === 'en' ? 'Log out' : 'Đăng xuất'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn line"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13.5px',
                  color: 'var(--ink)',
                  borderColor: 'var(--line)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  justifyContent: 'center',
                  marginBottom: '8px',
                }}
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsProfileModalOpen(true);
                }}
              >
                {t('nav_profile_settings')}
              </button>

              <button
                type="button"
                className="btn line"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13.5px',
                  color: 'var(--acc)',
                  borderColor: 'rgba(161, 52, 44, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  justifyContent: 'center',
                }}
                onClick={handleLogout}
              >
                {t('nav_logout')}
              </button>
            </>
          )}
        </div>
      )}

      </nav>

      {/* Modal Cài đặt & Hồ sơ */}
      <AccountSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}

export default Sidebar;

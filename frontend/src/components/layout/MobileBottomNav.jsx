import React, { useState } from 'react';
import { Icon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';
import { useGuestGuard } from '../../context/GuestGuardContext';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/authService';
import { AccountSettingsModal } from '../../pages/Profile/AccountSettingsModal';

export function MobileBottomNav({
  currentRoute,
  onNavigate,
  isAdmin = false,
  user = null,
  onOpenMailbox,
  onOpenNotifications,
  onOpenThemeModal,
}) {
  const { logout, isAuthenticated, isGuest, user: authUser } = useAuth();
  const { guardAction, openLoginModal } = useGuestGuard();
  const { t, language, setLanguage } = useLanguage();
  const currentUser = user || authUser;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const mainNavItems = [
    { key: 'home', icon: 'home', label: t('nav_lobby'), requireAuth: false },
    { key: 'r1', icon: 'r1', label: t('nav_room1'), requireAuth: false },
    { key: 'r2', icon: 'r2', label: t('nav_room2'), requireAuth: false },
    { key: 'r3', icon: 'r3', label: t('nav_room3'), requireAuth: false },
    { key: 'diary', icon: 'diary', label: t('nav_diary'), requireAuth: true },
  ];

  const displayName = isGuest
    ? t('nav_guest')
    : currentUser?.nickname || currentUser?.username || (language === 'en' ? 'User' : 'Khách');
  const initialLetter = isGuest ? (language === 'en' ? 'G' : 'K') : displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    setIsDrawerOpen(false);
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Lỗi khi đăng xuất trên máy chủ:', err);
    }
    logout();
    onNavigate('login');
  };

  const isOwner = !isGuest && (currentUser?.role === 'OWNER' || String(currentUser?.role).toUpperCase() === 'OWNER');

  return (
    <>
      {/* 1. Fixed Bottom Navigation Bar for Mobile & Tablet Portrait */}
      <nav className="mobile-bottom-nav">
        {mainNavItems.map((item) => {
          const isActive = currentRoute === item.key;
          const isLocked = isGuest && item.requireAuth;

          return (
            <button
              key={item.key}
              type="button"
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
              title={isLocked ? `${item.label} (Cần đăng nhập)` : item.label}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                  e.stopPropagation();
                  guardAction(
                    null,
                    item.key === 'diary' ? 'truy cập Nhật ký cá nhân' : 'truy cập tính năng'
                  );
                  return;
                }
                setIsDrawerOpen(false);
                onNavigate(item.key);
              }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={item.icon} size={20} />
                {isLocked && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-4px',
                      fontSize: '9px',
                      lineHeight: 1,
                    }}
                  >
                    🔒
                  </span>
                )}
              </div>
              <span className="mobile-nav-label" style={{ fontSize: '10px', marginTop: '2px' }}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Nút 6: Function (Drawer) */}
        <button
          type="button"
          className={`mobile-bottom-nav-item ${isDrawerOpen ? 'active' : ''}`}
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          title="Function"
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDrawerOpen ? 'var(--gold, #E6C280)' : 'rgba(255, 255, 255, 0.1)',
              color: isDrawerOpen ? '#241A17' : 'inherit',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>✦</span>
          </div>
          <span className="mobile-nav-label" style={{ fontSize: '10px', marginTop: '2px' }}>
            Function
          </span>
        </button>
      </nav>

      {/* 2. Responsive Bottom Drawer for Extra Actions */}
      {isDrawerOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setIsDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 105,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            className="mobile-drawer-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--paper, #1e1b24)',
              color: 'var(--ink, #fff)',
              borderRadius: '24px 24px 0 0',
              padding: '16px 20px calc(24px + var(--safe-bottom, 0px))',
              maxHeight: '82dvh',
              overflowY: 'auto',
              borderTop: '1px solid var(--line, rgba(255, 255, 255, 0.15))',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Grab handle bar */}
            <div
              style={{
                width: '40px',
                height: '4px',
                borderRadius: '999px',
                background: 'var(--line, rgba(255,255,255,0.2))',
                margin: '0 auto 16px',
              }}
            />

            {/* Profile Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.05)',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--acc, #92400e)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: '18px',
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink2, #a1a1aa)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span>{isGuest ? (language === 'en' ? 'Visitor' : 'Khách vãng lai') : `@${currentUser?.username || 'user'}`}</span>
                  <span
                    style={{
                      padding: '1px 7px',
                      borderRadius: '999px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: isGuest ? 'rgba(110, 90, 78, 0.2)' : isAdmin ? 'rgba(201, 154, 59, 0.2)' : 'rgba(110, 90, 78, 0.2)',
                      color: isGuest ? 'var(--ink2)' : isAdmin ? 'var(--gold, #E6C280)' : 'var(--ink2)',
                    }}
                  >
                    {isGuest ? 'GUEST' : (currentUser?.role || 'USER')}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu List Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {/* Sổ tay */}
              <button
                type="button"
                className="btn line"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  justifyContent: 'flex-start',
                  minHeight: '48px',
                }}
                onClick={() => {
                  if (isGuest) {
                    guardAction(null, 'truy cập Sổ tay / Bộ sưu tập');
                    return;
                  }
                  setIsDrawerOpen(false);
                  onNavigate('notebook');
                }}
              >
                <Icon name="bookmark" size={18} />
                <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{t('nav_notebook')}</span>
              </button>

              {/* Hòm thư cảm xúc */}
              <button
                type="button"
                className="btn line"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  justifyContent: 'flex-start',
                  minHeight: '48px',
                }}
                onClick={() => {
                  setIsDrawerOpen(false);
                  if (onOpenMailbox) onOpenMailbox();
                }}
              >
                <Icon name="mail" size={18} />
                <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{language === 'en' ? 'Mailbox' : 'Hòm thư'}</span>
              </button>

              {/* Đổi Theme */}
              <button
                type="button"
                className="btn line"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  justifyContent: 'flex-start',
                  minHeight: '48px',
                }}
                onClick={() => {
                  setIsDrawerOpen(false);
                  if (onOpenThemeModal) onOpenThemeModal();
                }}
              >
                <Icon name="palette" size={18} />
                <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{language === 'en' ? 'Theme' : 'Đổi Theme'}</span>
              </button>

              {/* Đổi ngôn ngữ 1-chạm */}
              <button
                type="button"
                className="btn line"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  justifyContent: 'flex-start',
                  minHeight: '48px',
                }}
                onClick={() => {
                  setLanguage(language === 'vi' ? 'en' : 'vi');
                }}
              >
                <Icon name="globe" size={18} />
                <span style={{ fontSize: '13.5px', fontWeight: 600 }}>
                  {language === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}
                </span>
              </button>

              {/* Cài đặt tài khoản (khi đã login) */}
              {!isGuest && isAuthenticated && (
                <button
                  type="button"
                  className="btn line"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    justifyContent: 'flex-start',
                    minHeight: '48px',
                  }}
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                >
                  <Icon name="user" size={18} />
                  <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{language === 'en' ? 'Account' : 'Cài đặt'}</span>
                </button>
              )}

              {/* Quyền quản trị (Admin) - Nằm chung hàng trong lưới với các nút trên, không cần xuống một hàng mới */}
              {!isGuest && isAdmin && (
                <button
                  type="button"
                  className="btn line"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    justifyContent: 'flex-start',
                    borderColor: 'var(--gold)',
                    minHeight: '48px',
                  }}
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onNavigate('admin');
                  }}
                >
                  <Icon name="shield" size={18} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700 }}>{t('nav_admin')}</span>
                </button>
              )}

              {/* Quyền chủ sở hữu (Owner) */}
              {!isGuest && isOwner && (
                <button
                  type="button"
                  className="btn line"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    justifyContent: 'flex-start',
                    borderColor: '#c084fc',
                    minHeight: '48px',
                  }}
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onNavigate('owner');
                  }}
                >
                  <Icon name="crown" size={18} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700 }}>{language === 'en' ? 'Owner Board' : 'Chủ sở hữu'}</span>
                </button>
              )}
            </div>

            {/* Đăng nhập hoặc Đăng xuất */}
            <div style={{ borderTop: '1px solid var(--line, rgba(255,255,255,0.12))', paddingTop: '14px' }}>
              {isGuest || !isAuthenticated ? (
                <button
                  type="button"
                  className="btn main"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    justifyContent: 'center',
                    minHeight: '48px',
                  }}
                  onClick={() => {
                    setIsDrawerOpen(false);
                    openLoginModal(language === 'en' ? 'log in to your account' : 'đăng nhập tài khoản');
                  }}
                >
                  {language === 'en' ? 'Log in' : 'Đăng nhập'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn danger"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    justifyContent: 'center',
                    minHeight: '48px',
                  }}
                  onClick={handleLogout}
                >
                  {language === 'en' ? 'Log out' : 'Đăng xuất'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account Settings Modal */}
      {isProfileModalOpen && (
        <AccountSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </>
  );
}
export default MobileBottomNav;


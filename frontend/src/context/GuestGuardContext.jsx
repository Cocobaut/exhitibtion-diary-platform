import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { LoginModal } from '../components/overlays/LoginModal';

const GuestGuardContext = createContext(null);

export function GuestGuardProvider({ children, onNavigateToLogin }) {
  const { isAuthenticated, isGuest } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);
  const pendingActionRef = useRef(null);

  // Hiển thị thông báo Toast nhanh
  const triggerToast = useCallback((msg, duration = 3000) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage('');
    }, duration);
  }, []);

  // Đóng modal đăng nhập
  const closeLoginModal = useCallback(() => {
    setIsLoginOpen(false);
    pendingActionRef.current = null;
  }, []);

  // Mở modal form đăng nhập trực tiếp
  const openLoginModal = useCallback((feature = '') => {
    setActiveFeature(feature);
    setIsLoginOpen(true);
  }, []);

  /**
   * Bộ lọc hành động (Action Interceptor / Guard):
   * - Nếu người dùng là Khách vãng lai (isGuest) hoặc chưa đăng nhập (!isAuthenticated):
   *   + Ngăn chặn hành động
   *   + Mở ngay Form Đăng nhập trực tiếp (LoginModal)
   *   + Cho phép click ra ngoài để tắt form bất cứ lúc nào
   *   + Trả về false
   * - Nếu đã đăng nhập:
   *   + Thực thi actionCallback()
   *   + Trả về true
   */
  const guardAction = useCallback(
    (actionCallback, featureName = '') => {
      if (isGuest || !isAuthenticated) {
        if (typeof actionCallback === 'function') {
          pendingActionRef.current = actionCallback;
        } else {
          pendingActionRef.current = null;
        }
        setActiveFeature(featureName);
        setIsLoginOpen(true);
        return false;
      }

      if (typeof actionCallback === 'function') {
        actionCallback();
      }
      return true;
    },
    [isGuest, isAuthenticated]
  );

  const handleLoginSuccess = useCallback(
    (authData) => {
      setIsLoginOpen(false);
      triggerToast('✦ Đăng nhập thành công! Chào mừng bạn bước vào bảo tàng.');
      if (pendingActionRef.current) {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        try {
          action();
        } catch (err) {
          console.warn('Lỗi khi thực thi pending action sau đăng nhập:', err);
        }
      }
    },
    [triggerToast]
  );

  const value = {
    isGuest,
    isAuthenticated,
    guardAction,
    openLoginModal,
    openPrompt: openLoginModal, // Alias tương thích
    closeLoginModal,
    closePrompt: closeLoginModal, // Alias tương thích
    triggerToast,
  };

  return (
    <GuestGuardContext.Provider value={value}>
      {children}

      {/* Toast thông báo toàn cục */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(28, 14, 16, 0.94)',
            color: '#FFF2EB',
            padding: '10px 22px',
            borderRadius: '999px',
            fontSize: '13.5px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(220, 160, 140, 0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none',
          }}
        >
          <span style={{ color: 'var(--acc)', fontSize: '15px' }}>✦</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Form Đăng nhập trực tiếp trên màn hình, click ra ngoài để tắt */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={closeLoginModal}
        featureName={activeFeature}
        onLoginSuccess={handleLoginSuccess}
      />
    </GuestGuardContext.Provider>
  );
}

export function useGuestGuard() {
  const context = useContext(GuestGuardContext);
  if (!context) {
    throw new Error('useGuestGuard must be used within a GuestGuardProvider');
  }
  return context;
}

export default GuestGuardContext;

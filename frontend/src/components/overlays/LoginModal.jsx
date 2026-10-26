import React, { useState, useEffect } from 'react';
import { Logo } from '../common/Logo';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { RegisterModal } from '../../pages/Auth/RegisterModal';
import { ForgotPasswordModal } from '../../pages/Auth/ForgotPasswordModal';

export function LoginModal({ isOpen, onClose, featureName, onLoginSuccess }) {
  const { login } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Sub-modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  // Đóng modal khi nhấn ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setInfoMsg(
        featureName
          ? (language === 'en'
              ? `Please log in to ${featureName}.`
              : `Vui lòng đăng nhập để ${featureName}.`)
          : ''
      );
    }
  }, [isOpen, featureName, language]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account.trim() || !password) {
      setErrorMsg(
        language === 'en'
          ? 'Please enter both your account and password.'
          : 'Vui lòng nhập đầy đủ tài khoản và mật khẩu.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const res = await authService.login({
        account: account.trim(),
        password,
      });

      if (res && res.access_token) {
        login(res);
      }

      setIsLoading(false);
      onClose();

      if (onLoginSuccess) {
        onLoginSuccess(res);
      }
    } catch (err) {
      setIsLoading(false);
      if (err.errorCode === 'INVALID_CREDENTIALS' || err.status === 401) {
        setErrorMsg(
          language === 'en'
            ? 'Incorrect username or password.'
            : 'Tài khoản hoặc mật khẩu không chính xác.'
        );
      } else if (err.errorCode === 'ACCOUNT_LOCKED' || err.status === 403) {
        setErrorMsg(
          language === 'en'
            ? 'Your account has been locked. Please contact an administrator.'
            : 'Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên.'
        );
      } else {
        setErrorMsg(
          err.message ||
            (language === 'en'
              ? 'An error occurred. Please try again.'
              : 'Đã có lỗi xảy ra. Vui lòng thử lại.')
        );
      }
    }
  };

  const handleRegisterSuccess = ({ username }) => {
    setIsRegisterOpen(false);
    setAccount(username);
    setPassword('');
    setErrorMsg('');
    setInfoMsg(
      language === 'en'
        ? 'Account created successfully! Please enter your password to enter.'
        : 'Tài khoản đã tạo thành công! Mời bạn nhập mật khẩu để bước vào.'
    );
  };

  return (
    <>
      {/* 1. Lớp phủ nền mờ toàn màn hình: Click ra ngoài ô form sẽ tự động tắt ngay lập tức */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 8, 10, 0.72)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 99998,
          cursor: 'pointer',
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* 2. Hộp thoại Đăng nhập: Nằm chính xác ngay giữa màn hình (Center of Monitor)
             và CỐ ĐỊNH màu sắc 100% theo trang Login chuẩn (không bị đổi màu theo theme phòng) */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '490px',
          maxWidth: '92vw',
          background: 'rgba(245, 238, 228, 0.98)',
          color: '#2B211D',
          borderRadius: '24px',
          padding: '38px 42px 32px',
          boxShadow: '0 35px 90px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(212, 176, 106, 0.35)',
          border: '1px solid rgba(212, 176, 106, 0.45)',
          zIndex: 99999,
          textAlign: 'center',
          boxSizing: 'border-box',
          animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Nút đổi ngôn ngữ góc trên bên trái modal */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            background: 'rgba(212, 176, 106, 0.18)',
            border: '1px solid rgba(212, 176, 106, 0.35)',
            borderRadius: '16px',
            padding: '2px 6px',
          }}
        >
          <button
            type="button"
            onClick={() => setLanguage('vi')}
            style={{
              background: language === 'vi' ? '#A1342C' : 'transparent',
              color: language === 'vi' ? '#FFF' : '#6E5A4E',
              fontWeight: 700,
              fontSize: '11px',
              border: 'none',
              borderRadius: '10px',
              padding: '2px 6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            VI
          </button>
          <span style={{ color: '#8C776A', fontSize: '11px' }}>/</span>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            style={{
              background: language === 'en' ? '#A1342C' : 'transparent',
              color: language === 'en' ? '#FFF' : '#6E5A4E',
              fontWeight: 700,
              fontSize: '11px',
              border: 'none',
              borderRadius: '10px',
              padding: '2px 6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            EN
          </button>
        </div>

        {/* Nút đóng ✕ góc phải */}
        <button
          type="button"
          onClick={onClose}
          aria-label={language === 'en' ? 'Close login form' : 'Đóng form đăng nhập'}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'transparent',
            border: 'none',
            color: '#6E5A4E',
            cursor: 'pointer',
            padding: '6px',
            fontSize: '18px',
            lineHeight: 1,
            borderRadius: '50%',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#A1342C')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6E5A4E')}
        >
          ✕
        </button>

        {/* Museum Monogram Logo */}
        <div style={{ '--logo-c': '#A1342C', marginBottom: '8px' }}>
          <Logo />
        </div>

        {/* Subtitle nhãn vàng kim */}
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '.28em',
            fontWeight: 700,
            color: '#C99A3B',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}
        >
          ✦ {language === 'en' ? 'The Name of Feeling Museum' : 'Bảo tàng Tên của Cảm xúc'} ✦
        </div>

        {/* Tiêu đề Bảo tàng */}
        <h2
          className="serif"
          style={{
            fontSize: '28px',
            margin: '2px 0 6px',
            color: '#2B211D',
            letterSpacing: '.02em',
            fontWeight: 700,
          }}
        >
          {language === 'en' ? 'Museum of Feelings' : 'Bảo Tàng Cảm Xúc'}
        </h2>

        {/* Lời tựa */}
        <div
          className="hand"
          style={{
            fontSize: '20px',
            color: '#6E5A4E',
            marginBottom: '16px',
            lineHeight: 1.4,
          }}
        >
          {language === 'en'
            ? '“Every feeling finds a gentle sanctuary...”'
            : '“Mỗi cảm xúc đều tìm thấy một góc nương náu...”'}
        </div>

        {/* Thông báo lý do tính năng */}
        {infoMsg && (
          <div
            style={{
              background: 'rgba(161, 52, 44, 0.08)',
              border: '1px solid rgba(161, 52, 44, 0.28)',
              color: '#A1342C',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13.5px',
              marginBottom: '14px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '15px' }}>✦</span>
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Thông báo lỗi đăng nhập */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(161, 52, 44, 0.1)',
              border: '1px solid rgba(161, 52, 44, 0.35)',
              color: '#A1342C',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13.5px',
              marginBottom: '14px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Inputs: Cố định màu sắc trắng & nâu đất theo trang Login */}
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#2B211D',
              marginBottom: '6px',
            }}
          >
            <span>{language === 'en' ? 'Username or Email' : 'Tên đăng nhập hoặc Email'}</span>
          </div>
          <input
            className="inp focus"
            placeholder={language === 'en' ? 'e.g. linh.ng or email@example.com' : 'ví dụ: linh.ng hoặc email@example.com'}
            value={account}
            onChange={(e) => {
              setAccount(e.target.value);
              setErrorMsg('');
            }}
            disabled={isLoading}
            autoFocus
            style={{
              width: '100%',
              fontSize: '14.5px',
              padding: '12px 14px',
              background: '#FFFFFF',
              color: '#2B211D',
              border: '1px solid #DDD0C2',
              borderRadius: '10px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <div
            style={{
              marginTop: '14px',
              marginBottom: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#2B211D',
            }}
          >
            <span>{language === 'en' ? 'Password' : 'Mật khẩu'}</span>
            <div style={{ display: 'flex', gap: '14px', fontSize: '12px', fontWeight: 500 }}>
              <span
                style={{ color: '#6E5A4E', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword
                  ? (language === 'en' ? 'Hide password' : 'Ẩn mật khẩu')
                  : (language === 'en' ? 'Show password' : 'Hiện mật khẩu')}
              </span>
              <span
                style={{ color: '#A1342C', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => {
                  setErrorMsg('');
                  setIsForgotOpen(true);
                }}
              >
                {language === 'en' ? 'Forgot password?' : 'Quên mật khẩu?'}
              </span>
            </div>
          </div>

          <input
            className="inp focus"
            type={showPassword ? 'text' : 'password'}
            placeholder={language === 'en' ? 'Enter your password' : 'Nhập mật khẩu của bạn'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrorMsg('');
            }}
            disabled={isLoading}
            style={{
              width: '100%',
              fontSize: '14.5px',
              padding: '12px 14px',
              background: '#FFFFFF',
              color: '#2B211D',
              border: '1px solid #DDD0C2',
              borderRadius: '10px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Primary Action Button */}
          <div style={{ marginTop: '22px' }}>
            <button
              type="submit"
              className="btn main"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15.5px',
                fontWeight: 600,
                letterSpacing: '.03em',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #A1342C, #7F221B)',
                color: '#FFFFFF',
                border: 'none',
                boxShadow: '0 8px 24px rgba(161, 52, 44, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
              disabled={isLoading}
            >
              <span>
                {isLoading
                  ? (language === 'en' ? 'Opening museum doors...' : 'Đang mở cánh cửa bảo tàng...')
                  : (language === 'en' ? 'Enter the museum' : 'Bước vào bảo tàng')}
              </span>
              {!isLoading && <span>→</span>}
            </button>
          </div>
        </form>

        {/* Registration Prompt */}
        <div style={{ marginTop: '18px', fontSize: '13.5px', color: '#6E5A4E' }}>
          {language === 'en' ? "Don't have an account? " : 'Chưa có tài khoản? '}
          <b
            style={{ color: '#A1342C', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => {
              setErrorMsg('');
              setIsRegisterOpen(true);
            }}
          >
            {language === 'en' ? 'Sign up' : 'Đăng ký ngay'}
          </b>
        </div>
      </div>

      {/* Sub Modals */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegisterSuccess={handleRegisterSuccess}
        onSwitchToLogin={() => setIsRegisterOpen(false)}
      />

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        onBackToLogin={() => setIsForgotOpen(false)}
      />
    </>
  );
}

export default LoginModal;

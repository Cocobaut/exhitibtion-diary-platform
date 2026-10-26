import React, { useState } from 'react';
import { Logo } from '../../components/common/Logo';
import { LobbyScene } from '../Lobby/LobbyScene';
import { Icon } from '../../components/common/Icons';
import { RegisterModal } from './RegisterModal';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function LoginPage({ onLoginSuccess, onExploreGuest }) {
  const { login, enterGuestMode } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const handleGuestEntry = () => {
    if (enterGuestMode) {
      enterGuestMode();
    }
    if (onExploreGuest) {
      onExploreGuest();
    }
  };

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
        ? 'Account created successfully! Please enter your password to enter the museum.'
        : 'Tài khoản tạo thành công. Mời bạn nhập mật khẩu để bước vào bảo tàng.'
    );
  };

  const handleForgotSuccess = ({ username }) => {
    setIsForgotOpen(false);
    setAccount(username);
    setPassword('');
    setErrorMsg('');
    setInfoMsg(
      language === 'en'
        ? 'Password updated successfully! Please sign in with your new password.'
        : 'Đổi mật khẩu thành công. Mời bạn đăng nhập bằng mật khẩu mới.'
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Background Animated Lobby Scene */}
      <div className="stage" style={{ left: 0 }}>
        <LobbyScene />
      </div>

      {/* Atmospheric Glass Scrim */}
      <div
        className="scrim"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(35, 22, 17, 0.45) 0%, rgba(18, 12, 10, 0.82) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />

      {/* Top-Right Language Switcher */}
      <div
        className="glass"
        style={{
          position: 'absolute',
          top: '24px',
          right: '32px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          background: 'rgba(255, 255, 255, 0.22)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          borderRadius: '24px',
          padding: '4px 8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        }}
      >
        <button
          type="button"
          onClick={() => setLanguage('vi')}
          style={{
            background: language === 'vi' ? 'var(--gold)' : 'transparent',
            color: language === 'vi' ? '#2B1810' : '#F3EADD',
            fontWeight: 700,
            fontSize: '12.5px',
            border: 'none',
            borderRadius: '16px',
            padding: '4px 10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          VI
        </button>
        <span style={{ color: 'rgba(243, 234, 221, 0.55)', fontSize: '13px', margin: '0 1px' }}>/</span>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          style={{
            background: language === 'en' ? 'var(--gold)' : 'transparent',
            color: language === 'en' ? '#2B1810' : '#F3EADD',
            fontWeight: 700,
            fontSize: '12.5px',
            border: 'none',
            borderRadius: '16px',
            padding: '4px 10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          EN
        </button>
      </div>

      {/* Center Museum Entrance Card */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '490px',
          maxWidth: '92vw',
          background: 'rgba(245, 238, 228, 0.96)',
          color: 'var(--ink)',
          borderRadius: '24px',
          padding: '38px 42px 32px',
          boxShadow: '0 35px 90px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(212, 176, 106, 0.35)',
          zIndex: 35,
          textAlign: 'center',
          animation: 'popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Museum Monogram */}
        <div style={{ '--logo-c': 'var(--acc)', marginBottom: '8px' }}>
          <Logo />
        </div>

        <div
          style={{
            fontSize: '11px',
            letterSpacing: '.28em',
            fontWeight: 700,
            color: 'var(--gold)',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}
        >
          ✦ {language === 'en' ? 'The Name of Feeling Museum' : 'Bảo tàng Tên của Cảm xúc'} ✦
        </div>

        <h1
          className="serif"
          style={{
            fontSize: '28px',
            margin: '2px 0 6px',
            color: 'var(--ink)',
            letterSpacing: '.02em',
          }}
        >
          {language === 'en' ? 'Museum of Feelings' : 'Bảo Tàng Cảm Xúc'}
        </h1>

        <div
          className="hand"
          style={{
            fontSize: '20px',
            color: 'var(--ink2)',
            marginBottom: '16px',
            lineHeight: 1.4,
          }}
        >
          {language === 'en'
            ? '“Every feeling finds a gentle sanctuary...”'
            : '“Mỗi cảm xúc đều tìm thấy một góc nương náu...”'}
        </div>

        {/* Notifications / Alerts */}
        {infoMsg && (
          <div
            style={{
              background: 'rgba(46, 125, 50, 0.1)',
              border: '1px solid rgba(46, 125, 50, 0.35)',
              color: '#2e7d32',
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
            <span>✦</span> {infoMsg}
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              background: 'rgba(161, 52, 44, 0.1)',
              border: '1px solid rgba(161, 52, 44, 0.35)',
              color: 'var(--acc)',
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
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="fieldl" style={{ display: 'flex', justifyContent: 'space-between' }}>
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
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: '10px',
            }}
          />

          <div className="fieldl" style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{language === 'en' ? 'Password' : 'Mật khẩu'}</span>
            <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
              <span
                style={{ color: 'var(--ink2)', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword
                  ? (language === 'en' ? 'Hide password' : 'Ẩn mật khẩu')
                  : (language === 'en' ? 'Show password' : 'Hiện mật khẩu')}
              </span>
              <span
                style={{ color: 'var(--acc)', cursor: 'pointer', fontWeight: 600 }}
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
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: '10px',
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
                boxShadow: '0 8px 24px rgba(161, 52, 44, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
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

        {/* Secondary Guest Entrance */}
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            className="btn line"
            onClick={handleGuestEntry}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13.5px',
              color: 'var(--ink2)',
              borderColor: 'var(--line)',
              borderRadius: '10px',
              background: 'transparent',
            }}
          >
            {language === 'en' ? '✦ Wander as Guest' : 'Dạo bước tham quan (Khách vãng lai)'}
          </button>
        </div>

        {/* Registration Prompt */}
        <div className="muted" style={{ marginTop: '18px', fontSize: '13.5px' }}>
          {language === 'en' ? "Don't have an account? " : 'Chưa có tài khoản? '}
          <b
            style={{ color: 'var(--acc)', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => {
              setErrorMsg('');
              setIsRegisterOpen(true);
            }}
          >
            {language === 'en' ? 'Sign up' : 'Đăng ký thành viên'}
          </b>
        </div>
      </div>

      {/* Modal Đăng ký tài khoản */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={handleRegisterSuccess}
        onSwitchToLogin={() => setIsRegisterOpen(false)}
      />

      {/* Modal Quên / Khôi phục mật khẩu */}
      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        onSuccess={handleForgotSuccess}
        onSwitchToLogin={() => setIsForgotOpen(false)}
      />
    </div>
  );
}

export default LoginPage;

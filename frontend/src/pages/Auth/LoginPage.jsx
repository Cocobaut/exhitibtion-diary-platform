import React, { useState } from 'react';
import { Logo } from '../../components/common/Logo';
import { LobbyScene } from '../Lobby/LobbyScene';
import { Icon } from '../../components/common/Icons';
import { RegisterModal } from './RegisterModal';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export function LoginPage({ onLoginSuccess, onExploreGuest }) {
  const { login } = useAuth();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  // Quick Preset Accounts for fast evaluation & testing
  const demoAccounts = [
    { label: 'Khách tham quan', user: 'regular_user', pass: 'UserPass123@', role: 'USER', icon: 'user' },
    { label: 'Quản trị viên (An)', user: 'admin_tester', pass: 'AdminPass123@', role: 'ADMIN', icon: 'shield' },
    { label: 'Chủ sở hữu (Owner)', user: 'owner_tester', pass: 'OwnerPass123@', role: 'OWNER', icon: 'crown' },
  ];

  const handleQuickFill = async (demo) => {
    setAccount(demo.user);
    setPassword(demo.pass);
    setErrorMsg('');
    setInfoMsg(`Đã chọn tài khoản mẫu: ${demo.label}`);

    // Auto submit demo login for supreme convenience
    setIsLoading(true);
    try {
      const res = await authService.login({
        account: demo.user,
        password: demo.pass,
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
      console.warn('Demo login error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
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
        setErrorMsg('Tài khoản hoặc mật khẩu không chính xác.');
      } else if (err.errorCode === 'ACCOUNT_LOCKED' || err.status === 403) {
        setErrorMsg('Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên.');
      } else {
        setErrorMsg(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    }
  };

  const handleRegisterSuccess = ({ username }) => {
    setIsRegisterOpen(false);
    setAccount(username);
    setPassword('');
    setErrorMsg('');
    setInfoMsg('Tài khoản tạo thành công. Mời bạn nhập mật khẩu để bước vào bảo tàng.');
  };

  const handleForgotSuccess = ({ username }) => {
    setIsForgotOpen(false);
    setAccount(username);
    setPassword('');
    setErrorMsg('');
    setInfoMsg('Đổi mật khẩu thành công. Mời bạn đăng nhập bằng mật khẩu mới.');
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
          ✦ The Name of Feeling Museum ✦
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
          Bảo Tàng Cảm Xúc
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
          “Mỗi cảm xúc đều tìm thấy một góc nương náu...”
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
            <span>Tên đăng nhập hoặc Email</span>
          </div>
          <input
            className="inp focus"
            placeholder="ví dụ: linh.ng hoặc email@example.com"
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
            <span>Mật khẩu</span>
            <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
              <span
                style={{ color: 'var(--ink2)', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              </span>
              <span
                style={{ color: 'var(--acc)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => {
                  setErrorMsg('');
                  setIsForgotOpen(true);
                }}
              >
                Quên mật khẩu?
              </span>
            </div>
          </div>

          <input
            className="inp focus"
            type={showPassword ? 'text' : 'password'}
            placeholder="Nhập mật khẩu của bạn"
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
              <span>{isLoading ? 'Đang mở cánh cửa bảo tàng...' : 'Bước vào bảo tàng'}</span>
              {!isLoading && <span>→</span>}
            </button>
          </div>
        </form>

        {/* Secondary Guest Entrance */}
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            className="btn line"
            onClick={onExploreGuest}
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
            Dạo bước tham quan (Khách vãng lai)
          </button>
        </div>

        {/* Quick Demo Accounts Helper Strip */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px dashed var(--line)',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: 'var(--ink2)',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>✦</span>
            <span>Trải nghiệm nhanh theo vai trò:</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {demoAccounts.map((d) => (
              <button
                key={d.user}
                type="button"
                onClick={() => handleQuickFill(d)}
                style={{
                  background: 'var(--paper2)',
                  border: '1px solid var(--line)',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--acc)';
                  e.currentTarget.style.background = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.background = 'var(--paper2)';
                }}
              >
                <span>{d.role === 'OWNER' ? '👑' : d.role === 'ADMIN' ? '🛡️' : '👤'}</span>
                <b>{d.label}</b>
              </button>
            ))}
          </div>
        </div>

        {/* Registration Prompt */}
        <div className="muted" style={{ marginTop: '18px', fontSize: '13.5px' }}>
          Chưa có tài khoản?{' '}
          <b
            style={{ color: 'var(--acc)', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => {
              setErrorMsg('');
              setIsRegisterOpen(true);
            }}
          >
            Đăng ký thành viên
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

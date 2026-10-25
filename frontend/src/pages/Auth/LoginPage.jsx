import React, { useState } from 'react';
import { Logo } from '../../components/common/Logo';
import { LobbyScene } from '../Lobby/LobbyScene';

export function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('linh.ng');
  const [password, setPassword] = useState('••••••••');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLoginSuccess && onLoginSuccess({ username });
  };

  return (
    <>
      <div className="stage" style={{ left: 0 }}>
        <LobbyScene />
      </div>

      <div
        className="scrim"
        style={{ background: 'rgba(30,20,16,.45)', backdropFilter: 'blur(6px)' }}
      />

      <div className="panel" style={{ width: '460px', textAlign: 'center' }}>
        <div style={{ '--logo-c': 'var(--acc)' }}>
          <Logo />
        </div>

        <div
          className="hand"
          style={{ fontSize: '22px', color: 'var(--ink2)', margin: '14px 0 4px' }}
        >
          mời bạn vào bảo tàng
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="fieldl">Tên đăng nhập hoặc email</div>
          <input
            className="inp"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <div className="fieldl">
            Mật khẩu <span style={{ color: 'var(--acc)', cursor: 'pointer' }}>Quên mật khẩu?</span>
          </div>
          <input
            className="inp"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div style={{ marginTop: '20px' }}>
            <button type="submit" className="btn main" style={{ width: '100%' }}>
              Bước vào bảo tàng
            </button>
          </div>
        </form>

        <div className="muted" style={{ marginTop: '14px' }}>
          Chưa có tài khoản?{' '}
          <b style={{ color: 'var(--acc)', cursor: 'pointer' }}>Đăng ký</b>
        </div>
      </div>
    </>
  );
}

export default LoginPage;

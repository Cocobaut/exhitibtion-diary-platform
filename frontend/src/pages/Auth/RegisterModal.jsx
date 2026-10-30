import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { authService } from '../../services/authService';

export function RegisterModal({ isOpen, onClose, onSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    nickname: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMsg('');
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    const usernameRegex = /^[A-Za-z0-9_]{3,50}$/;
    if (!formData.username.trim()) {
      errors.username = 'Vui lòng nhập tên đăng nhập';
    } else if (!usernameRegex.test(formData.username.trim())) {
      errors.username = 'Dùng 3–50 ký tự: chữ, số hoặc dấu _';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Vui lòng nhập email';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Email không hợp lệ';
    }

    if (formData.nickname && formData.nickname.trim().length > 50) {
      errors.nickname = 'Biệt danh tối đa 50 ký tự';
    }

    if (!formData.password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 8) {
      errors.password = 'Mật khẩu cần tối thiểu 8 ký tự';
    } else {
      const hasUpper = /[A-Z]/.test(formData.password);
      const hasLower = /[a-z]/.test(formData.password);
      const hasDigit = /[0-9]/.test(formData.password);
      const hasSpecial = /[^A-Za-z0-9]/.test(formData.password);
      if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
        errors.password = 'Cần có chữ hoa, chữ thường, số và ký tự đặc biệt (như @ # $)';
      }
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        nickname: formData.nickname.trim() || undefined,
      };

      const result = await authService.register(payload);
      setIsLoading(false);
      onSuccess && onSuccess({
        username: formData.username.trim(),
        email: formData.email.trim(),
        user: result,
      });
    } catch (err) {
      setIsLoading(false);
      if (err.errorCode === 'WEAK_PASSWORD') {
        setErrorMsg('Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt');
      } else if (err.errorCode === 'USERNAME_TAKEN') {
        setErrorMsg('Tên đăng nhập này đã có người dùng');
      } else if (err.errorCode === 'EMAIL_TAKEN') {
        setErrorMsg('Email này đã được đăng ký');
      } else {
        setErrorMsg(err.message || 'Chưa tạo được tài khoản, bạn thử lại nhé.');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} style={{ width: '480px', maxWidth: '95vw' }}>
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <h2 className="serif" style={{ fontSize: '28px', color: 'var(--ink)' }}>
          Đăng ký tài khoản
        </h2>
        <div className="hand" style={{ fontSize: '18px', color: 'var(--ink2)', marginTop: '4px' }}>
          chỉ mất một phút thôi
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            background: 'rgba(161, 52, 44, 0.12)',
            border: '1px solid var(--acc)',
            color: 'var(--acc)',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '14px',
            marginBottom: '16px',
            textAlign: 'left',
          }}
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
        <div>
          <div className="fieldl">
            <span>Tên đăng nhập *</span>
            {fieldErrors.username && (
              <span style={{ color: 'var(--acc)', fontSize: '12px' }}>{fieldErrors.username}</span>
            )}
          </div>
          <input
            className="inp"
            placeholder="ví dụ: linh_ng"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            disabled={isLoading}
            autoFocus
          />
        </div>

        <div>
          <div className="fieldl">
            <span>Email *</span>
            {fieldErrors.email && (
              <span style={{ color: 'var(--acc)', fontSize: '12px' }}>{fieldErrors.email}</span>
            )}
          </div>
          <input
            type="email"
            className="inp"
            placeholder="linh@example.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <div className="fieldl">
            <span>Tên hiển thị (không bắt buộc)</span>
            {fieldErrors.nickname && (
              <span style={{ color: 'var(--acc)', fontSize: '12px' }}>{fieldErrors.nickname}</span>
            )}
          </div>
          <input
            className="inp"
            placeholder="ví dụ: Linh Thơ Thẩn"
            value={formData.nickname}
            onChange={(e) => handleChange('nickname', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <div className="fieldl">
            <span>Mật khẩu *</span>
            <span
              style={{ color: 'var(--acc)', cursor: 'pointer', fontSize: '12px' }}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            </span>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            className="inp"
            placeholder="Ít nhất 8 ký tự, ví dụ: Linh@2026"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            disabled={isLoading}
          />
          {fieldErrors.password && (
            <div style={{ color: 'var(--acc)', fontSize: '12px', marginTop: '4px' }}>
              {fieldErrors.password}
            </div>
          )}
        </div>

        <div>
          <div className="fieldl">
            <span>Xác nhận mật khẩu *</span>
            {fieldErrors.confirmPassword && (
              <span style={{ color: 'var(--acc)', fontSize: '12px' }}>{fieldErrors.confirmPassword}</span>
            )}
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            className="inp"
            placeholder="Nhập lại mật khẩu"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div style={{ marginTop: '22px' }}>
          <button
            type="submit"
            className="btn main"
            style={{ width: '100%', padding: '12px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>

      <div className="muted" style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
        Đã có tài khoản?{' '}
        <b
          style={{ color: 'var(--acc)', cursor: 'pointer' }}
          onClick={() => {
            onClose();
            onSwitchToLogin && onSwitchToLogin();
          }}
        >
          Đăng nhập ngay
        </b>
      </div>
    </Modal>
  );
}

export default RegisterModal;

import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { authService } from '../../services/authService';

export function ForgotPasswordModal({ isOpen, onClose, onSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMsg('');
    setSuccessMsg('');
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.username.trim()) {
      errors.username = 'Vui lòng nhập tên đăng nhập';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Vui lòng nhập email đăng ký';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Email không hợp lệ';
    }

    if (!formData.new_password) {
      errors.new_password = 'Vui lòng nhập mật khẩu mới';
    } else if (formData.new_password.length < 8) {
      errors.new_password = 'Mật khẩu cần tối thiểu 8 ký tự';
    } else {
      const hasUpper = /[A-Z]/.test(formData.new_password);
      const hasLower = /[a-z]/.test(formData.new_password);
      const hasDigit = /[0-9]/.test(formData.new_password);
      const hasSpecial = /[^A-Za-z0-9]/.test(formData.new_password);
      if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
        errors.new_password = 'Cần đủ chữ hoa, chữ thường, chữ số và ký tự đặc biệt';
      }
    }

    if (formData.new_password !== formData.confirm_password) {
      errors.confirm_password = 'Mật khẩu xác nhận không khớp';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        new_password: formData.new_password,
      };

      const res = await authService.changePassword(payload);
      setIsLoading(false);
      setSuccessMsg(res?.message || 'Đổi mật khẩu thành công. Mời bạn đăng nhập bằng mật khẩu mới.');

      setTimeout(() => {
        onSuccess && onSuccess({ username: formData.username.trim() });
      }, 1500);
    } catch (err) {
      setIsLoading(false);
      if (err.errorCode === 'INVALID_CREDENTIALS') {
        setErrorMsg('Tài khoản hoặc email không chính xác');
      } else if (err.errorCode === 'ACCOUNT_LOCKED') {
        setErrorMsg('Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên');
      } else if (err.errorCode === 'WEAK_PASSWORD') {
        setErrorMsg('Mật khẩu mới cần tối thiểu 8 ký tự gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt');
      } else {
        setErrorMsg(err.message || 'Đã có lỗi xảy ra khi khôi phục mật khẩu.');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} style={{ width: '460px', maxWidth: '95vw' }}>
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <h2 className="serif" style={{ fontSize: '28px', color: 'var(--ink)' }}>
          Khôi phục mật khẩu
        </h2>
        <div className="hand" style={{ fontSize: '18px', color: 'var(--ink2)', marginTop: '4px' }}>
          xác nhận thông tin để đặt lại mật khẩu mới
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

      {successMsg && (
        <div
          style={{
            background: 'rgba(56, 142, 60, 0.12)',
            border: '1px solid #388e3c',
            color: '#2e7d32',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '14px',
            marginBottom: '16px',
            textAlign: 'left',
          }}
        >
          {successMsg}
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
            disabled={isLoading || Boolean(successMsg)}
            autoFocus
          />
        </div>

        <div>
          <div className="fieldl">
            <span>Email đã đăng ký *</span>
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
            disabled={isLoading || Boolean(successMsg)}
          />
        </div>

        <div>
          <div className="fieldl">
            <span>Mật khẩu mới *</span>
            <span
              style={{ color: 'var(--acc)', cursor: 'pointer', fontSize: '12px' }}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? 'Ẩn' : 'Hiện'}
            </span>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            className="inp"
            placeholder="Tối thiểu 8 ký tự (Hoa, Thường, Số, Ký tự đặc biệt)"
            value={formData.new_password}
            onChange={(e) => handleChange('new_password', e.target.value)}
            disabled={isLoading || Boolean(successMsg)}
          />
          {fieldErrors.new_password && (
            <div style={{ color: 'var(--acc)', fontSize: '12px', marginTop: '4px' }}>
              {fieldErrors.new_password}
            </div>
          )}
        </div>

        <div>
          <div className="fieldl">
            <span>Xác nhận mật khẩu mới *</span>
            {fieldErrors.confirm_password && (
              <span style={{ color: 'var(--acc)', fontSize: '12px' }}>{fieldErrors.confirm_password}</span>
            )}
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            className="inp"
            placeholder="Nhập lại mật khẩu mới"
            value={formData.confirm_password}
            onChange={(e) => handleChange('confirm_password', e.target.value)}
            disabled={isLoading || Boolean(successMsg)}
          />
        </div>

        <div style={{ marginTop: '22px' }}>
          <button
            type="submit"
            className="btn main"
            style={{ width: '100%', padding: '12px' }}
            disabled={isLoading || Boolean(successMsg)}
          >
            {isLoading ? 'Đang cập nhật mật khẩu...' : 'Đặt lại mật khẩu'}
          </button>
        </div>
      </form>

      <div className="muted" style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
        Đã nhớ mật khẩu?{' '}
        <b
          style={{ color: 'var(--acc)', cursor: 'pointer' }}
          onClick={() => {
            onClose();
            onSwitchToLogin && onSwitchToLogin();
          }}
        >
          Quay lại Đăng nhập
        </b>
      </div>
    </Modal>
  );
}

export default ForgotPasswordModal;

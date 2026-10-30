import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { authService } from '../../services/authService';

/**
 * Quên mật khẩu, 2 bước:
 * - Không có resetToken: nhập email để nhận link đặt lại.
 * - Có resetToken (mở từ link trong email): nhập mật khẩu mới.
 */
export function ForgotPasswordModal({ isOpen, onClose, onSuccess, onSwitchToLogin, resetToken }) {
  const isResetStep = Boolean(resetToken);
  const [formData, setFormData] = useState({
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
    if (!isResetStep) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email.trim()) {
        errors.email = 'Vui lòng nhập email đăng ký';
      } else if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Email không hợp lệ';
      }
      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
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
        errors.new_password = 'Cần có chữ hoa, chữ thường, số và ký tự đặc biệt (như @ # $)';
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
      if (!isResetStep) {
        const res = await authService.forgotPassword({ email: formData.email.trim() });
        setIsLoading(false);
        setSuccessMsg(res?.message || 'Nếu email này đã đăng ký, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.');
        return;
      }

      const res = await authService.resetPassword({ token: resetToken, new_password: formData.new_password });
      setIsLoading(false);
      setSuccessMsg(res?.message || 'Đổi mật khẩu thành công. Mời bạn đăng nhập bằng mật khẩu mới.');

      setTimeout(() => {
        onSuccess && onSuccess();
      }, 1500);
    } catch (err) {
      setIsLoading(false);
      if (err.errorCode === 'INVALID_RESET_TOKEN') {
        setErrorMsg('Link đã hết hạn hoặc đã được dùng. Hãy yêu cầu link mới nhé.');
      } else if (err.errorCode === 'TOO_MANY_ATTEMPTS') {
        setErrorMsg('Bạn đã yêu cầu quá nhiều lần. Hãy thử lại sau ít phút.');
      } else if (err.errorCode === 'ACCOUNT_LOCKED') {
        setErrorMsg('Tài khoản đang bị khoá. Hãy liên hệ ban quản trị.');
      } else if (err.errorCode === 'WEAK_PASSWORD') {
        setErrorMsg('Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt');
      } else {
        setErrorMsg(err.message || 'Có lỗi xảy ra, bạn thử lại nhé.');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} style={{ width: '460px', maxWidth: '95vw' }}>
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <h2 className="serif" style={{ fontSize: '28px', color: 'var(--ink)' }}>
          Đặt lại mật khẩu
        </h2>
        <div className="hand" style={{ fontSize: '18px', color: 'var(--ink2)', marginTop: '4px' }}>
          {isResetStep ? 'chọn một mật khẩu mới' : 'nhập email bạn đã dùng để đăng ký'}
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
        {!isResetStep && (
          <>
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
            autoFocus
          />
        </div>

          </>
        )}

        {isResetStep && (
          <>
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
            placeholder="Ít nhất 8 ký tự, ví dụ: Linh@2026"
            value={formData.new_password}
            onChange={(e) => handleChange('new_password', e.target.value)}
            disabled={isLoading || Boolean(successMsg)}
            autoFocus
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

          </>
        )}

        <div style={{ marginTop: '22px' }}>
          <button
            type="submit"
            className="btn main"
            style={{ width: '100%', padding: '12px' }}
            disabled={isLoading || Boolean(successMsg)}
          >
            {isLoading
              ? (isResetStep ? 'Đang lưu...' : 'Đang gửi...')
              : (isResetStep ? 'Lưu mật khẩu mới' : 'Gửi link đặt lại')}
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

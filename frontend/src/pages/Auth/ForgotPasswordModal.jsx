import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { authService } from '../../services/authService';

/**
 * Quên mật khẩu theo luồng trực tiếp:
 * 1. Nhập Tên đăng nhập (username) + Email đã đăng ký.
 * 2. Tìm trong database, nếu khớp -> Trả về hợp lệ và hiển thị 2 ô nhập mật khẩu mới ngay phía dưới.
 * 3. Nếu 2 ô có cùng giá trị và hợp lệ -> Cập nhật mật khẩu cho user, admin, owner.
 */
export function ForgotPasswordModal({ isOpen, onClose, onSuccess, onSwitchToLogin, resetToken }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    new_password: '',
    confirm_password: '',
  });
  const [isVerified, setIsVerified] = useState(Boolean(resetToken));
  const [activeToken, setActiveToken] = useState(resetToken || '');
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

  const validateVerificationStep = () => {
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
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordStep = () => {
    const errors = {};
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

  const handleVerifyAccount = async (e) => {
    e.preventDefault();
    if (!validateVerificationStep()) return;

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await authService.forgotPassword({
        username: formData.username.trim(),
        email: formData.email.trim(),
      });
      setIsLoading(false);
      if (res && res.reset_token) {
        setActiveToken(res.reset_token);
        setIsVerified(true);
        setSuccessMsg('Thông tin tài khoản chính xác! Vui lòng nhập mật khẩu mới phía dưới.');
      } else {
        setErrorMsg('Không thể xác thực thông tin. Vui lòng thử lại.');
      }
    } catch (err) {
      setIsLoading(false);
      if (err.errorCode === 'INVALID_CREDENTIALS') {
        setErrorMsg('Tên đăng nhập hoặc email không chính xác.');
      } else if (err.errorCode === 'ACCOUNT_LOCKED') {
        setErrorMsg('Tài khoản của bạn đang bị khóa. Hãy liên hệ quản trị viên.');
      } else if (err.errorCode === 'TOO_MANY_ATTEMPTS') {
        setErrorMsg('Bạn đã thử quá nhiều lần. Hãy đợi một ít phút rồi thử lại.');
      } else {
        setErrorMsg(err.message || 'Tên đăng nhập hoặc email không chính xác.');
      }
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validatePasswordStep()) return;

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await authService.resetPassword({
        token: activeToken,
        new_password: formData.new_password,
      });
      setIsLoading(false);
      setSuccessMsg(res?.message || 'Đổi mật khẩu thành công. Mời bạn đăng nhập bằng mật khẩu mới.');

      setTimeout(() => {
        onSuccess && onSuccess();
        onClose && onClose();
        onSwitchToLogin && onSwitchToLogin();
      }, 1500);
    } catch (err) {
      setIsLoading(false);
      if (err.errorCode === 'INVALID_RESET_TOKEN') {
        setErrorMsg('Phiên đặt lại mật khẩu đã hết hạn. Vui lòng xác thực lại từ đầu.');
        setIsVerified(false);
        setActiveToken('');
      } else if (err.errorCode === 'ACCOUNT_LOCKED') {
        setErrorMsg('Tài khoản của bạn đang bị khóa.');
      } else if (err.errorCode === 'WEAK_PASSWORD') {
        setErrorMsg('Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.');
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
          {isVerified ? 'nhập mật khẩu mới cho tài khoản' : 'nhập tên đăng nhập và email của bạn'}
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

      <form onSubmit={isVerified ? handleResetPassword : handleVerifyAccount} style={{ textAlign: 'left' }}>
        {/* Bước 1: Nhập Tên đăng nhập & Email */}
        <div>
          <div className="fieldl">
            <span>Tên đăng nhập *</span>
            {fieldErrors.username && (
              <span style={{ color: 'var(--acc)', fontSize: '12px' }}>{fieldErrors.username}</span>
            )}
          </div>
          <input
            type="text"
            className="inp"
            placeholder="Ví dụ: linh_2026"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            disabled={isLoading || isVerified}
          />
        </div>

        <div style={{ marginTop: '14px' }}>
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
            disabled={isLoading || isVerified}
          />
        </div>

        {/* Bước 2: Hiển thị ngay 2 ô Mật khẩu mới & Xác nhận mật khẩu khi thông tin đúng */}
        {isVerified && (
          <div style={{ marginTop: '16px', borderTop: '1px dashed var(--line, #e2dcd5)', paddingTop: '16px' }}>
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
                disabled={isLoading || (successMsg && successMsg.includes('Đổi mật khẩu thành công'))}
              />
              {fieldErrors.new_password && (
                <div style={{ color: 'var(--acc)', fontSize: '12px', marginTop: '4px' }}>
                  {fieldErrors.new_password}
                </div>
              )}
            </div>

            <div style={{ marginTop: '14px' }}>
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
                disabled={isLoading || (successMsg && successMsg.includes('Đổi mật khẩu thành công'))}
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: '22px' }}>
          <button
            type="submit"
            className="btn main"
            style={{ width: '100%', padding: '12px' }}
            disabled={isLoading || (successMsg && successMsg.includes('Đổi mật khẩu thành công'))}
          >
            {isLoading
              ? (isVerified ? 'Đang cập nhật mật khẩu...' : 'Đang kiểm tra tài khoản...')
              : (isVerified ? 'Cập nhật mật khẩu' : 'Xác thực tài khoản')}
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

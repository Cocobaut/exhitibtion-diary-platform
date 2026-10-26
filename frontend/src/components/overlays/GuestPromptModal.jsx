import React, { useEffect } from 'react';
import { Icon } from '../common/Icons';

export function GuestPromptModal({
  isOpen,
  onClose,
  featureName = 'tính năng này',
  onGoToLogin,
}) {
  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Nền mờ kính scrim */}
      <div
        className="scrim"
        style={{
          background: 'rgba(20, 10, 12, 0.55)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          zIndex: 120,
        }}
        onClick={onClose}
      />

      {/* Hộp thoại thông báo */}
      <div
        className="modal glass"
        role="dialog"
        aria-modal="true"
        style={{
          zIndex: 121,
          maxWidth: '460px',
          width: '90%',
          padding: '28px 26px 24px',
          borderRadius: '20px',
          background: 'var(--paper)',
          color: 'var(--ink)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          border: '1px solid var(--line)',
          textAlign: 'center',
          animation: 'popIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng hộp thoại"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--ink2)',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '18px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        {/* Biểu tượng ngọn đèn / ổ khóa nhỏ nghệ thuật */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(161, 52, 44, 0.12)',
            color: 'var(--acc)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px',
            fontSize: '24px',
            border: '1px solid rgba(161, 52, 44, 0.25)',
          }}
        >
          <span>🏮</span>
        </div>

        {/* Huy hiệu nhỏ */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--acc)',
            marginBottom: '8px',
          }}
        >
          ✦ Dành cho thành viên bảo tàng
        </div>

        {/* Tiêu đề */}
        <h3
          style={{
            fontSize: '20px',
            fontWeight: 700,
            marginBottom: '10px',
            color: 'var(--ink)',
            lineHeight: 1.35,
          }}
        >
          Bạn đang dạo bước với tư cách Khách vãng lai
        </h3>

        {/* Mô tả chi tiết lý do chặn */}
        <p
          style={{
            fontSize: '14px',
            lineHeight: 1.6,
            color: 'var(--ink2)',
            marginBottom: '22px',
          }}
        >
          Để <strong style={{ color: 'var(--ink)' }}>{featureName}</strong>, lưu giữ kỷ niệm và kết nối trọn vẹn cùng bảo tàng, mời bạn đăng nhập hoặc tạo một góc nhỏ của riêng mình.
        </p>

        {/* Cụm nút thao tác */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <button
            type="button"
            className="btn main"
            style={{
              width: '100%',
              padding: '12px 18px',
              fontSize: '14.5px',
              borderRadius: '12px',
              justifyContent: 'center',
            }}
            onClick={() => {
              onClose();
              if (onGoToLogin) onGoToLogin();
            }}
          >
            Đăng nhập ngay →
          </button>

          <button
            type="button"
            className="btn line"
            style={{
              width: '100%',
              padding: '10px 18px',
              fontSize: '13.5px',
              borderRadius: '12px',
              justifyContent: 'center',
              color: 'var(--ink2)',
              borderColor: 'var(--line)',
            }}
            onClick={onClose}
          >
            Tiếp tục dạo bước
          </button>
        </div>
      </div>
    </>
  );
}

export default GuestPromptModal;

import React from 'react';
import { Icon } from '../../components/common/Icons';

export function ConfirmSubmitModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="panel" style={{ width: '560px', textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#FBF0DD',
            color: 'var(--acc)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 12px',
          }}
        >
          <Icon name="r1" size={30} />
        </div>
        <h2 style={{ fontSize: '28px' }}>Bạn có chắc chắn muốn tạo tác phẩm?</h2>
        <div className="muted" style={{ fontSize: '15.5px', margin: '8px 0 22px' }}>
          Vui lòng đọc kỹ nội dung đã ghi.
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: '12px' }}>
          <button type="button" className="btn line" onClick={onClose}>
            Để mình đọc lại
          </button>
          <button type="button" className="btn main" onClick={onConfirm}>
            Chắc chắn
          </button>
        </div>
      </div>
    </>
  );
}

export default ConfirmSubmitModal;

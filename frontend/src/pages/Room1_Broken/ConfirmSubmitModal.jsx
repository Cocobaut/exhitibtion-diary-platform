import React from 'react';
import { Icon } from '../../components/common/Icons';
import { useLanguage } from '../../context/LanguageContext';

export function ConfirmSubmitModal({ isOpen, onClose, onConfirm, isSubmitting = false, errorMsg = '' }) {
  const { language } = useLanguage();
  if (!isOpen) return null;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="panel" style={{ width: '540px', maxWidth: '92vw', textAlign: 'center' }}>
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
        <h2 className="serif" style={{ fontSize: '28px', color: 'var(--ink)' }}>
          {language === 'en' ? 'Are you sure you want to submit your artwork?' : 'Bạn có chắc chắn muốn tạo tác phẩm?'}
        </h2>
        <div className="muted" style={{ fontSize: '15px', margin: '8px 0 20px', lineHeight: 1.5 }}>
          {language === 'en'
            ? 'Please review your story carefully. Once submitted, it will enter the curation and illustration queue.'
            : 'Vui lòng kiểm tra kỹ nội dung đã viết. Tác phẩm sau khi gửi sẽ được đưa vào hàng đợi kiểm duyệt và minh họa.'}
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(161, 52, 44, 0.12)',
              border: '1px solid var(--acc)',
              color: 'var(--acc)',
              padding: '9px 12px',
              borderRadius: '10px',
              fontSize: '13.5px',
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            {errorMsg}
          </div>
        )}

        <div className="row" style={{ justifyContent: 'center', gap: '12px' }}>
          <button type="button" className="btn line" onClick={onClose} disabled={isSubmitting}>
            {language === 'en' ? 'Let me review' : 'Để mình đọc lại'}
          </button>
          <button type="button" className="btn main" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting
              ? (language === 'en' ? 'Submitting artwork...' : 'Đang gửi tác phẩm...')
              : (language === 'en' ? 'Confirm' : 'Chắc chắn')}
          </button>
        </div>
      </div>
    </>
  );
}

export default ConfirmSubmitModal;

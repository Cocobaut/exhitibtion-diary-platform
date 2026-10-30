import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export function ArtworkPreparedModal({ isOpen, onClose, onViewMyArtworks }) {
  const { language } = useLanguage();
  if (!isOpen) return null;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="panel" style={{ width: '580px', textAlign: 'center' }}>
        <svg
          width="90"
          height="90"
          viewBox="0 0 90 90"
          style={{ display: 'block', margin: '0 auto 10px' }}
        >
          <circle cx="45" cy="45" r="44" fill="#FBF0DD" />
          <rect x="25" y="22" width="40" height="46" fill="none" stroke="#A1342C" strokeWidth="2.5" />
          <path
            d="M31 58 l9-11 6 7 5-5 8 9"
            fill="none"
            stroke="#D4B06A"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle className="pulse" cx="56" cy="32" r="4" fill="#D4B06A" />
        </svg>

        <h2 style={{ fontSize: '28px' }}>
          {language === 'en' ? 'Got it!' : 'Đã nhận được rồi!'}
        </h2>
        <div className="muted" style={{ fontSize: '15.5px', margin: '8px 0 22px' }}>
          {language === 'en'
            ? 'We will notify you in your mailbox once your artwork is illustrated and exhibited.'
            : 'Khi tranh vẽ xong, bạn sẽ nhận được thông báo.'}
        </div>

        <div className="row" style={{ justifyContent: 'center', gap: '12px' }}>
          <button type="button" className="btn line" onClick={onViewMyArtworks}>
            {language === 'en' ? 'View my artworks' : 'Xem tác phẩm của tôi'}
          </button>
          <button type="button" className="btn main" onClick={onClose}>
            {language === 'en' ? 'Back to gallery' : 'Về phòng triển lãm'}
          </button>
        </div>
      </div>
    </>
  );
}

export default ArtworkPreparedModal;

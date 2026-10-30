import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Nút nhỏ "Xem bản dịch / Xem bản gốc" dưới nội dung người dùng.
 * Không hiển thị gì khi bài chưa có bản dịch sang ngôn ngữ đang chọn.
 */
export function TranslationToggle({ hasTranslation, showTranslation, onToggle, style }) {
  const { language } = useLanguage();
  if (!hasTranslation) return null;

  const label = showTranslation
    ? (language === 'en' ? 'See original' : 'Xem bản gốc')
    : (language === 'en' ? 'See translation' : 'Xem bản dịch');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--ink2)', ...style }}>
      {showTranslation && (
        <span>{language === 'en' ? 'Translated by the museum team ·' : 'Bản dịch của ban quản trị ·'}</span>
      )}
      <button
        type="button"
        onClick={onToggle}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          color: 'var(--acc)',
          textDecoration: 'underline',
          cursor: 'pointer',
          font: 'inherit',
        }}
      >
        {label}
      </button>
    </div>
  );
}

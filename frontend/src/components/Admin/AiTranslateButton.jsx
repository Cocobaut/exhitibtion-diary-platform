import React, { useState } from 'react';
import { aiCopilotService } from '../../services/aiCopilotService';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Nhờ AI dịch nháp bản gốc sang ngôn ngữ còn lại rồi điền vào ô bản dịch.
 * Admin vẫn đọc lại và sửa trước khi lưu; bản gốc của tác giả không bị đụng tới.
 */
export function AiTranslateButton({ originalLanguage, source, onTranslated, onError }) {
  const { language } = useLanguage();
  const [isTranslating, setIsTranslating] = useState(false);

  const sourceLang = originalLanguage === 'en' ? 'en' : 'vi';
  const targetLang = sourceLang === 'en' ? 'vi' : 'en';
  const hasSource = Object.values(source || {}).some((v) => v && v.trim());

  const handleClick = async () => {
    setIsTranslating(true);
    try {
      const res = await aiCopilotService.translateContent({ source_lang: sourceLang, target_lang: targetLang, ...source });
      onTranslated(res?.data || res, targetLang);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        (language === 'en' ? 'AI could not translate right now.' : 'AI chưa dịch được lúc này.');
      if (onError) onError(msg);
    } finally {
      setIsTranslating(false);
    }
  };

  const targetName = targetLang === 'en'
    ? (language === 'en' ? 'English' : 'tiếng Anh')
    : (language === 'en' ? 'Vietnamese' : 'tiếng Việt');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
      <button
        type="button"
        className="btn ghost"
        onClick={handleClick}
        disabled={isTranslating || !hasSource}
        style={{ fontSize: '13px' }}
      >
        {isTranslating
          ? (language === 'en' ? 'Translating...' : 'Đang dịch...')
          : (language === 'en' ? `✦ Translate to ${targetName} with AI` : `✦ Dịch sang ${targetName} bằng AI`)}
      </button>
      <span style={{ fontSize: '12.5px', color: 'var(--ink2)' }}>
        {language === 'en'
          ? `Original is in ${sourceLang === 'en' ? 'English' : 'Vietnamese'}. Translation is optional; please review it before saving.`
          : `Bài gốc viết bằng ${sourceLang === 'en' ? 'tiếng Anh' : 'tiếng Việt'}. Bản dịch không bắt buộc, nhớ đọc lại trước khi lưu.`}
      </span>
    </div>
  );
}

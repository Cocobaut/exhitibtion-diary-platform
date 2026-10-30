import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function SubmitArtworkModal({ isOpen, onClose, onSubmit }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [title, setTitle] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [summary, setSummary] = useState('');
  const [story, setStory] = useState('');
  const [errors, setErrors] = useState({});

  const accountNickname = user?.nickname || user?.username || (language === 'en' ? 'Author' : 'Tác giả');
  const displayPenName = isAnonymous ? (language === 'en' ? 'Anonymous' : 'Ẩn danh') : accountNickname;

  const extractFirstSentence = (text) => {
    if (!text) return '';
    const trimmed = text.trim();
    // Tách theo dấu kết thúc câu (. ! ? hoặc xuống dòng \n)
    const match = trimmed.match(/^[^.!?\n]+[.!?]?/);
    let sentence = match ? match[0].trim() : trimmed;
    if (sentence.length > 120) {
      sentence = sentence.slice(0, 117) + '...';
    }
    return sentence;
  };

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!title.trim() || title.trim().length < 3) {
      errs.title = language === 'en' ? 'Title must be at least 3 characters' : 'Tiêu đề cần ít nhất 3 ký tự';
    } else if (title.trim().length > 150) {
      errs.title = language === 'en' ? 'Title cannot exceed 150 characters' : 'Tiêu đề tối đa 150 ký tự';
    }

    if (summary.trim() && summary.trim().length > 120) {
      errs.summary = language === 'en' ? 'Summary cannot exceed 120 characters' : 'Tóm tắt tối đa 120 ký tự';
    }

    if (!story.trim() || story.trim().length < 30) {
      errs.story = language === 'en' ? 'Story must be at least 30 characters so readers can connect' : 'Viết thêm một chút nhé, ít nhất 30 ký tự';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    const finalSummary = summary.trim() || extractFirstSentence(story);
    onSubmit &&
      onSubmit({
        title: title.trim(),
        summary: finalSummary,
        story: story.trim(),
        isAnonymous,
        penName: displayPenName,
      });
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        className="panel"
        style={{
          width: '1080px',
          maxWidth: '95vw',
          maxHeight: '92vh',
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '34px',
          overflowY: 'auto',
          textAlign: 'left',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        {/* Form Fields */}
        <div>
          <h2 className="serif" style={{ fontSize: '30px', color: 'var(--ink)' }}>
            {language === 'en' ? 'Exhibit Artwork' : 'Trưng bày tác phẩm'}
          </h2>
          <div className="sub" style={{ fontSize: '14.5px', color: 'var(--ink2)', marginBottom: '18px' }}>
            {language === 'en'
              ? 'Recount a setback or failure. Our team will review, illustrate artwork, and hang it on the gallery wall for you.'
              : 'Kể về một lần vấp ngã. Chúng mình sẽ vẽ tranh minh họa và treo lên tường giúp bạn.'}
          </div>

          <div>
            <div className="fieldl">
              <span>{language === 'en' ? 'Title *' : 'Tiêu đề *'}</span>
              {errors.title && <span style={{ color: 'var(--acc)' }}>{errors.title}</span>}
            </div>
            <input
              className="inp"
              placeholder={language === 'en' ? 'e.g. That college entrance exam season' : 'ví dụ: Mùa thi đại học năm ấy'}
              value={title}
              maxLength={150}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: null }));
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '16px',
              alignItems: 'end',
              marginTop: '12px',
            }}
          >
            <div>
              <div className="fieldl">
                <span>{language === 'en' ? 'Shown as' : 'Tên hiển thị'}</span>
                <span style={{ fontSize: '12px', color: 'var(--ink2)' }}>
                  {language === 'en' ? '(from your profile)' : '(lấy từ hồ sơ)'}
                </span>
              </div>
              <input
                className="inp"
                value={displayPenName}
                readOnly
                disabled
                style={{
                  background: 'rgba(0, 0, 0, 0.04)',
                  cursor: 'not-allowed',
                  opacity: 0.85,
                  color: 'var(--ink)',
                }}
                title={language === 'en' ? 'Change it in your profile' : 'Đổi tên này trong phần Hồ sơ'}
              />
            </div>
            <div
              className="row"
              style={{
                height: '46px',
                cursor: 'pointer',
                gap: '8px',
                userSelect: 'none',
              }}
              onClick={() => setIsAnonymous(!isAnonymous)}
            >
              <span className={`tog ${isAnonymous ? 'on' : ''}`} />
              <span className="muted" style={{ color: 'var(--ink)' }}>
                {language === 'en' ? 'Anonymous' : 'Ẩn danh'}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <div className="fieldl">
              <span>{language === 'en' ? 'Short summary' : 'Tóm tắt ngắn'}</span>
              <span style={{ fontSize: '12px', color: 'var(--ink2)' }}>
                {summary.length > 0
                  ? `${summary.length} / 120`
                  : (language === 'en' ? '(Optional)' : '(Không bắt buộc)')}
              </span>
            </div>
            <input
              className="inp"
              placeholder={language === 'en'
                ? 'Leave empty to auto-extract first sentence of your story...'
                : 'Để trống thì mình sẽ lấy câu đầu tiên của câu chuyện'}
              value={summary}
              maxLength={120}
              onChange={(e) => {
                setSummary(e.target.value);
                if (errors.summary) setErrors((prev) => ({ ...prev, summary: null }));
              }}
            />
            {errors.summary && (
              <div style={{ color: 'var(--acc)', fontSize: '12px', marginTop: '4px' }}>
                {errors.summary}
              </div>
            )}
          </div>

          <div style={{ marginTop: '12px' }}>
            <div className="fieldl">
              <span>{language === 'en' ? 'Your story *' : 'Câu chuyện của bạn *'}</span>
              <span>{story.length} {language === 'en' ? 'characters' : 'ký tự'}</span>
            </div>
            <textarea
              className="inp area focus"
              style={{ minHeight: '160px', fontFamily: 'var(--book)' }}
              placeholder={language === 'en'
                ? 'Detail what you went through, how you felt at that moment, and how you kept moving forward...'
                : 'Chuyện gì đã xảy ra? Lúc đó bạn cảm thấy thế nào?'}
              value={story}
              onChange={(e) => {
                setStory(e.target.value);
                if (errors.story) setErrors((prev) => ({ ...prev, story: null }));
              }}
            />
            {errors.story && (
              <div style={{ color: 'var(--acc)', fontSize: '12px', marginTop: '4px' }}>
                {errors.story}
              </div>
            )}
          </div>

          <div
            className="row between"
            style={{
              marginTop: '20px',
              borderTop: '1px solid var(--line)',
              paddingTop: '16px',
            }}
          >
            <span
              className="muted"
              style={{
                maxWidth: '420px',
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                fontSize: '12.5px',
              }}
            >
              <Icon name="shield" size={15} />
              {language === 'en'
                ? 'All artworks are reviewed by our curatorial team to remove identifying details before exhibition.'
                : 'Chúng mình sẽ đọc và ẩn thông tin cá nhân trước khi trưng bày.'}
            </span>
            <span className="row" style={{ gap: '10px' }}>
              <button type="button" className="btn line" onClick={onClose}>
                {language === 'en' ? 'Cancel' : 'Huỷ'}
              </button>
              <button type="button" className="btn main" onClick={handleNext}>
                {language === 'en' ? 'Exhibit' : 'Trưng bày'}
              </button>
            </span>
          </div>
        </div>

        {/* Right Preview Card */}
        <div style={{ paddingTop: '24px' }}>
          <div className="muted" style={{ marginBottom: '10px', fontSize: '13.5px' }}>
            {language === 'en' ? 'Preview' : 'Xem trước'}
          </div>
          <div style={{ '--paper': '#F3EADD' }}>
            <article className="work pending">
              <div className="art">
                <div>
                  <Icon name="image" size={26} />
                  <div style={{ marginTop: '6px' }}>
                    {language === 'en' ? 'Illustration coming soon' : 'Tranh đang được vẽ'}
                  </div>
                </div>
              </div>
              <div className="cap">
                <h4>{title || (language === 'en' ? 'Artwork Title' : 'Tiêu đề tác phẩm')}</h4>
                <p>
                  {summary.trim() ||
                    extractFirstSentence(story) ||
                    (language === 'en' ? 'Summary of your story...' : 'Tóm tắt câu chuyện của bạn...')}
                </p>
                <div className="meta">
                  <span className="badge b-wait">
                    <Icon name="clock" size={13} /> {language === 'en' ? 'Being prepared' : 'Đang được chuẩn bị'}
                  </span>
                  <span>{language === 'en' ? 'submitted today' : 'gửi hôm nay'}</span>
                </div>
              </div>
            </article>
          </div>
          <div className="muted" style={{ fontSize: '12.5px', marginTop: '14px', lineHeight: 1.5 }}>
            {language === 'en'
              ? 'Artwork illustrated by museum curators or artists inspired by your touching story.'
              : 'Tranh sẽ được vẽ riêng cho câu chuyện của bạn.'}
          </div>
        </div>
      </div>
    </>
  );
}

export default SubmitArtworkModal;

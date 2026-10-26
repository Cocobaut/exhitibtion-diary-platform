import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';
import { leafPath } from './WishTree';
import { room3Service, CATEGORY_MAP } from '../../services/room3Service';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function HangLeafModal({ isOpen, onClose, onHangLeaf }) {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [selectedCat, setSelectedCat] = useState('KL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const accountNickname = user?.nickname || user?.username || (language === 'en' ? 'Author' : 'Tác giả');
  const displayPenName = isAnonymous ? (language === 'en' ? 'Anonymous' : 'Ẩn danh') : accountNickname;

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setIsSubmitting(false);
      if (!title) {
        setTitle(language === 'en' ? 'To you studying for exams' : 'Cho bạn đang ôn thi');
      }
      if (!message) {
        setMessage(
          language === 'en'
            ? 'You don’t have to be fast, just don’t stop.'
            : 'Bạn không cần phải nhanh, chỉ cần đừng dừng lại.'
        );
      }
    }
  }, [isOpen, language]);

  if (!isOpen) return null;

  const currentCat = CATEGORY_MAP[selectedCat] || CATEGORY_MAP.KL;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanTitle = title.trim();
    const cleanContent = message.trim();

    if (cleanTitle.length < 3 || cleanTitle.length > 150) {
      setErrorMessage(
        language === 'en'
          ? 'Message title must be between 3 and 150 characters.'
          : 'Tên thông điệp phải từ 3 đến 150 ký tự.'
      );
      return;
    }
    if (cleanContent.length < 10 || cleanContent.length > 280) {
      setErrorMessage(
        language === 'en'
          ? 'Message content must be between 10 and 280 characters.'
          : 'Nội dung thông điệp phải từ 10 đến 280 ký tự.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await room3Service.hangLeaf({
        title: cleanTitle,
        content: cleanContent,
        short_content: cleanContent,
        author_display_name: displayPenName,
        is_anonymous: isAnonymous,
        tag_category: selectedCat,
        color_code: currentCat.backendColor,
      });

      const leafResult = response?.data || response;
      if (onHangLeaf) {
        onHangLeaf(leafResult);
      }
      onClose();
    } catch (err) {
      console.error('Error hanging leaf:', err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        (language === 'en'
          ? 'Could not hang message right now. Please try again later.'
          : 'Không thể gửi thông điệp lúc này. Vui lòng thử lại sau.');
      setErrorMessage(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        className="panel"
        style={{
          width: '890px',
          maxHeight: '92vh',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: '30px',
          boxShadow: '0 25px 70px rgba(0,0,0,0.45)',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        {/* Left Side: Form */}
        <div>
          <h2>{language === 'en' ? 'Hang a Message on the Wish Tree' : 'Treo thông điệp lên cây'}</h2>
          <div className="sub">
            {language === 'en'
              ? 'A kind word for a stranger who needs to hear it.'
              : 'Một câu tử tế cho một người lạ đang cần nghe.'}
          </div>

          {errorMessage && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(196, 43, 28, 0.1)',
                border: '1px solid #C42B1C',
                color: '#8A180E',
                fontSize: '13.5px',
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          <div className="fieldl">{language === 'en' ? 'Message Category' : 'Loại thông điệp'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {Object.keys(CATEGORY_MAP).map((k) => {
              const item = CATEGORY_MAP[k];
              const isSelected = selectedCat === k;
              const catName = language === 'en'
                ? (k === 'KL' ? 'Encouragement' : k === 'CL' ? 'Healing' : k === 'BO' ? 'Gratitude' : 'Perspective')
                : item.name;
              const catDesc = language === 'en'
                ? (k === 'KL' ? 'Persistence & strength' : k === 'CL' ? 'Peace & comfort' : k === 'BO' ? 'Thankfulness & appreciation' : 'Life perspectives')
                : item.desc;

              return (
                <div
                  key={k}
                  className={`opt ${isSelected ? 'on' : ''}`}
                  onClick={() => setSelectedCat(k)}
                  style={{ cursor: 'pointer' }}
                >
                  <b>
                    <i
                      className="dot"
                      style={{ background: item.color, width: '12px', height: '12px' }}
                    />
                    {catName}
                  </b>
                  <div className="muted" style={{ fontSize: '12px' }}>
                    {catDesc}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="fieldl">{language === 'en' ? 'Message Title' : 'Tên thông điệp'}</div>
          <input
            className="inp"
            placeholder={language === 'en' ? 'E.g., To you studying for exams...' : 'Ví dụ: Cho bạn đang ôn thi...'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
          />

          <div className="fieldl">
            {language === 'en' ? 'Content' : 'Nội dung'} <span>{message.length} / 280</span>
          </div>
          <textarea
            className="inp area focus"
            style={{ minHeight: '110px', fontFamily: 'var(--hand)', fontSize: '20px' }}
            placeholder={language === 'en' ? 'Warm and comforting encouragement...' : 'Lời nhắn nhủ, động viên ấm áp...'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={280}
          />

          <div style={{ marginTop: '12px' }}>
            <div className="fieldl">
              <span>{language === 'en' ? 'Pen Name' : 'Bút danh'}</span>
              <span style={{ fontSize: '12px', color: 'var(--ink2)' }}>
                {language === 'en' ? '(Account nickname)' : '(Bí danh tài khoản)'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                  flex: 1,
                }}
                title={language === 'en' ? 'Pen name is locked to your account nickname' : 'Bút danh cố định theo bí danh tài khoản'}
              />
              <div
                className="row"
                style={{
                  height: '42px',
                  cursor: 'pointer',
                  gap: '6px',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
                onClick={() => setIsAnonymous(!isAnonymous)}
              >
                <span className={`tog ${isAnonymous ? 'on' : ''}`} />
                <span className="muted" style={{ color: 'var(--ink)', fontSize: '13px' }}>
                  {language === 'en' ? 'Anonymous' : 'Ẩn danh'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Leaf Preview */}
        <div style={{ paddingTop: '50px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
          <div className="muted" style={{ marginBottom: '8px' }}>
            {language === 'en' ? 'Your Wish Leaf' : 'Chiếc lá của bạn'}
          </div>

          <div
            style={{
              background: 'var(--wall)',
              borderRadius: '18px',
              padding: '30px 0',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at 50% 50%, ${currentCat.color}33, transparent 70%)`,
              }}
            />
            <svg
              width="180"
              height="110"
              viewBox="0 0 180 110"
              style={{ position: 'relative', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}
            >
              <g transform="translate(20 62) rotate(-14)">
                <path d={leafPath(140, 46)} fill={currentCat.color} />
                <path d="M6 0 H130" stroke="rgba(0,0,0,0.2)" strokeWidth="1.6" />
              </g>
            </svg>
          </div>

          <div
            className="muted"
            style={{
              fontSize: '12.5px',
              margin: '14px 0 18px',
              textAlign: 'left',
              display: 'flex',
              gap: '8px',
              lineHeight: 1.5,
            }}
          >
            <Icon name="shield" size={16} />
            <span>
              {language === 'en'
                ? 'Leaves are reviewed by our curatorial team before hanging. You will receive a notification once it is on the tree.'
                : 'Lá sẽ được đội ngũ đọc trước khi treo lên cây. Bạn sẽ nhận thông báo khi lá đã lên cây.'}
            </span>
          </div>

          <button
            type="button"
            className="btn main"
            style={{ width: '100%', marginTop: 'auto' }}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (language === 'en' ? 'Sending...' : 'Đang gửi...') : (language === 'en' ? '✦ Hang on Tree' : '✦ Treo lên cây')}
          </button>
        </div>
      </div>
    </>
  );
}

export default HangLeafModal;

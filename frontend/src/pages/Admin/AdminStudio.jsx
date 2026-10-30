import React, { useState, useRef } from 'react';
import { Painting } from '../../components/common/Painting';
import { Icon } from '../../components/common/Icons';
import { AiTranslateButton } from '../../components/Admin/AiTranslateButton';
import { adminStudioService } from '../../services/adminStudioService';
import { adminRoomService } from '../../services/adminRoomService';
import { useLanguage } from '../../context/LanguageContext';

export function AdminStudio({ triggerToast, onPublished }) {
  const { t, language } = useLanguage();
  const [roomId, setRoomId] = useState(1);
  const [titleVi, setTitleVi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [authorName, setAuthorName] = useState(
    language === 'en' ? 'Exhibition Curatorial Team' : 'Ban Giám Tuyển Triển Lãm'
  );
  const [summaryVi, setSummaryVi] = useState('');
  const [summaryEn, setSummaryEn] = useState('');
  const [contentVi, setContentVi] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [quote, setQuote] = useState(
    language === 'en'
      ? '“Emotion is the only truth in every moment.”'
      : '“Cảm xúc là thứ duy nhất chân thật trong mọi khoảnh khắc.”'
  );
  const [mediaUrl, setMediaUrl] = useState('');

  // Room 2 fields
  const [targetDate, setTargetDate] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');

  // Room 3 fields
  const [leafCategory, setLeafCategory] = useState('ENCOURAGEMENT');
  const [colorCode, setColorCode] = useState('#FFD700');

  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  const roomCategories = [
    { id: 1, name: t('r1_name') },
    { id: 2, name: t('r2_name') },
    { id: 3, name: t('r3_name') },
  ];

  const leafCategories = [
    { key: 'ENCOURAGEMENT', label: language === 'en' ? 'Encouragement' : 'Khích lệ, kiên trì', color: '#FFD700' },
    { key: 'HEALING', label: language === 'en' ? 'Healing' : 'Chữa lành, bình an', color: '#98FB98' },
    { key: 'GRATITUDE', label: language === 'en' ? 'Gratitude' : 'Cảm ơn, trân trọng', color: '#FFB6C1' },
    { key: 'PERSPECTIVE', label: language === 'en' ? 'Perspective' : 'Góc nhìn cuộc sống', color: '#87CEFA' },
  ];

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg('');
    try {
      const res = await adminRoomService.uploadArtworkImage(roomId, file);
      const url = res?.media_url || res?.data?.media_url;
      if (url) {
        setMediaUrl(url);
      }
    } catch (err) {
      console.error('Error uploading artwork image:', err);
      setErrorMsg(
        language === 'en'
          ? 'Could not upload artwork image. Please check file size.'
          : 'Chưa tải được tranh lên. Hãy thử ảnh nhỏ hơn.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const finalTitleVi = titleVi.trim() || titleEn.trim();
    const finalTitleEn = titleEn.trim() || titleVi.trim();
    const finalContentVi = contentVi.trim() || contentEn.trim();
    const finalContentEn = contentEn.trim() || contentVi.trim();

    if (!finalTitleVi) {
      setErrorMsg(
        language === 'en'
          ? 'Please enter artwork title (Vietnamese or English).'
          : 'Vui lòng nhập tiêu đề tác phẩm (Tiếng Việt hoặc Tiếng Anh).'
      );
      return;
    }

    if (!finalContentVi) {
      setErrorMsg(
        language === 'en'
          ? 'Please enter artwork content (Vietnamese or English).'
          : 'Vui lòng nhập nội dung tác phẩm (Tiếng Việt hoặc Tiếng Anh).'
      );
      return;
    }

    if (roomId === 1 && !mediaUrl) {
      setErrorMsg(
        language === 'en'
          ? 'Artwork illustration is required in Room 1.'
          : 'Tranh minh họa là bắt buộc ở Phòng 1.'
      );
      return;
    }

    const finalShortVi = summaryVi.trim() || summaryEn.trim() || finalTitleVi;
    const finalShortEn = summaryEn.trim() || summaryVi.trim() || finalTitleEn;

    setIsPublishing(true);
    try {
      const payload = {
        room_id: roomId,
        title_vi: finalTitleVi,
        title_en: finalTitleEn,
        author_display_name:
          authorName.trim() ||
          (language === 'en' ? 'Exhibition Curatorial Team' : 'Ban Giám Tuyển Triển Lãm'),
        short_content_vi: finalShortVi,
        short_content_en: finalShortEn,
        content_vi: finalContentVi,
        content_en: finalContentEn,
        media_url: mediaUrl || undefined,
        quote: quote.trim() || undefined,
        target_date: roomId === 2 && targetDate ? targetDate : undefined,
        visibility: roomId === 2 ? visibility : undefined,
        tag_category: roomId === 3 ? leafCategory : undefined,
        color_code: roomId === 3 ? colorCode : undefined,
      };

      const res = await adminStudioService.publishArtwork(payload);

      if (triggerToast) {
        triggerToast(
          language === 'en'
            ? '✦ Curatorial artwork published directly to exhibition gallery!'
            : '✦ Đã xuất bản, bài đang được trưng bày.'
        );
      }

      // Reset form
      setTitleVi('');
      setTitleEn('');
      setSummaryVi('');
      setSummaryEn('');
      setContentVi('');
      setContentEn('');
      setMediaUrl('');
      setErrorMsg('');

      if (onPublished) {
        onPublished(res?.data || res);
      }
    } catch (err) {
      console.error('Error publishing studio artwork:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (language === 'en'
          ? 'Could not publish artwork right now.'
          : 'Không thể xuất bản tác phẩm lúc này.');
      setErrorMsg(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  const hasVietnameseSource = Boolean(titleVi.trim() || summaryVi.trim() || contentVi.trim());
  const detectedOrigLang = hasVietnameseSource ? 'vi' : 'en';

  const previewTitle =
    (language === 'en' ? titleEn || titleVi : titleVi || titleEn) ||
    (language === 'en' ? 'Artwork title' : 'Tiêu đề tác phẩm');
  const previewSummary =
    (language === 'en' ? summaryEn || summaryVi : summaryVi || summaryEn) ||
    (language === 'en' ? 'Short summary...' : 'Tóm tắt ngắn...');

  return (
    <div
      className="abs"
      style={{
        left: '32px',
        right: '32px',
        top: '142px',
        bottom: '26px',
        overflowY: 'auto',
      }}
    >
      <form
        onSubmit={handlePublish}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Cột trái: nội dung bài song ngữ VI / EN */}
        <div className="box" style={{ padding: '22px 26px' }}>
          <p className="muted" style={{ margin: '0 0 18px', fontSize: '13.5px' }}>
            {language === 'en'
              ? 'Posts published here go straight to the exhibition, without the review step.'
              : 'Bài đăng ở đây sẽ được trưng bày ngay, không cần qua bước duyệt.'}
          </p>

          {errorMsg && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'rgba(196, 43, 28, 0.1)',
                border: '1px solid #C42B1C',
                color: '#8A180E',
                fontSize: '14px',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Chọn phòng & Bút danh */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'end', marginBottom: '16px' }}>
            <div>
              <div className="fieldl">{language === 'en' ? 'Room' : 'Phòng'}</div>
              <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                {roomCategories.map((r) => (
                  <span
                    key={r.id}
                    className={`ichip ${roomId === r.id ? 'on' : ''}`}
                    onClick={() => setRoomId(r.id)}
                    style={{ cursor: 'pointer', padding: '7px 16px', fontSize: '13.5px' }}
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="fieldl">{language === 'en' ? 'Pen name' : 'Bút danh'}</div>
              <input
                className="inp"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder={language === 'en' ? 'Exhibition Curatorial Team' : 'Ban Giám Tuyển Triển Lãm'}
              />
            </div>
          </div>

          {/* Nút hỗ trợ dịch tự động bằng AI */}
          <AiTranslateButton
            originalLanguage={detectedOrigLang}
            source={
              detectedOrigLang === 'en'
                ? { title: titleEn, short_content: summaryEn, content: contentEn }
                : { title: titleVi, short_content: summaryVi, content: contentVi }
            }
            onTranslated={(d, target) => {
              if (target === 'en') {
                if (d.title) setTitleEn(d.title);
                if (d.short_content) setSummaryEn(d.short_content);
                if (d.content) setContentEn(d.content);
              } else {
                if (d.title) setTitleVi(d.title);
                if (d.short_content) setSummaryVi(d.short_content);
                if (d.content) setContentVi(d.content);
              }
            }}
            onError={(msg) => (triggerToast ? triggerToast(`[AI] ${msg}`) : setErrorMsg(`[AI] ${msg}`))}
          />

          {/* 1. Title VI & Title EN (title_vi / title_en) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <div className="fieldl">
                {language === 'en' ? 'Title (Vietnamese - title_vi)' : 'Tiêu đề Tiếng Việt (title_vi)'}
              </div>
              <input
                className="inp"
                value={titleVi}
                onChange={(e) => setTitleVi(e.target.value)}
                placeholder={language === 'en' ? 'Vietnamese title...' : 'Ví dụ: Kỷ niệm ngày thành lập bảo tàng'}
                maxLength={150}
              />
            </div>
            <div>
              <div className="fieldl">
                {language === 'en' ? 'Title (English - title_en)' : 'Tiêu đề Tiếng Anh (title_en)'}
              </div>
              <input
                className="inp"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder={language === 'en' ? 'E.g. Museum anniversary' : 'Tiêu đề tiếng Anh...'}
                maxLength={150}
              />
            </div>
          </div>

          {/* 2. Short Content VI & Short Content EN (short_content_vi / short_content_en) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <div className="fieldl">
                {language === 'en'
                  ? 'Short Summary (Vietnamese - short_content_vi)'
                  : 'Tóm tắt ngắn Tiếng Việt (short_content_vi)'}{' '}
                <span>{summaryVi.length}/140</span>
              </div>
              <input
                className="inp"
                value={summaryVi}
                onChange={(e) => setSummaryVi(e.target.value)}
                placeholder={language === 'en' ? 'Short summary in Vietnamese...' : 'Hiện trên thẻ ở phòng triển lãm (TV)...'}
                maxLength={140}
              />
            </div>
            <div>
              <div className="fieldl">
                {language === 'en'
                  ? 'Short Summary (English - short_content_en)'
                  : 'Tóm tắt ngắn Tiếng Anh (short_content_en)'}{' '}
                <span>{summaryEn.length}/140</span>
              </div>
              <input
                className="inp"
                value={summaryEn}
                onChange={(e) => setSummaryEn(e.target.value)}
                placeholder={language === 'en' ? 'Shown on the card in the exhibition...' : 'Tóm tắt ngắn hiển thị trên thẻ (EN)...'}
                maxLength={140}
              />
            </div>
          </div>

          {/* 3. Full Content VI & Full Content EN (content_vi / content_en) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <div className="fieldl">
                {language === 'en' ? 'Content (Vietnamese - content_vi)' : 'Nội dung Tiếng Việt (content_vi)'}
              </div>
              <textarea
                className="inp area"
                style={{ minHeight: '180px', fontSize: '14.5px', lineHeight: 1.6, fontFamily: 'var(--sans)' }}
                value={contentVi}
                onChange={(e) => setContentVi(e.target.value)}
                placeholder={language === 'en' ? 'Full story in Vietnamese...' : 'Toàn bộ câu chuyện bằng tiếng Việt...'}
              />
            </div>
            <div>
              <div className="fieldl">
                {language === 'en' ? 'Content (English - content_en)' : 'Nội dung Tiếng Anh (content_en)'}
              </div>
              <textarea
                className="inp area"
                style={{ minHeight: '180px', fontSize: '14.5px', lineHeight: 1.6, fontFamily: 'var(--sans)' }}
                value={contentEn}
                onChange={(e) => setContentEn(e.target.value)}
                placeholder={language === 'en' ? 'The full story in English...' : 'Toàn bộ câu chuyện bằng tiếng Anh...'}
              />
            </div>
          </div>

          {roomId === 1 && (
            <div style={{ marginTop: '14px' }}>
              <div className="fieldl">{language === 'en' ? 'Quote on the wall' : 'Câu trích dẫn trên tường'}</div>
              <input
                className="inp"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder={language === 'en' ? '“A reflective quote...”' : '“Một câu nói lắng đọng...”'}
              />
            </div>
          )}

          {roomId === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
              <div>
                <div className="fieldl">{language === 'en' ? 'Landing date (optional)' : 'Ngày hạ xuống (không bắt buộc)'}</div>
                <input
                  type="date"
                  className="inp"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
              <div>
                <div className="fieldl">{language === 'en' ? 'Who can see it' : 'Ai được xem'}</div>
                <select
                  className="inp"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  <option value="PUBLIC">{language === 'en' ? 'Everyone' : 'Mọi người'}</option>
                  <option value="PRIVATE">{language === 'en' ? 'Only me' : 'Chỉ mình tôi'}</option>
                </select>
              </div>
            </div>
          )}

          {roomId === 3 && (
            <div style={{ marginTop: '14px' }}>
              <div className="fieldl">{language === 'en' ? 'Leaf topic' : 'Chủ đề lá'}</div>
              <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                {leafCategories.map((cat) => (
                  <span
                    key={cat.key}
                    className={`ichip ${leafCategory === cat.key ? 'on' : ''}`}
                    onClick={() => {
                      setLeafCategory(cat.key);
                      setColorCode(cat.color);
                    }}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color }} />
                    {cat.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cột phải: tranh, xem trước và nút xuất bản luôn trong tầm mắt */}
        <div className="box" style={{ padding: '20px', position: 'sticky', top: 0 }}>
          <div className="fieldl">
            {language === 'en' ? 'Preview' : 'Xem trước'}
            {roomId === 1 && <span style={{ color: 'var(--acc)' }}>{language === 'en' ? 'Image required' : 'Cần có tranh'}</span>}
          </div>

          <div style={{ background: 'var(--wall)', borderRadius: '12px', padding: '14px', border: '1px solid var(--line)' }}>
            <article className="work" style={{ margin: 0 }}>
              <div className="art" style={{ height: '170px', overflow: 'hidden' }}>
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt={language === 'en' ? 'Preview' : 'Xem trước'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Painting seed={99} kind={roomId === 1 ? 'door' : 'letter'} />
                )}
              </div>
              <div className="cap">
                <h4>{previewTitle}</h4>
                <p style={{ height: 'auto' }}>{previewSummary}</p>
              </div>
            </article>
          </div>

          <div className="row" style={{ gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn line sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Icon name="upload" size={15} />
              {isUploading
                ? (language === 'en' ? 'Uploading...' : 'Đang tải...')
                : mediaUrl
                  ? (language === 'en' ? 'Change image' : 'Đổi tranh')
                  : (language === 'en' ? 'Upload image' : 'Tải tranh lên')}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/png,image/jpeg,image/webp"
              onChange={handleUploadImage}
            />
            {mediaUrl && (
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setMediaUrl('')}
              >
                {language === 'en' ? 'Remove' : 'Bỏ tranh'}
              </button>
            )}
          </div>

          <button
            type="submit"
            className="btn main"
            style={{ width: '100%', justifyContent: 'center', marginTop: '18px', padding: '12px 20px', fontSize: '15px' }}
            disabled={isPublishing || isUploading}
          >
            <Icon name="check" size={18} />
            {isPublishing
              ? (language === 'en' ? 'Publishing...' : 'Đang xuất bản...')
              : (language === 'en' ? 'Publish now' : 'Xuất bản ngay')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminStudio;

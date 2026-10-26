import React, { useState, useRef } from 'react';
import { Painting } from '../../components/common/Painting';
import { Icon } from '../../components/common/Icons';
import { adminStudioService } from '../../services/adminStudioService';
import { adminRoomService } from '../../services/adminRoomService';
import { useLanguage } from '../../context/LanguageContext';

export function AdminStudio({ triggerToast, onPublished }) {
  const { t, language } = useLanguage();
  const [roomId, setRoomId] = useState(1);
  const [titleVi, setTitleVi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [authorName, setAuthorName] = useState(language === 'en' ? 'Exhibition Curatorial Team' : 'Ban Giám Tuyển Triển Lãm');
  const [summaryVi, setSummaryVi] = useState('');
  const [contentVi, setContentVi] = useState('');
  const [quote, setQuote] = useState(language === 'en' ? '“Emotion is the only truth in every moment.”' : '“Cảm xúc là thứ duy nhất chân thật trong mọi khoảnh khắc.”');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isBilingual, setIsBilingual] = useState(false);
  const [summaryEn, setSummaryEn] = useState('');
  const [contentEn, setContentEn] = useState('');

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
    { id: 1, name: language === 'en' ? 'Room 1 · Broken Exhibition' : 'Phòng 1 · Đổ vỡ' },
    { id: 2, name: language === 'en' ? 'Room 2 · Lantern Sky' : 'Phòng 2 · Lồng đèn Hy vọng' },
    { id: 3, name: language === 'en' ? 'Room 3 · Wish Tree' : 'Phòng 3 · Cây thông điệp' },
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
      setErrorMsg(language === 'en' ? 'Could not upload artwork image. Please check file size.' : 'Không thể tải ảnh minh họa lên. Vui lòng kiểm tra lại kích thước file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!titleVi.trim()) {
      setErrorMsg(language === 'en' ? 'Please enter artwork title.' : 'Vui lòng nhập tiêu đề tác phẩm.');
      return;
    }

    if (!contentVi.trim()) {
      setErrorMsg(language === 'en' ? 'Please enter artwork content.' : 'Vui lòng nhập nội dung tác phẩm.');
      return;
    }

    if (roomId === 1 && !mediaUrl) {
      setErrorMsg(language === 'en' ? 'Artwork illustration is required in Room 1.' : 'Tranh minh họa là bắt buộc ở Phòng 1.');
      return;
    }

    setIsPublishing(true);
    try {
      const payload = {
        room_id: roomId,
        title_vi: titleVi.trim(),
        title_en: isBilingual ? (titleEn.trim() || titleVi.trim()) : titleVi.trim(),
        author_display_name: authorName.trim() || (language === 'en' ? 'Exhibition Curatorial Team' : 'Ban Giám Tuyển Triển Lãm'),
        short_content_vi: summaryVi.trim() || titleVi.trim(),
        short_content_en: isBilingual ? (summaryEn.trim() || summaryVi.trim()) : (summaryVi.trim() || titleVi.trim()),
        content_vi: contentVi.trim(),
        content_en: isBilingual ? (contentEn.trim() || contentVi.trim()) : contentVi.trim(),
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
            : '✦ Tác phẩm chuyên đề của Studio đã xuất bản trực tiếp lên phòng triển lãm thành công!'
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
      const msg = err?.response?.data?.message || err?.message || (language === 'en' ? 'Could not publish artwork right now.' : 'Không thể xuất bản tác phẩm lúc này.');
      setErrorMsg(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div
      className="abs box"
      style={{
        left: '32px',
        right: '32px',
        top: '142px',
        bottom: '26px',
        overflowY: 'auto',
        padding: '24px 28px',
      }}
    >
      <div className="row between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '14px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '12px', letterSpacing: '.15em', fontWeight: 600, color: 'var(--acc)' }}>
            {language === 'en' ? 'CURATORIAL STUDIO' : 'STUDIO GIÁM TUYỂN'}
          </div>
          <h2 style={{ fontSize: '24px', margin: '4px 0 0' }}>
            {language === 'en' ? 'Direct Publish Curated Artwork' : 'Xuất bản trực tiếp tác phẩm chuyên đề'}
          </h2>
        </div>
        <div className="muted" style={{ fontSize: '13px', maxWidth: '420px', textAlign: 'right' }}>
          {language === 'en'
            ? <>Artworks published here will immediately be <b>APPROVED</b> and displayed live on the exhibition wall without needing prior moderation.</>
            : <>Tác phẩm xuất bản tại đây sẽ lập tức có trạng thái <b>APPROVED</b> và hiển thị trực tiếp lên tường triển lãm mà không cần qua quy trình duyệt.</>}
        </div>
      </div>

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

      <form onSubmit={handlePublish}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
          {/* Left Column: Form Fields */}
          <div>
            <div className="fieldl">{language === 'en' ? 'Select Target Exhibition Room' : 'Chọn Phòng Triển Lãm đích'}</div>
            <div className="row" style={{ gap: '8px', marginBottom: '18px' }}>
              {roomCategories.map((r) => (
                <span
                  key={r.id}
                  className={`ichip ${roomId === r.id ? 'on' : ''}`}
                  onClick={() => setRoomId(r.id)}
                  style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '13.5px' }}
                >
                  {r.name}
                </span>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div className="fieldl">{language === 'en' ? 'Artwork Title (Vietnamese / Primary)' : 'Tiêu đề tác phẩm (Tiếng Việt)'}</div>
                <input
                  className="inp"
                  value={titleVi}
                  onChange={(e) => setTitleVi(e.target.value)}
                  placeholder={language === 'en' ? 'E.g., In celebration of museum anniversary' : 'Ví dụ: Kỷ niệm ngày thành lập bảo tàng'}
                  required
                />
              </div>
              <div>
                <div className="fieldl">{language === 'en' ? 'Author Display Name' : 'Bút danh hiển thị'}</div>
                <input
                  className="inp"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder={language === 'en' ? 'Exhibition Curatorial Team' : 'Ban Giám Tuyển Triển Lãm'}
                />
              </div>
            </div>

            <div className="fieldl" style={{ marginTop: '14px' }}>
              {language === 'en' ? 'Short Summary on Card' : 'Tóm tắt ngắn trên thẻ (Short Content)'} <span>{summaryVi.length} / 120 {language === 'en' ? 'chars' : 'ký tự'}</span>
            </div>
            <input
              className="inp"
              value={summaryVi}
              onChange={(e) => setSummaryVi(e.target.value)}
              placeholder={language === 'en' ? 'Brief excerpt visible when scanning the exhibition wall...' : 'Đoạn văn ngắn gọn xuất hiện khi nhìn lướt trên tường triển lãm...'}
              maxLength={120}
            />

            <div className="fieldl" style={{ marginTop: '14px' }}>
              {language === 'en' ? 'Full Artwork Story & Content' : 'Nội dung đầy đủ của tác phẩm'}
            </div>
            <textarea
              className="inp area"
              style={{ minHeight: '180px', fontSize: '14.5px', lineHeight: 1.6, fontFamily: 'var(--sans)' }}
              value={contentVi}
              onChange={(e) => setContentVi(e.target.value)}
              placeholder={language === 'en' ? 'Full curatorial story or narrative...' : 'Toàn văn câu chuyện hoặc lời tựa của giám tuyển...'}
              required
            />

            {/* Room 1 specific: Quote */}
            {roomId === 1 && (
              <div style={{ marginTop: '14px' }}>
                <div className="fieldl">{language === 'en' ? 'Curatorial Wall Quote' : 'Lời trích dẫn nghệ thuật (Quote trên tường)'}</div>
                <input
                  className="inp"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  placeholder={language === 'en' ? '“A reflective quote...”' : '“Một câu nói lắng đọng...”'}
                />
              </div>
            )}

            {/* Room 2 specific: Target Date & Visibility */}
            {roomId === 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '14px' }}>
                <div>
                  <div className="fieldl">{language === 'en' ? 'Target Date (Optional)' : 'Ngày gửi gắm (Target Date - Tùy chọn)'}</div>
                  <input
                    type="date"
                    className="inp"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
                <div>
                  <div className="fieldl">{language === 'en' ? 'Lantern Visibility' : 'Chế độ hiển thị lồng đèn'}</div>
                  <select
                    className="inp"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                  >
                    <option value="PUBLIC">{language === 'en' ? 'Public on the Hope Sky' : 'Công khai trên bầu trời hy vọng'}</option>
                    <option value="PRIVATE">{language === 'en' ? 'Private only' : 'Chỉ hiển thị riêng tư'}</option>
                  </select>
                </div>
              </div>
            )}

            {/* Room 3 specific: Leaf Category & Color */}
            {roomId === 3 && (
              <div style={{ marginTop: '14px' }}>
                <div className="fieldl">{language === 'en' ? 'Wish Leaf Category' : 'Chủ đề lá thông điệp'}</div>
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

            {/* Optional Bilingual Expansion */}
            <div style={{ marginTop: '18px' }}>
              <label className="row" style={{ gap: '8px', cursor: 'pointer', fontSize: '13.5px', color: 'var(--acc)' }}>
                <input
                  type="checkbox"
                  checked={isBilingual}
                  onChange={(e) => setIsBilingual(e.target.checked)}
                />
                <span>{language === 'en' ? 'Add English translation (Bilingual Content)' : 'Bổ sung bản dịch tiếng Anh (English Content)'}</span>
              </label>

              {isBilingual && (
                <div style={{ marginTop: '12px', padding: '16px', background: 'var(--wall)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                  <div className="fieldl">{language === 'en' ? 'English Title' : 'Tiêu đề tiếng Anh'}</div>
                  <input
                    className="inp"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder={language === 'en' ? 'English title of the artwork...' : 'Tiêu đề tiếng Anh của tác phẩm...'}
                  />

                  <div className="fieldl" style={{ marginTop: '10px' }}>{language === 'en' ? 'English Short Summary' : 'Tóm tắt tiếng Anh'}</div>
                  <input
                    className="inp"
                    value={summaryEn}
                    onChange={(e) => setSummaryEn(e.target.value)}
                    placeholder={language === 'en' ? 'English short summary...' : 'Đoạn tóm tắt tiếng Anh...'}
                  />

                  <div className="fieldl" style={{ marginTop: '10px' }}>{language === 'en' ? 'English Full Content' : 'Nội dung đầy đủ tiếng Anh'}</div>
                  <textarea
                    className="inp area"
                    style={{ minHeight: '120px', fontSize: '13.5px', fontFamily: 'var(--sans)' }}
                    value={contentEn}
                    onChange={(e) => setContentEn(e.target.value)}
                    placeholder={language === 'en' ? 'English content of the artwork...' : 'Toàn văn nội dung tiếng Anh của tác phẩm...'}
                  />
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px' }}>
              <button
                type="submit"
                className="btn main"
                style={{ padding: '12px 28px', fontSize: '15px' }}
                disabled={isPublishing || isUploading}
              >
                <Icon name="check" size={18} />
                {isPublishing
                  ? (language === 'en' ? 'Publishing...' : 'Đang xuất bản...')
                  : (language === 'en' ? 'Publish directly to exhibition' : 'Xuất bản trực tiếp lên triển lãm')}
              </button>
            </div>
          </div>

          {/* Right Column: Image Upload & Live Wall Preview */}
          <div>
            <div className="fieldl">
              {language === 'en' ? 'Illustration Artwork' : 'Tranh minh họa'} {roomId === 1 && <span style={{ color: 'var(--acc)' }}>({language === 'en' ? 'Required in Room 1' : 'Bắt buộc ở Phòng 1'})</span>}
            </div>

            <div
              style={{
                height: '210px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--line)',
                background: '#F0EBE0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {mediaUrl ? (
                <img
                  src={mediaUrl}
                  alt={language === 'en' ? 'Studio artwork illustration' : 'Tranh minh họa Studio'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Painting seed={99} kind={roomId === 1 ? 'door' : 'letter'} />
              )}
            </div>

            <div className="row" style={{ gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn line sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Icon name="upload" size={15} /> {isUploading ? (language === 'en' ? 'Uploading...' : 'Đang tải ảnh...') : (language === 'en' ? 'Upload artwork' : 'Tải tranh lên')}
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
                  {language === 'en' ? 'Remove image' : 'Xóa ảnh'}
                </button>
              )}
            </div>

            <div className="fieldl" style={{ marginTop: '22px' }}>
              {language === 'en' ? 'Live Exhibition Wall Preview' : 'Xem trước trên bức tường ảo'}
            </div>
            <div
              style={{
                background: 'var(--wall)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid var(--line)',
              }}
            >
              <article
                className="work"
                style={{
                  transform: 'scale(.94)',
                  transformOrigin: 'top center',
                  margin: '0 auto',
                }}
              >
                <div className="art" style={{ height: '130px', overflow: 'hidden' }}>
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
                  <h4>{(language === 'en' && isBilingual && titleEn ? titleEn : titleVi) || (language === 'en' ? 'Artwork Title' : 'Tiêu đề tác phẩm')}</h4>
                  <p style={{ height: 'auto' }}>{(language === 'en' && isBilingual && summaryEn ? summaryEn : summaryVi) || (language === 'en' ? 'Short summary of the artwork...' : 'Tóm tắt nội dung tác phẩm...')}</p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AdminStudio;

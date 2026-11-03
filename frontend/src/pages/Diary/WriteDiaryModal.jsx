import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../components/common/Icons';
import { diaryService } from '../../services/diaryService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function WriteDiaryModal({ isOpen, onClose, onSave, editData = null }) {
  const { user } = useAuth();
  const { language } = useLanguage();

  const getTodayISO = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const [date, setDate] = useState(getTodayISO);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const accountNickname = user?.nickname || user?.username || (language === 'en' ? 'Author' : 'Tác giả');
  const displayPenName = isAnonymous ? (language === 'en' ? 'Anonymous' : 'Ẩn danh') : accountNickname;

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setIsSubmitting(false);

      if (editData) {
        setTitle(editData.title || '');
        setDate(editData.entry_date || getTodayISO());
        setContent(editData.content || editData.snippet || '');
        const existingMedia = editData.media_urls || (editData.image_url ? [editData.image_url] : []);
        setPreviewUrls(existingMedia);
      } else {
        setDate(getTodayISO());
        setTitle('');
        setContent('');
        setSelectedFiles([]);
        setPreviewUrls([]);
      }
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (previewUrls.length + files.length > 5) {
      setErrorMessage(
        language === 'en'
          ? 'You can attach up to 5 photos only.'
          : 'Chỉ được đính kèm tối đa 5 hình ảnh.'
      );
      return;
    }

    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setSelectedFiles((prev) => [...prev, ...files]);
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (idx) => {
    setPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanContent = content.trim();
    if (!cleanContent) {
      setErrorMessage(
        language === 'en'
          ? 'Diary entry content cannot be empty.'
          : 'Bạn chưa viết gì cả.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let finalMediaUrls = previewUrls.filter((u) => u.startsWith('http'));

      // If user selected new local files, upload them first
      if (selectedFiles.length > 0) {
        try {
          const uploadedUrls = await diaryService.uploadMedia(selectedFiles);
          finalMediaUrls = [...finalMediaUrls, ...uploadedUrls];
        } catch (uploadErr) {
          console.warn('Image upload error, continuing without new images:', uploadErr);
        }
      }

      let result;
      if (editData?.id) {
        // Edit mode: strictly private personal diary, mood is null
        result = await diaryService.updateDiary(editData.id, {
          title: title.trim() || undefined,
          entry_date: date,
          mood: null,
          content: cleanContent,
          media_urls: finalMediaUrls,
          is_public: false,
          visibility: 'PRIVATE',
        });
      } else {
        // Create mode: strictly private personal diary, mood is null
        result = await diaryService.createDiary({
          title: title.trim() || undefined,
          entry_date: date,
          mood: null,
          content: cleanContent,
          media_urls: finalMediaUrls,
          visibility: 'PRIVATE',
          is_public: false,
        });
      }

      if (onSave) {
        onSave(result?.data || result);
      }
      onClose();
    } catch (err) {
      console.error('Error saving diary:', err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        (language === 'en'
          ? 'Could not save diary entry. Please try again.'
          : 'Chưa lưu được, bạn thử lại nhé.');
      setErrorMessage(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="scrim"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
        }}
        onClick={onClose}
      />
      <div
        className="panel"
        style={{
          position: 'fixed',
          zIndex: 100,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '940px',
          maxWidth: '95vw',
          maxHeight: '92vh',
          display: 'grid',
          gridTemplateColumns: '1.45fr 1fr',
          gap: '28px',
          padding: '30px 32px',
          background: 'var(--paper)',
          color: 'var(--ink)',
          borderRadius: '22px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.45)',
          overflowY: 'auto',
          textAlign: 'left',
        }}
      >
        <span
          className="x"
          onClick={onClose}
          role="button"
          tabIndex={0}
          style={{
            position: 'absolute',
            right: '22px',
            top: '20px',
            fontSize: '22px',
            cursor: 'pointer',
            color: 'var(--ink2)',
            zIndex: 10,
          }}
        >
          ✕
        </span>

        {/* Left Side: Writing Inputs */}
        <div>
          <div style={{ marginBottom: '14px' }}>
            <h2 className="serif" style={{ fontSize: '26px', color: 'var(--ink)', margin: 0 }}>
              {editData
                ? (language === 'en' ? 'Edit Diary Entry' : 'Chỉnh sửa nhật ký')
                : (language === 'en' ? 'New Diary Entry' : 'Viết nhật ký mới')}
            </h2>
          </div>

          {errorMessage && (
            <div
              style={{
                color: 'var(--acc)',
                background: 'rgba(180, 50, 40, 0.08)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '14px',
                border: '1px solid rgba(180, 50, 40, 0.2)',
              }}
            >
              {errorMessage}
            </div>
          )}

          <div className="row" style={{ gap: '14px', marginBottom: '12px' }}>
            <div style={{ flex: '0 0 160px' }}>
              <div className="fieldl">{language === 'en' ? 'Date' : 'Ngày'}</div>
              <input
                type="date"
                className="inp"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="fieldl">{language === 'en' ? 'Title' : 'Tiêu đề'}</div>
              <input
                className="inp"
                placeholder={language === 'en' ? 'e.g. A peaceful afternoon...' : 'Ví dụ: Một chiều bình yên...'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
              />
            </div>
          </div>

          <div className="fieldl">{language === 'en' ? 'Content' : 'Nội dung'}</div>

          <textarea
            className="inp area focus"
            placeholder={
              language === 'en'
                ? 'Write about what happened today or share your thoughts...'
                : 'Hôm nay của bạn thế nào?'
            }
            style={{
              minHeight: '230px',
              fontFamily: 'var(--book)',
              fontSize: '16.5px',
              lineHeight: 1.8,
            }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="fieldl" style={{ marginTop: '14px' }}>
            {language === 'en' ? 'Photos' : 'Ảnh'} ({previewUrls.length}/5)
          </div>
          <div className="row" style={{ gap: '10px', flexWrap: 'wrap' }}>
            {previewUrls.map((url, idx) => (
              <div
                key={idx}
                style={{
                  width: '84px',
                  height: '64px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid var(--line)',
                }}
              >
                <img
                  src={url}
                  alt={`Preview ${idx}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span
                  onClick={() => handleRemoveImage(idx)}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  ✕
                </span>
              </div>
            ))}

            {previewUrls.length < 5 && (
              <div
                className="drop"
                onClick={() => fileInputRef.current?.click()}
                title={language === 'en' ? 'Add photo' : 'Thêm ảnh'}
                style={{
                  width: '84px',
                  height: '64px',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--ink2)',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  border: '1px dashed var(--line)',
                  background: 'rgba(255,255,255,0.4)',
                }}
              >
                <Icon name="plus" size={20} />
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Right Side: Privacy & Save */}
        <div style={{ paddingTop: '50px', display: 'flex', flexDirection: 'column' }}>
          <div className="fieldl" style={{ marginTop: 0 }}>
            {language === 'en' ? 'Privacy' : 'Quyền riêng tư'}
          </div>

          <div
            className="opt on"
            style={{ marginBottom: '14px', cursor: 'default' }}
          >
            <b>
              <Icon name="lock" size={17} /> {language === 'en' ? 'Personal Only' : 'Chỉ mình tôi'}
            </b>
            <div className="muted" style={{ fontSize: '12.5px', marginTop: '4px', lineHeight: 1.5 }}>
              {language === 'en'
                ? 'Saved privately to your personal space. No one else can read this.'
                : 'Không gian riêng tư tuyệt đối, chỉ một mình bạn có thể đọc.'}
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <div className="fieldl" style={{ marginTop: 0 }}>
              <span>{language === 'en' ? 'Author Pen Name' : 'Bút danh tác giả'}</span>
              <span style={{ fontSize: '11.5px', color: 'var(--ink2)' }}>
                {language === 'en' ? '(from profile)' : '(từ hồ sơ)'}
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
                marginBottom: '8px',
                fontSize: '13.5px',
              }}
              title={language === 'en' ? 'Change it in your profile' : 'Đổi tên này trong phần Hồ sơ'}
            />
            <div
              className="row"
              style={{
                cursor: 'pointer',
                gap: '8px',
                userSelect: 'none',
              }}
              onClick={() => setIsAnonymous(!isAnonymous)}
            >
              <span className={`tog ${isAnonymous ? 'on' : ''}`} />
              <span className="muted" style={{ color: 'var(--ink)', fontSize: '12.5px' }}>
                {language === 'en' ? 'Anonymous' : 'Ẩn danh'}
              </span>
            </div>
          </div>

          <div
            className="row"
            style={{
              justifyContent: 'flex-end',
              marginTop: 'auto',
              paddingTop: '24px',
              gap: '10px',
            }}
          >
            <button
              type="button"
              className="btn ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {language === 'en' ? 'Cancel' : 'Huỷ'}
            </button>
            <button
              type="button"
              className="btn main"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? (language === 'en' ? 'Saving...' : 'Đang lưu...')
                : editData
                ? (language === 'en' ? 'Save changes' : 'Lưu thay đổi')
                : (language === 'en' ? 'Save' : 'Lưu')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default WriteDiaryModal;

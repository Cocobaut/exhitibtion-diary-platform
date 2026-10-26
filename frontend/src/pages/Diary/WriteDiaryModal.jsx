import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../components/common/Icons';
import { MOODS } from '../../data/mockData';
import { diaryService } from '../../services/diaryService';

export function WriteDiaryModal({ isOpen, onClose, onSave, editData = null }) {
  const getTodayISO = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const [date, setDate] = useState(getTodayISO);
  const [title, setTitle] = useState('Một ngày bình thường');
  const [mood, setMood] = useState('Bình yên');
  const [selectedFont, setSelectedFont] = useState('Lora');
  const [content, setContent] = useState(
    'Sáng nay trời mưa nhỏ. Mình ngồi ở quán quen, viết lại kế hoạch cho tháng tới mà không thấy áp lực như mọi khi...'
  );
  const [isPrivate, setIsPrivate] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setIsSubmitting(false);

      if (editData) {
        setTitle(editData.title || '');
        setDate(editData.entry_date || getTodayISO());
        setMood(editData.mood || 'Bình yên');
        setContent(editData.content || editData.snippet || '');
        setIsPrivate(editData.is_public === false || editData.visibility === 'PRIVATE');
        const existingMedia = editData.media_urls || (editData.image_url ? [editData.image_url] : []);
        setPreviewUrls(existingMedia);
      } else {
        setDate(getTodayISO());
        setTitle('');
        setMood('Bình yên');
        setContent('');
        setIsPrivate(true);
        setSelectedFiles([]);
        setPreviewUrls([]);
      }
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  const fontOptions = [
    { label: 'Lora', family: 'var(--book)' },
    { label: 'Viết tay', family: 'var(--hand)' },
    { label: 'Gọn gàng', family: 'var(--sans)' },
  ];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (previewUrls.length + files.length > 5) {
      setErrorMessage('Chỉ được đính kèm tối đa 5 hình ảnh.');
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
      setErrorMessage('Nội dung trang nhật ký không được để trống.');
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
        // Edit mode
        result = await diaryService.updateDiary(editData.id, {
          title: title.trim() || undefined,
          entry_date: date,
          mood,
          content: cleanContent,
          media_urls: finalMediaUrls,
          is_public: !isPrivate,
        });
      } else {
        // Create mode
        result = await diaryService.createDiary({
          title: title.trim() || undefined,
          entry_date: date,
          mood,
          content: cleanContent,
          media_urls: finalMediaUrls,
          visibility: isPrivate ? 'PRIVATE' : 'COMMUNITY',
          is_public: !isPrivate,
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
        'Không thể lưu trang nhật ký. Vui lòng kiểm tra lại.';
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
          width: '980px',
          maxHeight: '92vh',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: '1fr 310px',
          gap: '30px',
          boxShadow: '0 25px 70px rgba(0,0,0,0.45)',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        {/* Left Side: Editor */}
        <div>
          <h2>{editData ? 'Chỉnh sửa nhật ký' : 'Viết nhật ký mới'}</h2>
          <div className="sub">Không ai đọc được trang này nếu bạn không muốn.</div>

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

          <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: '14px', marginTop: '10px' }}>
            <div>
              <div className="fieldl">Ngày ghi</div>
              <input
                type="date"
                className="inp"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <div className="fieldl">Tiêu đề trang</div>
              <input
                className="inp"
                placeholder="Ví dụ: Một chiều bình yên..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
              />
            </div>
          </div>

          <div className="fieldl">Tâm trạng</div>
          <div className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
            {Object.keys(MOODS).map((m) => (
              <span
                key={m}
                className={`ichip ${mood === m ? 'on' : ''}`}
                onClick={() => setMood(m)}
                style={{ cursor: 'pointer' }}
              >
                <i className="dot" style={{ background: MOODS[m] }} />
                {m}
              </span>
            ))}
          </div>

          <div className="fieldl">Nội dung</div>
          <div className="row" style={{ gap: '6px', marginBottom: '6px' }}>
            {fontOptions.map((opt) => (
              <span
                key={opt.label}
                className={`ichip ${selectedFont === opt.label ? 'on' : ''}`}
                style={{ fontFamily: opt.family, cursor: 'pointer' }}
                onClick={() => setSelectedFont(opt.label)}
              >
                {opt.label}
              </span>
            ))}
            <span className="muted" style={{ marginLeft: '6px' }}>
              <Icon name="font" size={16} />
            </span>
          </div>

          <textarea
            className="inp area focus"
            placeholder="Kể lại những gì diễn ra trong ngày hoặc những suy nghĩ của bạn..."
            style={{
              minHeight: '180px',
              fontFamily:
                selectedFont === 'Viết tay'
                  ? 'var(--hand)'
                  : selectedFont === 'Gọn gàng'
                  ? 'var(--sans)'
                  : 'var(--book)',
              fontSize: selectedFont === 'Viết tay' ? '20px' : '16px',
              lineHeight: 1.8,
            }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="fieldl">Ảnh đính kèm ({previewUrls.length}/5)</div>
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
                title="Thêm ảnh"
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
        <div style={{ paddingTop: '56px', display: 'flex', flexDirection: 'column' }}>
          <div className="fieldl" style={{ marginTop: 0 }}>
            Ai được đọc?
          </div>

          <div
            className={`opt ${isPrivate ? 'on' : ''}`}
            style={{ marginBottom: '10px', cursor: 'pointer' }}
            onClick={() => setIsPrivate(true)}
          >
            <b>
              <Icon name="lock" size={17} /> Chỉ mình tôi
            </b>
            <div className="muted" style={{ fontSize: '12px' }}>
              Lưu ngay, riêng tư tuyệt đối.
            </div>
          </div>

          <div
            className={`opt ${!isPrivate ? 'on' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setIsPrivate(false)}
          >
            <b>
              <Icon name="globe" size={17} /> Chia sẻ lên Cộng đồng
            </b>
            <div className="muted" style={{ fontSize: '12px' }}>
              Vào hàng chờ duyệt. Nếu không được duyệt, trang vẫn ở lại nhật ký riêng của bạn.
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
              Huỷ
            </button>
            <button
              type="button"
              className="btn main"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang lưu...' : editData ? 'Cập nhật trang' : 'Lưu trang này'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default WriteDiaryModal;

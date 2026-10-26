import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';
import { useAuth } from '../../context/AuthContext';

export function SubmitArtworkModal({ isOpen, onClose, onSubmit }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [penName, setPenName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [summary, setSummary] = useState('');
  const [story, setStory] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setPenName(user.nickname || user.username || '');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!title.trim() || title.trim().length < 3) {
      errs.title = 'Tiêu đề cần ít nhất 3 ký tự';
    } else if (title.trim().length > 150) {
      errs.title = 'Tiêu đề tối đa 150 ký tự';
    }

    if (!summary.trim() || summary.trim().length < 10) {
      errs.summary = 'Tóm tắt cần ít nhất 10 ký tự';
    }

    if (!story.trim() || story.trim().length < 30) {
      errs.story = 'Câu chuyện cần ít nhất 30 ký tự để người đọc thấu hiểu';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    onSubmit &&
      onSubmit({
        title: title.trim(),
        summary: summary.trim(),
        story: story.trim(),
        isAnonymous,
        penName: isAnonymous ? 'Ẩn danh' : penName || 'Tác giả',
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
            Trưng bày tác phẩm
          </h2>
          <div className="sub" style={{ fontSize: '14.5px', color: 'var(--ink2)', marginBottom: '18px' }}>
            Kể lại một lần vấp ngã. Đội ngũ sẽ đọc, vẽ tranh minh họa và treo tác phẩm lên tường cho bạn.
          </div>

          <div>
            <div className="fieldl">
              <span>Tiêu đề *</span>
              {errors.title && <span style={{ color: 'var(--acc)' }}>{errors.title}</span>}
            </div>
            <input
              className="inp"
              placeholder="ví dụ: Mùa thi đại học năm ấy"
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
              <div className="fieldl">Bút danh cho tác phẩm này</div>
              <input
                className="inp"
                value={isAnonymous ? 'Ẩn danh' : penName}
                disabled={isAnonymous}
                onChange={(e) => setPenName(e.target.value)}
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
                Ẩn danh
              </span>
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <div className="fieldl">
              <span>Tóm tắt hiển thị trên thẻ *</span>
              <span>{summary.length} / 120</span>
            </div>
            <input
              className="inp"
              placeholder="Một câu đúc kết ngắn gọn (10 - 120 ký tự)..."
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
              <span>Câu chuyện đầy đủ *</span>
              <span>{story.length} ký tự</span>
            </div>
            <textarea
              className="inp area focus"
              style={{ minHeight: '160px', fontFamily: 'var(--book)' }}
              placeholder="Kể lại chi tiết những gì bạn đã trải qua, cảm xúc lúc đó và cách bạn bước tiếp..."
              value={story}
              onChange={(e) => {
                setStory(e.target.value)}
              }
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
              Mọi tác phẩm đều được đội ngũ đọc và bỏ chi tiết nhận dạng trước khi trưng bày.
            </span>
            <span className="row" style={{ gap: '10px' }}>
              <button type="button" className="btn line" onClick={onClose}>
                Huỷ
              </button>
              <button type="button" className="btn main" onClick={handleNext}>
                Trưng bày
              </button>
            </span>
          </div>
        </div>

        {/* Right Preview Card */}
        <div style={{ paddingTop: '24px' }}>
          <div className="muted" style={{ marginBottom: '10px', fontSize: '13.5px' }}>
            Thẻ của bạn sẽ trông như thế này:
          </div>
          <div style={{ '--paper': '#F3EADD' }}>
            <article className="work pending">
              <div className="art">
                <div>
                  <Icon name="image" size={26} />
                  <div style={{ marginTop: '6px' }}>Tranh minh họa đang được vẽ</div>
                </div>
              </div>
              <div className="cap">
                <h4>{title || 'Tiêu đề tác phẩm'}</h4>
                <p>{summary || 'Tóm tắt câu chuyện của bạn...'}</p>
                <div className="meta">
                  <span className="badge b-wait">
                    <Icon name="clock" size={13} /> Đang được chuẩn bị
                  </span>
                  <span>gửi hôm nay</span>
                </div>
              </div>
            </article>
          </div>
          <div className="muted" style={{ fontSize: '12.5px', marginTop: '14px', lineHeight: 1.5 }}>
            Tranh minh họa do admin hoặc nghệ sĩ bảo tàng sáng tác dựa trên câu chuyện xúc động của bạn.
          </div>
        </div>
      </div>
    </>
  );
}

export default SubmitArtworkModal;

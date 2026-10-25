import React, { useState } from 'react';
import { Icon } from '../../components/common/Icons';
import { MOODS } from '../../data/mockData';
import { Painting } from '../../components/common/Painting';

export function WriteDiaryModal({ isOpen, onClose, onSave }) {
  const [date] = useState('25.10.2026');
  const [title, setTitle] = useState('Một ngày bình thường');
  const [mood, setMood] = useState('Bình yên');
  const [selectedFont, setSelectedFont] = useState('Lora');
  const [content, setContent] = useState(
    'Sáng nay trời mưa nhỏ. Mình ngồi ở quán quen, viết lại kế hoạch cho tháng tới mà không thấy áp lực như mọi khi'
  );
  const [isPrivate, setIsPrivate] = useState(true);

  if (!isOpen) return null;

  const fontOptions = [
    { label: 'Lora', family: 'var(--book)' },
    { label: 'Viết tay', family: 'var(--hand)' },
    { label: 'Gọn gàng', family: 'var(--sans)' },
  ];

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        className="panel"
        style={{
          width: '980px',
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '30px',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        {/* Left Side: Editor */}
        <div>
          <h2>Viết nhật ký mới</h2>
          <div className="sub">Không ai đọc được trang này nếu bạn không muốn.</div>

          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '14px' }}>
            <div>
              <div className="fieldl">Ngày ghi</div>
              <div className="inp row" style={{ gap: '8px' }}>
                <Icon name="calendar" size={16} /> {date}
              </div>
            </div>
            <div>
              <div className="fieldl">Tiêu đề</div>
              <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>

          <div className="fieldl">Tâm trạng</div>
          <div className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
            {Object.keys(MOODS).map((m) => (
              <span
                key={m}
                className={`ichip ${mood === m ? 'on' : ''}`}
                onClick={() => setMood(m)}
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
                style={{ fontFamily: opt.family }}
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
            style={{
              minHeight: '170px',
              fontFamily:
                selectedFont === 'Viết tay'
                  ? 'var(--hand)'
                  : selectedFont === 'Gọn gàng'
                  ? 'var(--sans)'
                  : 'var(--book)',
              fontSize: selectedFont === 'Viết tay' ? '20px' : '16px',
            }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="fieldl">Ảnh đính kèm</div>
          <div className="row" style={{ gap: '10px' }}>
            <div style={{ width: '84px', height: '64px', borderRadius: '8px', overflow: 'hidden' }}>
              <Painting seed={71} kind="rain" />
            </div>
            <div
              className="drop"
              style={{
                width: '84px',
                height: '64px',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--ink2)',
                cursor: 'pointer',
              }}
            >
              <Icon name="plus" size={20} />
            </div>
          </div>
        </div>

        {/* Right Side: Privacy & Save */}
        <div style={{ paddingTop: '62px' }}>
          <div className="fieldl" style={{ marginTop: 0 }}>Ai được đọc?</div>

          <div
            className={`opt ${isPrivate ? 'on' : ''}`}
            style={{ marginBottom: '10px' }}
            onClick={() => setIsPrivate(true)}
          >
            <b><Icon name="lock" size={17} /> Chỉ mình tôi</b>
            <div className="muted">Lưu ngay, riêng tư tuyệt đối.</div>
          </div>

          <div
            className={`opt ${!isPrivate ? 'on' : ''}`}
            onClick={() => setIsPrivate(false)}
          >
            <b><Icon name="globe" size={17} /> Chia sẻ lên Cộng đồng</b>
            <div className="muted">
              Vào hàng chờ duyệt. Nếu không được duyệt, trang vẫn ở lại nhật ký riêng của bạn.
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: '28px' }}>
            <button type="button" className="btn ghost" onClick={onClose}>
              Huỷ
            </button>
            <button
              type="button"
              className="btn main"
              onClick={() => {
                onSave && onSave({ date, title, mood, selectedFont, content, isPrivate });
                onClose();
              }}
            >
              Lưu trang này
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default WriteDiaryModal;

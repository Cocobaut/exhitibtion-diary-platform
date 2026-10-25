import React, { useState } from 'react';
import { Icon } from '../../components/common/Icons';
import { CATS, CAT_KEYS } from '../../data/mockData';
import { leafPath } from './WishTree';

export function HangLeafModal({ isOpen, onClose, onHangLeaf }) {
  const [selectedCat, setSelectedCat] = useState('KL');
  const [title, setTitle] = useState('Cho bạn đang ôn thi');
  const [message, setMessage] = useState('Bạn không cần phải nhanh, chỉ cần đừng dừng lại');
  const [penName, setPenName] = useState('Mây');

  if (!isOpen) return null;

  const currentCat = CATS[selectedCat];

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        className="panel"
        style={{
          width: '880px',
          display: 'grid',
          gridTemplateColumns: '1fr 260px',
          gap: '30px',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        {/* Left Side: Form */}
        <div>
          <h2>Treo thông điệp lên cây</h2>
          <div className="sub">Một câu tử tế cho một người lạ đang cần nghe.</div>

          <div className="fieldl">Loại thông điệp</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {CAT_KEYS.map((k) => (
              <div
                key={k}
                className={`opt ${selectedCat === k ? 'on' : ''}`}
                onClick={() => setSelectedCat(k)}
              >
                <b>
                  <i
                    className="dot"
                    style={{ background: CATS[k].c, width: '12px', height: '12px' }}
                  />
                  {CATS[k].name}
                </b>
                <div className="muted">{CATS[k].desc}</div>
              </div>
            ))}
          </div>

          <div className="fieldl">Tên thông điệp</div>
          <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div className="fieldl">
            Nội dung <span>{message.length} / 280</span>
          </div>
          <textarea
            className="inp area focus"
            style={{ minHeight: '100px', fontFamily: 'var(--hand)', fontSize: '20px' }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="fieldl">Bút danh</div>
          <input className="inp" value={penName} onChange={(e) => setPenName(e.target.value)} />
        </div>

        {/* Right Side: Leaf Preview */}
        <div style={{ paddingTop: '60px', textAlign: 'center' }}>
          <div className="muted" style={{ marginBottom: '8px' }}>
            Chiếc lá của bạn
          </div>

          <div
            style={{
              background: 'var(--wall)',
              borderRadius: '18px',
              padding: '30px 0',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 50% 50%, rgba(246,221,143,.35), transparent 65%)',
              }}
            />
            <svg width="180" height="110" viewBox="0 0 180 110" style={{ position: 'relative' }}>
              <g transform="translate(20 62) rotate(-14)">
                <path d={leafPath(140, 46)} fill={currentCat.c} />
                <path d="M6 0 H130" stroke="#A8862E" strokeWidth="1.5" />
              </g>
            </svg>
          </div>

          <div
            className="muted"
            style={{
              fontSize: '13px',
              margin: '14px 0 18px',
              textAlign: 'left',
              display: 'flex',
              gap: '6px',
            }}
          >
            <Icon name="shield" size={14} />
            Lá sẽ được đội ngũ đọc trước khi treo lên cây. Bạn sẽ nhận thông báo khi lá đã lên cây.
          </div>

          <button
            type="button"
            className="btn main"
            style={{ width: '100%' }}
            onClick={() => {
              onHangLeaf && onHangLeaf({ selectedCat, title, message, penName });
              onClose();
            }}
          >
            Treo lên cây
          </button>
        </div>
      </div>
    </>
  );
}

export default HangLeafModal;

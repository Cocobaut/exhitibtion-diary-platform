import React, { useState } from 'react';
import { Icon } from '../../components/common/Icons';
import { SingleLantern } from './LanternSky';

export function LanternLandedModal({ isOpen, onClose, onSaveToNotebook, onReplyFuture, letterData }) {
  const [isSaved, setIsSaved] = useState(false);
  if (!isOpen) return null;

  const letter = letterData || {
    title: "Gửi mình của năm 2026,",
    content: "Lúc viết thư này mình đang ngồi ở thư viện, vừa trượt kỳ thi IELTS lần hai. Nếu cậu đọc được những dòng này, mong là cậu đã thôi so mình với người khác. Dù kết quả ra sao, mình vẫn tự hào vì tụi mình đã không bỏ cuộc.",
    author: "Linh, 24.10.2023",
    statusNote: "Đã tới giờ hẹn · 09:00, 25.10.2026",
    symbol: "heart"
  };

  const handleSave = () => {
    setIsSaved(true);
    if (onSaveToNotebook) {
      onSaveToNotebook({
        id: `nb_lt_${Date.now()}`,
        source: 'lantern',
        sourceLabel: 'Lồng đèn hạ xuống · Phòng 2',
        badgeClass: 'b-wait',
        icon: 'r2',
        title: letter.title || 'Lồng đèn gửi tương lai',
        content: letter.content,
        author: letter.author,
        symbol: letter.symbol || 'heart',
        savedAt: 'Hôm nay'
      });
    }
  };

  return (
    <>
      <div className="scrim" style={{ background: 'rgba(20,8,12,.4)' }} onClick={onClose} />

      {/* Large Landed Lantern SVG in center */}
      <svg
        className="abs"
        style={{ left: '532px', top: '430px', zIndex: 31, pointerEvents: 'none' }}
        width="300"
        height="300"
        viewBox="-150 -150 300 300"
      >
        <SingleLantern x={0} y={0} sc={2.1} seed={4321} kind={letter.symbol || "heart"} color="#FFF0D2" />
      </svg>

      {/* Opened Letter Panel */}
      <div
        className="panel"
        style={{
          left: 'auto',
          right: '70px',
          top: '150px',
          transform: 'none',
          width: '500px',
          background: '#FBF4E6',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        <div className="row" style={{ gap: '6px', color: '#8A5A1E', fontSize: '13.5px' }}>
          <Icon name="clock" size={15} /> {letter.statusNote || "Đã tới giờ hẹn"}
        </div>

        <div
          className="book"
          style={{
            fontStyle: 'italic',
            color: 'var(--acc)',
            fontSize: '22px',
            margin: '10px 0 6px',
          }}
        >
          {letter.title}
        </div>

        <div className="book" style={{ fontSize: '16px', lineHeight: 1.8 }}>
          {letter.content}
        </div>

        <div className="hand" style={{ textAlign: 'right', fontSize: '22px', marginTop: '6px' }}>
          {letter.author}
        </div>

        <div
          className="row between"
          style={{
            marginTop: '16px',
            borderTop: '1px solid var(--line)',
            paddingTop: '14px',
          }}
        >
          <button
            type="button"
            className={`btn ${isSaved ? 'main' : 'line'} sm`}
            onClick={handleSave}
          >
            <Icon name={isSaved ? "check" : "bookmark"} size={16} />
            {isSaved ? "Đã lưu vào sổ tay" : "Lưu vào sổ tay"}
          </button>
          <button type="button" className="btn main sm" onClick={onReplyFuture}>
            <Icon name="r2" size={16} /> Viết thư trả lời tương lai
          </button>
        </div>
      </div>
    </>
  );
}

export default LanternLandedModal;

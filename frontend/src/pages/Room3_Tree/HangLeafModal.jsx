import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';
import { leafPath } from './WishTree';
import { room3Service, CATEGORY_MAP } from '../../services/room3Service';
import { useAuth } from '../../context/AuthContext';

export function HangLeafModal({ isOpen, onClose, onHangLeaf }) {
  const { user } = useAuth();

  const [selectedCat, setSelectedCat] = useState('KL');
  const [title, setTitle] = useState('Cho bạn đang ôn thi');
  const [message, setMessage] = useState('Bạn không cần phải nhanh, chỉ cần đừng dừng lại.');
  const [penName, setPenName] = useState('Mây');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setIsSubmitting(false);
      if (user?.nickname) {
        setPenName(user.nickname);
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const currentCat = CATEGORY_MAP[selectedCat] || CATEGORY_MAP.KL;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanTitle = title.trim();
    const cleanContent = message.trim();

    if (cleanTitle.length < 3 || cleanTitle.length > 150) {
      setErrorMessage('Tên thông điệp phải từ 3 đến 150 ký tự.');
      return;
    }
    if (cleanContent.length < 10 || cleanContent.length > 280) {
      setErrorMessage('Nội dung thông điệp phải từ 10 đến 280 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await room3Service.hangLeaf({
        title: cleanTitle,
        content: cleanContent,
        short_content: cleanContent,
        author_display_name: penName.trim() || undefined,
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
        'Không thể gửi thông điệp lúc này. Vui lòng thử lại sau.';
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
          <h2>Treo thông điệp lên cây</h2>
          <div className="sub">Một câu tử tế cho một người lạ đang cần nghe.</div>

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

          <div className="fieldl">Loại thông điệp</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {Object.keys(CATEGORY_MAP).map((k) => {
              const item = CATEGORY_MAP[k];
              const isSelected = selectedCat === k;
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
                    {item.name}
                  </b>
                  <div className="muted" style={{ fontSize: '12px' }}>
                    {item.desc}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="fieldl">Tên thông điệp</div>
          <input
            className="inp"
            placeholder="Ví dụ: Cho bạn đang ôn thi..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
          />

          <div className="fieldl">
            Nội dung <span>{message.length} / 280</span>
          </div>
          <textarea
            className="inp area focus"
            style={{ minHeight: '110px', fontFamily: 'var(--hand)', fontSize: '20px' }}
            placeholder="Lời nhắn nhủ, động viên ấm áp..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={280}
          />

          <div className="fieldl">Bút danh</div>
          <input
            className="inp"
            placeholder="Ví dụ: Mây hoặc Người gieo mầm"
            value={penName}
            onChange={(e) => setPenName(e.target.value)}
            maxLength={50}
          />
        </div>

        {/* Right Side: Leaf Preview */}
        <div style={{ paddingTop: '50px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
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
              Lá sẽ được đội ngũ đọc trước khi treo lên cây. Bạn sẽ nhận thông báo khi lá đã lên cây.
            </span>
          </div>

          <button
            type="button"
            className="btn main"
            style={{ width: '100%', marginTop: 'auto' }}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang gửi...' : '✦ Treo lên cây'}
          </button>
        </div>
      </div>
    </>
  );
}

export default HangLeafModal;

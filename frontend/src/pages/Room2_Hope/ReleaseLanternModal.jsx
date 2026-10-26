import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';
import { SYM, SYM_KEYS } from '../../data/mockData';
import { poly } from './LanternSky';
import { room2Service } from '../../services/room2Service';

export function ReleaseLanternModal({ isOpen, onClose, onRelease }) {
  const [title, setTitle] = useState('Gửi mình của năm 2030');
  const [message, setMessage] = useState(
    'Hôm nay mình vừa trượt vòng phỏng vấn thứ ba. Mình viết lá thư này để cậu nhớ rằng đã có lúc mọi thứ thật khó, và mình vẫn đi tiếp.'
  );
  const [penName, setPenName] = useState('Linh của năm 2026');
  const [selectedSymbol, setSelectedSymbol] = useState('heart');
  const [isPrivate, setIsPrivate] = useState(true);

  // Target date handling (minimum 1 hour in the future)
  const getInitialTargetDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 4);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const [targetDateObj, setTargetDateObj] = useState(getInitialTargetDate);
  const [quickOption, setQuickOption] = useState('4 năm');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to format ISO for datetime-local input
  const formatForDatetimeLocal = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
  };

  const handleQuickDate = (option) => {
    setQuickOption(option);
    const now = new Date();
    const next = new Date(now);

    switch (option) {
      case '1 ngày':
        next.setDate(now.getDate() + 1);
        break;
      case '1 tháng':
        next.setMonth(now.getMonth() + 1);
        break;
      case '1 năm':
        next.setFullYear(now.getFullYear() + 1);
        break;
      case '3 năm':
        next.setFullYear(now.getFullYear() + 3);
        break;
      case '4 năm':
      default:
        next.setFullYear(now.getFullYear() + 4);
        break;
    }
    next.setHours(9, 0, 0, 0);
    setTargetDateObj(next);
  };

  const handleDateInputChange = (e) => {
    const val = e.target.value;
    if (val) {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        setTargetDateObj(parsed);
        setQuickOption('');
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanTitle = title.trim();
    const cleanContent = message.trim();
    const now = new Date();
    const diffHours = (targetDateObj.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (cleanTitle.length < 3 || cleanTitle.length > 150) {
      setErrorMessage('Tiêu đề phải từ 3 đến 150 ký tự.');
      return;
    }
    if (cleanContent.length < 10) {
      setErrorMessage('Nội dung thư phải tối thiểu 10 ký tự.');
      return;
    }
    if (diffHours < 0.95) {
      setErrorMessage('Thời điểm hạ xuống phải là thời gian trong tương lai (tối thiểu sau thời điểm hiện tại 1 giờ).');
      return;
    }

    // Auto-generate short_content (5-300 chars)
    const shortContent = cleanContent.length > 180
      ? cleanContent.substring(0, 180).trim() + '...'
      : cleanContent;

    setIsSubmitting(true);
    try {
      const response = await room2Service.createLantern({
        title: cleanTitle,
        content: cleanContent,
        short_content: shortContent,
        author_display_name: penName.trim() || undefined,
        symbol: selectedSymbol,
        visibility: isPrivate ? 'PRIVATE' : 'PUBLIC',
        target_date: targetDateObj.toISOString(),
      });

      const lanternData = response?.data || response;
      if (onRelease) {
        onRelease(lanternData);
      }
      onClose();
    } catch (err) {
      console.error('Error creating lantern:', err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể thả lồng đèn lúc này. Vui lòng kiểm tra lại thông tin.';
      setErrorMessage(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplayDate = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} ngày ${pad(d.getDate())}.${pad(
      d.getMonth() + 1
    )}.${d.getFullYear()}`;
  };

  return (
    <>
      <div className="scrim" style={{ background: 'rgba(20,8,12,.55)' }} onClick={onClose} />
      <div
        className="panel"
        style={{
          width: '1020px',
          maxHeight: '92vh',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: '32px',
          boxShadow: '0 25px 70px rgba(0,0,0,0.5)',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        {/* Left Side: Content & Privacy */}
        <div>
          <h2>Thả lồng đèn tương lai</h2>
          <div className="sub">Viết cho chính mình, hẹn ngày giờ lồng đèn hạ xuống.</div>

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

          <div className="fieldl">Tiêu đề</div>
          <input
            className="inp"
            placeholder="Ví dụ: Gửi mình của năm 2030..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
          />

          <div className="fieldl">Lời gửi tương lai</div>
          <textarea
            className="inp area focus"
            style={{ minHeight: '180px' }}
            placeholder="Tâm sự, lời hứa hoặc những điều bạn muốn nhắn nhủ..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '6px' }}>
            <div>
              <div className="fieldl">Bút danh</div>
              <input
                className="inp"
                placeholder="Ví dụ: Linh của năm 2026"
                value={penName}
                onChange={(e) => setPenName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div>
              <div className="fieldl">Biểu tượng trên đèn</div>
              <div className="row" style={{ height: '46px', gap: '6px' }}>
                {SYM_KEYS.map((k) => {
                  const sym = SYM[k]().map(([a, b]) => [a * 10, b * 10]);
                  const isSelected = selectedSymbol === k;
                  return (
                    <span
                      key={k}
                      onClick={() => setSelectedSymbol(k)}
                      title={`Biểu tượng ${k}`}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        display: 'grid',
                        placeItems: 'center',
                        border: isSelected ? '2px solid var(--acc)' : '1px solid var(--line)',
                        background: isSelected ? '#FFF8EE' : '#FFFDF9',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <svg width="22" height="22" viewBox="-12 -13 24 24">
                        <path
                          d={poly(sym)}
                          fill="none"
                          stroke={isSelected ? 'var(--acc)' : '#7F1916'}
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="fieldl">Ai được thấy lồng đèn này?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div
              className={`opt ${isPrivate ? 'on' : ''}`}
              onClick={() => setIsPrivate(true)}
              style={{ cursor: 'pointer' }}
            >
              <b>
                <Icon name="lock" size={17} /> Riêng tư
              </b>
              <div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                Chỉ bạn thấy. Không cần duyệt, bay lên ngay.
              </div>
            </div>
            <div
              className={`opt ${!isPrivate ? 'on' : ''}`}
              onClick={() => setIsPrivate(false)}
              style={{ cursor: 'pointer' }}
            >
              <b>
                <Icon name="globe" size={17} /> Công khai
              </b>
              <div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                Admin duyệt rồi thả lên bầu trời chung.
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Calendar & Target Date */}
        <div style={{ paddingTop: '28px', display: 'flex', flexDirection: 'column' }}>
          <div className="fieldl" style={{ marginTop: 0 }}>
            Thời điểm hạ xuống
          </div>

          {/* Quick preset chips */}
          <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {['1 ngày', '1 tháng', '1 năm', '3 năm', '4 năm'].map((opt) => (
              <span
                key={opt}
                className={`ichip ${quickOption === opt ? 'on' : ''}`}
                onClick={() => handleQuickDate(opt)}
                style={{ cursor: 'pointer' }}
              >
                {opt} nữa
              </span>
            ))}
          </div>

          {/* Precision Date Time Input */}
          <div
            style={{
              background: '#FFFDF9',
              border: '1px solid var(--line)',
              borderRadius: '14px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
              Chọn ngày và giờ chính xác:
            </div>
            <input
              type="datetime-local"
              className="inp"
              style={{
                fontSize: '14px',
                fontFamily: 'inherit',
                color: '#3A2016',
                background: '#FFF',
                border: '1px solid var(--line)',
                padding: '8px 12px',
                borderRadius: '8px',
                width: '100%',
              }}
              value={formatForDatetimeLocal(targetDateObj)}
              onChange={handleDateInputChange}
            />

            <div
              className="row"
              style={{
                gap: '8px',
                marginTop: '16px',
                background: 'rgba(127,25,22,0.06)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: 'var(--acc)',
                fontSize: '13px',
              }}
            >
              <Icon name="clock" size={16} />
              <span>
                Hạ xuống: <b>{formatDisplayDate(targetDateObj)}</b>
              </span>
            </div>
          </div>

          <div className="muted" style={{ fontSize: '13px', marginTop: '16px', lineHeight: 1.6 }}>
            Đúng {formatDisplayDate(targetDateObj)}, lồng đèn sẽ hạ xuống và bạn sẽ nhận thông báo trong hộp thư.
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
              <Icon name="r2" size={17} />
              {isSubmitting ? 'Đang thả...' : '✦ Thả lồng đèn'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ReleaseLanternModal;

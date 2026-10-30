import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';
import { SYM, SYM_KEYS } from '../../data/mockData';
import { poly } from './LanternSky';
import { room2Service } from '../../services/room2Service';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function ReleaseLanternModal({ isOpen, onClose, onRelease }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('heart');
  const [isPrivate, setIsPrivate] = useState(true);

  const accountNickname = user?.nickname || user?.username || (language === 'en' ? 'Author' : 'Tác giả');
  const displayPenName = isAnonymous ? (language === 'en' ? 'Anonymous' : 'Ẩn danh') : accountNickname;

  // Target date handling (minimum 1 hour in the future)
  const getInitialTargetDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 4);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const [targetDateObj, setTargetDateObj] = useState(getInitialTargetDate);
  const [quickOption, setQuickOption] = useState('4y');
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

  const quickOptions = [
    { key: '1d', label: language === 'en' ? '1 day' : '1 ngày', days: 1 },
    { key: '1m', label: language === 'en' ? '1 month' : '1 tháng', months: 1 },
    { key: '1y', label: language === 'en' ? '1 year' : '1 năm', years: 1 },
    { key: '3y', label: language === 'en' ? '3 years' : '3 năm', years: 3 },
    { key: '4y', label: language === 'en' ? '4 years' : '4 năm', years: 4 },
  ];

  const handleQuickDate = (item) => {
    setQuickOption(item.key);
    const now = new Date();
    const next = new Date(now);

    if (item.days) next.setDate(now.getDate() + item.days);
    if (item.months) next.setMonth(now.getMonth() + item.months);
    if (item.years) next.setFullYear(now.getFullYear() + item.years);

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
      setErrorMessage(
        language === 'en'
          ? 'Title must be between 3 and 150 characters.'
          : 'Tiêu đề phải từ 3 đến 150 ký tự.'
      );
      return;
    }
    if (cleanContent.length < 10) {
      setErrorMessage(
        language === 'en'
          ? 'Letter content must be at least 10 characters.'
          : 'Thư cần ít nhất 10 ký tự.'
      );
      return;
    }
    if (diffHours < 0.95) {
      setErrorMessage(
        language === 'en'
          ? 'Descent time must be in the future (at least 1 hour from now).'
          : 'Hãy chọn thời điểm ít nhất 1 giờ nữa.'
      );
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
        author_display_name: displayPenName,
        is_anonymous: isAnonymous,
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
        (language === 'en'
          ? 'Could not release lantern right now. Please check your information.'
          : 'Chưa thả được lồng đèn, bạn thử lại nhé.');
      setErrorMessage(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplayDate = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    if (language === 'en') {
      return `${pad(d.getHours())}:${pad(d.getMinutes())} on ${pad(d.getMonth() + 1)}/${pad(
        d.getDate()
      )}/${d.getFullYear()}`;
    }
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
          <h2>{language === 'en' ? 'Release a lantern' : 'Thả lồng đèn'}</h2>
          <div className="sub">
            {language === 'en'
              ? 'Write to your future self, choose the moment your lantern descends.'
              : 'Viết thư cho chính mình. Thư sẽ mở vào ngày bạn chọn.'}
          </div>

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

          <div className="fieldl">{language === 'en' ? 'Title' : 'Tiêu đề'}</div>
          <input
            className="inp"
            placeholder={language === 'en' ? 'E.g., To myself in 2030...' : 'Ví dụ: Gửi mình của năm 2030...'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
          />

          <div className="fieldl">{language === 'en' ? 'Your letter' : 'Lá thư'}</div>
          <textarea
            className="inp area focus"
            style={{ minHeight: '180px' }}
            placeholder={language === 'en'
              ? 'Thoughts, promises, or things you want to share with your future self...'
              : 'Bạn muốn nhắn gì cho mình của sau này?'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '6px' }}>
            <div>
              <div className="fieldl">
                <span>{language === 'en' ? 'Shown as' : 'Tên hiển thị'}</span>
                <span style={{ fontSize: '12px', color: 'var(--ink2)' }}>
                  {language === 'en' ? '(from your profile)' : '(lấy từ hồ sơ)'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                    flex: 1,
                  }}
                  title={language === 'en' ? 'Change it in your profile' : 'Đổi tên này trong phần Hồ sơ'}
                />
                <div
                  className="row"
                  style={{
                    height: '42px',
                    cursor: 'pointer',
                    gap: '6px',
                    userSelect: 'none',
                    flexShrink: 0,
                  }}
                  onClick={() => setIsAnonymous(!isAnonymous)}
                >
                  <span className={`tog ${isAnonymous ? 'on' : ''}`} />
                  <span className="muted" style={{ color: 'var(--ink)', fontSize: '13px' }}>
                    {language === 'en' ? 'Anonymous' : 'Ẩn danh'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="fieldl">{language === 'en' ? 'Symbol' : 'Biểu tượng'}</div>
              <div className="row" style={{ height: '46px', gap: '6px' }}>
                {SYM_KEYS.map((k) => {
                  const sym = SYM[k]().map(([a, b]) => [a * 10, b * 10]);
                  const isSelected = selectedSymbol === k;
                  return (
                    <span
                      key={k}
                      onClick={() => setSelectedSymbol(k)}
                      title={language === 'en' ? `Symbol: ${k}` : `Biểu tượng ${k}`}
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

          <div className="fieldl">{language === 'en' ? 'Who can see it?' : 'Ai được xem?'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div
              className={`opt ${isPrivate ? 'on' : ''}`}
              onClick={() => setIsPrivate(true)}
              style={{ cursor: 'pointer' }}
            >
              <b>
                <Icon name="lock" size={17} /> {language === 'en' ? 'Private' : 'Riêng tư'}
              </b>
              <div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                {language === 'en'
                  ? 'Only you see it. Floats immediately without moderation.'
                  : 'Chỉ bạn xem được. Bay lên ngay.'}
              </div>
            </div>
            <div
              className={`opt ${!isPrivate ? 'on' : ''}`}
              onClick={() => setIsPrivate(false)}
              style={{ cursor: 'pointer' }}
            >
              <b>
                <Icon name="globe" size={17} /> {language === 'en' ? 'Public' : 'Công khai'}
              </b>
              <div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                {language === 'en'
                  ? 'Moderated by admin then released into the shared sky.'
                  : 'Mọi người cùng xem, sau khi được duyệt.'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Calendar & Target Date */}
        <div style={{ paddingTop: '28px', display: 'flex', flexDirection: 'column' }}>
          <div className="fieldl" style={{ marginTop: 0 }}>
            {language === 'en' ? 'Open on' : 'Ngày mở thư'}
          </div>

          {/* Quick preset chips */}
          <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {quickOptions.map((opt) => (
              <span
                key={opt.key}
                className={`ichip ${quickOption === opt.key ? 'on' : ''}`}
                onClick={() => handleQuickDate(opt)}
                style={{ cursor: 'pointer' }}
              >
                {opt.label} {language === 'en' ? 'later' : 'nữa'}
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
              {language === 'en' ? 'Or pick a date:' : 'Hoặc chọn ngày cụ thể:'}
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
                {language === 'en' ? 'Opens on:' : 'Mở thư:'} <b>{formatDisplayDate(targetDateObj)}</b>
              </span>
            </div>
          </div>

          <div className="muted" style={{ fontSize: '13px', marginTop: '16px', lineHeight: 1.6 }}>
            {language === 'en'
              ? `At ${formatDisplayDate(targetDateObj)}, the lantern will descend and you will receive a notification in your mailbox.`
              : `Bạn sẽ nhận thông báo khi đến ngày.`}
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
              <Icon name="r2" size={17} />
              {isSubmitting
                ? (language === 'en' ? 'Releasing...' : 'Đang thả...')
                : (language === 'en' ? '✦ Release Lantern' : '✦ Thả lồng đèn')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ReleaseLanternModal;

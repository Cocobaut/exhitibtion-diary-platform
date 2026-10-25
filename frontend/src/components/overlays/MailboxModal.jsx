import React, { useState } from 'react';
import { Icon } from '../common/Icons';

export function MailboxModal({ isOpen, onClose, onSaveToNotebook, notebookItems = [] }) {
  const [activeTopic, setActiveTopic] = useState('Can đảm');
  const [savedMessages, setSavedMessages] = useState({});
  const topics = ['Ngẫu nhiên', 'Can đảm', 'Chữa lành', 'Góc nhìn'];

  const messages = {
    'Can đảm': {
      num: '128 / 412',
      badge: 'b-ok',
      text: 'Can đảm không phải là không sợ. Can đảm là vẫn nộp đơn lần nữa, dù tay còn run.',
      author: 'một người lạ ở Phòng 3, đã được kiểm duyệt',
    },
    'Chữa lành': {
      num: '85 / 412',
      badge: 'b-ok',
      text: 'Hôm nay nghỉ ngơi cũng là một cách cố gắng. Cái cây cũng đâu ra lá quanh năm.',
      author: 'Mây · Phòng 3',
    },
    'Góc nhìn': {
      num: '210 / 412',
      badge: 'b-priv',
      text: 'Mười năm nữa, chuyện hôm nay chỉ là một dòng trong câu chuyện dài của bạn.',
      author: 'Admin · An',
    },
    'Ngẫu nhiên': {
      num: '312 / 412',
      badge: 'b-wait',
      text: 'Bạn có thể bắt đầu lại bao nhiêu lần cũng được.',
      author: 'Ẩn danh',
    },
  };

  const currentMsg = messages[activeTopic] || messages['Can đảm'];

  const isCurrentSaved = !!savedMessages[activeTopic] || notebookItems.some(item => item.content === currentMsg.text);

  const handleSave = () => {
    setSavedMessages(prev => ({ ...prev, [activeTopic]: true }));
    if (onSaveToNotebook) {
      onSaveToNotebook({
        id: `nb_mb_${Date.now()}`,
        source: 'mailbox',
        sourceLabel: `Hòm thư · ${activeTopic}`,
        badgeClass: currentMsg.badge,
        icon: 'sparkle',
        content: currentMsg.text,
        author: currentMsg.author,
        category: activeTopic,
        savedAt: 'Hôm nay'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="scrim" onClick={onClose} />

      <div
        className="abs"
        style={{
          left: 0,
          right: 0,
          top: '64px',
          textAlign: 'center',
          zIndex: 32,
          color: '#F6E9DD',
        }}
      >
        <div className="serif" style={{ fontSize: '34px', fontWeight: 700 }}>
          Hôm nay bạn cần nghe điều gì?
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: '12px', gap: '8px' }}>
          {topics.map((t) => (
            <span
              key={t}
              onClick={() => setActiveTopic(t)}
              className={`chip glass ${activeTopic === t ? 'on' : ''}`}
              style={{
                cursor: 'pointer',
                '--onw': '#F6E9DD',
                '--glass': 'rgba(255,240,225,.1)',
                '--glass-line': 'rgba(255,235,215,.25)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* SVG Mailbox base */}
      <svg
        className="abs"
        style={{ left: '432px', top: '520px', zIndex: 31, pointerEvents: 'none' }}
        width="500"
        height="380"
        viewBox="0 0 500 380"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="mbglow">
            <stop offset="0" stopColor="#F6D98F" stopOpacity="0.75" />
            <stop offset="1" stopColor="#F6D98F" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="pulse" cx="250" cy="120" r="240" fill="url(#mbglow)" />
        <path d="M120 380 V170 Q120 90 250 90 Q380 90 380 170 V380 Z" style={{ fill: 'var(--acc)' }} />
        <path d="M120 170 Q120 90 250 90" fill="none" stroke="#fff" strokeOpacity="0.15" strokeWidth="5" />
        <rect x="160" y="150" width="180" height="20" rx="9" fill="#2A1A14" />
        <text x="250" y="270" textAnchor="middle" fontSize="40" style={{ fill: 'var(--gold)' }}>
          ✦
        </text>
      </svg>

      {/* Message Card Panel */}
      <div
        className="panel"
        style={{
          top: '170px',
          transform: 'translateX(-50%) rotate(-1.2deg)',
          width: '560px',
          padding: '30px 42px 24px',
          background: '#FBF4E6',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        <div className="row between" style={{ marginBottom: '10px' }}>
          <span className={`badge ${currentMsg.badge}`}>
            <Icon name="sparkle" size={14} /> {activeTopic}
          </span>
          <span className="muted" style={{ fontSize: '13px' }}>
            thông điệp số {currentMsg.num}
          </span>
        </div>

        <div className="book" style={{ fontSize: '23px', lineHeight: 1.6 }}>
          {currentMsg.text}
        </div>

        <div className="hand" style={{ textAlign: 'right', fontSize: '20px', marginTop: '8px' }}>
          - {currentMsg.author}
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
            className="btn line sm"
            onClick={() => {
              const other = topics.filter(t => t !== activeTopic);
              setActiveTopic(other[Math.floor(Math.random() * other.length)]);
            }}
          >
            <Icon name="refresh" size={16} /> Rút thông điệp mới
          </button>
          <span className="row" style={{ gap: '14px' }}>
            <span className="muted">Sổ tay ({notebookItems.length})</span>
            <button
              type="button"
              className={`btn ${isCurrentSaved ? 'main' : 'line'} sm`}
              onClick={handleSave}
            >
              <Icon name={isCurrentSaved ? "check" : "bookmark"} size={16} />
              {isCurrentSaved ? "Đã lưu vào sổ tay" : "Lưu vào sổ tay"}
            </button>
          </span>
        </div>
      </div>
    </>
  );
}

export default MailboxModal;

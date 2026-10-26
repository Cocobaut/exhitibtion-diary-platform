import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { capsuleService } from '../../services/capsuleService';

const TOPIC_KEYS = [
  { key: null, badge: 'b-wait', vi: 'Ngẫu nhiên', en: 'Random' },
  { key: 'COURAGE', badge: 'b-wait', vi: 'Can đảm', en: 'Courage' },
  { key: 'HEALING', badge: 'b-ok', vi: 'Chữa lành', en: 'Healing' },
  { key: 'PERSPECTIVE', badge: 'b-priv', vi: 'Góc nhìn', en: 'Perspective' },
];

export function MailboxModal({ isOpen, onClose, onSaveToNotebook, notebookItems = [] }) {
  const { isAuthenticated } = useAuth();
  const { language, localize } = useLanguage();
  const [activeTopicKey, setActiveTopicKey] = useState(null);
  const [drawnData, setDrawnData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentTopicObj = TOPIC_KEYS.find((t) => t.key === activeTopicKey) || TOPIC_KEYS[0];

  // Rút thông điệp mới từ backend
  const handleDraw = useCallback(
    async (topicKey = activeTopicKey) => {
      const topicObj = TOPIC_KEYS.find((t) => t.key === topicKey) || TOPIC_KEYS[0];
      setIsLoading(true);
      setErrorMsg('');

      try {
        if (!isAuthenticated) {
          // Mock fallback nếu khách chưa đăng nhập
          setDrawnData({
            draw_id: `guest_${Date.now()}`,
            capsule_id: 100,
            message:
              topicObj.key === 'COURAGE'
                ? 'Can đảm không phải là không sợ. Can đảm là vẫn nộp đơn lần nữa, dù tay còn run.'
                : topicObj.key === 'HEALING'
                ? 'Hôm nay nghỉ ngơi cũng là một cách cố gắng. Cái cây cũng đâu ra lá quanh năm.'
                : topicObj.key === 'PERSPECTIVE'
                ? 'Mười năm nữa, chuyện hôm nay chỉ là một dòng trong câu chuyện dài của bạn.'
                : 'Bạn có thể bắt đầu lại bao nhiêu lần cũng được.',
            message_en:
              topicObj.key === 'COURAGE'
                ? 'Courage is not the absence of fear. Courage is applying one more time even when your hands shake.'
                : topicObj.key === 'HEALING'
                ? 'Resting today is also a form of trying. Even trees do not blossom leaves all year round.'
                : topicObj.key === 'PERSPECTIVE'
                ? 'Ten years from now, today will merely be one line in your long story.'
                : 'You are allowed to start over as many times as you need.',
            category: topicObj.key || 'HEALING',
            author_name: language === 'en' ? 'Museum wanderer' : 'Người lữ khách bảo tàng',
            is_saved: false,
          });
          setIsLoading(false);
          return;
        }

        const res = await capsuleService.drawCapsule(topicObj.key);
        setDrawnData(res);
      } catch (err) {
        if (err.errorCode === 'CAPSULE_POOL_EMPTY' || err.status === 404) {
          setErrorMsg(language === 'en' ? 'Capsules for this topic are currently being prepared.' : 'Kho thông điệp chủ đề này hiện đang được chuẩn bị thêm.');
        } else {
          setErrorMsg(err.message || (language === 'en' ? 'Unable to draw a message right now.' : 'Không thể rút thông điệp lúc này.'));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [activeTopicKey, isAuthenticated, language]
  );

  // Tự động rút 1 thông điệp khi mở modal
  useEffect(() => {
    if (isOpen) {
      handleDraw(activeTopicKey);
    }
  }, [isOpen]);

  const handleTopicChange = (newKey) => {
    setActiveTopicKey(newKey);
    handleDraw(newKey);
  };

  // Lưu hoặc bỏ lưu vào sổ tay
  const handleSaveToggle = async () => {
    if (!drawnData) return;

    if (!isAuthenticated) {
      // Lưu local cho khách
      if (onSaveToNotebook) {
        onSaveToNotebook({
          id: drawnData.draw_id,
          source: 'mailbox',
          sourceLabel: language === 'en' ? `Mailbox · ${currentTopicObj.en}` : `Hòm thư · ${currentTopicObj.vi}`,
          badgeClass: currentTopicObj.badge,
          icon: 'sparkle',
          content: localize(drawnData, 'message'),
          author: drawnData.author_name || (language === 'en' ? 'Anonymous' : 'Ẩn danh'),
          category: currentTopicObj.key,
          savedAt: language === 'en' ? 'Just now' : 'Vừa xong',
        });
      }
      setDrawnData((prev) => ({ ...prev, is_saved: true }));
      return;
    }

    setIsSaving(true);
    const targetState = !drawnData.is_saved;

    try {
      await capsuleService.saveDraw(drawnData.draw_id, targetState);
      setDrawnData((prev) => ({ ...prev, is_saved: targetState }));

      if (targetState && onSaveToNotebook) {
        onSaveToNotebook({
          id: drawnData.draw_id,
          source: 'mailbox',
          sourceLabel: `Hòm thư · ${activeTopic}`,
          badgeClass: currentTopicObj.badge,
          icon: 'sparkle',
          content: drawnData.message,
          author: drawnData.author_name || 'Người gửi ẩn danh',
          category: activeTopic,
          savedAt: 'Hôm nay',
        });
      }
    } catch (err) {
      console.warn('Lỗi khi lưu thông điệp:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isSaved = Boolean(
    drawnData?.is_saved ||
      (drawnData && notebookItems.some((item) => item.content === drawnData.message))
  );

  return (
    <>
      <div className="scrim" onClick={onClose} />

      {/* Header Topic Switcher */}
      <div
        className="abs"
        style={{
          left: 0,
          right: 0,
          top: '56px',
          textAlign: 'center',
          zIndex: 32,
          color: '#F6E9DD',
        }}
      >
        <div className="serif" style={{ fontSize: '32px', fontWeight: 700 }}>
          {language === 'en' ? 'What do you need to hear today?' : 'Hôm nay bạn cần nghe điều gì?'}
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: '12px', gap: '8px' }}>
          {TOPIC_KEYS.map((t) => (
            <span
              key={t.vi}
              onClick={() => handleTopicChange(t.key)}
              className={`chip glass ${activeTopicKey === t.key ? 'on' : ''}`}
              style={{
                cursor: 'pointer',
                '--onw': '#F6E9DD',
                '--glass': 'rgba(255,240,225,.1)',
                '--glass-line': 'rgba(255,235,215,.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {language === 'en' ? t.en : t.vi}
            </span>
          ))}
        </div>
      </div>

      {/* SVG Mailbox Base Animation */}
      <svg
        className="abs"
        style={{ left: '50%', transform: 'translateX(-50%)', top: '500px', zIndex: 31, pointerEvents: 'none' }}
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
          top: '180px',
          transform: 'translateX(-50%) rotate(-1deg)',
          width: '560px',
          maxWidth: '92vw',
          padding: '28px 38px 24px',
          background: '#FBF4E6',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        <div className="row between" style={{ marginBottom: '12px' }}>
          <span className={`badge ${currentTopicObj.badge}`}>
            <Icon name="sparkle" size={14} /> {language === 'en' ? currentTopicObj.en : currentTopicObj.vi}
          </span>
          {drawnData?.capsule_id && (
            <span className="muted" style={{ fontSize: '13px' }}>
              {language === 'en' ? `message #${drawnData.capsule_id}` : `thông điệp #${drawnData.capsule_id}`}
            </span>
          )}
        </div>

        {isLoading ? (
          <div
            style={{
              minHeight: '140px',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ink2)',
              fontStyle: 'italic',
            }}
          >
            {language === 'en' ? 'Drawing a message from mailbox...' : 'Đang rút thông điệp từ hòm thư...'}
          </div>
        ) : errorMsg ? (
          <div
            style={{
              minHeight: '140px',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--acc)',
              textAlign: 'center',
              padding: '0 20px',
            }}
          >
            {errorMsg}
          </div>
        ) : (
          <>
            <div
              className="book"
              style={{
                fontSize: '22px',
                lineHeight: 1.65,
                color: 'var(--ink)',
                minHeight: '80px',
              }}
            >
              {localize(drawnData, 'message')}
            </div>

            <div
              className="hand"
              style={{
                textAlign: 'right',
                fontSize: '19px',
                color: 'var(--ink2)',
                marginTop: '12px',
              }}
            >
              - {drawnData?.author_name || (language === 'en' ? 'Anonymous' : 'Ẩn danh')}
            </div>
          </>
        )}

        {/* Action Controls */}
        <div
          className="row between"
          style={{
            marginTop: '18px',
            borderTop: '1px solid var(--line)',
            paddingTop: '14px',
          }}
        >
          <button
            type="button"
            className="btn line sm"
            onClick={() => handleDraw(activeTopicKey)}
            disabled={isLoading}
          >
            <Icon name="refresh" size={16} /> {language === 'en' ? 'Draw new message' : 'Rút thông điệp mới'}
          </button>

          <span className="row" style={{ gap: '14px' }}>
            <span className="muted" style={{ fontSize: '13px' }}>
              {language === 'en' ? `Notebook (${notebookItems.length})` : `Sổ tay (${notebookItems.length})`}
            </span>
            <button
              type="button"
              className={`btn ${drawnData?.is_saved ? 'main' : 'line'} sm`}
              onClick={handleSaveToggle}
              disabled={isLoading || isSaving || !drawnData}
            >
              <Icon name={drawnData?.is_saved ? 'check' : 'bookmark'} size={16} />
              {drawnData?.is_saved
                ? (language === 'en' ? 'Saved to notebook' : 'Đã lưu vào sổ tay')
                : (language === 'en' ? 'Save to notebook' : 'Lưu vào sổ tay')}
            </button>
          </span>
        </div>
      </div>
    </>
  );
}

export default MailboxModal;

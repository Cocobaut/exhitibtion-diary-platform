import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';
import { capsuleService } from '../../services/capsuleService';

const TOPICS = [
  { label: 'Ngẫu nhiên', key: null, badge: 'b-wait' },
  { label: 'Can đảm', key: 'COURAGE', badge: 'b-wait' },
  { label: 'Chữa lành', key: 'HEALING', badge: 'b-ok' },
  { label: 'Góc nhìn', key: 'PERSPECTIVE', badge: 'b-priv' },
];

export function MailboxModal({ isOpen, onClose, onSaveToNotebook, notebookItems = [] }) {
  const { isAuthenticated } = useAuth();
  const [activeTopic, setActiveTopic] = useState('Ngẫu nhiên');
  const [drawnData, setDrawnData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentTopicObj = TOPICS.find((t) => t.label === activeTopic) || TOPICS[0];

  // Rút thông điệp mới từ backend
  const handleDraw = useCallback(
    async (topicLabel = activeTopic) => {
      const topicObj = TOPICS.find((t) => t.label === topicLabel) || TOPICS[0];
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
            category: topicObj.key || 'HEALING',
            author_name: 'Người lữ khách bảo tàng',
            is_saved: false,
          });
          setIsLoading(false);
          return;
        }

        const res = await capsuleService.drawCapsule(topicObj.key);
        setDrawnData(res);
      } catch (err) {
        if (err.errorCode === 'CAPSULE_POOL_EMPTY' || err.status === 404) {
          setErrorMsg('Kho thông điệp chủ đề này hiện đang được chuẩn bị thêm.');
        } else {
          setErrorMsg(err.message || 'Không thể rút thông điệp lúc này.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [activeTopic, isAuthenticated]
  );

  // Tự động rút 1 thông điệp khi mở modal
  useEffect(() => {
    if (isOpen) {
      handleDraw(activeTopic);
    }
  }, [isOpen]);

  const handleTopicChange = (newTopic) => {
    setActiveTopic(newTopic);
    handleDraw(newTopic);
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
          sourceLabel: `Hòm thư · ${activeTopic}`,
          badgeClass: currentTopicObj.badge,
          icon: 'sparkle',
          content: drawnData.message,
          author: drawnData.author_name || 'Ẩn danh',
          category: activeTopic,
          savedAt: 'Vừa xong',
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
          Hôm nay bạn cần nghe điều gì?
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: '12px', gap: '8px' }}>
          {TOPICS.map((t) => (
            <span
              key={t.label}
              onClick={() => handleTopicChange(t.label)}
              className={`chip glass ${activeTopic === t.label ? 'on' : ''}`}
              style={{
                cursor: 'pointer',
                '--onw': '#F6E9DD',
                '--glass': 'rgba(255,240,225,.1)',
                '--glass-line': 'rgba(255,235,215,.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
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
            <Icon name="sparkle" size={14} /> {activeTopic}
          </span>
          {drawnData?.capsule_id && (
            <span className="muted" style={{ fontSize: '13px' }}>
              thông điệp #{drawnData.capsule_id}
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
            Đang rút thông điệp từ hòm thư...
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
              {drawnData?.message}
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
              - {drawnData?.author_name || 'Ẩn danh'}
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
            onClick={() => handleDraw(activeTopic)}
            disabled={isLoading}
          >
            <Icon name="refresh" size={16} /> Rút thông điệp mới
          </button>

          <span className="row" style={{ gap: '14px' }}>
            <span className="muted" style={{ fontSize: '13px' }}>
              Sổ tay ({notebookItems.length})
            </span>
            <button
              type="button"
              className={`btn ${isSaved ? 'main' : 'line'} sm`}
              onClick={handleSaveToggle}
              disabled={isLoading || isSaving || !drawnData}
            >
              <Icon name={isSaved ? 'check' : 'bookmark'} size={16} />
              {isSaved ? 'Đã lưu vào sổ tay' : 'Lưu vào sổ tay'}
            </button>
          </span>
        </div>
      </div>
    </>
  );
}

export default MailboxModal;

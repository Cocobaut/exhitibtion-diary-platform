import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export function AiModerationModal({ isOpen, onClose, data, onAccept }) {
  const { language } = useLanguage();

  if (!isOpen || !data) return null;

  const {
    score = 100,
    verdict_recommendation = 'APPROVE_WITH_EDITS',
    violations = [],
    room_assessment,
    suggested_content,
  } = data;

  const isApproved = verdict_recommendation === 'APPROVE_WITH_EDITS' || verdict_recommendation === 'APPROVE';

  return (
    <>
      {/* Background overlay scrim */}
      <div className="scrim" onClick={onClose} style={{ zIndex: 1000 }} />

      {/* Modal Dialog Panel */}
      <div
        className="panel"
        style={{
          width: '680px',
          maxWidth: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 1001,
          boxShadow: '0 25px 70px rgba(0,0,0,0.6)',
          borderRadius: '16px',
          padding: '24px 28px',
        }}
      >
        {/* Close Button */}
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          &times;
        </span>

        {/* Modal Title */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '.2em', fontWeight: 600, color: 'var(--acc)', textTransform: 'uppercase', marginBottom: '4px' }}>
            {language === 'en' ? 'AI COPILOT MODERATION' : 'KIỂM DUYỆT BẰNG AI COPILOT'}
          </div>
          <h2 className="serif" style={{ fontSize: '24px', margin: 0, fontWeight: 600 }}>
            {language === 'en' ? 'Content Quality Analysis' : 'Kết quả phân tích bài viết'}
          </h2>
        </div>

        {/* Score & Recommendation Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--wall, #2a2e42)',
            border: '1px solid var(--line, #3b4259)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
              {language === 'en' ? 'Rubric Score' : 'Điểm đánh giá Rubric'}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: score >= 60 ? '#10b981' : '#f59e0b', marginTop: '2px' }}>
              {score} <span style={{ fontSize: '15px', color: 'var(--muted)', fontWeight: 400 }}>/ 100</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: '4px' }}>
              {language === 'en' ? 'AI Recommendation' : 'Khuyến nghị của AI'}
            </div>
            <span
              className="badge"
              style={{
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '20px',
                fontWeight: 700,
                background: isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isApproved ? '#10b981' : '#ef4444',
                border: `1px solid ${isApproved ? '#10b981' : '#ef4444'}`,
              }}
            >
              {isApproved
                ? (language === 'en' ? '✓ APPROVE WITH EDITS' : '✓ PHÙ HỢP CẦN SỬA')
                : (language === 'en' ? '✕ DISAPPROVE' : '✕ TỪ CHỐI BÀI VIẾT')}
            </span>
          </div>
        </div>

        {/* Room Assessment */}
        {room_assessment && (
          <div
            style={{
              fontSize: '13.5px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: 'var(--ink)',
              marginBottom: '16px',
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: 700, color: '#818cf8' }}>
              {language === 'en' ? 'Room Assessment' : 'Đánh giá phòng'} ({room_assessment.current_room}):{' '}
            </span>
            <span>{room_assessment.reason}</span>
            {room_assessment.suggested_room && room_assessment.suggested_room !== room_assessment.current_room && (
              <div style={{ marginTop: '4px', fontWeight: 600, color: '#f59e0b' }}>
                {language === 'en' ? 'Suggested Room:' : 'Gợi ý chuyển sang:'} {room_assessment.suggested_room}
              </div>
            )}
          </div>
        )}

        {/* Violations List */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
            {language === 'en'
              ? `Detected Policy Violations (${violations.length})`
              : `Các lỗi vi phạm phát hiện (${violations.length})`}
          </div>

          {violations.length === 0 ? (
            <div style={{ fontSize: '13.5px', color: '#10b981', fontStyle: 'italic', padding: '8px 0' }}>
              ✓ {language === 'en' ? 'No policy violations detected. Content is clean.' : 'Không phát hiện vi phạm chính sách.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {violations.map((v, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    fontSize: '13.5px',
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    -{v.deducted_points}đ
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      &ldquo;{v.quote}&rdquo;{' '}
                      {v.line_number && (
                        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 400 }}>
                          ({language === 'en' ? `Line ${v.line_number}` : `Dòng ${v.line_number}`})
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>
                      {v.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suggested Neutral Content */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
            {language === 'en'
              ? 'AI Neutralized Rewrite (Strict No-Hallucination)'
              : 'Đề xuất nội dung đã làm sạch (Strict No-Hallucination)'}
          </div>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'var(--paper, #1a1d2e)',
              border: '1px solid var(--line, #3b4259)',
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'var(--ink)',
              maxHeight: '140px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {suggested_content || (language === 'en' ? 'No suggested changes.' : 'Không có đề xuất thay đổi.')}
          </div>
        </div>

        {/* Action Buttons: Accept / Decline */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid var(--line, #3b4259)',
            paddingTop: '16px',
          }}
        >
          <button
            type="button"
            className="btn line"
            onClick={onClose}
            style={{ padding: '8px 18px', fontSize: '14px' }}
          >
            {language === 'en' ? 'Decline (Keep original)' : 'Decline (Giữ nguyên)'}
          </button>
          <button
            type="button"
            className="btn main"
            onClick={() => onAccept && onAccept(suggested_content)}
            style={{
              padding: '8px 22px',
              fontSize: '14px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              color: '#fff',
              border: 'none',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
            }}
          >
            {language === 'en' ? 'Accept (Apply AI rewrite)' : 'Chấp nhận (Áp dụng đề xuất AI)'}
          </button>
        </div>
      </div>
    </>
  );
}

export default AiModerationModal;

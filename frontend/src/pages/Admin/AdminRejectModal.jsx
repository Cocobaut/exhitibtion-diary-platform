import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';
import { useLanguage } from '../../context/LanguageContext';

export function AdminRejectModal({
  isOpen,
  artwork,
  onClose,
  onConfirmReject,
  isSubmitting = false,
}) {
  const { t, language, localize } = useLanguage();

  const quickReasons = language === 'en'
    ? [
        'Contains identifying info',
        'Inappropriate language',
        'Content too short',
        'Off-topic for room',
      ]
    : [
        'Chứa thông tin nhận dạng',
        'Ngôn từ chưa phù hợp',
        'Nội dung quá ngắn',
        'Không đúng chủ đề phòng',
      ];

  const [selectedReason, setSelectedReason] = useState(quickReasons[0]);
  const [adminNote, setAdminNote] = useState(
    language === 'en'
      ? 'Your story is touching. Please remove personal names or identifying details and resubmit.'
      : 'Câu chuyện của bạn rất chân thật. Bạn có thể bỏ tên trường và tên cô giáo rồi gửi lại giúp nhóm nhé.'
  );

  useEffect(() => {
    setSelectedReason(quickReasons[0]);
  }, [language]);

  useEffect(() => {
    if (isOpen) {
      const artTitle = localize(artwork, 'title') || artwork?.title;
      if (artTitle) {
        setAdminNote(
          language === 'en'
            ? `Thank you for sharing "${artTitle}". Please adjust identifying details and feel free to resubmit to the moderation team.`
            : `Cảm ơn bạn đã gửi câu chuyện "${artTitle}". Bạn có thể chỉnh sửa lại các chi tiết nhận dạng và gửi lại giúp ban quản trị nhé.`
        );
      }
    }
  }, [isOpen, artwork, language, localize]);

  if (!isOpen) return null;

  const authorName =
    artwork?.author_display_name || artwork?.author?.username || (language === 'en' ? 'Author' : 'Tác giả');
  const artworkDisplayTitle = localize(artwork, 'title') || artwork?.title || (language === 'en' ? 'Pending Artwork' : 'Tác phẩm chờ duyệt');

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="panel" style={{ width: '600px', boxShadow: '0 25px 70px rgba(0,0,0,0.5)' }}>
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        <h2 style={{ fontSize: '28px' }}>{t('admin_reject_title')}</h2>
        <div className="sub">
          &ldquo;{artworkDisplayTitle}&rdquo; · {authorName}.{' '}
          {language === 'en'
            ? 'The artwork status will be changed to REJECTED without being deleted from the database.'
            : 'Bài sẽ chuyển sang trạng thái REJECTED, không bị xoá khỏi hệ thống.'}
        </div>

        <div className="fieldl">{t('admin_reject_reason_label')}</div>
        <div className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
          {quickReasons.map((tReason) => (
            <span
              key={tReason}
              className={`ichip ${selectedReason === tReason ? 'on' : ''}`}
              onClick={() => setSelectedReason(tReason)}
              style={{ cursor: 'pointer' }}
            >
              {tReason}
            </span>
          ))}
        </div>

        <div className="fieldl">{t('admin_reject_note_label')}</div>
        <textarea
          className="inp area focus"
          style={{ minHeight: '120px', fontFamily: 'var(--sans)', fontSize: '15px' }}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder={
            language === 'en'
              ? 'Enter specific reason and instructions for author to revise...'
              : 'Nhập lý do cụ thể và hướng dẫn để tác giả chỉnh sửa...'
          }
        />

        <div
          className="muted"
          style={{ fontSize: '13px', marginTop: '12px', display: 'flex', gap: '8px', lineHeight: 1.5 }}
        >
          <Icon name="bell" size={16} />
          <span>
            {language === 'en' ? (
              <>{authorName} will receive a bell notification with this note and an <b>“Edit and resubmit”</b> option.</>
            ) : (
              <>{authorName} sẽ nhận thông báo chuông kèm lời nhắn này và nút <b>“Sửa và gửi lại”</b>.</>
            )}
          </span>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '22px', gap: '10px' }}>
          <button type="button" className="btn ghost" onClick={onClose} disabled={isSubmitting}>
            {t('admin_reject_cancel')}
          </button>
          <button
            type="button"
            className="btn main"
            style={{ background: '#8E2A22' }}
            onClick={() => {
              if (onConfirmReject) {
                onConfirmReject({
                  selectedReason,
                  adminNote,
                  artworkId: artwork?.id,
                });
              }
            }}
            disabled={isSubmitting || !adminNote.trim()}
          >
            {isSubmitting
              ? (language === 'en' ? 'Rejecting...' : 'Đang từ chối...')
              : t('admin_reject_confirm')}
          </button>
        </div>
      </div>
    </>
  );
}

export default AdminRejectModal;

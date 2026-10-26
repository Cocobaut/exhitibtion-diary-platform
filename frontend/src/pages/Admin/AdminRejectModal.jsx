import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';

export function AdminRejectModal({
  isOpen,
  artwork,
  onClose,
  onConfirmReject,
  isSubmitting = false,
}) {
  const [selectedReason, setSelectedReason] = useState('Chứa thông tin nhận dạng');
  const [adminNote, setAdminNote] = useState(
    'Câu chuyện của bạn rất chân thật. Bạn có thể bỏ tên trường và tên cô giáo rồi gửi lại giúp nhóm nhé.'
  );

  const quickReasons = [
    'Chứa thông tin nhận dạng',
    'Ngôn từ chưa phù hợp',
    'Nội dung quá ngắn',
    'Không đúng chủ đề phòng',
  ];

  useEffect(() => {
    if (isOpen) {
      if (artwork?.title) {
        setAdminNote(
          `Cảm ơn bạn đã gửi câu chuyện "${artwork.title}". Bạn có thể chỉnh sửa lại các chi tiết nhận dạng và gửi lại giúp ban quản trị nhé.`
        );
      }
    }
  }, [isOpen, artwork]);

  if (!isOpen) return null;

  const authorName =
    artwork?.author_display_name || artwork?.author?.username || 'Tác giả';

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="panel" style={{ width: '600px', boxShadow: '0 25px 70px rgba(0,0,0,0.5)' }}>
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        <h2 style={{ fontSize: '28px' }}>Từ chối tác phẩm</h2>
        <div className="sub">
          &ldquo;{artwork?.title || 'Tác phẩm chờ duyệt'}&rdquo; · {authorName}. Bài sẽ chuyển sang
          trạng thái <b>REJECTED</b>, không bị xoá khỏi hệ thống.
        </div>

        <div className="fieldl">Lý do nhanh</div>
        <div className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
          {quickReasons.map((t) => (
            <span
              key={t}
              className={`ichip ${selectedReason === t ? 'on' : ''}`}
              onClick={() => setSelectedReason(t)}
              style={{ cursor: 'pointer' }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="fieldl">Lời nhắn gửi tác giả (admin_note)</div>
        <textarea
          className="inp area focus"
          style={{ minHeight: '120px', fontFamily: 'var(--sans)', fontSize: '15px' }}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Nhập lý do cụ thể và hướng dẫn để tác giả chỉnh sửa..."
        />

        <div
          className="muted"
          style={{ fontSize: '13px', marginTop: '12px', display: 'flex', gap: '8px', lineHeight: 1.5 }}
        >
          <Icon name="bell" size={16} />
          <span>
            {authorName} sẽ nhận thông báo chuông kèm lời nhắn này và nút <b>“Sửa và gửi lại”</b>.
          </span>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '22px', gap: '10px' }}>
          <button type="button" className="btn ghost" onClick={onClose} disabled={isSubmitting}>
            Huỷ
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
            {isSubmitting ? 'Đang từ chối...' : 'Xác nhận từ chối'}
          </button>
        </div>
      </div>
    </>
  );
}

export default AdminRejectModal;

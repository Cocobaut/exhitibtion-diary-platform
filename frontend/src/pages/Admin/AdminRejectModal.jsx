import React, { useState } from 'react';
import { Icon } from '../../components/common/Icons';

export function AdminRejectModal({ isOpen, onClose, onConfirmReject }) {
  const [selectedReason, setSelectedReason] = useState('Chứa thông tin nhận dạng');
  const [adminNote, setAdminNote] = useState(
    'Câu chuyện của bạn rất chân thật. Bạn có thể bỏ tên trường và tên cô giáo rồi gửi lại giúp nhóm nhé'
  );

  const quickReasons = [
    'Chứa thông tin nhận dạng',
    'Ngôn từ chưa phù hợp',
    'Nội dung quá ngắn',
    'Không đúng chủ đề phòng',
  ];

  if (!isOpen) return null;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="panel" style={{ width: '600px' }}>
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        <h2 style={{ fontSize: '28px' }}>Từ chối tác phẩm</h2>
        <div className="sub">
          “Mùa thi đại học năm ấy” · Gió. Bài sẽ chuyển sang REJECTED, không bị xoá.
        </div>

        <div className="fieldl">Lý do nhanh</div>
        <div className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
          {quickReasons.map((t) => (
            <span
              key={t}
              className={`ichip ${selectedReason === t ? 'on' : ''}`}
              onClick={() => setSelectedReason(t)}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="fieldl">Lời nhắn gửi tác giả (admin_note)</div>
        <textarea
          className="inp area focus"
          style={{ minHeight: '110px', fontFamily: 'var(--sans)', fontSize: '15px' }}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
        />

        <div className="muted" style={{ fontSize: '13px', marginTop: '10px', display: 'flex', gap: '6px' }}>
          <Icon name="bell" size={14} />
          Gió sẽ nhận thông báo kèm lời nhắn này và nút “Sửa và gửi lại”.
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '18px' }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Huỷ
          </button>
          <button
            type="button"
            className="btn main"
            style={{ background: '#8E2A22' }}
            onClick={() => {
              onConfirmReject && onConfirmReject({ selectedReason, adminNote });
              onClose();
            }}
          >
            Xác nhận từ chối
          </button>
        </div>
      </div>
    </>
  );
}

export default AdminRejectModal;

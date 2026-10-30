import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';
import { useLanguage } from '../../context/LanguageContext';

export function UserRoleManagementModal({
  isOpen,
  user,
  onClose,
  onConfirmRoleChange,
  isSubmitting = false,
}) {
  const { language } = useLanguage();
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (user) {
      const currentRole = user.role ? String(user.role).toUpperCase() : 'USER';
      const targetRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
      setSelectedRole(targetRole);
      setReason('');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const currentRole = user.role ? String(user.role).toUpperCase() : 'USER';

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="panel" style={{ width: '560px', boxShadow: '0 25px 70px rgba(0,0,0,0.5)' }}>
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          &times;
        </span>

        <h2 className="serif" style={{ fontSize: '24px', fontWeight: 600 }}>
          {language === 'en' ? 'Change role' : 'Đổi vai trò'}: {user.nickname || user.username}
        </h2>

        <div className="fieldl">
          {language === 'en' ? 'Select New Role' : 'Chọn vai trò mới'}
        </div>
        <div className="row" style={{ gap: '12px', marginBottom: '16px' }}>
          <div
            onClick={() => setSelectedRole('USER')}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '10px',
              border: selectedRole === 'USER' ? '2px solid var(--acc)' : '1px solid var(--line)',
              background: selectedRole === 'USER' ? 'rgba(196, 75, 43, 0.08)' : 'var(--paper)',
              cursor: 'pointer',
              transition: 'all .15s ease',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '14.5px' }}>{language === 'en' ? 'User' : 'Người dùng'}</div>
          </div>

          <div
            onClick={() => setSelectedRole('ADMIN')}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '10px',
              border: selectedRole === 'ADMIN' ? '2px solid #B57424' : '1px solid var(--line)',
              background: selectedRole === 'ADMIN' ? 'rgba(181, 116, 36, 0.1)' : 'var(--paper)',
              cursor: 'pointer',
              transition: 'all .15s ease',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '14.5px', color: '#B57424' }}>{language === 'en' ? 'Admin' : 'Quản trị viên'}</div>
          </div>
        </div>

        <div className="fieldl">
          {language === 'en' ? 'Reason (optional)' : 'Lý do (không bắt buộc)'}
        </div>
        <textarea
          className="inp area"
          style={{ minHeight: '90px', fontSize: '14px', fontFamily: 'var(--sans)' }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            language === 'en'
              ? 'E.g. joins the review team'
              : 'Ví dụ: tham gia nhóm duyệt bài'
          }
        />

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '22px', gap: '10px' }}>
          <button type="button" className="btn ghost" onClick={onClose} disabled={isSubmitting}>
            {language === 'en' ? 'Cancel' : 'Hủy'}
          </button>
          <button
            type="button"
            className="btn main"
            style={{ background: selectedRole === 'ADMIN' ? '#B57424' : 'var(--acc)' }}
            onClick={() => {
              if (onConfirmRoleChange) {
                onConfirmRoleChange({
                  userId: user.id,
                  newRole: selectedRole,
                  reason,
                });
              }
            }}
            disabled={isSubmitting || selectedRole === currentRole}
          >
            {isSubmitting
              ? (language === 'en' ? 'Updating...' : 'Đang cập nhật...')
              : (language === 'en' ? 'Confirm Role Change' : 'Xác nhận đổi vai trò')}
          </button>
        </div>
      </div>
    </>
  );
}

export default UserRoleManagementModal;

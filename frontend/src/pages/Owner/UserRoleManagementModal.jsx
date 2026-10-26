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
      setReason(
        language === 'en'
          ? (currentRole === 'ADMIN'
              ? 'Demote moderator to standard user'
              : 'Appoint additional moderator for exhibition moderation')
          : (currentRole === 'ADMIN'
              ? 'Hạ cấp vai trò quản trị viên về người dùng thông thường'
              : 'Bổ nhiệm thêm nhân sự cho Ban kiểm duyệt triển lãm')
      );
    }
  }, [user, language]);

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
          {language === 'en' ? 'Adjust Account Role' : 'Điều chỉnh vai trò tài khoản'}
        </h2>
        <div className="sub">
          {language === 'en' ? (
            <>
              Account: <b>{user.nickname || user.username}</b> (@{user.username}) · {user.email}. Current role: <b>{currentRole}</b>.
            </>
          ) : (
            <>
              Tài khoản: <b>{user.nickname || user.username}</b> (@{user.username}) · {user.email}. Vai trò hiện tại: <b>{currentRole}</b>.
            </>
          )}
        </div>

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
            <div style={{ fontWeight: 600, fontSize: '14.5px' }}>USER</div>
            <small className="muted" style={{ display: 'block', marginTop: '4px' }}>
              {language === 'en'
                ? 'Standard user (Explore exhibitions, submit artworks for review, write diaries)'
                : 'Người dùng thông thường (Tham quan, đăng bài chờ duyệt, viết nhật ký)'}
            </small>
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
            <div style={{ fontWeight: 600, fontSize: '14.5px', color: '#B57424' }}>ADMIN</div>
            <small className="muted" style={{ display: 'block', marginTop: '4px' }}>
              {language === 'en'
                ? 'Moderator (Review 3 exhibition rooms, diaries, time capsules, studio)'
                : 'Quản trị viên (Kiểm duyệt 3 phòng, nhật ký, kho thông điệp, studio)'}
            </small>
          </div>
        </div>

        <div className="fieldl">
          {language === 'en' ? 'Reason for Role Adjustment' : 'Lý do điều chỉnh vai trò'}
        </div>
        <textarea
          className="inp area"
          style={{ minHeight: '90px', fontSize: '14px', fontFamily: 'var(--sans)' }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            language === 'en'
              ? 'Enter reason for adjustment to save into system audit history...'
              : 'Nhập lý do điều chỉnh để lưu vào lịch sử kiểm toán...'
          }
          required
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

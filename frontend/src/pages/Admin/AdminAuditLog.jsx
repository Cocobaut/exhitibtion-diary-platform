import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/common/Icons';
import { adminStudioService } from '../../services/adminStudioService';
import { useLanguage } from '../../context/LanguageContext';

export function AdminAuditLog({ triggerToast }) {
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterRoom, setFilterRoom] = useState('ALL');
  const [page, setPage] = useState(1);

  // User Management Modal: Lock/Unlock or Request Deletion
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalTab, setUserModalTab] = useState('LOCK'); // 'LOCK' or 'REQUEST_DELETE'
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUsername, setTargetUsername] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [lockStatus, setLockStatus] = useState(false); // false: khóa, true: mở khóa
  const [actionReason, setActionReason] = useState('');
  const [isSubmittingUserAction, setIsSubmittingUserAction] = useState(false);

  // Initialize reason when modal opens or language changes
  useEffect(() => {
    if (!actionReason) {
      setActionReason(
        language === 'en'
          ? 'Distributing content that violates community standards'
          : 'Phát tán nội dung vi phạm tiêu chuẩn cộng đồng'
      );
    }
  }, [language]);

  // Action display mapping
  const actionMap = {
    CREATE_DIRECT: { label: language === 'en' ? 'STUDIO PUBLISH' : 'XUẤT BẢN TỪ STUDIO', badgeClass: 'b-priv', color: '#5B4EB5' },
    APPROVE: { label: language === 'en' ? 'APPROVE' : 'PHÊ DUYỆT', badgeClass: 'b-ok', color: '#2D7D46' },
    APPROVE_AND_UPLOAD_MEDIA: { label: language === 'en' ? 'APPROVE & UPLOAD' : 'DUYỆT & TẢI ẢNH', badgeClass: 'b-ok', color: '#2D7D46' },
    REJECT: { label: language === 'en' ? 'REJECT' : 'TỪ CHỐI', badgeClass: 'b-wait', color: '#C44B2B' },
    ARCHIVE: { label: language === 'en' ? 'ARCHIVE' : 'LƯU TRỮ (GỠ BÀI)', badgeClass: 'b-wait', color: '#888888' },
    UPDATE: { label: language === 'en' ? 'UPDATE' : 'CHỈNH SỬA', badgeClass: 'b-blue', color: '#1B6FB5' },
    REQUEST_DELETE_USER: { label: language === 'en' ? 'REQUEST DELETE USER' : 'YÊU CẦU XÓA TÀI KHOẢN', badgeClass: 'b-wait', color: '#D97706' },
    LOCK_USER: { label: language === 'en' ? 'LOCK USER' : 'KHÓA TÀI KHOẢN', badgeClass: 'b-wait', color: '#8E2A22' },
  };

  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const actionParam = filterAction === 'ALL' ? null : filterAction;
      const roomParam = filterRoom === 'ALL' ? null : Number(filterRoom);

      const res = await adminStudioService.getAuditLogs({
        action_type: actionParam,
        room_id: roomParam,
        page,
        limit: 50,
      });

      const data = res?.data || res;
      setLogs(data?.items || []);
      setTotalLogs(data?.pagination?.total_items ?? data?.items?.length ?? 0);
    } catch (err) {
      console.warn('Could not load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterAction, filterRoom, page]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  // Handle user lock/unlock or deletion request
  const handleUserActionSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingUserAction(true);

    try {
      if (userModalTab === 'LOCK') {
        if (!targetUserId.trim()) {
          alert(
            language === 'en'
              ? 'Please enter the user ID to update status.'
              : 'Vui lòng nhập mã tài khoản cần thay đổi trạng thái.'
          );
          setIsSubmittingUserAction(false);
          return;
        }

        await adminStudioService.updateUserStatus(targetUserId.trim(), {
          is_active: lockStatus,
          reason: actionReason,
        });

        if (triggerToast) {
          triggerToast(
            lockStatus
              ? (language === 'en' ? 'Successfully unlocked user account.' : 'Đã mở khóa tài khoản người dùng thành công.')
              : (language === 'en' ? 'Locked violating user account.' : 'Đã khóa tài khoản người dùng vi phạm.')
          );
        }
      } else {
        // REQUEST_DELETE
        if (!targetUsername.trim() || !targetEmail.trim()) {
          alert(
            language === 'en'
              ? 'Identity verification policy requires exact Username and Email.'
              : 'Để xác minh danh tính, cần nhập chính xác tên đăng nhập và email của tài khoản.'
          );
          setIsSubmittingUserAction(false);
          return;
        }

        await adminStudioService.requestUserDeletion({
          userId: targetUserId.trim() || undefined,
          username: targetUsername.trim(),
          email: targetEmail.trim(),
          reason: actionReason,
        });

        if (triggerToast) {
          triggerToast(
            language === 'en'
              ? 'Sent account deletion request to Owner for approval.'
              : 'Đã gửi yêu cầu xóa tài khoản lên Chủ sở hữu, đang chờ duyệt.'
          );
        }
      }

      setUserModalOpen(false);
      setTargetUserId('');
      setTargetUsername('');
      setTargetEmail('');
      loadAuditLogs();
    } catch (err) {
      console.error('Error handling user action:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể thực hiện thao tác lúc này.';
      alert(`Error: ${msg}`);
    } finally {
      setIsSubmittingUserAction(false);
    }
  };

  return (
    <div
      className="abs box"
      style={{
        left: '32px',
        right: '32px',
        top: '142px',
        bottom: '26px',
        overflowY: 'auto',
        padding: '24px 28px',
      }}
    >
      {/* Top Header & Filters */}
      <div className="row between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '18px', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '.18em', fontWeight: 600, color: 'var(--acc)', textTransform: 'uppercase' }}>
            {language === 'en' ? 'SYSTEM AUDIT TRAIL' : 'NHẬT KÝ KIỂM TOÁN HỆ THỐNG'}
          </div>
          <h2 className="serif" style={{ fontSize: '24px', margin: '4px 0 0', fontWeight: 600 }}>
            {language === 'en' ? 'Administrative Operations History' : 'Lịch sử thao tác quản trị'}
          </h2>
        </div>

        <div className="row" style={{ gap: '10px' }}>
          <button
            type="button"
            className="btn line sm"
            onClick={() => setUserModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {language === 'en' ? 'Moderate Violating User' : 'Xử lý người dùng vi phạm'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="row between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div className="row" style={{ gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: '13px' }}>
            {language === 'en' ? 'Action:' : 'Hành động:'}
          </span>
          <select
            className="inp"
            style={{ width: '220px', padding: '6px 10px', fontSize: '13px' }}
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">{language === 'en' ? 'All actions' : 'Tất cả hành động'}</option>
            <option value="APPROVE">{language === 'en' ? 'Approve (APPROVE)' : 'Phê duyệt'}</option>
            <option value="REJECT">{language === 'en' ? 'Reject (REJECT)' : 'Từ chối (REJECT)'}</option>
            <option value="ARCHIVE">{language === 'en' ? 'Archive (ARCHIVE)' : 'Lưu trữ'}</option>
            <option value="CREATE_DIRECT">{language === 'en' ? 'Studio Publish (CREATE_DIRECT)' : 'Xuất bản từ Studio'}</option>
            <option value="APPROVE_AND_UPLOAD_MEDIA">{language === 'en' ? 'Approve & Upload Media' : 'Duyệt & Tải ảnh'}</option>
            <option value="REQUEST_DELETE_USER">{language === 'en' ? 'Request Delete User' : 'Yêu cầu xóa tài khoản'}</option>
          </select>

          <span className="muted" style={{ fontSize: '13px', marginLeft: '6px' }}>
            {language === 'en' ? 'Room:' : 'Phòng:'}
          </span>
          <select
            className="inp"
            style={{ width: '190px', padding: '6px 10px', fontSize: '13px' }}
            value={filterRoom}
            onChange={(e) => {
              setFilterRoom(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">{language === 'en' ? 'All rooms' : 'Tất cả phòng'}</option>
            <option value="1">{language === 'en' ? 'Room 1' : 'Phòng 1'}</option>
            <option value="2">{language === 'en' ? 'Room 2' : 'Phòng 2'}</option>
            <option value="3">{language === 'en' ? 'Room 3' : 'Phòng 3'}</option>
          </select>
        </div>

        {isLoading && (
          <span className="muted" style={{ fontSize: '13px' }}>
            {language === 'en' ? 'Loading audit logs...' : 'Đang tải nhật ký...'}
          </span>
        )}
      </div>

      {/* Audit Log Table */}
      <table className="at">
        <thead>
          <tr>
            <th style={{ width: '150px' }}>{language === 'en' ? 'Timestamp' : 'Thời gian'}</th>
            <th style={{ width: '170px' }}>{language === 'en' ? 'Administrator' : 'Quản trị viên'}</th>
            <th style={{ width: '150px' }}>{language === 'en' ? 'Action' : 'Hành động'}</th>
            <th style={{ width: '140px' }}>{language === 'en' ? 'Context / Room' : 'Không gian'}</th>
            <th>{language === 'en' ? 'Artwork / Target' : 'Tác phẩm / Đối tượng'}</th>
            <th>{language === 'en' ? 'Audit Notes & Details' : 'Ghi chú & Chi tiết kiểm toán'}</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                {language === 'en'
                  ? 'No audit records matching the filters found'
                  : 'Không tìm thấy bản ghi nhật ký kiểm toán nào'}
              </td>
            </tr>
          ) : (
            logs.map((log) => {
              const meta = actionMap[log.action_type] || {
                label: log.action_type,
                badgeClass: 'b-priv',
              };
              const adminName =
                log.created_by_admin?.nickname ||
                log.created_by_admin?.username ||
                log.admin_name ||
                (language === 'en' ? 'System' : 'Hệ thống');

              return (
                <tr key={log.log_id || log.id}>
                  <td className="muted" style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                    {formatDate(log.performed_at || log.created_at)}
                  </td>
                  <td>
                    <b>{adminName}</b>
                  </td>
                  <td>
                    <span className={`badge ${meta.badgeClass}`} style={{ fontSize: '11px' }}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: '13px' }}>
                    {log.room_code
                      ? `${language === 'en' ? 'Room' : 'Phòng'} ${log.room_id} (${log.room_code})`
                      : log.room_id
                      ? `${language === 'en' ? 'Room' : 'Phòng'} ${log.room_id}`
                      : (language === 'en' ? 'System-wide' : 'Toàn hệ thống')}
                  </td>
                  <td style={{ maxWidth: '240px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                      {log.artwork_title || `${language === 'en' ? 'Target' : 'Tác phẩm'} #${log.artwork_id || log.target_id || ''}`}
                    </div>
                  </td>
                  <td className="muted" style={{ fontSize: '13px', lineHeight: 1.4 }}>
                    {log.details || log.summary || log.note || '—'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* USER MANAGEMENT MODAL */}
      {userModalOpen && (
        <>
          <div className="scrim" onClick={() => setUserModalOpen(false)} />
          <div className="panel" style={{ width: '600px', boxShadow: '0 25px 70px rgba(0,0,0,0.5)' }}>
            <span className="x" onClick={() => setUserModalOpen(false)} role="button" tabIndex={0}>
              &times;
            </span>

            <h2 className="serif" style={{ fontSize: '24px', fontWeight: 600 }}>
              {language === 'en' ? 'Account Enforcement & Moderation' : 'Xử lý tài khoản người dùng vi phạm'}
            </h2>
            <div className="sub">
              {language === 'en'
                ? 'Admins can directly lock violating accounts. To permanently purge data, submit an authenticated deletion request to the Owner.'
                : 'Quản trị viên có thể khóa tài khoản vi phạm. Muốn xóa vĩnh viễn thì gửi yêu cầu lên Chủ sở hữu.'}
            </div>

            {/* Segment Switcher */}
            <div className="seg" style={{ marginBottom: '18px' }}>
              <span
                className={userModalTab === 'LOCK' ? 'on' : ''}
                onClick={() => setUserModalTab('LOCK')}
              >
                {language === 'en' ? 'Lock / Unlock Account' : 'Khóa / Mở khóa tài khoản'}
              </span>
              <span
                className={userModalTab === 'REQUEST_DELETE' ? 'on' : ''}
                onClick={() => setUserModalTab('REQUEST_DELETE')}
              >
                {language === 'en' ? 'Request Deletion to Owner' : 'Gửi yêu cầu xóa lên Chủ sở hữu'}
              </span>
            </div>

            <form onSubmit={handleUserActionSubmit}>
              {userModalTab === 'LOCK' ? (
                <>
                  <div className="fieldl">
                    {language === 'en' ? 'User ID (User UUID)' : 'Mã tài khoản'}
                  </div>
                  <input
                    className="inp"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder={language === 'en' ? 'Enter UUID of target account...' : 'Nhập mã tài khoản cần thay đổi trạng thái...'}
                    required
                  />

                  <div className="fieldl" style={{ marginTop: '12px' }}>
                    {language === 'en' ? 'Target Status' : 'Trạng thái áp dụng'}
                  </div>
                  <div className="row" style={{ gap: '14px', flexWrap: 'wrap' }}>
                    <label className="row" style={{ gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                      <input
                        type="radio"
                        name="lockStatus"
                        checked={lockStatus === false}
                        onChange={() => setLockStatus(false)}
                      />
                      <span>{language === 'en' ? 'Lock account (Block access)' : 'Khóa tài khoản (Chặn truy cập)'}</span>
                    </label>
                    <label className="row" style={{ gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                      <input
                        type="radio"
                        name="lockStatus"
                        checked={lockStatus === true}
                        onChange={() => setLockStatus(true)}
                      />
                      <span>{language === 'en' ? 'Unlock account' : 'Mở khóa tài khoản'}</span>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      background: 'rgba(217, 119, 6, 0.1)',
                      border: '1px solid #D97706',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#92400E',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      marginBottom: '14px',
                    }}
                  >
                    <b>{language === 'en' ? 'Identity Verification Policy:' : 'Ràng buộc bảo mật danh tính:'}</b>{' '}
                    {language === 'en'
                      ? 'Enter both exact Username and registered Email to verify credentials before forwarding request to the Owner.'
                      : 'Nhập chính xác tên đăng nhập và email để hệ thống đối chiếu trước khi chuyển lên Chủ sở hữu.'}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div className="fieldl">{language === 'en' ? 'Username' : 'Tên đăng nhập'}</div>
                      <input
                        className="inp"
                        value={targetUsername}
                        onChange={(e) => setTargetUsername(e.target.value)}
                        placeholder="spammer_001"
                        required
                      />
                    </div>
                    <div>
                      <div className="fieldl">{language === 'en' ? 'Registered Email' : 'Email đã đăng ký'}</div>
                      <input
                        type="email"
                        className="inp"
                        value={targetEmail}
                        onChange={(e) => setTargetEmail(e.target.value)}
                        placeholder="spammer@exhibition.vn"
                        required
                      />
                    </div>
                  </div>

                  <div className="fieldl" style={{ marginTop: '12px' }}>
                    {language === 'en' ? 'User ID (Optional)' : 'Mã tài khoản (không bắt buộc)'}
                  </div>
                  <input
                    className="inp"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="User UUID..."
                  />
                </>
              )}

              <div className="fieldl" style={{ marginTop: '12px' }}>
                {language === 'en' ? 'Reason for Enforcement' : 'Lý do xử lý'}
              </div>
              <textarea
                className="inp area"
                style={{ minHeight: '90px', fontSize: '14px', fontFamily: 'var(--sans)' }}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={language === 'en' ? 'Specify policy violations and context...' : 'Ghi rõ lý do và hành vi vi phạm...'}
                required
              />

              <div className="row" style={{ justifyContent: 'flex-end', marginTop: '22px', gap: '10px' }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setUserModalOpen(false)}
                  disabled={isSubmittingUserAction}
                >
                  {language === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  className="btn main"
                  style={{ background: userModalTab === 'LOCK' && !lockStatus ? '#8E2A22' : 'var(--acc)' }}
                  disabled={isSubmittingUserAction}
                >
                  {isSubmittingUserAction
                    ? (language === 'en' ? 'Processing...' : 'Đang xử lý...')
                    : userModalTab === 'LOCK'
                    ? lockStatus
                      ? (language === 'en' ? 'Confirm Unlock' : 'Xác nhận mở khóa')
                      : (language === 'en' ? 'Confirm Lock Account' : 'Xác nhận khóa tài khoản')
                    : (language === 'en' ? 'Submit Request to Owner' : 'Gửi yêu cầu lên Chủ sở hữu')}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminAuditLog;

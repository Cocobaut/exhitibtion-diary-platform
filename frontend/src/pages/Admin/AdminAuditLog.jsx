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
  const [actionReason, setActionReason] = useState('Phát tán nội dung vi phạm tiêu chuẩn cộng đồng');
  const [isSubmittingUserAction, setIsSubmittingUserAction] = useState(false);

  // Action display mapping
  const actionMap = {
    CREATE_DIRECT: { label: language === 'en' ? 'STUDIO PUBLISH' : 'XUẤT BẢN STUDIO', badgeClass: 'b-priv', color: '#5B4EB5' },
    APPROVE: { label: language === 'en' ? 'APPROVE' : 'PHÊ DUYỆT', badgeClass: 'b-ok', color: '#2D7D46' },
    APPROVE_AND_UPLOAD_MEDIA: { label: language === 'en' ? 'APPROVE & UPLOAD' : 'DUYỆT & TẢI ẢNH', badgeClass: 'b-ok', color: '#2D7D46' },
    REJECT: { label: language === 'en' ? 'REJECT' : 'TỪ CHỐI', badgeClass: 'b-wait', color: '#C44B2B' },
    ARCHIVE: { label: language === 'en' ? 'ARCHIVE' : 'LƯU TRỮ (GỠ BÀI)', badgeClass: 'b-wait', color: '#888888' },
    UPDATE: { label: language === 'en' ? 'UPDATE' : 'CHỈNH SỬA', badgeClass: 'b-blue', color: '#1B6FB5' },
    REQUEST_DELETE_USER: { label: language === 'en' ? 'REQUEST DELETE USER' : 'YÊU CẦU XÓA USER', badgeClass: 'b-wait', color: '#D97706' },
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
          alert('Vui lòng nhập ID người dùng cần thay đổi trạng thái.');
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
              ? '✦ Đã mở khóa tài khoản người dùng thành công.'
              : 'Đã khóa tài khoản người dùng vi phạm.'
          );
        }
      } else {
        // REQUEST_DELETE
        if (!targetUsername.trim() || !targetEmail.trim()) {
          alert('Theo quy tắc bảo mật danh tính, bắt buộc phải nhập chính xác Username và Email của tài khoản.');
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
          triggerToast('✦ Đã gửi yêu cầu xóa tài khoản lên Chủ sở hữu (Owner) chờ phê duyệt.');
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
      alert(`Lỗi: ${msg}`);
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
      <div className="row between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '18px' }}>
        <div>
          <div style={{ fontSize: '12px', letterSpacing: '.15em', fontWeight: 600, color: 'var(--acc)' }}>
            NHẬT KÝ KIỂM TOÁN HỆ THỐNG
          </div>
          <h2 style={{ fontSize: '24px', margin: '4px 0 0' }}>Lịch sử thao tác quản trị ({totalLogs})</h2>
        </div>

        <div className="row" style={{ gap: '10px' }}>
          <button
            type="button"
            className="btn line sm"
            onClick={() => setUserModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Icon name="bell" size={15} /> Xử lý người dùng vi phạm
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="row between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div className="row" style={{ gap: '10px', alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: '13px' }}>Hành động:</span>
          <select
            className="inp"
            style={{ width: '220px', padding: '6px 10px', fontSize: '13px' }}
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="ALL">Tất cả hành động</option>
            <option value="APPROVE">Phê duyệt (APPROVE)</option>
            <option value="REJECT">Từ chối (REJECT)</option>
            <option value="ARCHIVE">Lưu trữ (ARCHIVE)</option>
            <option value="CREATE_DIRECT">Xuất bản Studio (CREATE_DIRECT)</option>
            <option value="APPROVE_AND_UPLOAD_MEDIA">Duyệt &amp; Tải ảnh</option>
            <option value="REQUEST_DELETE_USER">Yêu cầu xóa tài khoản</option>
          </select>

          <span className="muted" style={{ fontSize: '13px', marginLeft: '6px' }}>Phòng:</span>
          <select
            className="inp"
            style={{ width: '170px', padding: '6px 10px', fontSize: '13px' }}
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
          >
            <option value="ALL">Tất cả phòng</option>
            <option value="1">Phòng 1 (Đổ vỡ)</option>
            <option value="2">Phòng 2 (Lồng đèn)</option>
            <option value="3">Phòng 3 (Cây thông điệp)</option>
          </select>
        </div>

        {isLoading && <span className="muted" style={{ fontSize: '13px' }}>Đang tải nhật ký...</span>}
      </div>

      {/* Audit Log Table */}
      <table className="at">
        <thead>
          <tr>
            <th style={{ width: '150px' }}>Thời gian</th>
            <th style={{ width: '170px' }}>Quản trị viên</th>
            <th style={{ width: '150px' }}>Hành động</th>
            <th style={{ width: '120px' }}>Không gian</th>
            <th>Tác phẩm / Đối tượng</th>
            <th>Ghi chú &amp; Chi tiết kiểm toán</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                Không tìm thấy bản ghi nhật ký kiểm toán nào
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
                'Hệ thống';

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
                    {log.room_code ? `Phòng ${log.room_id} (${log.room_code})` : log.room_id ? `Phòng ${log.room_id}` : 'Toàn hệ thống'}
                  </td>
                  <td style={{ maxWidth: '240px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                      {log.artwork_title || `Tác phẩm #${log.artwork_id || log.target_id || ''}`}
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
              <Icon name="x" size={22} />
            </span>

            <h2 style={{ fontSize: '24px' }}>Xử lý tài khoản người dùng vi phạm</h2>
            <div className="sub">
              Admin có quyền khóa tài khoản vi phạm. Để xóa vĩnh viễn dữ liệu, hãy gửi phiếu yêu cầu lên Chủ sở hữu (Owner).
            </div>

            {/* Segment Switcher */}
            <div className="seg" style={{ marginBottom: '18px' }}>
              <span
                className={userModalTab === 'LOCK' ? 'on' : ''}
                onClick={() => setUserModalTab('LOCK')}
              >
                Khóa / Mở khóa tài khoản
              </span>
              <span
                className={userModalTab === 'REQUEST_DELETE' ? 'on' : ''}
                onClick={() => setUserModalTab('REQUEST_DELETE')}
              >
                Gửi yêu cầu xóa lên Owner
              </span>
            </div>

            <form onSubmit={handleUserActionSubmit}>
              {userModalTab === 'LOCK' ? (
                <>
                  <div className="fieldl">ID người dùng (User UUID)</div>
                  <input
                    className="inp"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="Nhập ID tài khoản cần thay đổi trạng thái..."
                    required
                  />

                  <div className="fieldl" style={{ marginTop: '12px' }}>Trạng thái áp dụng</div>
                  <div className="row" style={{ gap: '10px' }}>
                    <label className="row" style={{ gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                      <input
                        type="radio"
                        name="lockStatus"
                        checked={lockStatus === false}
                        onChange={() => setLockStatus(false)}
                      />
                      <span>Khóa tài khoản (Chặn truy cập)</span>
                    </label>
                    <label className="row" style={{ gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                      <input
                        type="radio"
                        name="lockStatus"
                        checked={lockStatus === true}
                        onChange={() => setLockStatus(true)}
                      />
                      <span>Mở khóa tài khoản</span>
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
                    🛡️ <b>Ràng buộc bảo mật danh tính:</b> Nhập chính xác cả Username và Email để hệ thống đối chiếu xác minh trước khi chuyển tiếp lên Owner.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div className="fieldl">Tên người dùng (Username)</div>
                      <input
                        className="inp"
                        value={targetUsername}
                        onChange={(e) => setTargetUsername(e.target.value)}
                        placeholder="Ví dụ: spammer_001"
                        required
                      />
                    </div>
                    <div>
                      <div className="fieldl">Email đã đăng ký</div>
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

                  <div className="fieldl" style={{ marginTop: '12px' }}>ID người dùng (Tùy chọn nếu có)</div>
                  <input
                    className="inp"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="User UUID..."
                  />
                </>
              )}

              <div className="fieldl" style={{ marginTop: '12px' }}>Lý do xử lý</div>
              <textarea
                className="inp area"
                style={{ minHeight: '90px', fontSize: '14px', fontFamily: 'var(--sans)' }}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Ghi rõ lý do và hành vi vi phạm..."
                required
              />

              <div className="row" style={{ justifyContent: 'flex-end', marginTop: '22px', gap: '10px' }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setUserModalOpen(false)}
                  disabled={isSubmittingUserAction}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn main"
                  style={{ background: userModalTab === 'LOCK' && !lockStatus ? '#8E2A22' : 'var(--acc)' }}
                  disabled={isSubmittingUserAction}
                >
                  {isSubmittingUserAction
                    ? 'Đang xử lý...'
                    : userModalTab === 'LOCK'
                    ? lockStatus
                      ? 'Xác nhận mở khóa'
                      : 'Xác nhận khóa tài khoản'
                    : 'Gửi yêu cầu lên Owner'}
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

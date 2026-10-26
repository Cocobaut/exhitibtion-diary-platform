import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/common/Icons';
import { useAuth } from '../../context/AuthContext';
import { ownerService } from '../../services/ownerService';
import { adminStudioService } from '../../services/adminStudioService';
import { UserRoleManagementModal } from './UserRoleManagementModal';

export function OwnerDashboardPage({ onNavigate }) {
  const { user, isOwner } = useAuth();

  const [activeSegment, setActiveSegment] = useState(0); // 0: Danh sách người dùng, 1: Yêu cầu xóa từ Admin, 2: Nhật ký kiểm toán Owner
  const [toastMessage, setToastMessage] = useState('');

  // -------------------------------------------------------------
  // System Stats State
  // -------------------------------------------------------------
  const [stats, setStats] = useState(null);

  // -------------------------------------------------------------
  // User Management State (Segment 0)
  // -------------------------------------------------------------
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // -------------------------------------------------------------
  // Deletion Requests State (Segment 1)
  // -------------------------------------------------------------
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // -------------------------------------------------------------
  // Owner Audit Logs (Segment 2)
  // -------------------------------------------------------------
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  // -------------------------------------------------------------
  // Load System Stats
  // -------------------------------------------------------------
  const loadStats = useCallback(async () => {
    try {
      const res = await ownerService.getSystemStats();
      setStats(res?.data || res);
    } catch (err) {
      console.warn('Could not load system stats:', err);
    }
  }, []);

  // -------------------------------------------------------------
  // Load Users List
  // -------------------------------------------------------------
  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const roleParam = filterRole === 'ALL' ? null : filterRole;
      const statusParam =
        filterStatus === 'ACTIVE' ? true : filterStatus === 'LOCKED' ? false : null;

      const res = await ownerService.getUsers({
        role: roleParam,
        is_active: statusParam,
        q: searchQuery.trim() || undefined,
        page,
        limit: 30,
      });

      const data = res?.data || res;
      setUsers(data?.items || []);
      setTotalUsers(data?.pagination?.total_items ?? data?.items?.length ?? 0);
    } catch (err) {
      console.warn('Could not load users list:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [filterRole, filterStatus, searchQuery, page]);

  // -------------------------------------------------------------
  // Load Deletion Requests (from Audit Logs action REQUEST_DELETE_USER)
  // -------------------------------------------------------------
  const loadDeletionRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const res = await adminStudioService.getAuditLogs({
        action_type: 'REQUEST_DELETE_USER',
        limit: 50,
      });
      const data = res?.data || res;
      setDeletionRequests(data?.items || []);
    } catch (err) {
      console.warn('Could not load deletion requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  // -------------------------------------------------------------
  // Load Owner Audit Logs
  // -------------------------------------------------------------
  const loadAuditLogs = useCallback(async () => {
    setIsLoadingAudit(true);
    try {
      const res = await adminStudioService.getAuditLogs({ limit: 50 });
      const data = res?.data || res;
      setAuditLogs(data?.items || []);
    } catch (err) {
      console.warn('Could not load audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeSegment === 0) {
      loadUsers();
    } else if (activeSegment === 1) {
      loadDeletionRequests();
    } else if (activeSegment === 2) {
      loadAuditLogs();
    }
  }, [activeSegment, loadUsers, loadDeletionRequests, loadAuditLogs]);

  // -------------------------------------------------------------
  // Actions: Role Change
  // -------------------------------------------------------------
  const handleConfirmRoleChange = async ({ userId, newRole }) => {
    if (userId === user?.id) {
      alert('Chủ sở hữu không thể tự thay đổi vai trò của chính mình.');
      return;
    }

    setIsUpdatingRole(true);
    try {
      await ownerService.updateUserRole(userId, { role: newRole });
      triggerToast(`✦ Đã cập nhật thành công vai trò của tài khoản thành ${newRole}.`);
      setSelectedUserForRole(null);
      loadUsers();
      loadStats();
    } catch (err) {
      console.error('Error updating role:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể đổi vai trò lúc này.';
      alert(`Lỗi: ${msg}`);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // -------------------------------------------------------------
  // Actions: Toggle Active/Lock Status
  // -------------------------------------------------------------
  const handleToggleUserStatus = async (targetUser) => {
    if (targetUser.id === user?.id) {
      alert('Chủ sở hữu không thể tự vô hiệu hóa tài khoản của chính mình.');
      return;
    }

    if (targetUser.role === 'OWNER') {
      alert('Không thể thay đổi trạng thái của tài khoản Chủ sở hữu khác.');
      return;
    }

    const newStatus = !targetUser.is_active;
    const confirmPrompt = window.confirm(
      newStatus
        ? `Bạn có chắc muốn MỞ KHÓA cho tài khoản @${targetUser.username}?`
        : `Bạn có chắc muốn KHÓA tài khoản @${targetUser.username}? Phiên làm việc của tài khoản sẽ bị vô hiệu ngay lập tức.`
    );
    if (!confirmPrompt) return;

    try {
      await ownerService.updateUserStatus(targetUser.id, {
        is_active: newStatus,
        reason: newStatus
          ? 'Chủ sở hữu mở khóa tài khoản'
          : 'Chủ sở hữu vô hiệu hóa tài khoản do vi phạm',
      });

      triggerToast(
        newStatus
          ? `✦ Đã mở khóa thành công tài khoản @${targetUser.username}.`
          : `Đã khóa tài khoản @${targetUser.username}.`
      );

      loadUsers();
      loadStats();
    } catch (err) {
      console.error('Error toggling user status:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể thay đổi trạng thái.';
      alert(`Lỗi: ${msg}`);
    }
  };

  // -------------------------------------------------------------
  // Actions: Hard Delete User
  // -------------------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    if (deletingUser.id === user?.id) {
      alert('Chủ sở hữu không thể tự xóa tài khoản của chính mình.');
      return;
    }

    if (deletingUser.role === 'OWNER') {
      alert('Không thể xóa tài khoản của Chủ sở hữu.');
      return;
    }

    setIsDeleting(true);
    try {
      await ownerService.deleteUser(deletingUser.id);
      triggerToast(`Đã xóa vĩnh viễn tài khoản @${deletingUser.username} khỏi hệ thống.`);
      setDeletingUser(null);
      loadUsers();
      loadStats();
      if (activeSegment === 1) {
        loadDeletionRequests();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể xóa tài khoản lúc này.';
      alert(`Lỗi: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // Actions: View User Detail
  // -------------------------------------------------------------
  const handleOpenUserDetail = async (targetUser) => {
    setIsLoadingDetail(true);
    setSelectedUserDetail(targetUser);
    try {
      const res = await ownerService.getUserDetail(targetUser.id);
      setSelectedUserDetail(res?.data || res);
    } catch (err) {
      console.warn('Could not load user full details:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  // Strict role guard: Only OWNER is permitted
  if (!isOwner && user?.role !== 'OWNER') {
    return (
      <div className="stage admin" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="box" style={{ padding: '36px', textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ fontSize: '24px', margin: '0 0 10px' }}>Yêu cầu quyền Chủ sở hữu (Owner)</h2>
          <p className="muted" style={{ lineHeight: 1.6, fontSize: '14.5px' }}>
            Khu vực này được bảo vệ nghiêm ngặt và chỉ dành riêng cho tài khoản có vai trò <b>OWNER</b> tối cao của nền tảng.
          </p>
          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="btn main"
              onClick={() => (onNavigate ? onNavigate('home') : window.location.reload())}
            >
              Quay về Sảnh chính
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stage admin">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            zIndex: 9999,
            background: 'var(--ink)',
            color: 'var(--paper)',
            padding: '12px 22px',
            borderRadius: '10px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            fontSize: '14.5px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="abs" style={{ left: '32px', right: '32px', top: '22px' }}>
        <div className="row between">
          <div>
            <div
              style={{
                fontSize: '12px',
                letterSpacing: '.25em',
                fontWeight: 700,
                color: '#B57424',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>👑</span> QUẢN TRỊ TỐI CAO · CHỦ SỞ HỮU (OWNER)
            </div>
            <h1 style={{ margin: '4px 0 0' }}>Bảng Điều Hành &amp; Phân Quyền Toàn Hệ Thống</h1>
          </div>

          <div className="row" style={{ gap: '14px' }}>
            <span className="badge" style={{ background: '#B57424', color: '#fff', fontSize: '13px' }}>
              Chủ sở hữu: {user?.nickname || user?.username}
            </span>
          </div>
        </div>

        {/* 4-Card System Stats Metric Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '14px',
            marginTop: '16px',
          }}
        >
          <div className="box stat">
            <small>NGƯỜI DÙNG &amp; NHÂN SỰ</small>
            <b>{stats?.users_summary?.total_users ?? totalUsers}</b>
            <small>
              {stats?.users_summary?.by_role?.ADMIN ?? 0} Admins ·{' '}
              {stats?.users_summary?.by_role?.OWNER ?? 1} Owner
            </small>
          </div>

          <div className="box stat">
            <small>TRẠNG THÁI TÀI KHOẢN</small>
            <b style={{ color: '#2D7D46' }}>
              {stats?.users_summary?.active_users ?? totalUsers}
            </b>
            <small style={{ color: stats?.users_summary?.deactivated_users > 0 ? '#C44B2B' : 'var(--muted)' }}>
              {stats?.users_summary?.deactivated_users ?? 0} tài khoản bị khóa
            </small>
          </div>

          <div className="box stat">
            <small>TÁC PHẨM TRIỂN LÃM</small>
            <b>{stats?.exhibition_summary?.total_artworks ?? 0}</b>
            <small>
              {stats?.exhibition_summary?.approved_artworks ?? 0} đang treo ·{' '}
              {stats?.exhibition_summary?.pending_artworks ?? 0} chờ duyệt
            </small>
          </div>

          <div className="box stat">
            <small>NHẬT KÝ &amp; HÒM THƯ</small>
            <b>{stats?.diaries_summary?.total_diaries ?? 0}</b>
            <small>
              {stats?.capsules_summary?.total_capsules ?? 0} thông điệp ·{' '}
              {stats?.capsules_summary?.total_draws ?? 0} lượt rút
            </small>
          </div>
        </div>

        {/* Segment Switcher */}
        <div className="seg" style={{ marginTop: '16px' }}>
          <span
            className={activeSegment === 0 ? 'on' : ''}
            onClick={() => setActiveSegment(0)}
          >
            Danh sách người dùng &amp; Admin · {totalUsers}
          </span>
          <span
            className={activeSegment === 1 ? 'on' : ''}
            onClick={() => setActiveSegment(1)}
          >
            Yêu cầu xóa tài khoản từ Admin {deletionRequests.length > 0 && `· ${deletionRequests.length}`}
          </span>
          <span
            className={activeSegment === 2 ? 'on' : ''}
            onClick={() => setActiveSegment(2)}
          >
            Nhật ký kiểm toán toàn hệ thống
          </span>
        </div>
      </div>

      {/* SEGMENT 0: USER & ADMIN MANAGEMENT */}
      {activeSegment === 0 && (
        <div
          className="abs box"
          style={{
            left: '32px',
            right: '32px',
            top: '246px',
            bottom: '26px',
            overflowY: 'auto',
            padding: '18px 22px',
          }}
        >
          {/* Filters Bar */}
          <div className="row between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div className="row" style={{ gap: '10px', alignItems: 'center' }}>
              <div className="search" style={{ width: '280px', background: 'var(--paper)' }}>
                <Icon name="search" size={16} />
                <input
                  type="text"
                  placeholder="Tìm theo username, email, tên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <span className="muted" style={{ fontSize: '13px' }}>Vai trò:</span>
              <select
                className="inp"
                style={{ width: '130px', padding: '6px 10px', fontSize: '13px' }}
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="OWNER">OWNER</option>
              </select>

              <span className="muted" style={{ fontSize: '13px' }}>Trạng thái:</span>
              <select
                className="inp"
                style={{ width: '150px', padding: '6px 10px', fontSize: '13px' }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED">Bị khóa (Inactive)</option>
              </select>
            </div>

            {isLoadingUsers && <span className="muted" style={{ fontSize: '13px' }}>Đang tải người dùng...</span>}
          </div>

          {/* Users Table */}
          <table className="at">
            <thead>
              <tr>
                <th style={{ width: '220px' }}>Người dùng</th>
                <th style={{ width: '180px' }}>Email</th>
                <th style={{ width: '110px' }}>Vai trò</th>
                <th style={{ width: '130px' }}>Trạng thái</th>
                <th style={{ width: '110px' }}>Ngày tạo</th>
                <th style={{ textAlign: 'right' }}>Thao tác Chủ sở hữu</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    Không tìm thấy người dùng nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleStr = String(u.role || 'USER').toUpperCase();
                  const isCurrentSelf = u.id === user?.id;

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="row" style={{ gap: '10px', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: roleStr === 'OWNER' ? '#B57424' : roleStr === 'ADMIN' ? 'var(--acc)' : 'var(--line)',
                              color: '#fff',
                              display: 'grid',
                              placeItems: 'center',
                              fontWeight: 600,
                              fontSize: '13px',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (u.nickname || u.username || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                              {u.nickname || u.username} {isCurrentSelf && <small className="muted">(Bạn)</small>}
                            </div>
                            <div className="muted" style={{ fontSize: '12px' }}>@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="muted" style={{ fontSize: '13px' }}>{u.email}</td>
                      <td>
                        <span
                          className={`badge ${
                            roleStr === 'OWNER' ? 'b-wait' : roleStr === 'ADMIN' ? 'b-blue' : 'b-priv'
                          }`}
                          style={{
                            fontWeight: 700,
                            letterSpacing: '.05em',
                            background: roleStr === 'OWNER' ? '#B57424' : undefined,
                            color: roleStr === 'OWNER' ? '#fff' : undefined,
                          }}
                        >
                          {roleStr}
                        </span>
                      </td>
                      <td>
                        {u.is_active ? (
                          <span className="badge b-ok" style={{ fontSize: '11px' }}>HOẠT ĐỘNG</span>
                        ) : (
                          <span className="badge" style={{ background: '#8E2A22', color: '#fff', fontSize: '11px' }}>
                            BỊ KHÓA
                          </span>
                        )}
                      </td>
                      <td className="muted" style={{ fontSize: '12.5px' }}>{formatDate(u.created_at)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row" style={{ gap: '6px', justifyContent: 'flex-end' }}>
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            className="btn line sm"
                            onClick={() => handleOpenUserDetail(u)}
                            title="Xem chi tiết hoạt động"
                            style={{ padding: '4px 8px', fontSize: '12.5px' }}
                          >
                            Chi tiết
                          </button>

                          {/* Đổi vai trò (Không cho tự đổi role của chính mình) */}
                          <button
                            type="button"
                            className="btn line sm"
                            onClick={() => setSelectedUserForRole(u)}
                            disabled={isCurrentSelf || roleStr === 'OWNER'}
                            title={isCurrentSelf ? 'Không thể tự đổi vai trò của mình' : 'Thăng cấp / Hạ cấp vai trò'}
                            style={{ padding: '4px 8px', fontSize: '12.5px' }}
                          >
                            Đổi vai trò
                          </button>

                          {/* Khóa / Mở khóa */}
                          <button
                            type="button"
                            className={`btn line sm ${u.is_active ? 'danger' : ''}`}
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={isCurrentSelf || roleStr === 'OWNER'}
                            title={u.is_active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            style={{ padding: '4px 8px', fontSize: '12.5px' }}
                          >
                            {u.is_active ? 'Khóa' : 'Mở'}
                          </button>

                          {/* Xóa vĩnh viễn (Hard delete) */}
                          <button
                            type="button"
                            className="iconbtn danger"
                            onClick={() => setDeletingUser(u)}
                            disabled={isCurrentSelf || roleStr === 'OWNER'}
                            title="Xóa vĩnh viễn tài khoản khỏi hệ thống"
                            style={{ width: '28px', height: '28px', border: '1px solid var(--line)', background: 'var(--paper)' }}
                          >
                            <Icon name="x" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SEGMENT 1: DELETION REQUESTS QUEUE */}
      {activeSegment === 1 && (
        <div
          className="abs box"
          style={{
            left: '32px',
            right: '32px',
            top: '246px',
            bottom: '26px',
            overflowY: 'auto',
            padding: '20px 24px',
          }}
        >
          <div className="row between" style={{ marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', margin: 0 }}>Hàng đợi yêu cầu xóa tài khoản từ Quản trị viên</h3>
              <small className="muted">
                Admin không có quyền xóa trực tiếp tài khoản mà phải gửi phiếu yêu cầu có xác thực danh tính lên Chủ sở hữu.
              </small>
            </div>
            {isLoadingRequests && <span className="muted" style={{ fontSize: '13px' }}>Đang tải...</span>}
          </div>

          {deletionRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)' }}>
              <Icon name="check" size={32} />
              <div style={{ marginTop: '10px', fontWeight: 600 }}>Không có yêu cầu xóa tài khoản nào đang chờ duyệt</div>
              <small className="muted">Hệ thống đang hoạt động an toàn và ổn định</small>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {deletionRequests.map((req, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
                      <span className="badge" style={{ background: '#8E2A22', color: '#fff', fontSize: '11px' }}>
                        YÊU CẦU XÓA
                      </span>
                      <b style={{ fontSize: '15px' }}>{req.details || req.summary || req.note || 'Yêu cầu xóa tài khoản vi phạm'}</b>
                    </div>
                    <div className="muted" style={{ fontSize: '13px', marginTop: '6px' }}>
                      Admin gửi yêu cầu: <b>{req.created_by_admin?.nickname || 'Admin'}</b> · Thời gian: {formatDate(req.performed_at)}
                    </div>
                  </div>

                  <div className="row" style={{ gap: '10px' }}>
                    <button
                      type="button"
                      className="btn danger sm"
                      onClick={() => {
                        // Look up or prompt for target user id
                        const promptId = window.prompt(
                          'Nhập ID (UUID) của tài khoản cần xóa vĩnh viễn để xác nhận duyệt yêu cầu này:'
                        );
                        if (promptId && promptId.trim()) {
                          setDeletingUser({ id: promptId.trim(), username: 'mục tiêu yêu cầu xóa' });
                        }
                      }}
                    >
                      Duyệt xóa vĩnh viễn
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEGMENT 2: OWNER AUDIT LOGS */}
      {activeSegment === 2 && (
        <div
          className="abs box"
          style={{
            left: '32px',
            right: '32px',
            top: '246px',
            bottom: '26px',
            overflowY: 'auto',
            padding: '20px 24px',
          }}
        >
          <div className="row between" style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '18px', margin: 0 }}>Toàn bộ nhật ký kiểm toán hệ thống (Owner View)</h3>
            {isLoadingAudit && <span className="muted" style={{ fontSize: '13px' }}>Đang tải...</span>}
          </div>

          <table className="at">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Thời gian</th>
                <th style={{ width: '170px' }}>Người thực hiện</th>
                <th style={{ width: '140px' }}>Hành động</th>
                <th style={{ width: '120px' }}>Phòng</th>
                <th>Tác phẩm / Đối tượng</th>
                <th>Chi tiết kiểm toán</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log, i) => (
                <tr key={i}>
                  <td className="muted" style={{ fontSize: '12.5px' }}>{formatDate(log.performed_at)}</td>
                  <td><b>{log.created_by_admin?.nickname || log.admin_name || 'Hệ thống'}</b></td>
                  <td>
                    <span className="badge b-priv" style={{ fontSize: '11px' }}>
                      {log.action_type}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: '12.5px' }}>
                    {log.room_code ? `Phòng ${log.room_id}` : 'Hệ thống'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{log.artwork_title || `Đối tượng #${log.artwork_id || ''}`}</td>
                  <td className="muted" style={{ fontSize: '13px' }}>{log.details || log.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* USER ROLE MANAGEMENT MODAL */}
      <UserRoleManagementModal
        isOpen={Boolean(selectedUserForRole)}
        user={selectedUserForRole}
        isSubmitting={isUpdatingRole}
        onClose={() => setSelectedUserForRole(null)}
        onConfirmRoleChange={handleConfirmRoleChange}
      />

      {/* USER DETAIL MODAL */}
      {selectedUserDetail && (
        <>
          <div className="scrim" onClick={() => setSelectedUserDetail(null)} />
          <div className="panel" style={{ width: '540px', boxShadow: '0 25px 70px rgba(0,0,0,0.5)' }}>
            <span className="x" onClick={() => setSelectedUserDetail(null)} role="button" tabIndex={0}>
              <Icon name="x" size={22} />
            </span>

            <h2 style={{ fontSize: '24px' }}>Chi tiết tài khoản</h2>
            <div className="sub">
              Thông tin chi tiết và thống kê hoạt động trên toàn hệ thống bảo tàng.
            </div>

            <div style={{ background: 'var(--wall)', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)', marginBottom: '16px' }}>
              <div className="row" style={{ gap: '12px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'var(--acc)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: '18px',
                    overflow: 'hidden',
                  }}
                >
                  {selectedUserDetail.avatar_url ? (
                    <img src={selectedUserDetail.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (selectedUserDetail.nickname || selectedUserDetail.username || 'U')[0].toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>{selectedUserDetail.nickname}</div>
                  <div className="muted" style={{ fontSize: '13px' }}>@{selectedUserDetail.username} · {selectedUserDetail.email}</div>
                  <div style={{ marginTop: '4px' }}>
                    <span className="badge b-priv" style={{ fontSize: '11px' }}>Vai trò: {selectedUserDetail.role}</span>{' '}
                    <span className={`badge ${selectedUserDetail.is_active ? 'b-ok' : 'b-wait'}`} style={{ fontSize: '11px' }}>
                      {selectedUserDetail.is_active ? 'Đang hoạt động' : 'Bị khóa'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="fieldl">Thống kê hoạt động</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="box stat" style={{ padding: '12px' }}>
                <small>Tác phẩm</small>
                <b style={{ fontSize: '20px' }}>{selectedUserDetail.stats?.artworks_count ?? 0}</b>
              </div>
              <div className="box stat" style={{ padding: '12px' }}>
                <small>Nhật ký</small>
                <b style={{ fontSize: '20px' }}>{selectedUserDetail.stats?.diaries_count ?? 0}</b>
              </div>
              <div className="box stat" style={{ padding: '12px' }}>
                <small>Thông báo</small>
                <b style={{ fontSize: '20px' }}>{selectedUserDetail.stats?.notifications_count ?? 0}</b>
              </div>
            </div>

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '22px' }}>
              <button type="button" className="btn main" onClick={() => setSelectedUserDetail(null)}>
                Đóng
              </button>
            </div>
          </div>
        </>
      )}

      {/* HARD DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <>
          <div className="scrim" onClick={() => setDeletingUser(null)} />
          <div className="panel" style={{ width: '520px', boxShadow: '0 25px 70px rgba(0,0,0,0.5)' }}>
            <span className="x" onClick={() => setDeletingUser(null)} role="button" tabIndex={0}>
              <Icon name="x" size={22} />
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '26px' }}>⚠️</span>
              <h2 style={{ fontSize: '22px', margin: 0, color: '#C42B1C' }}>Xác nhận xóa vĩnh viễn tài khoản</h2>
            </div>

            <div className="sub" style={{ marginTop: '12px', lineHeight: 1.6 }}>
              Hành động này là <b>KHÔNG THỂ KHÔI PHỤC</b>. Toàn bộ tác phẩm, trang nhật ký, lượt tương tác và thông tin của tài khoản <b>@{deletingUser.username}</b> ({deletingUser.id}) sẽ bị dọn dẹp sạch sẽ khỏi cơ sở dữ liệu.
            </div>

            <div
              style={{
                marginTop: '16px',
                padding: '12px 14px',
                background: 'rgba(196, 43, 28, 0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(196, 43, 28, 0.25)',
                fontSize: '13.5px',
                color: '#8A180E',
              }}
            >
              Chỉ duy nhất Chủ sở hữu (Owner) mới có quyền thực hiện xóa vĩnh viễn tài khoản.
            </div>

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '24px', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn main"
                style={{ background: '#8E2A22' }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OwnerDashboardPage;

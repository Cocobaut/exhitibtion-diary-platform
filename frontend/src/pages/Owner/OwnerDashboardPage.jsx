import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/common/Icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ownerService } from '../../services/ownerService';
import { adminStudioService } from '../../services/adminStudioService';
import { aiCopilotService } from '../../services/aiCopilotService';
import { UserRoleManagementModal } from './UserRoleManagementModal';

export function OwnerDashboardPage({ onNavigate }) {
  const { user, isOwner } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [activeSegment, setActiveSegment] = useState(0); // 0: Users, 1: Deletion Requests, 2: Audit Logs
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

  // -------------------------------------------------------------
  // AI Copilot Configuration (Segment 3)
  // -------------------------------------------------------------
  const [aiSettings, setAiSettings] = useState(null);
  const [isLoadingAiSettings, setIsLoadingAiSettings] = useState(false);
  const [isSavingAiSettings, setIsSavingAiSettings] = useState(false);

  // Moderation form fields
  const [modEnabled, setModEnabled] = useState(true);
  const [modProvider, setModProvider] = useState('gemini');
  const [modApiKey, setModApiKey] = useState('');
  const [modModel, setModModel] = useState('');
  const [modBaseUrl, setModBaseUrl] = useState('');
  const [modDiscoveredModels, setModDiscoveredModels] = useState([]);
  const [isDiscoveringMod, setIsDiscoveringMod] = useState(false);

  // Image generation form fields
  const [imgEnabled, setImgEnabled] = useState(true);
  const [imgProvider, setImgProvider] = useState('gemini');
  const [imgApiKey, setImgApiKey] = useState('');
  const [imgModel, setImgModel] = useState('');
  const [imgBaseUrl, setImgBaseUrl] = useState('');
  const [imgDiscoveredModels, setImgDiscoveredModels] = useState([]);
  const [isDiscoveringImg, setIsDiscoveringImg] = useState(false);

  // Dùng chung một khóa cho duyệt bài và vẽ tranh
  const [useSameAiKey, setUseSameAiKey] = useState(true);

  // Master AI switch
  const [isMasterAiEnabled, setIsMasterAiEnabled] = useState(true);
  const [isTogglingMasterAi, setIsTogglingMasterAi] = useState(false);

  // API Key deletion confirmation modal state
  const [deletingApiKeyService, setDeletingApiKeyService] = useState(null); // 'moderation' | 'image_generation'
  const [isDeletingApiKey, setIsDeletingApiKey] = useState(false);

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

  // -------------------------------------------------------------
  // Load AI Settings (Segment 3)
  // -------------------------------------------------------------
  const loadAiSettings = useCallback(async () => {
    setIsLoadingAiSettings(true);
    try {
      const res = await aiCopilotService.getAiSettings();
      const data = res?.data || res;
      setAiSettings(data);
      if (data) {
        setIsMasterAiEnabled(data.is_ai_enabled ?? true);

        if (data.moderation) {
          setModEnabled(data.moderation.is_enabled ?? true);
          setModProvider(data.moderation.provider || 'gemini');
          setModModel(data.moderation.model_name || '');
          setModBaseUrl(data.moderation.base_url || '');
          setModApiKey('');
        }

        if (data.image_generation) {
          setImgEnabled(data.image_generation.is_enabled ?? true);
          setImgProvider(data.image_generation.provider || 'gemini');
          setImgModel(data.image_generation.model_name || '');
          setImgBaseUrl(data.image_generation.base_url || '');
          setImgApiKey('');
        }
      }
    } catch (err) {
      console.warn('Could not load AI settings:', err);
    } finally {
      setIsLoadingAiSettings(false);
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
    } else if (activeSegment === 3) {
      loadAiSettings();
    }
  }, [activeSegment, loadUsers, loadDeletionRequests, loadAuditLogs, loadAiSettings]);

  // -------------------------------------------------------------
  // AI Copilot Handlers (Segment 3)
  // -------------------------------------------------------------
  const handleToggleMasterAi = async (enable) => {
    setIsTogglingMasterAi(true);
    try {
      if (enable) {
        await aiCopilotService.activateAiService('all');
        setIsMasterAiEnabled(true);
        triggerToast(language === 'en' ? 'AI services enabled' : 'Đã bật trợ lý AI');
      } else {
        await aiCopilotService.deactivateAiService('all');
        setIsMasterAiEnabled(false);
        triggerToast(language === 'en' ? 'AI services paused' : 'Đã tạm dừng trợ lý AI');
      }
      await loadAiSettings();
    } catch (err) {
      console.error('Lỗi khi bật/tắt Master AI:', err);
      triggerToast('Không thể thay đổi trạng thái AI lúc này.');
    } finally {
      setIsTogglingMasterAi(false);
    }
  };

  const handleDiscoverModels = async (taskType) => {
    const isMod = taskType === 'moderation';
    const keyToTest = isMod || useSameAiKey ? modApiKey.trim() : imgApiKey.trim();
    const provider = isMod ? modProvider : imgProvider;
    const baseUrl = isMod ? modBaseUrl.trim() : imgBaseUrl.trim();

    if (!keyToTest && !(isMod || useSameAiKey ? aiSettings?.moderation?.is_key_configured : aiSettings?.image_generation?.is_key_configured)) {
      triggerToast(
        language === 'en'
          ? '⚠️ API Key is missing. Please enter an API Key to test and discover models.'
          : 'Chưa có khóa API. Hãy nhập khóa API để kiểm tra và tìm mô hình.'
      );
      return;
    }

    if (isMod) setIsDiscoveringMod(true);
    else setIsDiscoveringImg(true);

    try {
      const res = await aiCopilotService.discoverModels({
        api_key: keyToTest || 'KEEP_CURRENT_KEY',
        provider,
        task_type: taskType,
        base_url: baseUrl || null,
      });

      const data = res?.data || res;
      if (data?.discovered_models && data.discovered_models.length > 0) {
        if (isMod) {
          setModDiscoveredModels(data.discovered_models);
          if (data.recommended_model_id) setModModel(data.recommended_model_id);
          triggerToast(
            language === 'en'
              ? `✦ Successfully discovered ${data.discovered_models.length} model(s) for Moderation.`
              : `✦ Tìm thấy ${data.discovered_models.length} mô hình cho kiểm duyệt.`
          );
        } else {
          setImgDiscoveredModels(data.discovered_models);
          if (data.recommended_model_id) setImgModel(data.recommended_model_id);
          triggerToast(
            language === 'en'
              ? `✦ Successfully discovered ${data.discovered_models.length} model(s) for Image Generation.`
              : `✦ Tìm thấy ${data.discovered_models.length} mô hình cho sinh ảnh.`
          );
        }
      } else {
        triggerToast(
          language === 'en'
            ? 'Key verified, but no specific models were returned by the provider.'
            : 'Khóa API hợp lệ nhưng nhà cung cấp chưa trả về danh sách mô hình.'
        );
      }
    } catch (err) {
      console.error('Lỗi khi khám phá models:', err);
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Không kết nối được tới nhà cung cấp';
      triggerToast(msg);
    } finally {
      if (isMod) setIsDiscoveringMod(false);
      else setIsDiscoveringImg(false);
    }
  };

  const handleConfirmDeleteApiKey = async () => {
    if (!deletingApiKeyService) return;
    setIsDeletingApiKey(true);
    try {
      if (deletingApiKeyService === 'moderation') {
        await aiCopilotService.deleteModerationKey();
        triggerToast(
          language === 'en'
            ? '✦ Content Moderation API Key removed successfully.'
            : '✦ Đã xóa khóa API của dịch vụ kiểm duyệt.'
        );
      } else {
        await aiCopilotService.deleteImageGenKey();
        triggerToast(
          language === 'en'
            ? '✦ Image Generation API Key removed successfully.'
            : '✦ Đã xóa khóa API của dịch vụ sinh ảnh.'
        );
      }
      setDeletingApiKeyService(null);
      await loadAiSettings();
    } catch (err) {
      console.error('Lỗi khi xóa API Key:', err);
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Không thể xóa API Key.';
      triggerToast(msg);
    } finally {
      setIsDeletingApiKey(false);
    }
  };

  const handleSaveAllAiSettings = async () => {
    setIsSavingAiSettings(true);
    try {
      const payload = {
        is_ai_enabled: isMasterAiEnabled,
        moderation: {
          is_enabled: modEnabled,
          provider: modProvider,
          api_key: modApiKey.trim() || null,
          model_name: modModel.trim() || undefined,
          base_url: modBaseUrl.trim() || null,
        },
        image_generation: {
          is_enabled: imgEnabled,
          provider: imgProvider,
          api_key: (useSameAiKey ? modApiKey.trim() : imgApiKey.trim()) || null,
          model_name: imgModel.trim() || undefined,
          base_url: imgBaseUrl.trim() || null,
        },
      };

      await aiCopilotService.updateAiSettings(payload);
      triggerToast(
        language === 'en'
          ? '✦ All AI Copilot settings and API Keys saved successfully!'
          : '✦ Đã lưu cấu hình AI.'
      );
      setModApiKey('');
      setImgApiKey('');
      await loadAiSettings();
    } catch (err) {
      console.error('Lỗi khi cập nhật cấu hình AI:', err);
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Không thể lưu cấu hình AI';
      triggerToast(msg);
    } finally {
      setIsSavingAiSettings(false);
    }
  };

  // -------------------------------------------------------------
  // Actions: Role Change
  // -------------------------------------------------------------
  const handleConfirmRoleChange = async ({ userId, newRole, reason }) => {
    if (userId === user?.id) {
      triggerToast(
        language === 'en'
          ? 'Platform owner cannot alter their own role.'
          : 'Chủ sở hữu không thể tự thay đổi vai trò của chính mình.'
      );
      return;
    }

    setIsUpdatingRole(true);
    try {
      await ownerService.updateUserRole(userId, { role: newRole, reason });
      triggerToast(
        language === 'en'
          ? `Successfully updated account role to ${newRole}.`
          : `Đã cập nhật thành công vai trò của tài khoản thành ${newRole}.`
      );
      setSelectedUserForRole(null);
      loadUsers();
      loadStats();
    } catch (err) {
      console.error('Error updating role:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể đổi vai trò lúc này.';
      triggerToast(`[Lỗi] ${msg}`);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // -------------------------------------------------------------
  // Actions: Toggle Active/Lock Status
  // -------------------------------------------------------------
  const handleToggleUserStatus = async (targetUser) => {
    if (targetUser.id === user?.id) {
      triggerToast(
        language === 'en'
          ? 'Platform owner cannot deactivate their own account.'
          : 'Chủ sở hữu không thể tự vô hiệu hóa tài khoản của chính mình.'
      );
      return;
    }

    if (targetUser.role === 'OWNER') {
      triggerToast(
        language === 'en'
          ? 'Cannot alter the status of another Owner account.'
          : 'Không thể thay đổi trạng thái của tài khoản Chủ sở hữu khác.'
      );
      return;
    }

    const newStatus = !targetUser.is_active;
    const confirmPrompt = window.confirm(
      newStatus
        ? (language === 'en'
            ? `Are you sure you want to UNLOCK account @${targetUser.username}?`
            : `Bạn có chắc muốn MỞ KHÓA cho tài khoản @${targetUser.username}?`)
        : (language === 'en'
            ? `Are you sure you want to LOCK account @${targetUser.username}? Active sessions will be terminated immediately.`
            : `Bạn có chắc muốn KHÓA tài khoản @${targetUser.username}? Phiên làm việc của tài khoản sẽ bị vô hiệu ngay lập tức.`)
    );
    if (!confirmPrompt) return;

    try {
      await ownerService.updateUserStatus(targetUser.id, {
        is_active: newStatus,
        reason: newStatus
          ? (language === 'en' ? 'Owner unlocked user account' : 'Chủ sở hữu mở khóa tài khoản')
          : (language === 'en' ? 'Owner locked user account due to violation' : 'Chủ sở hữu vô hiệu hóa tài khoản do vi phạm'),
      });

      triggerToast(
        newStatus
          ? (language === 'en'
              ? `Successfully unlocked account @${targetUser.username}.`
              : `Đã mở khóa thành công tài khoản @${targetUser.username}.`)
          : (language === 'en'
              ? `Locked account @${targetUser.username}.`
              : `Đã khóa tài khoản @${targetUser.username}.`)
      );

      loadUsers();
      loadStats();
    } catch (err) {
      console.error('Error toggling user status:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể thay đổi trạng thái.';
      triggerToast(`[Lỗi] ${msg}`);
    }
  };

  // -------------------------------------------------------------
  // Actions: Hard Delete User
  // -------------------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    if (deletingUser.id === user?.id) {
      triggerToast(
        language === 'en'
          ? 'Platform owner cannot delete their own account.'
          : 'Chủ sở hữu không thể tự xóa tài khoản của chính mình.'
      );
      return;
    }

    if (deletingUser.role === 'OWNER') {
      triggerToast(
        language === 'en'
          ? 'Cannot delete an Owner account.'
          : 'Không thể xóa tài khoản của Chủ sở hữu.'
      );
      return;
    }

    setIsDeleting(true);
    try {
      await ownerService.deleteUser(deletingUser.id);
      triggerToast(
        language === 'en'
          ? `Permanently deleted account @${deletingUser.username} from system.`
          : `Đã xóa vĩnh viễn tài khoản @${deletingUser.username} khỏi hệ thống.`
      );
      setDeletingUser(null);
      loadUsers();
      loadStats();
      if (activeSegment === 1) {
        loadDeletionRequests();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể xóa tài khoản lúc này.';
      triggerToast(`[Lỗi] ${msg}`);
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
          <h2 className="serif" style={{ fontSize: '24px', margin: '0 0 10px', fontWeight: 600 }}>
            {language === 'en' ? 'Owner Access Required' : 'Cần quyền Chủ sở hữu'}
          </h2>
          <p className="muted" style={{ lineHeight: 1.6, fontSize: '14.5px' }}>
            {language === 'en'
              ? 'This area is strictly restricted to accounts with the supreme OWNER role on the platform.'
              : 'Khu vực này chỉ dành cho tài khoản Chủ sở hữu.'}
          </p>
          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="btn main"
              onClick={() => (onNavigate ? onNavigate('home') : window.location.reload())}
            >
              {language === 'en' ? 'Back to Main Lobby' : 'Quay về Sảnh chính'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="stage admin custom-scrollbar"
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '24px 32px 56px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
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

      {/* Top Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Title Row & Actions */}
        <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div
              style={{
                fontSize: '12px',
                letterSpacing: '.2em',
                fontWeight: 600,
                color: 'var(--acc)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Icon name="crown" size={15} />
              <span>{language === 'en' ? 'OWNER' : 'CHỦ SỞ HỮU'}</span>
            </div>
            <h1 className="serif" style={{ margin: '6px 0 0', fontSize: '28px', fontWeight: 600 }}>
              {language === 'en' ? 'Museum management' : 'Quản lý bảo tàng'}
            </h1>
          </div>

          <div className="row" style={{ gap: '14px', alignItems: 'center' }}>
            {/* Language Switcher */}
            <div className="lang glass" style={{ cursor: 'pointer', userSelect: 'none' }}>
              <b
                className={language === 'vi' ? 'on' : ''}
                onClick={() => setLanguage('vi')}
                title="Tiếng Việt"
              >
                VI
              </b>
              <b
                className={language === 'en' ? 'on' : ''}
                onClick={() => setLanguage('en')}
                title="English"
              >
                EN
              </b>
            </div>
          </div>
        </div>

        {/* 4-Card System Stats Metric Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
          }}
        >
          <div className="box stat">
            <small>{language === 'en' ? 'USERS' : 'NGƯỜI DÙNG'}</small>
            <b className="serif">{stats?.users_summary?.total_users ?? totalUsers}</b>
          </div>

          <div className="box stat">
            <small>{language === 'en' ? 'ACTIVE ACCOUNTS' : 'ĐANG HOẠT ĐỘNG'}</small>
            <b className="serif" style={{ color: '#2D7D46' }}>
              {stats?.users_summary?.active_users ?? totalUsers}
            </b>
          </div>

          <div className="box stat">
            <small>{language === 'en' ? 'ARTWORKS' : 'TÁC PHẨM'}</small>
            <b className="serif">{stats?.exhibition_summary?.total_artworks ?? 0}</b>
          </div>

          <div className="box stat">
            <small>{language === 'en' ? 'DIARIES' : 'NHẬT KÝ'}</small>
            <b className="serif">{stats?.diaries_summary?.total_diaries ?? 0}</b>
          </div>
        </div>

        {/* Segment Switcher */}
        <div className="seg" style={{ marginTop: '4px' }}>
          <span
            className={activeSegment === 0 ? 'on' : ''}
            onClick={() => setActiveSegment(0)}
          >
            {language === 'en' ? 'Users & Admins Directory' : 'Người dùng và quản trị viên'}
          </span>
          <span
            className={activeSegment === 1 ? 'on' : ''}
            onClick={() => setActiveSegment(1)}
          >
            {language === 'en' ? 'Account Deletion Requests' : 'Yêu cầu xóa tài khoản'}
          </span>
          <span
            className={activeSegment === 2 ? 'on' : ''}
            onClick={() => setActiveSegment(2)}
          >
            {language === 'en' ? 'System-wide Audit Logs' : 'Nhật ký hệ thống'}
          </span>
          <span
            className={activeSegment === 3 ? 'on' : ''}
            onClick={() => setActiveSegment(3)}
          >
            {language === 'en' ? 'AI Copilot Engine' : 'Cấu hình AI'}
          </span>
        </div>
      </div>

      {/* SEGMENT 0: USER & ADMIN MANAGEMENT */}
      {activeSegment === 0 && (
        <div className="box" style={{ padding: '20px 24px', width: '100%', boxSizing: 'border-box' }}>
          {/* Filters Bar */}
          <div className="row between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div className="row" style={{ gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="search" style={{ width: '280px', background: 'var(--paper)' }}>
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Search by username, email, name...' : 'Tìm theo tên đăng nhập, email, biệt danh...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <span className="muted" style={{ fontSize: '13px' }}>
                {language === 'en' ? 'Role:' : 'Vai trò:'}
              </span>
              <select
                className="inp"
                style={{ width: '130px', padding: '6px 10px', fontSize: '13px' }}
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">{language === 'en' ? 'All roles' : 'Tất cả vai trò'}</option>
                <option value="USER">{language === 'en' ? 'User' : 'Người dùng'}</option>
                <option value="ADMIN">{language === 'en' ? 'Admin' : 'Quản trị viên'}</option>
                <option value="OWNER">{language === 'en' ? 'Owner' : 'Chủ sở hữu'}</option>
              </select>

              <span className="muted" style={{ fontSize: '13px' }}>
                {language === 'en' ? 'Status:' : 'Trạng thái:'}
              </span>
              <select
                className="inp"
                style={{ width: '160px', padding: '6px 10px', fontSize: '13px' }}
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">{language === 'en' ? 'All' : 'Tất cả'}</option>
                <option value="ACTIVE">{language === 'en' ? 'Active' : 'Đang hoạt động'}</option>
                <option value="LOCKED">{language === 'en' ? 'Locked (Inactive)' : 'Bị khóa (Inactive)'}</option>
              </select>
            </div>

            {isLoadingUsers && (
              <span className="muted" style={{ fontSize: '13px' }}>
                {language === 'en' ? 'Loading users...' : 'Đang tải người dùng...'}
              </span>
            )}
          </div>

          {/* Users Table */}
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="at" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '200px' }}>{language === 'en' ? 'User' : 'Người dùng'}</th>
                  <th style={{ minWidth: '180px' }}>{language === 'en' ? 'Email' : 'Email'}</th>
                  <th style={{ minWidth: '100px' }}>{language === 'en' ? 'Role' : 'Vai trò'}</th>
                  <th style={{ minWidth: '120px' }}>{language === 'en' ? 'Status' : 'Trạng thái'}</th>
                  <th style={{ minWidth: '110px' }}>{language === 'en' ? 'Created At' : 'Ngày tạo'}</th>
                  <th style={{ textAlign: 'right', minWidth: '180px' }}>{language === 'en' ? 'Owner Actions' : 'Thao tác Chủ sở hữu'}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                      {language === 'en' ? 'No users matching the filters found' : 'Không tìm thấy người dùng nào phù hợp với bộ lọc'}
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
                                {u.nickname || u.username} {isCurrentSelf && <small className="muted">({language === 'en' ? 'You' : 'Bạn'})</small>}
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
                            <span className="badge b-ok" style={{ fontSize: '11px' }}>
                              {language === 'en' ? 'ACTIVE' : 'HOẠT ĐỘNG'}
                            </span>
                          ) : (
                            <span className="badge" style={{ background: '#8E2A22', color: '#fff', fontSize: '11px' }}>
                              {language === 'en' ? 'LOCKED' : 'BỊ KHÓA'}
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
                              title={language === 'en' ? 'View activity details' : 'Xem chi tiết hoạt động'}
                              style={{ padding: '4px 8px', fontSize: '12.5px' }}
                            >
                              {language === 'en' ? 'Details' : 'Chi tiết'}
                            </button>

                            {/* Đổi vai trò */}
                            <button
                              type="button"
                              className="btn line sm"
                              onClick={() => setSelectedUserForRole(u)}
                              disabled={isCurrentSelf || roleStr === 'OWNER'}
                              title={
                                isCurrentSelf
                                  ? (language === 'en' ? 'Cannot change own role' : 'Không thể tự đổi vai trò của mình')
                                  : (language === 'en' ? 'Promote / Demote role' : 'Thăng cấp / Hạ cấp vai trò')
                              }
                              style={{ padding: '4px 8px', fontSize: '12.5px' }}
                            >
                              {language === 'en' ? 'Change Role' : 'Đổi vai trò'}
                            </button>

                            {/* Khóa / Mở khóa */}
                            <button
                              type="button"
                              className={`btn line sm ${u.is_active ? 'danger' : ''}`}
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={isCurrentSelf || roleStr === 'OWNER'}
                              title={
                                u.is_active
                                  ? (language === 'en' ? 'Lock account' : 'Khóa tài khoản')
                                  : (language === 'en' ? 'Unlock account' : 'Mở khóa tài khoản')
                              }
                              style={{ padding: '4px 8px', fontSize: '12.5px' }}
                            >
                              {u.is_active ? (language === 'en' ? 'Lock' : 'Khóa') : (language === 'en' ? 'Unlock' : 'Mở')}
                            </button>

                            {/* Xóa vĩnh viễn (Hard delete) */}
                            <button
                              type="button"
                              className="btn line sm danger"
                              onClick={() => setDeletingUser(u)}
                              disabled={isCurrentSelf || roleStr === 'OWNER'}
                              title={language === 'en' ? 'Permanently delete user from system' : 'Xóa vĩnh viễn tài khoản khỏi hệ thống'}
                              style={{ padding: '4px 8px', fontSize: '12.5px' }}
                            >
                              {language === 'en' ? 'Delete' : 'Xóa'}
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

          {/* Pagination bar */}
          <div className="row between" style={{ marginTop: '16px', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span className="muted" style={{ fontSize: '13px' }}>
              {language === 'en'
                ? `Showing ${users.length} of ${totalUsers} users`
                : `Hiển thị ${users.length} / ${totalUsers} người dùng`}
            </span>
            <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn line sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {language === 'en' ? 'Previous' : 'Trước'}
              </button>
              <span className="muted" style={{ fontSize: '13px', padding: '0 6px' }}>
                {language === 'en' ? 'Page' : 'Trang'} {page}
              </span>
              <button
                type="button"
                className="btn line sm"
                disabled={users.length < 30}
                onClick={() => setPage((p) => p + 1)}
              >
                {language === 'en' ? 'Next' : 'Tiếp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEGMENT 1: DELETION REQUESTS QUEUE */}
      {activeSegment === 1 && (
        <div className="box" style={{ padding: '20px 24px', width: '100%', boxSizing: 'border-box' }}>
          <div className="row between" style={{ marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 className="serif" style={{ fontSize: '20px', margin: 0, fontWeight: 600 }}>
                {language === 'en'
                  ? 'Account Deletion Requests Queue from Admins'
                  : 'Hàng đợi yêu cầu xóa tài khoản từ Quản trị viên'}
              </h3>
              <small className="muted">
                {language === 'en'
                  ? 'Admins cannot directly delete user accounts; they must submit an authenticated deletion request to the Owner.'
                  : 'Quản trị viên không xóa trực tiếp được tài khoản, mà phải gửi yêu cầu có xác minh danh tính lên Chủ sở hữu.'}
              </small>
            </div>
            {isLoadingRequests && (
              <span className="muted" style={{ fontSize: '13px' }}>
                {language === 'en' ? 'Loading...' : 'Đang tải...'}
              </span>
            )}
          </div>

          {deletionRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)' }}>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>
                {language === 'en'
                  ? 'No account deletion requests waiting for approval'
                  : 'Không có yêu cầu xóa tài khoản nào đang chờ duyệt'}
              </div>
              <small className="muted" style={{ display: 'block', marginTop: '6px' }}>
                {language === 'en'
                  ? 'System is operating safely and stably'
                  : 'Hệ thống đang hoạt động an toàn và ổn định'}
              </small>
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
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
                      <span className="badge" style={{ background: '#8E2A22', color: '#fff', fontSize: '11px' }}>
                        {language === 'en' ? 'DELETION REQUEST' : 'YÊU CẦU XÓA'}
                      </span>
                      <b style={{ fontSize: '15px' }}>
                        {req.details || req.summary || req.note || (language === 'en' ? 'Request to delete violating account' : 'Yêu cầu xóa tài khoản vi phạm')}
                      </b>
                    </div>
                    <div className="muted" style={{ fontSize: '13px', marginTop: '6px' }}>
                      {language === 'en' ? 'Admin requested' : 'Người gửi yêu cầu'}: <b>{req.created_by_admin?.nickname || 'Admin'}</b> · {language === 'en' ? 'Time' : 'Thời gian'}: {formatDate(req.performed_at)}
                    </div>
                  </div>

                  <div className="row" style={{ gap: '10px' }}>
                    <button
                      type="button"
                      className="btn danger sm"
                      onClick={() => {
                        const promptId = window.prompt(
                          language === 'en'
                            ? 'Enter ID (UUID) of the account to permanently delete to approve this request:'
                            : 'Nhập mã của tài khoản cần xóa vĩnh viễn để xác nhận:'
                        );
                        if (promptId && promptId.trim()) {
                          setDeletingUser({
                            id: promptId.trim(),
                            username: language === 'en' ? 'requested deletion target' : 'mục tiêu yêu cầu xóa',
                          });
                        }
                      }}
                    >
                      {language === 'en' ? 'Approve Permanent Deletion' : 'Duyệt xóa vĩnh viễn'}
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
        <div className="box" style={{ padding: '20px 24px', width: '100%', boxSizing: 'border-box' }}>
          <div className="row between" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 className="serif" style={{ fontSize: '20px', margin: 0, fontWeight: 600 }}>
              {language === 'en'
                ? 'Complete System Audit Logs'
                : 'Toàn bộ nhật ký hệ thống'}
            </h3>
            {isLoadingAudit && (
              <span className="muted" style={{ fontSize: '13px' }}>
                {language === 'en' ? 'Loading...' : 'Đang tải...'}
              </span>
            )}
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="at" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>{language === 'en' ? 'Time' : 'Thời gian'}</th>
                  <th style={{ width: '170px' }}>{language === 'en' ? 'Performer' : 'Người thực hiện'}</th>
                  <th style={{ width: '140px' }}>{language === 'en' ? 'Action' : 'Hành động'}</th>
                  <th style={{ width: '120px' }}>{language === 'en' ? 'Room' : 'Phòng'}</th>
                  <th>{language === 'en' ? 'Artwork / Target' : 'Tác phẩm / Đối tượng'}</th>
                  <th>{language === 'en' ? 'Audit Details' : 'Chi tiết'}</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                      {language === 'en' ? 'No audit logs recorded yet' : 'Chưa có nhật ký nào'}
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log, i) => (
                    <tr key={i}>
                      <td className="muted" style={{ fontSize: '12.5px' }}>{formatDate(log.performed_at)}</td>
                      <td><b>{log.created_by_admin?.nickname || log.admin_name || (language === 'en' ? 'System' : 'Hệ thống')}</b></td>
                      <td>
                        <span className="badge b-priv" style={{ fontSize: '11px' }}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="muted" style={{ fontSize: '12.5px' }}>
                        {log.room_code ? `${language === 'en' ? 'Room' : 'Phòng'} ${log.room_id}` : (language === 'en' ? 'System' : 'Hệ thống')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.artwork_title || `${language === 'en' ? 'Target' : 'Đối tượng'} #${log.artwork_id || ''}`}</td>
                      <td className="muted" style={{ fontSize: '13px' }}>{log.details || log.note || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEGMENT 3: AI SETTINGS */}
      {activeSegment === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '880px' }}>
          {/* Trạng thái chung */}
          <div className="box" style={{ padding: '20px 24px' }}>
            <div className="row between" style={{ flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
              <div style={{ flex: '1 1 360px', minWidth: 0 }}>
                <div className="row" style={{ gap: '10px', alignItems: 'center' }}>
                  <h2 className="serif" style={{ fontSize: '20px', margin: 0, fontWeight: 600 }}>
                    {language === 'en' ? 'AI assistant' : 'Trợ lý AI'}
                  </h2>
                  <span className={`badge ${isMasterAiEnabled ? 'b-ok' : 'b-wait'}`} style={{ fontSize: '11px' }}>
                    {isMasterAiEnabled ? (language === 'en' ? 'On' : 'Đang bật') : (language === 'en' ? 'Off' : 'Đang tắt')}
                  </span>
                </div>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: '13.5px', lineHeight: 1.5 }}>
                  {language === 'en'
                    ? 'Helps admins review posts, translate them and draw illustrations. Admins always make the final call.'
                    : 'Giúp quản trị viên duyệt bài, dịch bài và vẽ tranh minh họa. Quyết định cuối cùng vẫn do quản trị viên.'}
                </p>
              </div>
              <button
                type="button"
                className={`btn ${isMasterAiEnabled ? 'line' : 'main'}`}
                onClick={() => handleToggleMasterAi(!isMasterAiEnabled)}
                disabled={isTogglingMasterAi}
                style={{ minWidth: '140px' }}
              >
                {isTogglingMasterAi
                  ? (language === 'en' ? 'Updating...' : 'Đang cập nhật...')
                  : isMasterAiEnabled
                    ? (language === 'en' ? 'Turn off' : 'Tắt AI')
                    : (language === 'en' ? 'Turn on' : 'Bật AI')}
              </button>
            </div>
          </div>

          {/* Bước 1: khóa API */}
          <div className="box" style={{ padding: '20px 24px' }}>
            <h3 className="serif" style={{ fontSize: '17px', margin: '0 0 4px', fontWeight: 600 }}>
              {language === 'en' ? '1. API key' : '1. Khóa API'}
            </h3>
            <p className="muted" style={{ margin: '0 0 14px', fontSize: '13.5px', lineHeight: 1.5 }}>
              {language === 'en' ? 'Get a free Gemini key at ' : 'Lấy khóa Gemini miễn phí tại '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--acc)' }}>
                Google AI Studio
              </a>
              {language === 'en' ? ', then paste it below. The key is encrypted before it is stored.' : ', rồi dán vào ô bên dưới. Khóa được mã hóa trước khi lưu.'}
            </p>

            <div className="row" style={{ gap: '10px', alignItems: 'center', marginBottom: '12px', fontSize: '13.5px', flexWrap: 'wrap' }}>
              <span className="muted">{language === 'en' ? 'Current key:' : 'Khóa hiện tại:'}</span>
              <b style={{ fontWeight: 600 }}>
                {aiSettings?.moderation?.masked_api_key || (language === 'en' ? 'none yet' : 'chưa có')}
              </b>
              {aiSettings?.moderation?.is_key_configured && (
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ color: '#C42B1C' }}
                  onClick={() => setDeletingApiKeyService('moderation')}
                >
                  {language === 'en' ? 'Remove' : 'Xóa khóa'}
                </button>
              )}
            </div>

            <div className="row" style={{ gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="password"
                className="inp"
                style={{ flex: '1 1 280px' }}
                placeholder={language === 'en' ? 'Paste a new key (leave empty to keep the current one)' : 'Dán khóa mới (để trống nếu giữ khóa cũ)'}
                value={modApiKey}
                onChange={(e) => setModApiKey(e.target.value)}
                autoComplete="off"
              />
              <button
                type="button"
                className="btn line"
                onClick={() => handleDiscoverModels('moderation')}
                disabled={isDiscoveringMod}
              >
                {isDiscoveringMod
                  ? (language === 'en' ? 'Checking...' : 'Đang kiểm tra...')
                  : (language === 'en' ? 'Check key' : 'Kiểm tra khóa')}
              </button>
            </div>

            <label className="row" style={{ gap: '8px', marginTop: '12px', fontSize: '13.5px', cursor: 'pointer' }}>
              <input type="checkbox" checked={useSameAiKey} onChange={(e) => setUseSameAiKey(e.target.checked)} />
              <span>{language === 'en' ? 'Use this key for drawing illustrations too' : 'Dùng khóa này cho cả việc vẽ tranh'}</span>
            </label>
          </div>

          {/* Bước 2: việc AI sẽ làm */}
          <div className="box" style={{ padding: '20px 24px' }}>
            <h3 className="serif" style={{ fontSize: '17px', margin: '0 0 12px', fontWeight: 600 }}>
              {language === 'en' ? '2. What AI helps with' : '2. Việc AI sẽ làm'}
            </h3>
            {[
              {
                on: modEnabled,
                set: setModEnabled,
                title: language === 'en' ? 'Review and translate posts' : 'Duyệt bài và dịch bài',
                desc: language === 'en'
                  ? 'Scores posts, suggests gentler wording and translates between Vietnamese and English.'
                  : 'Chấm điểm bài viết, gợi ý cách viết nhẹ nhàng hơn và dịch qua lại Việt Anh.',
              },
              {
                on: imgEnabled,
                set: setImgEnabled,
                title: language === 'en' ? 'Draw illustrations' : 'Vẽ tranh minh họa',
                desc: language === 'en'
                  ? 'Draws a picture for Room 1 posts based on the story.'
                  : 'Vẽ tranh cho bài ở Phòng 1 dựa trên nội dung câu chuyện.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="row between"
                style={{ gap: '16px', alignItems: 'center', padding: '12px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14.5px' }}>{item.title}</div>
                  <div className="muted" style={{ fontSize: '13px', marginTop: '2px' }}>{item.desc}</div>
                </div>
                <span
                  className={`tog ${item.on ? 'on' : ''}`}
                  role="switch"
                  aria-checked={item.on}
                  onClick={() => item.set(!item.on)}
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                />
              </div>
            ))}
          </div>

          {/* Tùy chỉnh nâng cao */}
          <details className="box" style={{ padding: '16px 24px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '14.5px' }}>
              {language === 'en' ? 'Advanced settings' : 'Tùy chỉnh nâng cao'}
              <span className="muted" style={{ fontWeight: 400, fontSize: '13px', marginLeft: '8px' }}>
                {language === 'en' ? 'provider and model, usually no need to change' : 'nhà cung cấp và mô hình, thường không cần đổi'}
              </span>
            </summary>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '16px' }}>
              {[
                {
                  key: 'moderation',
                  title: language === 'en' ? 'Review and translate' : 'Duyệt bài và dịch',
                  provider: modProvider, setProvider: setModProvider,
                  baseUrl: modBaseUrl, setBaseUrl: setModBaseUrl,
                  model: modModel, setModel: setModModel,
                  models: modDiscoveredModels,
                  providers: [['gemini', 'Google Gemini'], ['openai', 'OpenAI'], ['custom', language === 'en' ? 'Other (OpenAI-compatible)' : 'Khác (tương thích OpenAI)']],
                  placeholder: 'gemini-2.5-flash',
                },
                {
                  key: 'image_generation',
                  title: language === 'en' ? 'Draw illustrations' : 'Vẽ tranh',
                  provider: imgProvider, setProvider: setImgProvider,
                  baseUrl: imgBaseUrl, setBaseUrl: setImgBaseUrl,
                  model: imgModel, setModel: setImgModel,
                  models: imgDiscoveredModels,
                  providers: [['gemini', 'Google Gemini'], ['openai', 'OpenAI'], ['custom', language === 'en' ? 'Other (OpenAI-compatible)' : 'Khác (tương thích OpenAI)']],
                  placeholder: 'imagen-3.0-generate-002',
                },
              ].map((svc) => (
                <div key={svc.key}>
                  <div style={{ fontWeight: 600, marginBottom: '10px' }}>{svc.title}</div>

                  <div className="fieldl">{language === 'en' ? 'Provider' : 'Nhà cung cấp'}</div>
                  <select className="inp" value={svc.provider} onChange={(e) => svc.setProvider(e.target.value)}>
                    {svc.providers.map(([v, label]) => (
                      <option key={v} value={v}>{label}</option>
                    ))}
                  </select>

                  {svc.provider === 'custom' && (
                    <>
                      <div className="fieldl" style={{ marginTop: '10px' }}>{language === 'en' ? 'Server address' : 'Địa chỉ máy chủ'}</div>
                      <input
                        className="inp"
                        placeholder="https://..."
                        value={svc.baseUrl}
                        onChange={(e) => svc.setBaseUrl(e.target.value)}
                      />
                    </>
                  )}

                  <div className="fieldl" style={{ marginTop: '10px' }}>{language === 'en' ? 'Model' : 'Mô hình'}</div>
                  {svc.models.length > 0 ? (
                    <select className="inp" value={svc.model} onChange={(e) => svc.setModel(e.target.value)}>
                      {svc.models.map((m) => (
                        <option key={m.id} value={m.id}>{m.display_name || m.id}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="inp"
                      placeholder={svc.placeholder}
                      value={svc.model}
                      onChange={(e) => svc.setModel(e.target.value)}
                    />
                  )}

                  {svc.key === 'image_generation' && !useSameAiKey && (
                    <>
                      <div className="fieldl" style={{ marginTop: '10px' }}>
                        {language === 'en' ? 'Separate key for drawing' : 'Khóa riêng cho vẽ tranh'}
                        <span>{aiSettings?.image_generation?.masked_api_key || (language === 'en' ? 'none yet' : 'chưa có')}</span>
                      </div>
                      <input
                        type="password"
                        className="inp"
                        placeholder={language === 'en' ? 'Leave empty to keep the current one' : 'Để trống nếu giữ khóa cũ'}
                        value={imgApiKey}
                        onChange={(e) => setImgApiKey(e.target.value)}
                        autoComplete="off"
                      />
                    </>
                  )}

                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ marginTop: '10px' }}
                    onClick={() => handleDiscoverModels(svc.key)}
                    disabled={svc.key === 'moderation' ? isDiscoveringMod : isDiscoveringImg}
                  >
                    {language === 'en' ? 'Load model list' : 'Tải danh sách mô hình'}
                  </button>
                </div>
              ))}
            </div>
          </details>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn main"
              onClick={handleSaveAllAiSettings}
              disabled={isSavingAiSettings}
              style={{ minWidth: '180px', padding: '12px 24px', fontSize: '15px', fontWeight: 600 }}
            >
              {isSavingAiSettings
                ? (language === 'en' ? 'Saving...' : 'Đang lưu...')
                : (language === 'en' ? 'Save' : 'Lưu cài đặt')}
            </button>
          </div>
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
          <div
            className="scrim"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              zIndex: 9998,
            }}
            onClick={() => setSelectedUserDetail(null)}
          />
          <div
            className="panel"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '540px',
              maxWidth: '92vw',
              boxShadow: '0 25px 70px rgba(0,0,0,0.6)',
              zIndex: 9999,
            }}
          >
            <span className="x" onClick={() => setSelectedUserDetail(null)} role="button" tabIndex={0}>
              &times;
            </span>

            <h2 className="serif" style={{ fontSize: '24px', fontWeight: 600 }}>
              {language === 'en' ? 'Account Details' : 'Chi tiết tài khoản'}
            </h2>
            <div className="sub">
              {language === 'en'
                ? 'Detailed information and activity metrics across the museum platform.'
                : 'Thông tin chi tiết và thống kê hoạt động trên toàn hệ thống bảo tàng.'}
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
                    <span className="badge b-priv" style={{ fontSize: '11px' }}>
                      {language === 'en' ? 'Role' : 'Vai trò'}: {selectedUserDetail.role}
                    </span>{' '}
                    <span className={`badge ${selectedUserDetail.is_active ? 'b-ok' : 'b-wait'}`} style={{ fontSize: '11px' }}>
                      {selectedUserDetail.is_active
                        ? (language === 'en' ? 'Active' : 'Đang hoạt động')
                        : (language === 'en' ? 'Locked' : 'Bị khóa')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="fieldl">
              {language === 'en' ? 'Activity Metrics' : 'Thống kê hoạt động'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="box stat" style={{ padding: '12px' }}>
                <small>{language === 'en' ? 'Artworks' : 'Tác phẩm'}</small>
                <b className="serif" style={{ fontSize: '20px' }}>{selectedUserDetail.stats?.artworks_count ?? 0}</b>
              </div>
              <div className="box stat" style={{ padding: '12px' }}>
                <small>{language === 'en' ? 'Diaries' : 'Nhật ký'}</small>
                <b className="serif" style={{ fontSize: '20px' }}>{selectedUserDetail.stats?.diaries_count ?? 0}</b>
              </div>
              <div className="box stat" style={{ padding: '12px' }}>
                <small>{language === 'en' ? 'Notifications' : 'Thông báo'}</small>
                <b className="serif" style={{ fontSize: '20px' }}>{selectedUserDetail.stats?.notifications_count ?? 0}</b>
              </div>
            </div>

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '22px' }}>
              <button type="button" className="btn main" onClick={() => setSelectedUserDetail(null)}>
                {language === 'en' ? 'Close' : 'Đóng'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* HARD DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <>
          <div
            className="scrim"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              zIndex: 9998,
            }}
            onClick={() => setDeletingUser(null)}
          />
          <div
            className="panel"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '520px',
              maxWidth: '92vw',
              boxShadow: '0 25px 70px rgba(0,0,0,0.6)',
              zIndex: 9999,
            }}
          >
            <span className="x" onClick={() => setDeletingUser(null)} role="button" tabIndex={0}>
              &times;
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 className="serif" style={{ fontSize: '22px', margin: 0, color: '#C42B1C', fontWeight: 600 }}>
                {language === 'en' ? 'Confirm Permanent Account Deletion' : 'Xác nhận xóa vĩnh viễn tài khoản'}
              </h2>
            </div>

            <div className="sub" style={{ marginTop: '12px', lineHeight: 1.6 }}>
              {language === 'en' ? (
                <>
                  This action is <b>IRREVERSIBLE</b>. All artworks, diary entries, interactions, and profile data belonging to account <b>@{deletingUser.username}</b> ({deletingUser.id}) will be permanently wiped from the database.
                </>
              ) : (
                <>
                  Hành động này là <b>KHÔNG THỂ KHÔI PHỤC</b>. Toàn bộ tác phẩm, trang nhật ký, lượt tương tác và thông tin của tài khoản <b>@{deletingUser.username}</b> ({deletingUser.id}) sẽ bị dọn dẹp sạch sẽ khỏi cơ sở dữ liệu.
                </>
              )}
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
              {language === 'en'
                ? 'Only the Platform Owner has the authority to permanently delete user accounts.'
                : 'Chỉ Chủ sở hữu mới xóa vĩnh viễn được tài khoản.'}
            </div>

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '24px', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
              >
                {language === 'en' ? 'Cancel' : 'Hủy bỏ'}
              </button>
              <button
                type="button"
                className="btn main"
                style={{ background: '#8E2A22' }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting
                  ? (language === 'en' ? 'Deleting...' : 'Đang xóa...')
                  : (language === 'en' ? 'Confirm Permanent Deletion' : 'Xác nhận xóa vĩnh viễn')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* DELETE API KEY CONFIRMATION MODAL */}
      {deletingApiKeyService && (
        <>
          <div
            className="scrim"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              zIndex: 9998,
            }}
            onClick={() => !isDeletingApiKey && setDeletingApiKeyService(null)}
          />
          <div
            className="panel"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '520px',
              maxWidth: '92vw',
              boxShadow: '0 25px 70px rgba(0,0,0,0.6)',
              zIndex: 9999,
            }}
          >
            <span
              className="x"
              onClick={() => !isDeletingApiKey && setDeletingApiKeyService(null)}
              role="button"
              tabIndex={0}
            >
              &times;
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 className="serif" style={{ fontSize: '22px', margin: 0, color: '#C42B1C', fontWeight: 600 }}>
                {language === 'en' ? 'Confirm API Key Removal' : 'Xóa khóa API?'}
              </h2>
            </div>

            <div className="sub" style={{ marginTop: '14px', lineHeight: 1.6, fontSize: '14px' }}>
              {language === 'en' ? (
                <>
                  Are you sure you want to remove the API Key for{' '}
                  <b>{deletingApiKeyService === 'moderation' ? 'Content Moderation' : 'Art Image Generation'}</b> from the database?
                </>
              ) : (
                <>
                  Bạn có chắc chắn muốn xóa API Key của dịch vụ{' '}
                  <b>{deletingApiKeyService === 'moderation' ? 'Kiểm duyệt nội dung' : 'Sinh tranh minh họa nghệ thuật'}</b> khỏi cơ sở dữ liệu?
                </>
              )}
            </div>

            <div
              style={{
                marginTop: '16px',
                padding: '12px 14px',
                background: 'rgba(196, 43, 28, 0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(196, 43, 28, 0.25)',
                fontSize: '13px',
                color: '#8A180E',
                lineHeight: 1.5,
              }}
            >
              {language === 'en'
                ? 'This AI feature will be temporarily disabled until a new valid API key is saved. Other platform operations remain unaffected.'
                : 'Dịch vụ AI tương ứng sẽ tạm thời dừng hoạt động cho đến khi có API Key mới được thiết lập. Các hoạt động trưng bày và quản trị khác vẫn diễn ra bình thường.'}
            </div>

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '24px', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setDeletingApiKeyService(null)}
                disabled={isDeletingApiKey}
              >
                {language === 'en' ? 'Cancel' : 'Hủy bỏ'}
              </button>
              <button
                type="button"
                className="btn main"
                style={{ background: '#8E2A22' }}
                onClick={handleConfirmDeleteApiKey}
                disabled={isDeletingApiKey}
              >
                {isDeletingApiKey
                  ? (language === 'en' ? 'Removing...' : 'Đang xóa...')
                  : (language === 'en' ? 'Confirm Key Removal' : 'Xóa khóa')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OwnerDashboardPage;

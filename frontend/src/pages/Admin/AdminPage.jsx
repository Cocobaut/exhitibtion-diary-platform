import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/common/Icons';
import { CustomFilterDropdown } from '../../components/common/CustomFilterDropdown';
import { AdminPending } from './AdminPending';
import { AdminLive } from './AdminLive';
import { AdminCapsules } from './AdminCapsules';
import { AdminStudio } from './AdminStudio';
import { AdminAuditLog } from './AdminAuditLog';
import { AdminRejectModal } from './AdminRejectModal';
import { AdminPresenceIndicator } from '../../components/Admin/AdminPresenceIndicator';
import { adminRoomService } from '../../services/adminRoomService';
import { adminCapsuleService } from '../../services/adminCapsuleService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function AdminPage({ onOpenNotifications, onOpenThemeModal }) {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState(0); // 0: Phòng 1, 1: Phòng 2, 2: Phòng 3, 3: Kho thông điệp, 4: Studio, 5: Nhật ký quản trị
  const [statusSegment, setStatusSegment] = useState(0); // 0: Chờ phê duyệt, 1: Đang trưng bày, 2: Lưu trữ
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectArtwork, setSelectedRejectArtwork] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Dynamic counts for exhibition rooms & capsules
  const [roomPendingCounts, setRoomPendingCounts] = useState({ 1: 0, 2: 0, 3: 0 });
  const [capsuleCount, setCapsuleCount] = useState(0);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  // Fetch counts for all rooms & capsules
  const fetchCounts = useCallback(async () => {
    try {
      const [r1, r2, r3, capSummary] = await Promise.allSettled([
        adminRoomService.getPendingArtworks(1, { limit: 1 }),
        adminRoomService.getPendingArtworks(2, { limit: 1 }),
        adminRoomService.getPendingArtworks(3, { limit: 1 }),
        adminCapsuleService.getCapsuleCategories(),
      ]);

      const getCount = (res) => {
        if (res.status === 'fulfilled' && res.value) {
          const val = res.value?.data || res.value;
          return val?.pagination?.total ?? val?.pagination?.total_pending ?? val?.items?.length ?? 0;
        }
        return 0;
      };

      setRoomPendingCounts({
        1: getCount(r1),
        2: getCount(r2),
        3: getCount(r3),
      });

      if (capSummary.status === 'fulfilled' && capSummary.value) {
        const cData = capSummary.value?.data || capSummary.value;
        if (cData?.total_capsules !== undefined) {
          setCapsuleCount(cData.total_capsules);
        }
      }
    } catch (err) {
      console.warn('Could not load moderation counts:', err);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts, refreshTrigger]);

  // Map activeTab to Room ID (0 -> 1, 1 -> 2, 2 -> 3)
  const isRoomTab = activeTab >= 0 && activeTab <= 2;
  const currentRoomId = isRoomTab ? activeTab + 1 : 1;

  const tabs = [
    { name: t('admin_tab_r1'), count: roomPendingCounts[1] || 0 },
    { name: t('admin_tab_r2'), count: roomPendingCounts[2] || 0 },
    { name: t('admin_tab_r3'), count: roomPendingCounts[3] || 0 },
    { name: t('admin_tab_capsules'), count: capsuleCount || 0 },
    { name: t('admin_tab_studio'), count: 0 },
    { name: t('admin_tab_audit'), count: 0 },
  ];

  const handleOpenRejectModal = (artwork) => {
    setSelectedRejectArtwork(artwork);
    setShowRejectModal(true);
  };

  const handleConfirmReject = async ({ selectedReason, adminNote, artworkId }) => {
    if (!artworkId) return;
    setIsRejecting(true);
    try {
      await adminRoomService.rejectArtwork(currentRoomId, artworkId, {
        admin_note: adminNote,
        rejection_reason_tag: selectedReason,
      });

      triggerToast(language === 'en' ? 'Declined. The author was notified with your note.' : 'Đã từ chối và gửi lời nhắn tới tác giả.');
      setShowRejectModal(false);
      setSelectedRejectArtwork(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Error rejecting artwork:', err);
      const apiMsg =
        err?.response?.data?.message || err?.message || (language === 'en' ? 'Could not decline this artwork right now.' : 'Không thể từ chối tác phẩm lúc này.');
      alert(apiMsg);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleApproveSuccess = () => {
    triggerToast(language === 'en' ? '✦ Approved. The artwork is now on display.' : '✦ Đã duyệt, tác phẩm đang được trưng bày.');
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="stage admin" style={{ background: 'var(--wall)', transition: 'background 0.3s ease' }}>
      {/* Floating Toast Notification (Góc phải trên cùng) */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '28px',
            zIndex: 9999,
            background: 'rgba(28, 18, 14, 0.95)',
            border: '1.5px solid var(--gold)',
            color: '#FFF0D2',
            padding: '12px 22px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 12px 35px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="abs admin-top-header" style={{ left: '32px', right: '32px', top: '22px' }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                fontSize: '12px',
                letterSpacing: '.2em',
                fontWeight: 600,
                color: 'var(--acc)',
              }}
            >
              {language === 'en' ? 'ADMIN PANEL' : 'BẢNG QUẢN TRỊ'}
            </div>
            <h1 style={{ margin: '4px 0 0', fontSize: '26px', color: 'var(--ink)' }}>
              {language === 'en' ? 'Moderation & Exhibition' : 'Kiểm duyệt & trưng bày'}
            </h1>
          </div>

          <div className="row" style={{ gap: '14px', alignItems: 'center' }}>
            {/* Live Admin Team Presence Indicator */}
            <AdminPresenceIndicator />

            {/* Language Switcher (Desktop only >= 1025px, hidden on tablet & mobile) */}
            <div className="lang glass desktop-only-btn admin-lang-btn" style={{ cursor: 'pointer', userSelect: 'none' }}>
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

            {/* Theme Palette Switcher (Desktop only >= 1025px, hidden on tablet & mobile) */}
            <button
              type="button"
              className="iconbtn glass desktop-only-btn admin-theme-btn"
              style={{ cursor: 'pointer' }}
              title={language === 'en' ? 'Color theme' : 'Bảng màu nền'}
              onClick={onOpenThemeModal}
            >
              <Icon name="palette" size={20} />
            </button>

            {/* Notifications Bell */}
            <button
              type="button"
              className="iconbtn glass"
              style={{ cursor: 'pointer' }}
              onClick={onOpenNotifications}
              title={language === 'en' ? 'Notifications' : 'Thông báo'}
            >
              <Icon name="bell" size={20} />
            </button>
          </div>
        </div>

        {/* Global Tabs Navigation (Desktop >= 1025px) */}
        <div className="tabs desktop-only-chips" style={{ marginTop: '14px' }}>
          {tabs.map((t, i) => (
            <span
              key={i}
              className={i === activeTab ? 'on' : ''}
              onClick={() => {
                setActiveTab(i);
                setStatusSegment(0);
              }}
            >
              {t.name}
            </span>
          ))}
        </div>

        {/* 3 Viewports: Tablet Portrait, Mobile Landscape, Mobile Portrait (<= 1024px) */}
        {/* Button list dropdown chứa Room 1, Room 2, Room 3, mặc định là Room 1 */}
        <div className="mobile-filter-wrapper admin-tabs-filter-wrapper" style={{ marginTop: '14px' }}>
          <CustomFilterDropdown
            options={[
              {
                value: 0,
                label: `${t('admin_tab_r1')}${roomPendingCounts[1] > 0 ? ` (${roomPendingCounts[1]})` : ''}`,
              },
              {
                value: 1,
                label: `${t('admin_tab_r2')}${roomPendingCounts[2] > 0 ? ` (${roomPendingCounts[2]})` : ''}`,
              },
              {
                value: 2,
                label: `${t('admin_tab_r3')}${roomPendingCounts[3] > 0 ? ` (${roomPendingCounts[3]})` : ''}`,
              },
              {
                value: 3,
                label: `${t('admin_tab_capsules')}${capsuleCount > 0 ? ` (${capsuleCount})` : ''}`,
              },
              {
                value: 4,
                label: t('admin_tab_studio'),
              },
              {
                value: 5,
                label: t('admin_tab_audit'),
              },
            ]}
            value={activeTab}
            onChange={(val) => {
              setActiveTab(Number(val));
              setStatusSegment(0);
            }}
          />
        </div>
      </div>

      {/* Subtab Segment Switcher (for Exhibition Room tabs only) */}
      {isRoomTab && (
        <div className="abs admin-subtab-segment" style={{ left: '32px', top: '142px' }}>
          <div className="seg">
            <span
              className={statusSegment === 0 ? 'on' : ''}
              onClick={() => setStatusSegment(0)}
            >
              {t('admin_seg_pending')}
            </span>
            <span
              className={statusSegment === 1 ? 'on' : ''}
              onClick={() => setStatusSegment(1)}
            >
              {t('admin_seg_live')}
            </span>
            <span
              className={statusSegment === 2 ? 'on' : ''}
              onClick={() => setStatusSegment(2)}
            >
              {t('admin_seg_archive')}
            </span>
          </div>
        </div>
      )}

      {/* Main View Content */}
      {isRoomTab ? (
        statusSegment === 0 ? (
          <AdminPending
            key={`pending-${currentRoomId}-${refreshTrigger}`}
            roomId={currentRoomId}
            onOpenRejectModal={handleOpenRejectModal}
            onApproveSuccess={handleApproveSuccess}
            refreshTrigger={refreshTrigger}
            triggerToast={triggerToast}
          />
        ) : (
          <AdminLive
            key={`live-${currentRoomId}-${statusSegment}-${refreshTrigger}`}
            roomId={currentRoomId}
            statusSegment={statusSegment}
            onRefreshCounts={fetchCounts}
            triggerToast={triggerToast}
          />
        )
      ) : activeTab === 3 ? (
        <AdminCapsules
          triggerToast={triggerToast}
          onCapsulesUpdated={(count) => setCapsuleCount(count)}
        />
      ) : activeTab === 4 ? (
        <AdminStudio
          triggerToast={triggerToast}
          onPublished={() => fetchCounts()}
        />
      ) : activeTab === 5 ? (
        <AdminAuditLog
          triggerToast={triggerToast}
        />
      ) : (
        <div
          className="abs box"
          style={{
            left: '32px',
            right: '32px',
            top: '194px',
            bottom: '26px',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)',
            fontSize: '15px',
          }}
        >
          <div>{language === 'en' ? 'This section is not ready yet.' : 'Mục này đang được hoàn thiện.'}</div>
        </div>
      )}

      {/* Rejection Modal */}
      <AdminRejectModal
        isOpen={showRejectModal}
        artwork={selectedRejectArtwork}
        isSubmitting={isRejecting}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedRejectArtwork(null);
        }}
        onConfirmReject={handleConfirmReject}
      />
    </div>
  );
}

export default AdminPage;

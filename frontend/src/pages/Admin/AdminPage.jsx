import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/common/Icons';
import { AdminPending } from './AdminPending';
import { AdminLive } from './AdminLive';
import { AdminCapsules } from './AdminCapsules';
import { AdminStudio } from './AdminStudio';
import { AdminAuditLog } from './AdminAuditLog';
import { AdminRejectModal } from './AdminRejectModal';
import { adminRoomService } from '../../services/adminRoomService';
import { adminCapsuleService } from '../../services/adminCapsuleService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function AdminPage({ onOpenNotifications }) {
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

  // Fetch counts for all exhibition rooms and capsules
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
      fetchCounts();
    } catch (err) {
      console.error('Lỗi khi từ chối tác phẩm:', err);
      alert(err.message || (language === 'en' ? 'Could not decline this item.' : 'Không thể từ chối tác phẩm lúc này.'));
    } finally {
      setIsRejecting(false);
    }
  };

  const handleApproveSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    fetchCounts();
  };

  return (
    <div className="stage" style={{ background: 'var(--wall)' }}>
      {/* Top Header */}
      <div className="top">
        <div className="room-tag">
          <small>{t('admin_online_team')}</small>
          <b>{t('admin_title')}</b>
        </div>

        {/* Global Tab Navigation */}
        <div className="tabs">
          {tabs.map((tab, idx) => (
            <div
              key={idx}
              className={`tab ${activeTab === idx ? 'on' : ''}`}
              onClick={() => {
                setActiveTab(idx);
                // Reset sub-segment to Pending when entering room tab
                if (idx <= 2) setStatusSegment(0);
              }}
            >
              <span>{tab.name}</span>
              {tab.count > 0 && <span className="tab-badge">{tab.count}</span>}
            </div>
          ))}
        </div>

        <div className="row" style={{ gap: '10px' }}>
          <div className="lang glass">
            <b
              className={language === 'vi' ? 'on' : ''}
              onClick={() => setLanguage('vi')}
              style={{ cursor: 'pointer' }}
            >
              VI
            </b>
            <b
              className={language === 'en' ? 'on' : ''}
              onClick={() => setLanguage('en')}
              style={{ cursor: 'pointer' }}
            >
              EN
            </b>
          </div>

          <button
            type="button"
            className="iconbtn glass"
            title={language === 'en' ? 'Notifications' : 'Thông báo'}
            onClick={onOpenNotifications}
          >
            <Icon name="bell" size={20} />
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className="abs"
          style={{
            top: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            background: 'rgba(28, 18, 14, 0.92)',
            border: '1px solid var(--gold)',
            color: '#FFF0D2',
            padding: '10px 24px',
            borderRadius: '999px',
            fontSize: '14px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Sub-Header Segments (Chỉ hiển thị với Room 1, 2, 3) */}
      {isRoomTab && (
        <div
          className="row between"
          style={{
            padding: '12px 28px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--paper)',
          }}
        >
          <div className="row" style={{ gap: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
              {currentRoomId === 1
                ? t('r1_name')
                : currentRoomId === 2
                ? t('r2_name')
                : t('r3_name')}
            </span>
            <span className="badge b-wait" style={{ fontSize: '11px' }}>
              {language === 'en'
                ? `${roomPendingCounts[currentRoomId] || 0} waiting`
                : `${roomPendingCounts[currentRoomId] || 0} bài chờ duyệt`}
            </span>
          </div>

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
        <div className="card muted" style={{ textAlign: 'center', padding: '60px' }}>
          {language === 'en' ? 'Section under construction.' : 'Khu vực đang được cập nhật.'}
        </div>
      )}

      {/* Rejection Modal with predefined reasons */}
      <AdminRejectModal
        isOpen={showRejectModal}
        artwork={selectedRejectArtwork}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedRejectArtwork(null);
        }}
        onConfirm={handleConfirmReject}
        isLoading={isRejecting}
      />
    </div>
  );
}

export default AdminPage;

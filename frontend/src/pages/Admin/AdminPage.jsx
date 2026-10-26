import React, { useState, useEffect, useCallback } from 'react';
import { ADMINS } from '../../data/mockData';
import { Icon } from '../../components/common/Icons';
import { AdminPending } from './AdminPending';
import { AdminLive } from './AdminLive';
import { AdminCapsules } from './AdminCapsules';
import { AdminDiaries } from './AdminDiaries';
import { AdminStudio } from './AdminStudio';
import { AdminAuditLog } from './AdminAuditLog';
import { AdminRejectModal } from './AdminRejectModal';
import { adminRoomService } from '../../services/adminRoomService';
import { adminDiaryService } from '../../services/adminDiaryService';
import { adminCapsuleService } from '../../services/adminCapsuleService';
import { adminStudioService } from '../../services/adminStudioService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function AdminPage({ onOpenNotifications }) {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState(0); // 0: Phòng 1, 1: Phòng 2, 2: Phòng 3, 3: Nhật ký, 4: Kho thông điệp
  const [statusSegment, setStatusSegment] = useState(0); // 0: Chờ phê duyệt, 1: Đang trưng bày, 2: Lưu trữ
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectArtwork, setSelectedRejectArtwork] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Dynamic counts for exhibition rooms & diaries & capsules
  const [roomPendingCounts, setRoomPendingCounts] = useState({ 1: 0, 2: 0, 3: 0 });
  const [diaryPendingCount, setDiaryPendingCount] = useState(0);
  const [capsuleCount, setCapsuleCount] = useState(0);

  // Dynamic Admin Presence State (online / offline)
  const [adminPresence, setAdminPresence] = useState({
    total_admins: 0,
    total_online: 0,
    total_offline: 0,
    admins: [],
  });

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  // Fetch counts for all rooms, diaries, and capsules
  const fetchCounts = useCallback(async () => {
    try {
      const [r1, r2, r3, dPending, capSummary] = await Promise.allSettled([
        adminRoomService.getPendingArtworks(1, { limit: 1 }),
        adminRoomService.getPendingArtworks(2, { limit: 1 }),
        adminRoomService.getPendingArtworks(3, { limit: 1 }),
        adminDiaryService.getPendingDiaries({ limit: 1 }),
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

      setDiaryPendingCount(getCount(dPending));

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

  // Fetch real-time online/offline status of admin team
  const fetchAdminPresence = useCallback(async () => {
    try {
      const res = await adminStudioService.getAdminPresence();
      const data = res?.data || res;
      if (data && data.admins) {
        setAdminPresence(data);
      }
    } catch (err) {
      console.warn('Could not fetch admin presence:', err);
    }
  }, []);

  useEffect(() => {
    fetchAdminPresence();
    const interval = setInterval(fetchAdminPresence, 20000);
    return () => clearInterval(interval);
  }, [fetchAdminPresence]);

  // Map activeTab to Room ID (0 -> 1, 1 -> 2, 2 -> 3)
  const isRoomTab = activeTab >= 0 && activeTab <= 2;
  const currentRoomId = isRoomTab ? activeTab + 1 : 1;

  const tabs = [
    { name: t('admin_tab_r1'), count: roomPendingCounts[1] || 0 },
    { name: t('admin_tab_r2'), count: roomPendingCounts[2] || 0 },
    { name: t('admin_tab_r3'), count: roomPendingCounts[3] || 0 },
    { name: t('admin_tab_diary'), count: diaryPendingCount || 0 },
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

      triggerToast('Đã từ chối tác phẩm và gửi lời nhắn phản hồi tới chuông của tác giả.');
      setShowRejectModal(false);
      setSelectedRejectArtwork(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Error rejecting artwork:', err);
      const apiMsg =
        err?.response?.data?.message || err?.message || 'Không thể từ chối tác phẩm lúc này.';
      alert(`Lỗi: ${apiMsg}`);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleApproveSuccess = () => {
    triggerToast('✦ Tác phẩm đã được phê duyệt và đưa lên triển lãm thành công!');
    setRefreshTrigger((prev) => prev + 1);
  };

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
                letterSpacing: '.2em',
                fontWeight: 600,
                color: 'var(--acc)',
              }}
            >
              {language === 'en' ? 'ADMIN PANEL' : 'BẢNG QUẢN TRỊ'}
            </div>
            <h1>{language === 'en' ? 'Moderation & Exhibition' : 'Kiểm duyệt & trưng bày'}</h1>
          </div>

          <div className="row" style={{ gap: '14px', alignItems: 'center' }}>
            {adminPresence.total_admins > 0 ? (
              <div className="row" style={{ gap: '8px', alignItems: 'center', fontSize: '13px' }}>
                <span
                  style={{
                    color: '#2D7D46',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={language === 'en' ? 'Online admins' : 'Quản trị viên đang trực tuyến'}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#22c55e',
                      boxShadow: '0 0 5px rgba(34, 197, 94, 0.6)',
                      display: 'inline-block',
                    }}
                  />
                  {adminPresence.total_online} {language === 'en' ? 'online' : 'đang trực'}
                </span>
                <span className="muted">·</span>
                <span
                  style={{
                    color: '#C42B1C',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={language === 'en' ? 'Offline admins' : 'Quản trị viên ngoại tuyến'}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      display: 'inline-block',
                    }}
                  />
                  {adminPresence.total_offline} {language === 'en' ? 'offline' : 'vắng mặt'}
                </span>
              </div>
            ) : (
              <span className="muted">{language === 'en' ? 'Online' : 'Đang trực'}</span>
            )}

            <div className="avs">
              {(adminPresence.admins.length > 0 ? adminPresence.admins : ADMINS).map((adm, i) => {
                const isOnline = adm.is_online ?? adm.online;
                const displayName = adm.nickname || adm.name || adm.username || 'Admin';
                const avatar = adm.avatar_url;
                const bg = adm.color || 'var(--acc)';

                return (
                  <i
                    key={adm.id || i}
                    className={isOnline ? 'on online' : 'off offline'}
                    style={{ background: bg }}
                    title={`${displayName} (${isOnline ? (language === 'en' ? 'Online' : 'Đang trực tuyến') : (language === 'en' ? 'Offline' : 'Ngoại tuyến')})`}
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={displayName}
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      displayName[0].toUpperCase()
                    )}
                  </i>
                );
              })}
            </div>
            <span className="muted">
              {language === 'en' ? 'Admin Team' : 'Ban Quản Trị'}
            </span>

            {/* Language Switcher (Same format and style as rooms) */}
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

            <div
              className="iconbtn"
              style={{ border: '1px solid var(--line)', background: 'var(--paper)', cursor: 'pointer' }}
              onClick={onOpenNotifications}
            >
              <Icon name="bell" size={19} />
              <span className="n">3</span>
            </div>
          </div>
        </div>

        {/* Room Tabs */}
        <div className="tabs" style={{ marginTop: '14px' }}>
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
              {t.count > 0 && <b className="n">{t.count}</b>}
            </span>
          ))}
        </div>
      </div>

      {/* Subtab Segment Switcher (for Exhibition Room tabs) */}
      {isRoomTab && (
        <div className="abs" style={{ left: '32px', top: '142px' }}>
          <div className="seg">
            <span
              className={statusSegment === 0 ? 'on' : ''}
              onClick={() => setStatusSegment(0)}
            >
              {t('admin_seg_pending')} · {roomPendingCounts[currentRoomId] || 0}
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
      {activeTab === 4 ? (
        <AdminCapsules
          triggerToast={triggerToast}
          onCapsulesUpdated={(count) => setCapsuleCount(count)}
        />
      ) : activeTab === 3 ? (
        <AdminDiaries
          onCountChange={fetchCounts}
          triggerToast={triggerToast}
        />
      ) : isRoomTab ? (
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
      ) : activeTab === 5 ? (
        <AdminStudio
          triggerToast={triggerToast}
          onPublished={() => fetchCounts()}
        />
      ) : activeTab === 6 ? (
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
          <div>Khu vực quản trị phân hệ {tabs[activeTab]?.name || 'này'} đang hoàn thiện.</div>
        </div>
      )}

      {/* Reject Modal */}
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

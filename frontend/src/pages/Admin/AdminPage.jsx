import React, { useState } from 'react';
import { ADMINS } from '../../data/mockData';
import { Icon } from '../../components/common/Icons';
import { AdminPending } from './AdminPending';
import { AdminLive } from './AdminLive';
import { AdminCapsules } from './AdminCapsules';
import { AdminRejectModal } from './AdminRejectModal';

export function AdminPage({ onOpenNotifications }) {
  const [activeTab, setActiveTab] = useState(0); // 0: Phòng 1, 1: Phòng 2, 2: Phòng 3, 3: Nhật ký, 4: Kho thông điệp
  const [statusSegment, setStatusSegment] = useState(0); // 0: Chờ phê duyệt, 1: Đang trưng bày, 2: Lưu trữ
  const [showRejectModal, setShowRejectModal] = useState(false);

  const tabs = [
    { name: "Phòng 1", count: 12 },
    { name: "Phòng 2", count: 5 },
    { name: "Phòng 3", count: 9 },
    { name: "Nhật ký", count: 4 },
    { name: "Kho thông điệp", count: 0 },
    { name: "Studio", count: 0 },
    { name: "Nhật ký quản trị", count: 0 },
  ];

  return (
    <div className="stage admin">
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
              BẢNG QUẢN TRỊ
            </div>
            <h1>Kiểm duyệt & trưng bày</h1>
          </div>

          <div className="row" style={{ gap: '14px' }}>
            <span className="muted">Đang trực</span>
            <div className="avs">
              {ADMINS.map((adm, i) => (
                <i
                  key={i}
                  className={adm.online ? 'on' : ''}
                  style={{ background: adm.color }}
                  title={adm.name}
                >
                  {adm.name[0]}
                </i>
              ))}
            </div>
            <span className="muted">An, Bình, Chi online</span>
            <div
              className="iconbtn"
              style={{ border: '1px solid var(--line)', background: 'var(--paper)', cursor: 'pointer' }}
              onClick={onOpenNotifications}
            >
              <Icon name="bell" size={19} />
              <span className="n">5</span>
            </div>
          </div>
        </div>

        {/* Room Tabs */}
        <div className="tabs" style={{ marginTop: '14px' }}>
          {tabs.map((t, i) => (
            <span
              key={i}
              className={i === activeTab ? 'on' : ''}
              onClick={() => setActiveTab(i)}
            >
              {t.name}
              {t.count > 0 && <b className="n">{t.count}</b>}
            </span>
          ))}
        </div>
      </div>

      {/* Subtab Segment Switcher (for Room tabs) */}
      {activeTab !== 4 && (
        <div className="abs" style={{ left: '32px', top: '142px' }}>
          <div className="seg">
            <span
              className={statusSegment === 0 ? 'on' : ''}
              onClick={() => setStatusSegment(0)}
            >
              Chờ phê duyệt · 12
            </span>
            <span
              className={statusSegment === 1 ? 'on' : ''}
              onClick={() => setStatusSegment(1)}
            >
              Đang trưng bày · 1.284
            </span>
            <span
              className={statusSegment === 2 ? 'on' : ''}
              onClick={() => setStatusSegment(2)}
            >
              Lưu trữ · 3
            </span>
          </div>
        </div>
      )}

      {/* Main View Content */}
      {activeTab === 4 ? (
        <AdminCapsules />
      ) : statusSegment === 0 ? (
        <AdminPending onOpenRejectModal={() => setShowRejectModal(true)} />
      ) : (
        <AdminLive />
      )}

      {/* Reject Modal */}
      <AdminRejectModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirmReject={(data) => {
          console.log('Rejected:', data);
        }}
      />
    </div>
  );
}

export default AdminPage;

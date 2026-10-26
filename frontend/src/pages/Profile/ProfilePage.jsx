import React, { useState } from 'react';
import { AccountSettingsModal } from './AccountSettingsModal';
import { useAuth } from '../../context/AuthContext';
import { TopNav } from '../../components/layout/TopNav';

export function ProfilePage({ onNavigate, onOpenNotifications, onOpenThemeModal }) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(true);

  const displayName = user?.nickname || user?.username || 'Bạn';

  return (
    <div className="stage" style={{ padding: '40px 60px', overflowY: 'auto' }}>
      <TopNav
        greeting={`Hồ sơ của ${displayName}`}
        onOpenNotifications={onOpenNotifications}
        onOpenThemeModal={onOpenThemeModal}
      />

      <div style={{ marginTop: '80px', textAlign: 'center' }}>
        <button
          type="button"
          className="btn main"
          onClick={() => setIsModalOpen(true)}
        >
          Mở Cài đặt Tài khoản & Hồ sơ
        </button>
      </div>

      <AccountSettingsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          onNavigate && onNavigate('home');
        }}
      />
    </div>
  );
}

export default ProfilePage;

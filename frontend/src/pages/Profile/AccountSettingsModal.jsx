import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../components/common/Modal';
import { Icon } from '../../components/common/Icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { userService } from '../../services/userService';

export function AccountSettingsModal({ isOpen, onClose }) {
  const { user, updateUser, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState('info'); // 'info', 'security', 'theme'
  const fileInputRef = useRef(null);

  // Form Profile
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Avatar upload
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState({ type: '', text: '' });

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Theme
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [themeMsg, setThemeMsg] = useState('');

  // Sync state khi mở modal hoặc khi user thay đổi
  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setBio(user.bio || '');
      if (user.theme_preference && user.theme_preference !== theme) {
        setTheme(user.theme_preference);
      }
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  // Cập nhật Biệt danh & Bio
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (nickname && nickname.trim().length > 50) {
      setProfileMsg({
        type: 'error',
        text: language === 'en' ? 'Nickname cannot exceed 50 characters' : 'Biệt danh tối đa 50 ký tự',
      });
      return;
    }
    if (bio && bio.length > 255) {
      setProfileMsg({
        type: 'error',
        text: language === 'en' ? 'Bio cannot exceed 255 characters' : 'Giới thiệu tối đa 255 ký tự',
      });
      return;
    }

    setIsUpdatingProfile(true);
    setProfileMsg({ type: '', text: '' });

    try {
      const updated = await userService.updateProfile({
        nickname: nickname.trim(),
        bio: bio.trim() || null,
      });

      updateUser(updated);
      setIsUpdatingProfile(false);
      setProfileMsg({
        type: 'success',
        text: language === 'en' ? 'Profile updated successfully' : 'Cập nhật hồ sơ thành công',
      });
      refreshProfile && refreshProfile();
    } catch (err) {
      setIsUpdatingProfile(false);
      setProfileMsg({
        type: 'error',
        text: err.message || (language === 'en' ? 'Could not update profile. Please try again.' : 'Không thể cập nhật hồ sơ. Vui lòng thử lại.'),
      });
    }
  };

  // Cập nhật Ảnh đại diện (Avatar)
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg({
        type: 'error',
        text: language === 'en' ? 'Image exceeds maximum allowed size (5MB)' : 'Ảnh vượt quá dung lượng cho phép (tối đa 5MB)',
      });
      return;
    }

    // Validate mime
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarMsg({
        type: 'error',
        text: language === 'en' ? 'Only PNG, JPEG or WebP formats are supported' : 'Chỉ chấp nhận định dạng ảnh PNG, JPEG hoặc WebP',
      });
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarMsg({ type: '', text: '' });

    try {
      const res = await userService.uploadAvatar(file);
      setIsUploadingAvatar(false);
      if (res?.avatar_url) {
        updateUser({ avatar_url: res.avatar_url });
        setAvatarMsg({
          type: 'success',
          text: language === 'en' ? 'Avatar updated successfully' : 'Cập nhật ảnh đại diện thành công',
        });
        refreshProfile && refreshProfile();
      }
    } catch (err) {
      setIsUploadingAvatar(false);
      setAvatarMsg({
        type: 'error',
        text: err.message || (language === 'en' ? 'Could not upload avatar.' : 'Không thể tải ảnh đại diện lên.'),
      });
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (!currentPassword) {
      setPasswordMsg({
        type: 'error',
        text: language === 'en' ? 'Please enter current password' : 'Vui lòng nhập mật khẩu hiện tại',
      });
      return;
    }

    if (!newPassword) {
      setPasswordMsg({
        type: 'error',
        text: language === 'en' ? 'Please enter new password' : 'Vui lòng nhập mật khẩu mới',
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({
        type: 'error',
        text: language === 'en' ? 'New password requires at least 8 characters' : 'Mật khẩu mới cần tối thiểu 8 ký tự',
      });
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      setPasswordMsg({
        type: 'error',
        text: language === 'en'
          ? 'New password requires uppercase, lowercase, numbers, and special characters'
          : 'Mật khẩu mới cần tối thiểu 8 ký tự gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({
        type: 'error',
        text: language === 'en' ? 'Password confirmation does not match' : 'Xác nhận mật khẩu mới không khớp',
      });
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordMsg({
        type: 'error',
        text: language === 'en' ? 'New password cannot be identical to current password' : 'Mật khẩu mới không được trùng với mật khẩu cũ',
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await userService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setIsUpdatingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({
        type: 'success',
        text: language === 'en' ? 'Password changed successfully' : 'Đổi mật khẩu thành công',
      });
    } catch (err) {
      setIsUpdatingPassword(false);
      if (err.errorCode === 'INVALID_PASSWORD') {
        setPasswordMsg({
          type: 'error',
          text: language === 'en' ? 'Current password is incorrect' : 'Mật khẩu hiện tại không chính xác',
        });
      } else if (err.errorCode === 'PASSWORD_UNCHANGED' || err.errorCode === 'SAME_PASSWORD') {
        setPasswordMsg({
          type: 'error',
          text: language === 'en' ? 'New password cannot be identical to current password' : 'Mật khẩu mới không được trùng với mật khẩu cũ',
        });
      } else if (err.errorCode === 'WEAK_PASSWORD') {
        setPasswordMsg({
          type: 'error',
          text: language === 'en'
            ? 'New password requires uppercase, lowercase, numbers, and special characters'
            : 'Mật khẩu mới cần tối thiểu 8 ký tự gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt',
        });
      } else {
        setPasswordMsg({
          type: 'error',
          text: err.message || (language === 'en' ? 'Error occurred while changing password.' : 'Đã có lỗi xảy ra khi đổi mật khẩu.'),
        });
      }
    }
  };

  // Chọn và lưu Theme
  const handleSelectTheme = async (themeKey) => {
    setTheme(themeKey);
    setIsSavingTheme(true);
    setThemeMsg('');

    try {
      await userService.updateProfile({ theme_preference: themeKey });
      updateUser({ theme_preference: themeKey });
      setThemeMsg(language === 'en' ? 'Color theme preference saved to your account' : 'Đã lưu bảng màu ưa thích vào tài khoản');
    } catch {
      // Offline fallback
    } finally {
      setIsSavingTheme(false);
    }
  };

  const displayName = user?.nickname || user?.username || (language === 'en' ? 'You' : 'Bạn');
  const initialLetter = displayName.charAt(0).toUpperCase();

  const themesList = [
    {
      key: 'museum',
      name: language === 'en' ? 'Museum Twilight (Default)' : 'Bảo tàng chiều (Mặc định)',
      desc: language === 'en' ? 'Classic warm vintage tones with golden sunset glow' : 'Tông trầm ấm cổ điển, ánh vàng hoàng hôn',
    },
    {
      key: 'moss',
      name: language === 'en' ? 'Ancient Moss' : 'Rêu cổ',
      desc: language === 'en' ? 'Tranquil serene greens of a meditative botanical garden' : 'Sắc xanh tĩnh lặng của khu vườn tĩnh dưỡng',
    },
    {
      key: 'plum',
      name: language === 'en' ? 'Ripe Plum' : 'Mận chín',
      desc: language === 'en' ? 'Nostalgic deep violet and rosé hues, calm and contemplative' : 'Gam tím hồng hoài niệm, sâu lắng',
    },
    {
      key: 'paper',
      name: language === 'en' ? 'Aged Paper' : 'Giấy cũ',
      desc: language === 'en' ? 'Gentle yellowed vintage book pages, soothing for the eyes' : 'Màu trang sách ngả vàng, êm dịu ánh mắt',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      style={{
        width: '600px',
        maxWidth: '92vw',
        maxHeight: '90vh',
        overflowY: 'auto',
        textAlign: 'left',
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.45)',
      }}
      scrimStyle={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 className="serif" style={{ fontSize: '28px', color: 'var(--ink)' }}>
          {language === 'en' ? 'Profile & Settings' : 'Hồ sơ & Cài đặt'}
        </h2>
        <div className="hand" style={{ fontSize: '18px', color: 'var(--ink2)', marginTop: '2px' }}>
          {language === 'en' ? 'curating your peaceful sanctuary' : 'chăm chút chốn dừng chân của bạn'}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '10px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className="btn"
          style={{
            padding: '7px 16px',
            fontSize: '14px',
            background: activeTab === 'info' ? 'var(--acc)' : 'transparent',
            color: activeTab === 'info' ? '#fff' : 'var(--ink)',
            borderColor: activeTab === 'info' ? 'var(--acc)' : 'var(--line)',
          }}
        >
          {language === 'en' ? 'Personal Info' : 'Thông tin cá nhân'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className="btn"
          style={{
            padding: '7px 16px',
            fontSize: '14px',
            background: activeTab === 'security' ? 'var(--acc)' : 'transparent',
            color: activeTab === 'security' ? '#fff' : 'var(--ink)',
            borderColor: activeTab === 'security' ? 'var(--acc)' : 'var(--line)',
          }}
        >
          {language === 'en' ? 'Change Password' : 'Đổi mật khẩu'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className="btn"
          style={{
            padding: '7px 16px',
            fontSize: '14px',
            background: activeTab === 'theme' ? 'var(--acc)' : 'transparent',
            color: activeTab === 'theme' ? '#fff' : 'var(--ink)',
            borderColor: activeTab === 'theme' ? 'var(--acc)' : 'var(--line)',
          }}
        >
          {language === 'en' ? 'Theme & Appearance' : 'Bảng màu giao diện'}
        </button>
      </div>

      {/* TAB 1: THÔNG TIN CÁ NHÂN */}
      {activeTab === 'info' && (
        <div>
          {/* Avatar Area */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              background: 'rgba(232, 214, 191, 0.25)',
              padding: '16px',
              borderRadius: '16px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'var(--acc)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontSize: '26px',
                fontWeight: 700,
                overflow: 'hidden',
                flexShrink: 0,
                border: '2px solid var(--line)',
              }}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initialLetter
              )}
            </div>

            <div style={{ flex: 1 }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                className="btn line"
                style={{ padding: '6px 14px', fontSize: '13px' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar
                  ? (language === 'en' ? 'Uploading...' : 'Đang tải ảnh lên...')
                  : (language === 'en' ? 'Change Avatar' : 'Đổi ảnh đại diện')}
              </button>
              <div style={{ fontSize: '12px', color: 'var(--ink2)', marginTop: '6px' }}>
                {language === 'en' ? 'PNG, JPG, WebP format up to 5MB' : 'Định dạng PNG, JPG, WebP tối đa 5MB'}
              </div>
              {avatarMsg.text && (
                <div
                  style={{
                    fontSize: '12.5px',
                    color: avatarMsg.type === 'error' ? 'var(--acc)' : '#2e7d32',
                    marginTop: '4px',
                  }}
                >
                  {avatarMsg.text}
                </div>
              )}
            </div>
          </div>

          {/* Profile Form */}
          {profileMsg.text && (
            <div
              style={{
                background:
                  profileMsg.type === 'error'
                    ? 'rgba(161, 52, 44, 0.12)'
                    : 'rgba(56, 142, 60, 0.12)',
                border: `1px solid ${profileMsg.type === 'error' ? 'var(--acc)' : '#388e3c'}`,
                color: profileMsg.type === 'error' ? 'var(--acc)' : '#2e7d32',
                padding: '9px 12px',
                borderRadius: '10px',
                fontSize: '13.5px',
                marginBottom: '16px',
              }}
            >
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div className="fieldl">{language === 'en' ? 'Username' : 'Tên đăng nhập'}</div>
                <input className="inp" value={user?.username || ''} disabled style={{ opacity: 0.7 }} />
              </div>
              <div>
                <div className="fieldl">{language === 'en' ? 'Email' : 'Email'}</div>
                <input className="inp" value={user?.email || ''} disabled style={{ opacity: 0.7 }} />
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <div className="fieldl">
                <span>{language === 'en' ? 'Display Nickname' : 'Biệt danh hiển thị'}</span>
                <span style={{ fontSize: '12px', color: 'var(--ink2)' }}>
                  {language === 'en' ? 'Max 50 characters' : 'Tối đa 50 ký tự'}
                </span>
              </div>
              <input
                className="inp"
                placeholder={language === 'en' ? 'e.g. Autumn Soul' : 'ví dụ: Linh Mùa Thu'}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={isUpdatingProfile}
              />
            </div>

            <div style={{ marginTop: '12px' }}>
              <div className="fieldl">
                <span>{language === 'en' ? 'Bio' : 'Đôi dòng tâm sự (Bio)'}</span>
                <span style={{ fontSize: '12px', color: 'var(--ink2)' }}>
                  {language === 'en' ? 'Max 255 characters' : 'Tối đa 255 ký tự'}
                </span>
              </div>
              <textarea
                className="inp"
                style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                placeholder={language === 'en' ? 'A favorite quote or words you wish to share...' : 'Một câu châm ngôn hoặc đôi lời bạn muốn gửi gắm...'}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={isUpdatingProfile}
              />
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--ink2)' }}>
                {language === 'en' ? 'Role:' : 'Vai trò:'} <b>{user?.role || 'USER'}</b>
              </div>
              <span style={{ opacity: 0.4 }}>•</span>
              <div style={{ fontSize: '13px', color: 'var(--ink2)' }}>
                {language === 'en' ? 'Joined:' : 'Tham gia:'}{' '}
                {user?.created_at
                  ? (language === 'en'
                      ? new Date(user.created_at).toLocaleDateString('en-US')
                      : new Date(user.created_at).toLocaleDateString('vi-VN'))
                  : (language === 'en' ? 'Recently' : 'Gần đây')}
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                type="submit"
                className="btn main"
                style={{ padding: '10px 24px' }}
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile
                  ? (language === 'en' ? 'Saving...' : 'Đang lưu...')
                  : (language === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ĐỔI MẬT KHẨU */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword}>
          {passwordMsg.text && (
            <div
              style={{
                background:
                  passwordMsg.type === 'error'
                    ? 'rgba(161, 52, 44, 0.12)'
                    : 'rgba(56, 142, 60, 0.12)',
                border: `1px solid ${passwordMsg.type === 'error' ? 'var(--acc)' : '#388e3c'}`,
                color: passwordMsg.type === 'error' ? 'var(--acc)' : '#2e7d32',
                padding: '9px 12px',
                borderRadius: '10px',
                fontSize: '13.5px',
                marginBottom: '16px',
              }}
            >
              {passwordMsg.text}
            </div>
          )}

          <div>
            <div className="fieldl">{language === 'en' ? 'Current Password *' : 'Mật khẩu hiện tại *'}</div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="inp"
              placeholder={language === 'en' ? 'Enter current password' : 'Nhập mật khẩu bạn đang dùng'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isUpdatingPassword}
            />
          </div>

          <div style={{ marginTop: '12px' }}>
            <div className="fieldl">
              <span>{language === 'en' ? 'New Password *' : 'Mật khẩu mới *'}</span>
              <span
                style={{ color: 'var(--acc)', cursor: 'pointer', fontSize: '12px' }}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (language === 'en' ? 'Hide' : 'Ẩn') : (language === 'en' ? 'Show' : 'Hiện')}
              </span>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="inp"
              placeholder={language === 'en' ? 'Min 8 chars (Upper, Lower, Number, Special)' : 'Tối thiểu 8 ký tự (Hoa, Thường, Số, Ký tự đặc biệt)'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isUpdatingPassword}
            />
          </div>

          <div style={{ marginTop: '12px' }}>
            <div className="fieldl">{language === 'en' ? 'Confirm New Password *' : 'Xác nhận mật khẩu mới *'}</div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="inp"
              placeholder={language === 'en' ? 'Re-enter new password' : 'Nhập lại mật khẩu mới'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isUpdatingPassword}
            />
          </div>

          <div style={{ marginTop: '22px', textAlign: 'right' }}>
            <button
              type="submit"
              className="btn main"
              style={{ padding: '10px 24px' }}
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword
                ? (language === 'en' ? 'Updating...' : 'Đang cập nhật...')
                : (language === 'en' ? 'Update Password' : 'Cập nhật mật khẩu')}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: BẢNG MÀU (THEME) */}
      {activeTab === 'theme' && (
        <div>
          <div style={{ fontSize: '14.5px', color: 'var(--ink2)', marginBottom: '14px' }}>
            {language === 'en'
              ? 'Choose your favorite visual theme. This preference will be synchronized with your account.'
              : 'Chọn phong cách thị giác yêu thích. Lựa chọn này sẽ được lưu đồng bộ vào tài khoản của bạn.'}
          </div>

          {themeMsg && (
            <div
              style={{
                background: 'rgba(56, 142, 60, 0.12)',
                border: '1px solid #388e3c',
                color: '#2e7d32',
                padding: '9px 12px',
                borderRadius: '10px',
                fontSize: '13.5px',
                marginBottom: '14px',
              }}
            >
              {themeMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {themesList.map((t) => {
              const isSelected = theme === t.key;
              return (
                <div
                  key={t.key}
                  onClick={() => handleSelectTheme(t.key)}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '14px',
                    border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--line)'}`,
                    background: isSelected ? 'rgba(201, 154, 59, 0.08)' : 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15.5px', color: 'var(--ink)' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--ink2)', marginTop: '2px' }}>
                      {t.desc}
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '18px' }}>
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default AccountSettingsModal;

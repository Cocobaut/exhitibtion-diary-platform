import { apiClient } from './apiClient';

/**
 * Service xử lý các nghiệp vụ Hồ sơ cá nhân & Cài đặt tài khoản
 * Tham chiếu đặc tả: 02_user_profile_page.md và backend/specification/plan_02_user_profile.md
 */
export const userService = {
  /**
   * 2.1 Lấy thông tin hồ sơ hiện tại
   * @returns {Promise<Object>} { id, username, email, nickname, role, avatar_url, bio, theme_preference, created_at }
   */
  async getProfile() {
    return await apiClient.get('/users/me');
  },

  /**
   * 2.2 Cập nhật linh hoạt thông tin cá nhân (biệt danh, bio, theme_preference)
   * @param {Object} data { nickname?, bio?, theme_preference? }
   * @returns {Promise<Object>} { id, nickname, bio, avatar_url, theme_preference, updated_at }
   */
  async updateProfile(data) {
    return await apiClient.patch('/users/me', data);
  },

  /**
   * 2.3 Đổi mật khẩu trong tài khoản
   * @param {Object} credentials { current_password, new_password }
   * @returns {Promise<Object>} { success, message }
   */
  async changePassword({ current_password, new_password }) {
    return await apiClient.put('/users/me/password', {
      current_password,
      new_password,
    });
  },

  /**
   * 2.4 Cập nhật Ảnh đại diện (Avatar)
   * @param {File} file - File ảnh (PNG, JPEG, WebP <= 5MB)
   * @returns {Promise<Object>} { avatar_url }
   */
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);

    return await apiClient.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default userService;

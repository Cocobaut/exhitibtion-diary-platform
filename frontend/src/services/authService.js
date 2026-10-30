import { apiClient } from './apiClient';

/**
 * Service xử lý các nghiệp vụ Xác thực & Phân quyền (Auth)
 * Tham chiếu đặc tả: 01_auth_pages.md và backend/specification/plan_01_auth.md
 */
export const authService = {
  /**
   * 1.1 Đăng ký tài khoản người dùng mới
   * @param {Object} data { username, email, password, nickname }
   * @returns {Promise<Object>} { id, username, email, nickname, role }
   */
  async register({ username, email, password, nickname }) {
    return await apiClient.post('/auth/register', {
      username: username?.trim(),
      email: email?.trim(),
      password,
      nickname: nickname?.trim() || undefined,
    });
  },

  /**
   * 1.2 Đăng nhập bằng tài khoản (username/email) và mật khẩu
   * @param {Object} credentials { account, password }
   * @returns {Promise<Object>} { access_token, token_type, expires_in, user }
   */
  async login({ account, password }) {
    return await apiClient.post('/auth/login', {
      account: account?.trim(),
      password,
    });
  },

  /**
   * 1.3 Gửi email chứa link đặt lại mật khẩu
   * @param {Object} data { email }
   */
  async forgotPassword({ email }) {
    return await apiClient.post('/auth/forgot-password', { email: email?.trim() });
  },

  /**
   * 1.4 Đặt mật khẩu mới bằng token trong link email
   * @param {Object} data { token, new_password }
   */
  async resetPassword({ token, new_password }) {
    return await apiClient.post('/auth/reset-password', { token, new_password });
  },

  /**
   * 1.4 Đăng xuất và thu hồi access token
   * @returns {Promise<Object>} { success, message }
   */
  async logout() {
    try {
      return await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Lỗi khi gọi API logout trên máy chủ:', error);
      // Vẫn tiếp tục để phía client hoàn thành dọn session
      return { success: true, message: 'Đăng xuất cục bộ' };
    }
  },
};

export default authService;

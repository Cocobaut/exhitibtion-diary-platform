import { apiClient } from './apiClient';

/**
 * Service quản trị tối cao của Chủ sở hữu (Owner Management)
 * Tham chiếu đặc tả: 12_owner_management_page.md và backend/specification/plan_13_owner.md
 * Toàn bộ các API yêu cầu vai trò OWNER.
 */
export const ownerService = {
  /**
   * 13.1 Lấy danh sách toàn bộ người dùng và quản trị viên trong hệ thống
   * @param {Object} [options]
   * @param {string} [options.role] - 'USER' | 'ADMIN' | 'OWNER'
   * @param {boolean} [options.is_active] - true: đang hoạt động, false: bị khóa
   * @param {string} [options.q] - Tìm theo username, email, nickname
   * @param {number} [options.page=1]
   * @param {number} [options.limit=20]
   * @returns {Promise<Object>} { items, pagination: { page, limit, total_items, total_pages } }
   */
  async getUsers({
    role = null,
    is_active = null,
    q = null,
    page = 1,
    limit = 20,
  } = {}) {
    const params = { page, limit };
    if (role && role !== 'ALL') params.role = role;
    if (is_active !== null && is_active !== undefined) params.is_active = is_active;
    if (q) params.q = q.trim();

    return await apiClient.get('/owner/users', { params });
  },

  /**
   * 13.2 Xem chi tiết một tài khoản kèm thống kê hoạt động
   * @param {string} userId
   * @returns {Promise<Object>} User details with stats
   */
  async getUserDetail(userId) {
    return await apiClient.get(`/owner/users/${userId}`);
  },

  /**
   * 13.3 Vô hiệu hóa (khóa) hoặc kích hoạt lại tài khoản bất kỳ
   * @param {string} userId
   * @param {Object} payload
   * @param {boolean} payload.is_active
   * @param {string} payload.reason
   * @returns {Promise<Object>} { id, username, role, is_active, updated_at }
   */
  async updateUserStatus(userId, { is_active, reason }) {
    return await apiClient.patch(`/owner/users/${userId}/status`, {
      is_active,
      reason: reason?.trim() || 'Thao tác cập nhật trạng thái từ Chủ sở hữu',
    });
  },

  /**
   * 13.4 Thăng chức hoặc hạ chức vai trò tài khoản (USER <-> ADMIN)
   * @param {string} userId
   * @param {Object} payload
   * @param {string} payload.role - 'USER' | 'ADMIN'
   * @returns {Promise<Object>} { id, username, old_role, new_role, updated_at }
   */
  async updateUserRole(userId, { role }) {
    return await apiClient.patch(`/owner/users/${userId}/role`, {
      role: role.toUpperCase(),
    });
  },

  /**
   * 13.5 Xóa vĩnh viễn một tài khoản khỏi cơ sở dữ liệu (Hard Delete)
   * @param {string} userId
   * @returns {Promise<Object>} { id, username, deleted_at }
   */
  async deleteUser(userId) {
    return await apiClient.delete(`/owner/users/${userId}`);
  },

  /**
   * 13.6 Xem thống kê phân bổ toàn hệ thống
   * @returns {Promise<Object>} { users_summary, exhibition_summary, diaries_summary, capsules_summary }
   */
  async getSystemStats() {
    return await apiClient.get('/owner/system-stats');
  },
};

export default ownerService;

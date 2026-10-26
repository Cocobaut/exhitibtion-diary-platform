import { apiClient } from './apiClient';

/**
 * Service xử lý các nghiệp vụ Thông báo (Notifications)
 * Tham chiếu đặc tả: 03_lobby_shared_chrome.md và backend/specification/plan_04_notifications.md
 */
export const notificationService = {
  /**
   * 4.1 Đếm số lượng thông báo chưa đọc
   * @returns {Promise<Object>} { unread_count }
   */
  async getUnreadCount() {
    return await apiClient.get('/notifications/unread-count');
  },

  /**
   * 4.2 Lấy danh sách thông báo của người dùng
   * @param {Object} options { page, limit, is_read }
   * @returns {Promise<Object>} { items, pagination, unread_count }
   */
  async getNotifications({ page = 1, limit = 20, is_read = null } = {}) {
    const params = { page, limit };
    if (is_read !== null && is_read !== undefined) {
      params.is_read = is_read;
    }
    return await apiClient.get('/notifications', { params });
  },

  /**
   * 4.3 Đánh dấu một thông báo là đã đọc
   * @param {string} notificationId
   * @returns {Promise<Object>} { id, is_read, read_at }
   */
  async markAsRead(notificationId) {
    return await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  /**
   * 4.4 Đánh dấu tất cả thông báo là đã đọc
   * @returns {Promise<Object>} { affected_rows }
   */
  async markAllAsRead() {
    return await apiClient.patch('/notifications/read-all');
  },

  /**
   * 4.5 Đánh dấu nhiều thông báo là đã đọc (Bulk Read)
   * @param {Array<string>} notificationIds
   * @returns {Promise<Object>} { affected_rows }
   */
  async bulkMarkAsRead(notificationIds) {
    return await apiClient.patch('/notifications/bulk-read', {
      notification_ids: notificationIds,
    });
  },
};

export default notificationService;

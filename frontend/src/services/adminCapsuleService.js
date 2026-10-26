import { apiClient } from './apiClient';

/**
 * Service quản lý kho thông điệp hòm thư (Admin Message Capsules)
 * Tham chiếu đặc tả: 10_admin_capsules_page.md và backend/specification/plan_11_admin_capsules.md
 */
export const adminCapsuleService = {
  /**
   * 11.1 Lấy danh sách thông điệp trong kho kèm bộ lọc và phân trang
   * @param {Object} [options]
   * @param {string} [options.category] - 'HEALING' | 'COURAGE' | 'PERSPECTIVE'
   * @param {boolean} [options.is_approved] - true: đang bật, false: đang tắt
   * @param {number} [options.page=1]
   * @param {number} [options.limit=50]
   * @returns {Promise<Object>} { items, pagination: { page, limit, total_items, total_pages } }
   */
  async listCapsules({ category = null, is_approved = null, page = 1, limit = 50 } = {}) {
    const params = { page, limit };
    if (category) params.category = category;
    if (is_approved !== null && is_approved !== undefined) params.is_approved = is_approved;

    return await apiClient.get('/admin/capsules', { params });
  },

  /**
   * 11.2 Thêm mới thông điệp vào máy nhả
   * @param {Object} payload
   * @param {string} payload.message - Nội dung thông điệp
   * @param {string} [payload.message_vi]
   * @param {string} [payload.message_en]
   * @param {string} [payload.category='HEALING'] - 'HEALING' | 'COURAGE' | 'PERSPECTIVE'
   * @param {boolean} [payload.is_approved=true]
   * @returns {Promise<Object>} Created capsule data
   */
  async createCapsule({
    message,
    message_vi = null,
    message_en = null,
    category = 'HEALING',
    is_approved = true,
  }) {
    const vi = message_vi || message;
    const en = message_en || vi;

    return await apiClient.post('/admin/capsules', {
      message: vi,
      message_vi: vi,
      message_en: en,
      category,
      is_approved,
    });
  },

  /**
   * 11.3 Cập nhật nội dung và chủ đề thông điệp
   * @param {number|string} capsuleId
   * @param {Object} payload
   * @param {string} payload.message
   * @param {string} [payload.message_vi]
   * @param {string} [payload.message_en]
   * @param {string} payload.category
   * @returns {Promise<Object>} Updated capsule data
   */
  async updateCapsule(capsuleId, { message, message_vi = null, message_en = null, category = 'HEALING' }) {
    const vi = message_vi || message;
    const en = message_en || vi;

    return await apiClient.put(`/admin/capsules/${capsuleId}`, {
      message: vi,
      message_vi: vi,
      message_en: en,
      category,
    });
  },

  /**
   * 11.4 Bật / Tắt trạng thái hoạt động của thông điệp
   * @param {number|string} capsuleId
   * @param {boolean} isApproved - false: tạm dừng nhả, true: kích hoạt lại
   * @returns {Promise<Object>} { id, is_approved }
   */
  async toggleCapsuleStatus(capsuleId, isApproved) {
    return await apiClient.patch(`/admin/capsules/${capsuleId}/toggle-status`, {
      is_approved: isApproved,
    });
  },

  /**
   * 11.5 Xóa thông điệp khỏi kho dữ liệu
   * @param {number|string} capsuleId
   * @returns {Promise<Object>} { message }
   */
  async deleteCapsule(capsuleId) {
    return await apiClient.delete(`/admin/capsules/${capsuleId}`);
  },

  /**
   * 11.6 Lấy danh sách các loại thông điệp và thống kê số lượng từng loại
   * @returns {Promise<Object>} { total_capsules, categories: [...] }
   */
  async getCapsuleCategories() {
    return await apiClient.get('/admin/capsules/categories');
  },
};

export default adminCapsuleService;

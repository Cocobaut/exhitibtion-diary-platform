import { apiClient } from './apiClient';

/**
 * Service xử lý các nghiệp vụ Máy nhả thông điệp (Capsules)
 * Tham chiếu đặc tả: 03_lobby_shared_chrome.md và backend/specification/plan_03_capsules.md
 */
export const capsuleService = {
  /**
   * 3.1 Rút một thông điệp ngẫu nhiên
   * @param {string} [category] - HEALING | COURAGE | PERSPECTIVE (để trống nếu rút ngẫu nhiên)
   * @param {string} [lang='vi'] - Ngôn ngữ hiển thị (vi | en)
   * @returns {Promise<Object>} { draw_id, capsule_id, message, message_vi, message_en, category, is_saved, drawn_at }
   */
  async drawCapsule(category = null, lang = 'vi') {
    const params = {};
    if (category && category !== 'ALL' && category !== 'Ngẫu nhiên') {
      params.category = category;
    }
    if (lang) {
      params.lang = lang;
    }
    return await apiClient.post('/capsules/draw', null, { params });
  },

  /**
   * 3.2 Lưu hoặc bỏ lưu thông điệp vào sổ tay cá nhân
   * @param {string} drawId - ID của lượt rút
   * @param {boolean} [isSaved=true] - Trạng thái lưu
   * @returns {Promise<Object>} { draw_id, is_saved, updated_at }
   */
  async saveDraw(drawId, isSaved = true) {
    return await apiClient.patch(`/capsules/draws/${drawId}/save`, {
      is_saved: isSaved,
    });
  },

  /**
   * 3.3 Lấy danh sách thông điệp đã lưu trong sổ tay
   * @param {Object} options { page, limit, category }
   * @returns {Promise<Object>} { items, pagination, counts }
   */
  async getSavedCapsules({ page = 1, limit = 20, category = null } = {}) {
    const params = { page, limit };
    if (category) {
      params.category = category;
    }
    return await apiClient.get('/capsules/saved', { params });
  },

  /**
   * 3.4 Bỏ lưu thông điệp khỏi sổ tay
   * @param {string} drawId - ID của lượt rút cần xoá
   * @returns {Promise<Object>} { success, message }
   */
  async deleteSavedCapsule(drawId) {
    return await apiClient.delete(`/capsules/saved/${drawId}`);
  },
};

export default capsuleService;

import { apiClient } from './apiClient';

/**
 * Service xử lý kiểm duyệt trang nhật ký cộng đồng (Admin Diaries Moderation)
 * Tham chiếu đặc tả: 09_admin_diaries_page.md và backend/specification/plan_10_admin_diaries.md
 */
export const adminDiaryService = {
  /**
   * 10.1 Lấy danh sách nhật ký công khai chờ duyệt
   * @param {Object} [options]
   * @param {number} [options.page=1]
   * @param {number} [options.limit=15]
   * @returns {Promise<Object>} { items, pagination: { page, limit, total_pending, total_pages } }
   */
  async getPendingDiaries({ page = 1, limit = 15 } = {}) {
    return await apiClient.get('/admin/diaries/pending', {
      params: { page, limit },
    });
  },

  /**
   * 10.2 Phê duyệt nhật ký lên Tab Cộng đồng
   * @param {string} diaryId
   * @param {Object} [payload] { title_vi, title_en, content_vi, content_en }
   * @returns {Promise<Object>} { diary_id, is_public, is_approved, title_vi, title_en, updated_at }
   */
  async approveDiary(diaryId, payload = null) {
    return await apiClient.patch(
      `/admin/diaries/${diaryId}/approve`,
      payload && Object.keys(payload).length > 0 ? payload : undefined
    );
  },

  /**
   * 10.3 Từ chối phê duyệt công khai bài nhật ký
   * @param {string} diaryId
   * @param {Object} payload { reason: string }
   * @returns {Promise<Object>} { diary_id, is_public: false, is_approved: false }
   */
  async rejectDiary(diaryId, { reason }) {
    return await apiClient.patch(`/admin/diaries/${diaryId}/reject`, {
      reason: reason?.trim() || 'Bài viết chưa phù hợp để chia sẻ công khai.',
    });
  },

  /**
   * 10.4 Danh sách nhật ký cộng đồng đang hiển thị
   * @param {Object} [options]
   * @param {string} [options.q] - Tìm kiếm theo tiêu đề hoặc tên tác giả
   * @param {number} [options.page=1]
   * @param {number} [options.limit=15]
   * @returns {Promise<Object>} { items, pagination: { page, limit, total_items, total_pages } }
   */
  async getApprovedDiaries({ q = null, page = 1, limit = 15 } = {}) {
    const params = { page, limit };
    if (q) params.q = q;
    return await apiClient.get('/admin/diaries/approved', { params });
  },

  /**
   * 10.5 Thu hồi quyền hiển thị công khai bài nhật ký (gỡ về riêng tư)
   * @param {string} diaryId
   * @param {Object} payload { admin_reason: string }
   * @returns {Promise<Object>} { diary_id, is_public: false, is_approved: false }
   */
  async revokeDiary(diaryId, { admin_reason }) {
    return await apiClient.patch(`/admin/diaries/${diaryId}/revoke`, {
      admin_reason: admin_reason?.trim() || 'Thu hồi quyền hiển thị công khai theo quy định kiểm duyệt.',
    });
  },
};

export default adminDiaryService;

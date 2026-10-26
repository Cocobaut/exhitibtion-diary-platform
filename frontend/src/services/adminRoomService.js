import { apiClient } from './apiClient';

/**
 * Service xử lý các nghiệp vụ Quản trị kiểm duyệt 3 Phòng triển lãm
 * Tham chiếu đặc tả: 08_admin_rooms_page.md và backend/specification/plan_09_admin_rooms.md
 */
export const adminRoomService = {
  /**
   * 9.1.1 Lấy danh sách tác phẩm chờ duyệt trong phòng
   * @param {number} roomId - 1 (Đổ vỡ), 2 (Lồng đèn), 3 (Cây thông điệp)
   * @param {Object} options
   * @param {string} [options.title]
   * @param {string} [options.author_display_name]
   * @param {number} [options.page=1]
   * @param {number} [options.limit=20]
   * @param {string} [options.sort='oldest'] - 'oldest' hoặc 'latest'
   * @returns {Promise<Object>} { room_id, room_code, items, pagination }
   */
  async getPendingArtworks(roomId, {
    title = null,
    author_display_name = null,
    page = 1,
    limit = 20,
    sort = 'oldest',
  } = {}) {
    const params = { page, limit, sort };
    if (title) params.title = title;
    if (author_display_name) params.author_display_name = author_display_name;

    return await apiClient.get(`/admin/rooms/${roomId}/artworks/pending`, { params });
  },

  /**
   * 9.1.2 Tải ảnh nghệ thuật minh họa lên hệ thống lưu trữ
   * @param {number} roomId
   * @param {File} file - File ảnh minh họa
   * @returns {Promise<Object>} { media_url }
   */
  async uploadArtworkImage(roomId, file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.post(
      `/admin/rooms/${roomId}/artworks/upload-artwork-image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response?.data || response;
  },

  /**
   * 9.1.3 Phê duyệt tác phẩm chờ duyệt và đưa lên triển lãm
   * @param {number} roomId
   * @param {string} artworkId
   * @param {Object} payload { title, short_content, content, media_url, tag_category, color_code, quote, author_display_name }
   * @returns {Promise<Object>} { id, room_id, status, ... }
   */
  async approveArtwork(roomId, artworkId, payload) {
    return await apiClient.post(
      `/admin/rooms/${roomId}/artworks/${artworkId}/approve`,
      payload
    );
  },

  /**
   * 9.1.4 Từ chối tác phẩm chờ duyệt kèm lý do phản hồi
   * @param {number} roomId
   * @param {string} artworkId
   * @param {Object} options
   * @param {string} options.admin_note
   * @param {string} [options.rejection_reason_tag]
   * @returns {Promise<Object>} { id, status, admin_note, ... }
   */
  async rejectArtwork(roomId, artworkId, { admin_note, rejection_reason_tag = null }) {
    const combinedNote = rejection_reason_tag
      ? `[${rejection_reason_tag}] ${admin_note.trim()}`
      : admin_note.trim();

    return await apiClient.post(
      `/admin/rooms/${roomId}/artworks/${artworkId}/reject`,
      { admin_note: combinedNote }
    );
  },

  /**
   * 9.2.1 Danh sách tác phẩm đang trưng bày kèm thống kê tổng thể phòng
   * @param {number} roomId
   * @param {Object} options
   * @param {string} [options.q]
   * @param {string} [options.title]
   * @param {string} [options.author_display_name]
   * @param {number} [options.page=1]
   * @param {number} [options.limit=20]
   * @param {string} [options.sort='latest'] - 'latest', 'most_viewed', 'most_interacted'
   * @returns {Promise<Object>} { summary: { total_approved_artworks, total_views, total_reactions }, items, pagination }
   */
  async getApprovedArtworks(roomId, {
    status = 'APPROVED',
    q = null,
    title = null,
    author_display_name = null,
    page = 1,
    limit = 20,
    sort = 'latest',
  } = {}) {
    const params = { status, page, limit, sort };
    if (q) params.q = q;
    if (title) params.title = title;
    if (author_display_name) params.author_display_name = author_display_name;

    return await apiClient.get(`/admin/rooms/${roomId}/artworks/approved`, { params });
  },

  /**
   * 9.2.2 Cập nhật/hiệu đính nội dung tác phẩm đang trưng bày hoặc lưu trữ
   * @param {number} roomId
   * @param {string} artworkId
   * @param {Object} payload { title, title_vi, title_en, short_content, short_content_vi, short_content_en, content, content_vi, content_en, media_url, tag_category, color_code }
   * @returns {Promise<Object>} { id, updated_at }
   */
  async editArtwork(roomId, artworkId, payload) {
    const safePayload = { ...payload };
    delete safePayload.author_display_name; // Backend cấm sửa author_display_name

    return await apiClient.put(
      `/admin/rooms/${roomId}/artworks/${artworkId}`,
      safePayload
    );
  },

  /**
   * 9.2.3 Gỡ tác phẩm khỏi không gian trưng bày và chuyển vào kho lưu trữ
   * @param {number} roomId
   * @param {string} artworkId
   * @param {Object} payload { admin_note }
   * @returns {Promise<Object>} { id, status, archived_by, updated_at }
   */
  async archiveArtwork(roomId, artworkId, { admin_note = 'Gỡ theo kiểm duyệt quản trị' } = {}) {
    return await apiClient.patch(
      `/admin/rooms/${roomId}/artworks/${artworkId}/archive`,
      { admin_note }
    );
  },

  /**
   * 9.2.5 Khôi phục tác phẩm từ kho lưu trữ trở lại phòng trưng bày
   * @param {number} roomId
   * @param {string} artworkId
   * @returns {Promise<Object>} { id, status, updated_at }
   */
  async restoreArtwork(roomId, artworkId) {
    return await apiClient.patch(
      `/admin/rooms/${roomId}/artworks/${artworkId}/restore`
    );
  },

  /**
   * 9.2.4 Lấy tất cả các loại lá và thống kê số lượng (Phòng 3)
   * @param {number} [roomId=3]
   * @returns {Promise<Object>} { total_leaves, categories }
   */
  async getLeafCategories(roomId = 3) {
    return await apiClient.get(`/admin/rooms/${roomId}/artworks/leaf-categories`);
  },
};

export default adminRoomService;

import { apiClient } from './apiClient';

/**
 * Service quản lý Studio xuất bản trực tiếp và Nhật ký kiểm toán (Audit Logs)
 * Tham chiếu đặc tả: 11_admin_studio_audit_page.md và backend/specification/plan_12_admin_studio_audit.md
 */
export const adminStudioService = {
  /**
   * 12.1 Xuất bản trực tiếp tác phẩm của Giám tuyển/Admin lên triển lãm (bỏ qua bước duyệt)
   * @param {Object} payload
   * @param {number} payload.room_id - 1 (Đổ vỡ), 2 (Lồng đèn Hy vọng), 3 (Cây Thông điệp)
   * @param {string} payload.title_vi
   * @param {string} [payload.title_en]
   * @param {string} [payload.author_display_name='Ban Giám Tuyển']
   * @param {string} payload.short_content_vi
   * @param {string} [payload.short_content_en]
   * @param {string} payload.content_vi
   * @param {string} [payload.content_en]
   * @param {string} [payload.media_url]
   * @param {string} [payload.quote]
   * @param {string} [payload.target_date] - Cho phòng 2
   * @param {string} [payload.visibility='PUBLIC'] - Cho phòng 2
   * @param {string} [payload.tag_category] - Cho phòng 3
   * @param {string} [payload.color_code] - Cho phòng 3
   * @returns {Promise<Object>} { id, room_id, status: 'APPROVED', ... }
   */
  async publishArtwork(payload) {
    const titleVi = payload.title_vi || payload.title;
    const titleEn = payload.title_en || titleVi;
    const shortVi = payload.short_content_vi || payload.summary || payload.short_content || titleVi;
    const shortEn = payload.short_content_en || shortVi;
    const contentVi = payload.content_vi || payload.content;
    const contentEn = payload.content_en || contentVi;

    const body = {
      room_id: Number(payload.room_id),
      title_vi: titleVi,
      title_en: titleEn,
      author_display_name: payload.author_display_name || 'Ban Giám Tuyển',
      short_content_vi: shortVi,
      short_content_en: shortEn,
      content_vi: contentVi,
      content_en: contentEn,
      media_url: payload.media_url || null,
      quote: payload.quote || null,
      is_anonymous: Boolean(payload.is_anonymous),
      target_date: payload.target_date || null,
      visibility: payload.visibility || 'PUBLIC',
      tag_category: payload.tag_category || null,
      color_code: payload.color_code || null,
    };

    return await apiClient.post('/admin/studio/artworks', body);
  },

  /**
   * 12.2 Lấy danh sách nhật ký kiểm toán hệ thống kèm bộ lọc
   * @param {Object} [options]
   * @param {number} [options.room_id]
   * @param {string} [options.admin_id]
   * @param {string} [options.action_type] - CREATE_DIRECT | APPROVE | APPROVE_AND_UPLOAD_MEDIA | REJECT | ARCHIVE | REQUEST_DELETE_USER
   * @param {number} [options.page=1]
   * @param {number} [options.limit=50]
   * @returns {Promise<Object>} { items, pagination: { page, limit, total_items, total_pages } }
   */
  async getAuditLogs({
    room_id = null,
    admin_id = null,
    action_type = null,
    page = 1,
    limit = 50,
  } = {}) {
    const params = { page, limit };
    if (room_id) params.room_id = room_id;
    if (admin_id) params.admin_id = admin_id;
    if (action_type) params.action_type = action_type;

    return await apiClient.get('/admin/studio/audit-logs', { params });
  },

  /**
   * 12.3 Gửi yêu cầu lên Chủ sở hữu (Owner) để phê duyệt xóa vĩnh viễn tài khoản
   * @param {Object} payload
   * @param {string} [payload.userId]
   * @param {string} payload.username
   * @param {string} payload.email
   * @param {string} payload.reason
   * @returns {Promise<Object>}
   */
  async requestUserDeletion({ userId = null, username, email, reason }) {
    const url = userId
      ? `/admin/studio/users/${userId}/request-deletion`
      : '/admin/studio/users/request-deletion';

    return await apiClient.post(url, {
      username: username?.trim(),
      email: email?.trim(),
      reason: reason?.trim(),
    });
  },

  /**
   * 12.4 Chặn (khóa) hoặc Mở khóa tài khoản người dùng vi phạm
   * @param {string} userId
   * @param {Object} payload
   * @param {boolean} payload.is_active - false: khóa, true: kích hoạt lại
   * @param {string} payload.reason - Lý do khóa/mở khóa
   * @returns {Promise<Object>} { id, username, is_active, ... }
   */
  async updateUserStatus(userId, { is_active, reason }) {
    return await apiClient.patch(`/admin/studio/users/${userId}/status`, {
      is_active,
      reason: reason?.trim() || 'Thao tác cập nhật trạng thái từ Quản trị viên',
    });
  },

  /**
   * 12.5 Lấy danh sách tài khoản Ban Quản Trị kèm trạng thái online/offline, avatar
   * @returns {Promise<Object>} { total_admins, total_online, total_offline, admins: [...] }
   */
  async getAdminPresence() {
    return await apiClient.get('/admin/studio/presence');
  },
};

export default adminStudioService;

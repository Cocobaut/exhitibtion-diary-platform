import { apiClient } from './apiClient';

/**
 * Service xử lý các nghiệp vụ Phòng 2: Bầu trời Lồng đèn (Room 2 - Hope Lanterns)
 * Tham chiếu đặc tả: 05_room2_hope_page.md và backend/specification/plan_06_room2_hope.md
 */
export const room2Service = {
  /**
   * 6.1 Lấy danh sách lồng đèn bầu trời đêm
   * @param {Object} options
   * @param {string} [options.filter='all'] - 'all', 'mine', 'opened', 'locked'
   * @param {number} [options.limit=50]
   * @param {string} [options.title]
   * @param {string} [options.author_display_name]
   * @returns {Promise<Object>} { items, total_lanterns, total_opened }
   */
  async getLanterns({
    filter = 'all',
    limit = 50,
    title = null,
    author_display_name = null,
  } = {}) {
    const params = { filter, limit };
    if (title) params.title = title;
    if (author_display_name) params.author_display_name = author_display_name;

    return await apiClient.get('/rooms/2/artworks', { params });
  },

  /**
   * 6.4 Tìm kiếm lồng đèn phòng 2
   * @param {Object} options
   * @param {string} options.q
   * @param {string} [options.filter='all']
   * @param {number} [options.page=1]
   * @param {number} [options.limit=15]
   * @returns {Promise<Object>} { items, total, page, limit }
   */
  async searchLanterns({ q, filter = 'all', page = 1, limit = 15 } = {}) {
    return await apiClient.get('/rooms/2/search', {
      params: { q, filter, page, limit },
    });
  },

  /**
   * 6.3 Thả lồng đèn hy vọng mới
   * @param {Object} data { title, content, short_content, author_display_name, is_anonymous, visibility, target_date, symbol, original_language }
   * @returns {Promise<Object>} { id, title, visibility, status, target_date, remaining_seconds, is_opened, ... }
   */
  async createLantern({
    title,
    content,
    short_content = null,
    author_display_name = null,
    is_anonymous = false,
    visibility = 'PRIVATE',
    target_date,
    symbol = 'star',
    original_language = 'vi',
  }) {
    return await apiClient.post('/rooms/2/artworks', {
      title: title?.trim(),
      content: content?.trim(),
      short_content: short_content?.trim() || undefined,
      author_display_name: author_display_name?.trim() || undefined,
      is_anonymous: Boolean(is_anonymous),
      visibility: visibility?.toUpperCase() || 'PRIVATE',
      target_date: typeof target_date === 'string' ? target_date : target_date?.toISOString?.(),
      symbol,
      original_language,
    });
  },

  /**
   * 6.5 Lấy danh sách lồng đèn của bản thân đến thời điểm rơi xuống
   * @param {boolean} [includeOpened=false]
   * @returns {Promise<Object>} { items, total_ready }
   */
  async getReadyToFallLanterns(includeOpened = false) {
    return await apiClient.get('/rooms/2/artworks/ready-to-fall', {
      params: { include_opened: includeOpened },
    });
  },

  /**
   * 6.7 Lấy thông tin lồng đèn cá nhân phục vụ widget đếm ngược
   * @returns {Promise<Object>} Chi tiết lồng đèn cá nhân kèm remaining_seconds
   */
  async getMyPersonalLantern() {
    return await apiClient.get('/rooms/2/artworks/my-personal');
  },

  /**
   * 6.8 Rút ngẫu nhiên một lồng đèn đã mở
   * @returns {Promise<Object>}
   */
  async getRandomOpenedLantern() {
    return await apiClient.get('/rooms/2/artworks/random-opened');
  },

  /**
   * 6.2 Kéo thả và mở lồng đèn hy vọng
   * @param {string} artworkId
   * @returns {Promise<Object>} { id, title, content, author_display_name, target_date, created_at, is_opened, is_saved }
   */
  async openLantern(artworkId) {
    return await apiClient.post(`/rooms/2/artworks/${artworkId}/open`);
  },

  /**
   * 6.6 Xóa lồng đèn của bản thân
   * @param {string} artworkId
   * @returns {Promise<Object>} { success, message }
   */
  async deleteLantern(artworkId) {
    return await apiClient.delete(`/rooms/2/artworks/${artworkId}`);
  },

  /**
   * 6.9 Lưu thư lồng đèn vào sổ tay
   * @param {string} artworkId
   * @returns {Promise<Object>} { artwork_id, is_saved, saved_at }
   */
  async saveLanternToNotebook(artworkId) {
    return await apiClient.post(`/rooms/2/artworks/${artworkId}/save`);
  },

  /**
   * 6.10 Bỏ lưu thư lồng đèn khỏi sổ tay
   * @param {string} artworkId
   * @returns {Promise<Object>} { success, message }
   */
  async unsaveLanternFromNotebook(artworkId) {
    return await apiClient.delete(`/rooms/2/artworks/${artworkId}/save`);
  },
};

export default room2Service;

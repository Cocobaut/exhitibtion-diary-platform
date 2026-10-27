import { apiClient } from './apiClient';

/**
 * Service xử lý các nghiệp vụ Phòng 1: Triển lãm Đổ vỡ (Room 1 - Broken)
 * Tham chiếu đặc tả: 04_room1_broken_page.md và backend/specification/plan_05_room1_broken.md
 */
export const room1Service = {
  /**
   * 5.1 Lấy danh sách tác phẩm phòng 1
   * @param {Object} options
   * @param {number} [options.page=1]
   * @param {number} [options.limit=12]
   * @param {string} [options.filter='all'] - 'all', 'latest', 'most_sympathetic', 'my_artworks'
   * @param {string} [options.title]
   * @param {string} [options.author_display_name]
   * @returns {Promise<Object>} { items, pagination }
   */
  async getArtworks({
    page = 1,
    limit = 12,
    filter = 'all',
    title = null,
    author_display_name = null,
  } = {}) {
    // Map alias frontend nếu có
    let filterType = filter;
    if (filter === 'mine') filterType = 'my_artworks';
    if (filter === 'most_sympathy') filterType = 'most_sympathetic';

    const params = { page, limit, filter: filterType };
    if (title) params.title = title;
    if (author_display_name) params.author_display_name = author_display_name;

    return await apiClient.get('/rooms/1/artworks', { params });
  },

  /**
   * 5.2 Xem chi tiết một tác phẩm phòng 1
   * @param {string} artworkId
   * @param {string} [lang='vi']
   * @returns {Promise<Object>} Chi tiết tác phẩm
   */
  async getArtworkDetail(artworkId, lang = 'vi') {
    return await apiClient.get(`/rooms/1/artworks/${artworkId}`, {
      params: { lang },
    });
  },

  /**
   * 5.3 Tương tác cảm xúc trên tác phẩm phòng 1 (Toggle reaction)
   * @param {string} artworkId
   * @param {string} reactionType - HEART, HUG, SYMPATHY
   * @returns {Promise<Object>} { artwork_id, current_reaction, reactions_summary }
   */
  async toggleReaction(artworkId, reactionType) {
    return await apiClient.post(`/rooms/1/artworks/${artworkId}/reactions`, {
      reaction_type: reactionType,
    });
  },

  /**
   * 5.4 Tìm kiếm tác phẩm phòng 1
   * @param {Object} options
   * @param {string} options.q - Từ khóa tìm kiếm
   * @param {string} [options.scope='all'] - 'all' hoặc 'mine'
   * @param {number} [options.page=1]
   * @param {number} [options.limit=12]
   * @returns {Promise<Object>} { items, pagination }
   */
  async searchArtworks({ q, scope = 'all', page = 1, limit = 12 } = {}) {
    return await apiClient.get('/rooms/1/search', {
      params: { q, scope, page, limit },
    });
  },

  /**
   * 5.5 Gửi tác phẩm mới vào phòng 1 (chờ duyệt PENDING)
   * @param {Object} data { title, short_content, content, is_anonymous, original_language }
   * @returns {Promise<Object>} { id, status }
   */
  async createArtwork({
    title,
    short_content,
    content,
    is_anonymous = false,
    original_language = 'vi',
  }) {
    return await apiClient.post('/rooms/1/artworks', {
      title: title?.trim(),
      short_content: short_content?.trim(),
      content: content?.trim(),
      is_anonymous: Boolean(is_anonymous),
      original_language,
    });
  },

  /**
   * Lưu tác phẩm phòng 1 vào sổ tay
   * @param {string} artworkId
   * @returns {Promise<Object>} { artwork_id, is_saved, saved_at }
   */
  async saveArtworkToNotebook(artworkId) {
    return await apiClient.post(`/rooms/1/artworks/${artworkId}/save`);
  },

  /**
   * Bỏ lưu tác phẩm phòng 1 khỏi sổ tay
   * @param {string} artworkId
   * @returns {Promise<Object>}
   */
  async unsaveArtworkFromNotebook(artworkId) {
    return await apiClient.delete(`/rooms/1/artworks/${artworkId}/save`);
  },
};

export default room1Service;


import { apiClient } from './apiClient';

/**
 * Category & color translation helpers between Frontend and Backend
 * Frontend uses: 'KL' | 'CL' | 'BO' | 'GN'
 * Backend expects: 'ENCOURAGEMENT' | 'HEALING' | 'GRATITUDE' | 'PERSPECTIVE'
 */
export const CATEGORY_MAP = {
  KL: {
    backendKey: 'ENCOURAGEMENT',
    name: 'Khích lệ',
    desc: 'Lời khích lệ, động viên kiên trì',
    color: '#E2BC55',
    backendColor: '#FFD700',
    hi: '#F6DD8F',
  },
  CL: {
    backendKey: 'HEALING',
    name: 'Chữa lành',
    desc: 'Lời chữa lành, bình an tâm hồn',
    color: '#94C590',
    backendColor: '#98FB98',
    hi: '#C6E6BE',
  },
  BO: {
    backendKey: 'GRATITUDE',
    name: 'Biết ơn',
    desc: 'Lời cảm ơn, trân trọng cuộc sống',
    color: '#E9A2AE',
    backendColor: '#FFB6C1',
    hi: '#F6CDD3',
  },
  GN: {
    backendKey: 'PERSPECTIVE',
    name: 'Góc nhìn',
    desc: 'Lời chia sẻ góc nhìn cuộc sống',
    color: '#8FBCD9',
    backendColor: '#87CEFA',
    hi: '#C4DDEE',
  },
};

export const BACKEND_KEY_TO_FRONTEND = {
  ENCOURAGEMENT: 'KL',
  HEALING: 'CL',
  GRATITUDE: 'BO',
  PERSPECTIVE: 'GN',
};

/**
 * Helper to normalize category to backend key
 */
export function toBackendCategory(cat) {
  if (!cat) return undefined;
  const upper = cat.toUpperCase();
  if (CATEGORY_MAP[upper]) return CATEGORY_MAP[upper].backendKey;
  if (['ENCOURAGEMENT', 'HEALING', 'GRATITUDE', 'PERSPECTIVE'].includes(upper)) {
    return upper;
  }
  return upper;
}

/**
 * Helper to get frontend category key
 */
export function toFrontendCategory(cat) {
  if (!cat) return 'KL';
  const upper = cat.toUpperCase();
  if (BACKEND_KEY_TO_FRONTEND[upper]) return BACKEND_KEY_TO_FRONTEND[upper];
  if (CATEGORY_MAP[upper]) return upper;
  return 'KL';
}

/**
 * Service xử lý các nghiệp vụ Phòng 3: Cây Thông điệp Cộng đồng (Room 3 - Community Tree)
 * Tham chiếu đặc tả: 06_room3_community_tree_page.md và backend/specification/plan_07_room3_community.md
 */
export const room3Service = {
  /**
   * 7.6 Tải danh mục lá & màu sắc quy chuẩn (Color Legend)
   * @returns {Promise<Object>} { room_id, total_leaves, categories }
   */
  async getLeafCategories() {
    return await apiClient.get('/rooms/3/leaf-categories');
  },

  /**
   * 7.1 Lấy danh sách dải thông điệp/lá trên cây
   * @param {Object} options
   * @param {string} [options.category] - 'KL', 'CL', 'BO', 'GN' hoặc backend key
   * @param {string} [options.filter='all'] - 'all' hoặc 'mine'
   * @param {boolean} [options.mine=false]
   * @param {number} [options.limit=100]
   * @param {string} [options.title]
   * @param {string} [options.author_display_name]
   * @param {string} [options.color_code]
   * @returns {Promise<Object>} { color_legend, items, total_ribbons }
   */
  async getLeaves({
    category = null,
    filter = 'all',
    mine = false,
    limit = 100,
    title = null,
    author_display_name = null,
    color_code = null,
  } = {}) {
    const params = {
      filter: mine ? 'mine' : filter,
      limit: Math.min(limit, 150),
    };

    if (category) {
      params.category = toBackendCategory(category);
    }
    if (title) params.title = title;
    if (author_display_name) params.author_display_name = author_display_name;
    if (color_code) params.color_code = color_code;

    return await apiClient.get('/rooms/3/artworks', { params });
  },

  /**
   * 7.2 Xem chi tiết thông điệp trên chiếc lá (tự động tăng view_count)
   * @param {string} artworkId
   * @returns {Promise<Object>} Chi tiết dải thông điệp
   */
  async getLeafDetail(artworkId) {
    return await apiClient.get(`/rooms/3/artworks/${artworkId}`);
  },

  /**
   * 7.3 Tương tác tiếp sức năng lượng hoặc thả tim
   * @param {string} artworkId
   * @param {string} [actionType='INSPIRED'] - 'INSPIRED' | 'ENERGY' | 'HEART'
   * @returns {Promise<Object>} { artwork_id, current_action, reactions }
   */
  async toggleEnergy(artworkId, actionType = 'INSPIRED') {
    const normalizedAction = actionType.toUpperCase() === 'HEART' ? 'HEART' : 'INSPIRED';
    return await apiClient.post(`/rooms/3/artworks/${artworkId}/energy`, {
      action_type: normalizedAction,
    });
  },

  /**
   * 7.4 Treo thông điệp mới lên cây
   * @param {Object} data
   * @param {string} data.title
   * @param {string} data.content
   * @param {string} [data.short_content]
   * @param {string} [data.author_display_name]
   * @param {string} [data.tag_category='KL']
   * @param {string} [data.color_code]
   * @param {boolean} [data.is_anonymous=false]
   * @param {string} [data.original_language='vi']
   * @returns {Promise<Object>} { id, title, status, tag_category, color_code, ... }
   */
  async hangLeaf({
    title,
    content,
    short_content = null,
    author_display_name = null,
    tag_category = 'KL',
    color_code = null,
    is_anonymous = false,
    original_language = 'vi',
  }) {
    const backendCat = toBackendCategory(tag_category) || 'ENCOURAGEMENT';
    const expectedColor =
      color_code ||
      (backendCat === 'HEALING'
        ? '#98FB98'
        : backendCat === 'GRATITUDE'
        ? '#FFB6C1'
        : backendCat === 'PERSPECTIVE'
        ? '#87CEFA'
        : '#FFD700');

    const cleanTitle = title?.trim() || '';
    const cleanContent = content?.trim() || '';
    const cleanShort =
      short_content?.trim() ||
      (cleanContent.length > 150 ? cleanContent.slice(0, 150) + '...' : cleanContent);

    return await apiClient.post('/rooms/3/artworks', {
      title: cleanTitle,
      content: cleanContent,
      short_content: cleanShort,
      author_display_name: author_display_name?.trim() || undefined,
      tag_category: backendCat,
      color_code: expectedColor,
      is_anonymous: Boolean(is_anonymous),
      original_language,
    });
  },

  /**
   * 7.5 Tìm kiếm thông điệp trên cây
   * @param {Object} options
   * @param {string} options.q
   * @param {string} [options.category]
   * @param {string} [options.color_code]
   * @param {string} [options.scope='all'] - 'all' hoặc 'mine'
   * @param {number} [options.page=1]
   * @param {number} [options.limit=20]
   * @returns {Promise<Object>} { items, pagination: { total_hits, page, limit } }
   */
  async searchLeaves({
    q,
    category = null,
    color_code = null,
    scope = 'all',
    page = 1,
    limit = 20,
  } = {}) {
    const params = {
      q,
      scope,
      page,
      limit: Math.min(limit, 50),
    };
    if (category) params.category = toBackendCategory(category);
    if (color_code) params.color_code = color_code;

    return await apiClient.get('/rooms/3/search', { params });
  },
};

export default room3Service;

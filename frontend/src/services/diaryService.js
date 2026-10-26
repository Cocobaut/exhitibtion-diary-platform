import { apiClient } from './apiClient';

/**
 * Service xử lý các nghiệp vụ Không gian Nhật ký (Diaries Service)
 * Tham chiếu đặc tả: 07_diary_pages.md và backend/specification/plan_08_diaries.md
 */
export const diaryService = {
  /**
   * 8.1 Lấy danh sách nhật ký cá nhân (tab Bản thân)
   * @param {Object} options
   * @param {string} [options.view_mode='timeline'] - 'timeline' hoặc 'calendar'
   * @param {number} [options.year]
   * @param {number} [options.month]
   * @param {string} [options.mood]
   * @param {number} [options.page=1]
   * @param {number} [options.limit=20]
   * @returns {Promise<Object>} { items, pagination }
   */
  async getMyDiaries({
    view_mode = 'timeline',
    year = null,
    month = null,
    mood = null,
    page = 1,
    limit = 20,
  } = {}) {
    const params = { view_mode, page, limit };
    if (year) params.year = year;
    if (month) params.month = month;
    if (mood) params.mood = mood;

    return await apiClient.get('/diaries/me', { params });
  },

  /**
   * 8.2 Xem chi tiết bài nhật ký cá nhân
   * @param {string} diaryId
   * @returns {Promise<Object>} Chi tiết nhật ký
   */
  async getMyDiaryDetail(diaryId) {
    return await apiClient.get(`/diaries/me/${diaryId}`);
  },

  /**
   * 8.3 Viết trang nhật ký mới
   * @param {Object} data
   * @param {string} [data.title]
   * @param {string} [data.entry_date] - YYYY-MM-DD
   * @param {string} [data.mood]
   * @param {string} data.content
   * @param {string[]} [data.media_urls=[]]
   * @param {boolean} [data.is_public=false]
   * @param {string} [data.visibility='PRIVATE'] - 'PRIVATE' hoặc 'COMMUNITY'
   * @param {boolean} [data.is_encrypted=false]
   * @param {string} [data.original_language='vi']
   * @returns {Promise<Object>} { id, title, entry_date, is_public, is_approved, ... }
   */
  async createDiary({
    title,
    entry_date = null,
    mood = null,
    content,
    media_urls = [],
    is_public = false,
    visibility = 'PRIVATE',
    is_encrypted = false,
    original_language = 'vi',
  }) {
    const isPublicValue =
      visibility.toUpperCase() === 'COMMUNITY' ? true : Boolean(is_public);

    return await apiClient.post('/diaries', {
      title: title?.trim() || undefined,
      entry_date: entry_date || undefined,
      mood: mood || undefined,
      content: content?.trim() || '',
      media_urls: Array.isArray(media_urls) ? media_urls : [],
      is_public: isPublicValue,
      is_encrypted: Boolean(is_encrypted),
      original_language,
    });
  },

  /**
   * 8.4 Chỉnh sửa nhật ký cá nhân
   * @param {string} diaryId
   * @param {Object} data { title, entry_date, mood, content, media_urls, is_public, is_encrypted }
   * @returns {Promise<Object>} { id, title, updated_at }
   */
  async updateDiary(diaryId, data) {
    const payload = { ...data };
    if (payload.visibility) {
      payload.is_public = payload.visibility.toUpperCase() === 'COMMUNITY';
      delete payload.visibility;
    }
    return await apiClient.put(`/diaries/me/${diaryId}`, payload);
  },

  /**
   * 8.5 Xóa nhật ký cá nhân
   * @param {string} diaryId
   * @returns {Promise<Object>} { message }
   */
  async deleteDiary(diaryId) {
    return await apiClient.delete(`/diaries/me/${diaryId}`);
  },

  /**
   * 8.6 Tải lên tối đa 5 hình ảnh đính kèm nhật ký
   * @param {File[]|FileList|File} files - Danh sách file cần upload
   * @returns {Promise<string[]>} Danh sách URLs ảnh sau khi upload
   */
  async uploadMedia(files) {
    const formData = new FormData();
    const fileList = Array.isArray(files) ? files : files instanceof FileList ? Array.from(files) : [files];

    fileList.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post('/diaries/upload-media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = response?.data || response;
    return data?.urls || [];
  },

  /**
   * 8.2.1 Danh sách nhật ký cộng đồng (tab Cộng đồng)
   * @param {Object} options
   * @param {string} [options.mood]
   * @param {string} [options.sort='latest'] - 'latest' hoặc 'most_sympathetic'
   * @param {number} [options.page=1]
   * @param {number} [options.limit=20]
   * @returns {Promise<Object>} { items, pagination }
   */
  async getCommunityDiaries({
    mood = null,
    sort = 'latest',
    page = 1,
    limit = 20,
  } = {}) {
    const params = { sort, page, limit };
    if (mood) params.mood = mood;

    return await apiClient.get('/diaries/community', { params });
  },

  /**
   * 8.2.2 Xem chi tiết bài nhật ký cộng đồng
   * @param {string} diaryId
   * @returns {Promise<Object>} Chi tiết bài nhật ký cộng đồng
   */
  async getCommunityDiaryDetail(diaryId) {
    return await apiClient.get(`/diaries/community/${diaryId}`);
  },

  /**
   * 8.2.3 Thả/Gỡ cảm xúc trên bài nhật ký cộng đồng
   * @param {string} diaryId
   * @param {string} [reactionType='HEART'] - 'HEART', 'HUG', 'SYMPATHY'
   * @returns {Promise<Object>} { diary_id, current_reaction, reactions }
   */
  async toggleCommunityReaction(diaryId, reactionType = 'HEART') {
    return await apiClient.post(`/diaries/community/${diaryId}/reactions`, {
      reaction_type: reactionType.toUpperCase(),
    });
  },

  /**
   * 8.3.1 Tìm kiếm nhật ký cá nhân hoặc cộng đồng
   * @param {Object} options
   * @param {string} options.q
   * @param {string} [options.scope='mine'] - 'mine' hoặc 'community'
   * @param {string} [options.mood]
   * @param {string} [options.from_date]
   * @param {string} [options.to_date]
   * @param {number} [options.page=1]
   * @param {number} [options.limit=20]
   * @returns {Promise<Object>} { items, pagination }
   */
  async searchDiaries({
    q,
    scope = 'mine',
    mood = null,
    from_date = null,
    to_date = null,
    page = 1,
    limit = 20,
  } = {}) {
    const params = { q, scope, page, limit };
    if (mood) params.mood = mood;
    if (from_date) params.from_date = from_date;
    if (to_date) params.to_date = to_date;

    return await apiClient.get('/diaries/search', { params });
  },

  /**
   * 8.7 Thống kê cảm xúc nhật ký cá nhân
   * @returns {Promise<Object>} Thống kê số lượng theo tâm trạng
   */
  async getMoodStats() {
    return await apiClient.get('/diaries/stats/moods');
  },
};

export default diaryService;

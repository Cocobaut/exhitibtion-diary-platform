import { apiClient } from './apiClient';
import { capsuleService } from './capsuleService';
import { room1Service } from './room1Service';
import { room2Service } from './room2Service';
import { room3Service } from './room3Service';

/**
 * Service xử lý các nghiệp vụ Sổ tay Ký ức (Unified Notebook)
 * Tham chiếu đặc tả: 07b_notebook_page.md và plan_14_unified_notebook.md
 */
export const notebookService = {
  /**
   * Lấy danh sách các mục đã lưu trong Sổ tay hợp nhất từ Backend
   * @param {Object} options
   * @param {string} [options.source='all'] - 'all' | 'mailbox' | 'lantern' | 'room1' | 'room3'
   * @param {string} [options.search]
   * @param {number} [options.page=1]
   * @param {number} [options.limit=50]
   * @returns {Promise<Object>} { items, pagination: { total_items, counts, page, limit } }
   */
  async getNotebook({
    source = 'all',
    search = '',
    page = 1,
    limit = 50,
  } = {}) {
    const params = { source, page, limit };
    if (search && search.trim()) {
      params.search = search.trim();
    }
    return await apiClient.get('/notebook', { params });
  },

  /**
   * Bỏ lưu một mục khỏi Sổ tay dựa theo nguồn
   * @param {Object} item - Mục cần gỡ
   * @returns {Promise<Object>}
   */
  async removeNotebookItem(item) {
    if (!item) return;

    const source = item.source || (
      item.sourceLabel?.includes('Hòm thư') ? 'mailbox' :
      item.sourceLabel?.includes('Phòng 1') ? 'room1' :
      item.sourceLabel?.includes('Phòng 3') ? 'room3' : 'lantern'
    );
    const targetId = item.source_id || item.artwork_id || item.draw_id || item.id;

    if (source === 'mailbox') {
      try {
        return await capsuleService.toggleSaveDraw(targetId, false);
      } catch (err) {
        console.warn('Backend unsave capsule draw failed:', err);
      }
    } else if (source === 'lantern') {
      try {
        return await room2Service.unsaveLanternFromNotebook(targetId);
      } catch (err) {
        console.warn('Backend unsave lantern letter failed:', err);
      }
    } else if (source === 'room1') {
      try {
        return await room1Service.unsaveArtworkFromNotebook(targetId);
      } catch (err) {
        console.warn('Backend unsave room1 artwork failed:', err);
      }
    } else if (source === 'room3') {
      try {
        return await room3Service.unsaveLeafFromNotebook(targetId);
      } catch (err) {
        console.warn('Backend unsave room3 leaf failed:', err);
      }
    }
  },
};

export default notebookService;

import apiClient from "./apiClient";

export const aiCopilotService = {
  // ==========================================
  // 1. DÀNH CHO ADMIN & OWNER: KIỂM DUYỆT & SINH ẢNH
  // ==========================================

  /**
   * Kiểm duyệt bài viết với Human-in-the-loop rubric scoring
   * @param {Object} data - { art_id, target_room, content }
   */
  moderateArtwork: async ({ art_id, target_room, content }) => {
    return await apiClient.post("/admin/ai/moderate", {
      art_id,
      target_room,
      content,
    });
  },

  /**
   * Sinh ảnh minh họa nghệ thuật từ cảm xúc bài viết
   * @param {Object} data - { art_id, source_content, custom_prompt_addon }
   */
  generateArtImage: async ({ art_id, source_content, custom_prompt_addon }) => {
    return await apiClient.post("/admin/ai/generate-image", {
      art_id,
      source_content,
      custom_prompt_addon,
    });
  },

  // ==========================================
  // 2. DÀNH RIÊNG CHO OWNER: QUẢN TRỊ CẤU HÌNH AI
  // ==========================================

  /**
   * Lấy cấu hình AI hiện tại
   */
  getAiSettings: async () => {
    return await apiClient.get("/owner/ai-settings");
  },

  /**
   * Khám phá model động từ API Key thật của Provider
   * @param {Object} data - { api_key, provider, task_type, base_url }
   */
  discoverModels: async ({
    api_key,
    provider = "auto",
    task_type = "moderation",
    base_url = null,
  }) => {
    return await apiClient.post("/owner/ai-settings/discover-models", {
      api_key,
      provider,
      task_type,
      base_url,
    });
  },

  /**
   * Cập nhật toàn bộ cấu hình AI Multi-Provider
   */
  updateAiSettings: async (payload) => {
    return await apiClient.put("/owner/ai-settings", payload);
  },

  /**
   * Kích hoạt dịch vụ AI (service: 'all' | 'moderation' | 'image_generation')
   */
  activateAiService: async (service = "all") => {
    return await apiClient.post("/owner/ai-settings/activate", { service });
  },

  /**
   * Vô hiệu hóa dịch vụ AI (service: 'all' | 'moderation' | 'image_generation')
   */
  deactivateAiService: async (service = "all") => {
    return await apiClient.post("/owner/ai-settings/deactivate", { service });
  },

  /**
   * Xóa API Key của dịch vụ kiểm duyệt
   */
  deleteModerationKey: async () => {
    return await apiClient.delete("/owner/ai-settings/api-key/moderation");
  },

  /**
   * Xóa API Key của dịch vụ sinh ảnh
   */
  deleteImageGenKey: async () => {
    return await apiClient.delete("/owner/ai-settings/api-key/image-generation");
  },
};

export default aiCopilotService;

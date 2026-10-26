# 📮 Postman Collections Directory

Thư mục này dùng để lưu trữ toàn bộ các file Postman Collection JSON (định dạng Schema v2.1.0) phục vụ việc import vào Postman để kiểm thử tự động (API Testing) cho từng nhóm API trong dự án.

## 📂 Danh sách các file Collection (Tương ứng các nhóm API)

1. `01_auth.postman_collection.json` - Nhóm 1: Xác thực & Khôi phục mật khẩu
2. `02_user_profile.postman_collection.json` - Nhóm 2: Hồ sơ cá nhân & Tài khoản
3. `03_capsules.postman_collection.json` - Nhóm 3: Máy nhả thông điệp
4. `04_notifications.postman_collection.json` - Nhóm 4: Hộp thông báo
5. `05_room1_broken.postman_collection.json` - Nhóm 5: Phòng 1 (Đổ vỡ)
6. `06_room2_hope.postman_collection.json` - Nhóm 6: Phòng 2 (Lồng đèn Hy vọng)
7. `07_room3_community.postman_collection.json` - Nhóm 7: Phòng 3 (Cây thông điệp)
8. `08_diaries.postman_collection.json` - Nhóm 8: Nhật ký cá nhân & Cộng đồng
9. `09_admin_rooms.postman_collection.json` - Nhóm 9: Admin quản lý 3 phòng
10. `10_admin_diaries.postman_collection.json` - Nhóm 10: Admin quản lý nhật ký
11. `11_admin_capsules.postman_collection.json` - Nhóm 11: Admin kho thông điệp
12. `12_admin_studio_audit.postman_collection.json` - Nhóm 12: Admin Studio & Audit Log
13. `13_owner.postman_collection.json` - Nhóm 13: Chủ sở hữu hệ thống (Owner)
14. `14_notebook.postman_collection.json` - Nhóm 14: Sổ tay Ký ức Hợp nhất
15. `16_ai_copilot.postman_collection.json` - Nhóm 16: AI Copilot Kiểm duyệt bài viết & Sinh ảnh (Human-in-the-loop, Multi-Provider, Kích hoạt/Vô hiệu hóa & Xóa API Key)

### Chi tiết các Request trong Collection `16_ai_copilot`:
- **Owner - AI Configuration**:
  - `[1.1] GET /owner/ai-settings`: Xem cấu hình AI hiện tại và các key đã mask.
  - `[1.2] POST /owner/ai-settings/discover-models`: Khám phá model kiểm duyệt (Gemini, OpenAI, Anthropic).
  - `[1.3] POST /owner/ai-settings/discover-models`: Khám phá model sinh ảnh (Google Imagen 3, DALL-E 3).
  - `[1.4] PUT /owner/ai-settings`: Cập nhật cấu hình multi-provider và lưu API Key mã hóa AES-256.
  - `[1.5] POST /owner/ai-settings/activate`: Kích hoạt dịch vụ AI toàn hệ thống hoặc từng phân hệ.
  - `[1.6] POST /owner/ai-settings/deactivate`: Vô hiệu hóa dịch vụ AI toàn hệ thống hoặc từng phân hệ.
  - `[1.7] DELETE /owner/ai-settings/api-key/moderation`: Xóa API Key dịch vụ kiểm duyệt nội dung.
  - `[1.8] DELETE /owner/ai-settings/api-key/image-generation`: Xóa API Key dịch vụ sinh ảnh nghệ thuật.
- **Admin - AI Copilot**:
  - `[2.1] POST /admin/ai/moderate`: Soát lỗi PII/Quảng cáo/Từ cấm & Đề xuất viết lại.
  - `[2.2] POST /admin/ai/moderate`: Kiểm duyệt phát hiện sai phòng (Room mismatch).
  - `[2.3] POST /admin/ai/moderate`: Kiểm duyệt bài hợp lệ (Score >= 60).
  - `[2.4] POST /admin/ai/generate-image`: Sinh ảnh minh họa nghệ thuật từ cảm xúc bài viết.


## ⚙️ Hướng dẫn sử dụng
1. Mở Postman -> Chọn **Import** -> Kéo thả file JSON vào.
2. Thiết lập Environment Variable:
   - `baseUrl`: `http://localhost:8000`
   - `accessToken`: Token nhận được sau khi đăng nhập (được tự động set qua Test Script)
   - `adminToken`: Token của Admin để test các API quản trị
   - `ownerToken`: Token của Quản trị viên tối cao (Owner)


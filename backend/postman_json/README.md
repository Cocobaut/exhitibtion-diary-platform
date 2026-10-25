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

## ⚙️ Hướng dẫn sử dụng
1. Mở Postman -> Chọn **Import** -> Kéo thả file JSON vào.
2. Thiết lập Environment Variable:
   - `baseUrl`: `http://localhost:8000`
   - `accessToken`: Token nhận được sau khi đăng nhập (được tự động set qua Test Script)
   - `adminToken`: Token của Admin để test các API quản trị

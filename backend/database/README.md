# 🗄️ Database Schema & Import Guide (PostgreSQL)

Thư mục này chứa định nghĩa cấu trúc cơ sở dữ liệu (DDL Schema) và dữ liệu mẫu khởi tạo (Seed data) đồng bộ thống nhất giữa **[Database_Specification.pdf](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/specification/Database_Specification.pdf)** và **[API_Specification.pdf](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/specification/API_Specification.pdf)**.

---

## 📂 Danh sách các file SQL (Đã tối ưu & gộp gọn)

Thư mục chỉ gồm **đúng 2 file SQL** có đánh số thứ tự để PostgreSQL thực thi tự động chuẩn xác:

1. **[`01_schema.sql`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/database/01_schema.sql)**:
   - Kích hoạt extensions: `pgcrypto` (hỗ trợ UUID) và `unaccent` (hỗ trợ tìm kiếm tiếng Việt không dấu).
   - Hàm trigger `update_updated_at_column()` tự động cập nhật thời gian sửa đổi.
   - Khởi tạo đầy đủ **12 bảng**:
     1. `users`: Tài khoản, định danh người dùng (`UUID`), role `USER` hoặc `ADMIN`.
     2. `rooms`: 3 phòng triển lãm (`BROKEN`, `HOPE`, `COMMUNITY`).
     3. `artworks`: Tác phẩm triển lãm, hỗ trợ `author_display_name`, `is_anonymous`, khóa thời gian `target_date`, `visibility`.
     4. `artwork_interactions`: Cảm xúc (`HUG`, `HEART`, `SYMPATHY`, `INSPIRED`), Unique chống spam.
     5. `diaries`: Nhật ký cá nhân, hỗ trợ mã hóa, quyền riêng tư `is_public` và duyệt cộng đồng `is_approved`.
     6. `diary_interactions`: Thả tim, ôm, đồng cảm cho nhật ký cộng đồng.
     7. `message_capsules`: Kho thông điệp Máy nhả thông điệp (Composite FK `author_role = 'ADMIN'`).
     8. `user_capsule_draws`: Lịch sử rút thông điệp và cờ `is_saved`.
     9. `notifications`: Hộp tin nhắn hệ thống (`SYSTEM`, `INTERACTION`, `CAPSULE`, `REMINDER`).
     10. `password_reset_tokens`: Quản lý token đặt lại mật khẩu (hạn 15 phút).
     11. `revoked_tokens`: Danh sách đen thu hồi JWT khi người dùng Logout.
     12. `admin_audit_logs`: Nhật ký kiểm duyệt và thao tác của Admin.
   - Toàn bộ 6 Indexes tối ưu (Full-text search GIN, Partial Index thông báo chưa đọc, Composite filter...).

2. **[`02_seed.sql`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/database/02_seed.sql)**:
   - Khởi tạo 3 phòng triển lãm mặc định.
   - Khởi tạo tài khoản Quản trị viên (`admin@exhibition.edu.vn` / mật khẩu `AdminPassword@2026` với bcrypt hash chuẩn).
   - Nạp các thông điệp mẫu cho tính năng Máy nhả thông điệp.

---

## 🚀 Hướng dẫn Import vào PostgreSQL

### Cách 1: Tự động qua Docker Compose (Nhanh nhất)
Thư mục này đã được mount vào `/docker-entrypoint-initdb.d/` trong file `docker-compose.yml`. Khi khởi động container lần đầu, PostgreSQL sẽ tự động chạy lần lượt `01_schema.sql` rồi đến `02_seed.sql`:
```bash
cd backend
docker compose up -d
```

---

### Cách 2: Sử dụng dòng lệnh `psql` (CLI)
```bash
# 1. Tạo database nếu chưa có:
psql -U postgres -c "CREATE DATABASE exhibition_diary_db;"

# 2. Chạy schema cấu trúc bảng:
psql -U postgres -d exhibition_diary_db -f backend/database/01_schema.sql

# 3. Nạp dữ liệu mẫu ban đầu:
psql -U postgres -d exhibition_diary_db -f backend/database/02_seed.sql
```

---

### Cách 3: Dùng công cụ đồ họa (DBeaver / pgAdmin / Adminer)
1. Kết nối vào database `exhibition_diary_db`.
2. Mở file **`01_schema.sql`** và bấm Execute (F5).
3. Mở file **`02_seed.sql`** và bấm Execute (F5).

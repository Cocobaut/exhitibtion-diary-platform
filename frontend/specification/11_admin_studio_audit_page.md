# THỰC THI 11 — TRANG QUẢN TRỊ: STUDIO XUẤT BẢN & NHẬT KÝ KIỂM TOÁN
## Tệp hướng dẫn tích hợp: Tab "Studio" & "Nhật ký quản trị" trong Bảng Quản trị

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**:
  - Tab **"Studio"**: `src/pages/Admin/AdminStudio.jsx` (Xuất bản trực tiếp tác phẩm của ban biên tập)
  - Tab **"Nhật ký quản trị"**: `src/pages/Admin/AdminAuditLog.jsx` (Lịch sử thao tác kiểm toán)
- **Tệp dịch vụ (Service)**: `src/services/adminStudioService.js`.
- **Tài liệu đặc tả backend tham chiếu**: `backend/specification/plan_12_admin_studio_audit.md`.
- **Yêu cầu phân quyền**: Vai trò **`ADMIN`** hoặc **`OWNER`**.

---

## 2. Chi tiết luồng tích hợp API

### 2.1 Admin Studio: Xuất bản tác phẩm trực tiếp lên triển lãm
- **Mục đích**: Cho phép Ban quản trị hoặc Giám tuyển tự đăng bài viết, triển lãm chuyên đề của bảo tàng lên các phòng (Phòng 1, Phòng 2, Phòng 3) mà **không cần qua quy trình duyệt**. Tác phẩm sẽ lập tức có trạng thái `APPROVED`.
- **Endpoint**: `POST /api/v1/admin/studio/artworks`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "room_id": 1,
    "title": "Kỷ niệm ngày thành lập bảo tàng",
    "summary": "Tác phẩm đặc biệt tri ân những người đã can đảm chia sẻ câu chuyện.",
    "content": "Toàn văn nội dung bài viết chuyên đề của giám tuyển...",
    "image_url": "https://storage.../curator/special_2026.jpg",
    "author_display_name": "Ban Giám Tuyển",
    "quote": "“Cảm xúc là thứ duy nhất chân thật trong mọi khoảnh khắc.”"
  }
  ```
- **Response 201 Created**:
  ```json
  {
    "success": true,
    "message": "Tác phẩm Studio đã được xuất bản trực tiếp lên phòng triển lãm",
    "data": {
      "id": 99,
      "room_id": 1,
      "status": "APPROVED",
      "published_by": "An"
    }
  }
  ```
- **Hành động Frontend**:
  - Toast thông báo thành công.
  - Tự động ghi nhận một dòng log vào hệ thống `admin_audit_logs`.

---

### 2.2 Xem Nhật ký kiểm toán quản trị (`AdminAuditLog.jsx`)
- **Hành động kích hoạt**: Khi Admin chọn tab **"Nhật ký quản trị"**.
- **Endpoint**: `GET /api/v1/admin/studio/audit-logs`
- **Query params**:
  - `action_type=APPROVE | REJECT | ARCHIVE | PUBLISH | LOCK_USER`
  - `admin_id=<uuid>` (lọc theo admin cụ thể)
  - `limit=50&offset=0`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "log_01",
          "admin_name": "An",
          "action": "APPROVE",
          "target_type": "ARTWORK",
          "target_id": 9,
          "summary": "Phê duyệt tác phẩm 'Mùa thi đại học năm ấy' (Phòng 1)",
          "details": "Đã sửa 1 chi tiết nhận dạng: 'Cô Hằng' -> 'Cô giáo chủ nhiệm'",
          "ip_address": "14.161.x.x",
          "created_at": "2026-10-25T14:10:00Z"
        },
        {
          "id": "log_02",
          "admin_name": "Chi",
          "action": "REJECT",
          "target_type": "ARTWORK",
          "target_id": 10,
          "summary": "Từ chối tác phẩm 'Bạn cùng phòng'",
          "details": "Lý do: câu chuyện còn nhắc tên thật của bạn khác",
          "ip_address": "118.69.x.x",
          "created_at": "2026-10-25T13:45:00Z"
        }
      ],
      "total": 312
    }
  }
  ```
- **Hành động Frontend**:
  - Render bảng lịch sử kiểm toán với các badge màu tương ứng (`APPROVE`: Xanh lá, `REJECT`: Đỏ, `ARCHIVE`: Xám).
  - Đảm bảo tính minh bạch giữa các admin, nắm được ai đang duyệt hoặc sửa bài nào.

---

### 2.3 Khóa / Mở khóa tài khoản người dùng vi phạm
- **Mục đích**: Khi phát hiện tài khoản spam hoặc đăng tải nội dung phản động/độc hại.
- **Endpoint**: `PATCH /api/v1/admin/studio/users/{user_id}/status`
- **Request Body**:
  ```json
  {
    "is_active": false,
    "reason": "Spam nội dung quảng cáo nhiều lần"
  }
  ```
- **Response 200 OK**: Tài khoản bị khóa lập tức, không thể đăng nhập hoặc thao tác trên hệ thống.

---

### 2.4 Gửi yêu cầu lên Chủ sở hữu (Owner) để xóa vĩnh viễn tài khoản
- **Quy tắc quan trọng**: Admin **không được phép tự ý xoá vĩnh viễn** tài khoản người dùng hoặc admin khác. Khi có trường hợp vi phạm đặc biệt nghiêm trọng cần xoá dữ liệu, Admin lập phiếu yêu cầu gửi lên Owner.
- **Endpoint**: `POST /api/v1/admin/studio/users/{user_id}/request-deletion`
- **Request Body**:
  ```json
  {
    "reason": "Tài khoản giả mạo người nổi tiếng và phát tán thông tin sai lệch nghiêm trọng"
  }
  ```
- **Response 200 OK**:
  - Thông báo: *"Đã gửi yêu cầu xóa tài khoản lên Chủ sở hữu (Owner) chờ phê duyệt"*.
  - Phiếu yêu cầu sẽ xuất hiện trong Bảng điều khiển của Owner (`Plan 12`).

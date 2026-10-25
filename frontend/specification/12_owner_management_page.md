# THỰC THI 12 — TRANG QUẢN TRỊ TỐI CAO CỦA CHỦ SỞ HỮU (OWNER)
## Tệp hướng dẫn tích hợp: `OwnerDashboardPage` & `UserRoleManagementModal`

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**: `src/pages/Owner/OwnerDashboardPage.jsx` (Dành riêng cho vai trò `OWNER`).
- **Tệp dịch vụ (Service)**: `src/services/ownerService.js`.
- **Tài liệu đặc tả backend tham chiếu**: `backend/specification/plan_13_owner.md`.
- **Yêu cầu phân quyền nghiêm ngặt**: Chỉ duy nhất người dùng có `role === 'OWNER'` mới được truy cập trang này. Mọi vai trò khác (kể cả `ADMIN`) khi cố tình gọi API sẽ nhận về `403 Forbidden` (`"Yêu cầu quyền Chủ sở hữu (Owner)"`).

---

## 2. Chi tiết luồng tích hợp API

### 2.1 Quản lý Danh sách Toàn bộ Người dùng & Quản trị viên
- **Hành động kích hoạt**: Khi Chủ sở hữu truy cập Bảng điều khiển Owner.
- **Endpoint**: `GET /api/v1/owner/users`
- **Query params**:
  - `role=ALL | USER | ADMIN | OWNER` (mặc định `ALL`)
  - `status=ALL | ACTIVE | LOCKED`
  - `search={keyword}` (tìm theo username, email, nickname)
  - `limit=20&offset=0`
- **Headers**: `Authorization: Bearer <token_of_owner>`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "usr_001",
          "username": "linh.ng",
          "email": "linh@example.com",
          "nickname": "Linh",
          "role": "USER",
          "is_active": true,
          "created_at": "2026-10-21T08:00:00Z",
          "stats": {
            "artworks_count": 3,
            "diaries_count": 4,
            "reports_count": 0
          }
        },
        {
          "id": "adm_002",
          "username": "an.curator",
          "email": "an@museum.vn",
          "nickname": "An",
          "role": "ADMIN",
          "is_active": true,
          "created_at": "2026-09-01T00:00:00Z",
          "stats": {
            "moderated_artworks_count": 142
          }
        }
      ],
      "total_users": 1520,
      "total_admins": 4
    }
  }
  ```
- **Hành động Frontend**:
  - Hiển thị bảng toàn diện gồm Avatar, Thông tin tài khoản, Vai trò hiện tại, Trạng thái (Đang hoạt động / Bị khóa), và các nút thao tác nhanh.

---

### 2.2 Thăng cấp / Hạ cấp vai trò tài khoản (`ROLE`)
- **Mục đích**:
  - Thăng cấp một người dùng nhiệt tình từ `USER` $\rightarrow$ `ADMIN`.
  - Hạ cấp một `ADMIN` vi phạm quy chế hoặc thôi việc về lại `USER`.
- **Hành động kích hoạt**: Bấm nút **"Đổi vai trò"** trên hàng tài khoản -> Chọn vai trò mới -> Bấm **"Xác nhận"**.
- **Endpoint**: `PATCH /api/v1/owner/users/{user_id}/role`
- **Headers**: `Authorization: Bearer <token_of_owner>`
- **Request Body**:
  ```json
  {
    "new_role": "ADMIN",
    "reason": "Bổ nhiệm thêm nhân sự cho Ban kiểm duyệt Phòng 1"
  }
  ```
- **Quy tắc an toàn (Guardrails)**:
  - Chủ sở hữu **không thể tự hạ cấp vai trò của chính mình** (tránh hệ thống mất người đứng đầu). Backend sẽ chặn trả về `400 INVALID_ACTION`.
- **Response 200 OK**:
  - Cập nhật vai trò trên giao diện ngay lập tức.
  - Toast thông báo: *"Đã thay đổi vai trò tài khoản thành công"*.

---

### 2.3 Xem và Duyệt Yêu cầu Xóa Vĩnh viễn tài khoản (Deletion Requests)
- **Hành động kích hoạt**: Chủ sở hữu chuyển sang tab **"Yêu cầu xóa tài khoản"**.

#### Bước 1: Xem các phiếu yêu cầu xóa do Admin gửi lên
- **Endpoint**: `GET /api/v1/owner/deletion-requests?status=PENDING`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "request_id": "req_99",
          "target_user_id": "usr_spam_01",
          "target_username": "@bot_quangcao",
          "requested_by_admin": "An",
          "reason": "Tài khoản bot spam liên tục liên kết độc hại",
          "created_at": "2026-10-25T15:00:00Z"
        }
      ]
    }
  }
  ```

#### Bước 2: Duyệt xóa vĩnh viễn (Hard Delete)
- **Hành động kích hoạt**: Bấm nút màu đỏ nguy hiểm **"Duyệt xóa vĩnh viễn"** -> Nhập mật khẩu của Owner để xác thực lần 2.
- **Endpoint**: `DELETE /api/v1/owner/users/{user_id}`
- **Headers**: `Authorization: Bearer <token_of_owner>`
- **Request Body**:
  ```json
  {
    "confirm_owner_password": "OwnerStrongPassword999@",
    "reason": "Duyệt yêu cầu xóa tài khoản vi phạm từ Admin An"
  }
  ```
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "message": "Tài khoản đã bị xóa vĩnh viễn khỏi toàn bộ hệ thống"
  }
  ```
- **Hành động Frontend**:
  - Toàn bộ dữ liệu liên quan đến tài khoản được dọn dẹp sạch sẽ.
  - Toast thông báo và loại bỏ tài khoản khỏi danh sách.

---

### 2.4 Xem Nhật ký Thao tác Chủ sở hữu (Owner Audit Logs)
- **Endpoint**: `GET /api/v1/owner/audit-logs`
- **Nhiệm vụ**: Giám sát tất cả các quyết định tối cao: Phân quyền, thăng chức, xóa tài khoản, khóa hệ thống.

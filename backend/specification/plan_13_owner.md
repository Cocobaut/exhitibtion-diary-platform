# PLAN 13 — Nhóm API 13: Quản trị tối cao của Chủ sở hữu (`/api/v1/owner`)

> Đọc `plan_00_foundation.md` trước.
> **Toàn bộ nhóm API này yêu cầu quyền OWNER** (`dependencies=[Depends(require_owner)]`).
> Người dùng không phải OWNER (kể cả ADMIN hay USER thường) → **403 Forbidden** (`error_code: "FORBIDDEN"`, `message: "Yêu cầu quyền Chủ sở hữu (Owner)"`).

---

## 1. Giới thiệu vai trò OWNER (Chủ sở hữu hệ thống)

- Vai trò `OWNER`: Là cấp quản trị tối cao nhất của nền tảng Triển lãm Nhật ký & Ký ức.
- `OWNER` kế thừa toàn bộ quyền hạn của `ADMIN` (có thể truy cập tất cả API của `ADMIN` từ Plan 09 đến Plan 12).
- **Điểm đặc quyền độc nhất của OWNER**:
  1. Xem danh sách toàn bộ người dùng, quản trị viên và chủ sở hữu trên hệ thống kèm bộ lọc và tìm kiếm.
  2. Kích hoạt (`ACTIVATE`) hoặc vô hiệu hóa (`DEACTIVATE`) bất kỳ tài khoản nào (bao gồm cả tài khoản của các `ADMIN` khác).
  3. **Xóa vĩnh viễn (`DELETE`) tài khoản**: Admin **không thể** tự ý xóa tài khoản mà chỉ có thể gửi yêu cầu xóa lên Owner (`POST /api/v1/admin/studio/users/{user_id}/request-deletion`). **Duy nhất OWNER mới có quyền thực hiện xóa vĩnh viễn tài khoản người dùng hoặc Admin**.
  4. Thay đổi vai trò (`ROLE`) của tài khoản: Thăng cấp `USER` $\rightarrow$ `ADMIN`, hạ cấp `ADMIN` $\rightarrow$ `USER`.
  5. Xem nhật ký kiểm toán hệ thống toàn diện dành riêng cho Owner (`OWNER_ACTION_LOGS`).
- **Quy tắc bảo vệ an toàn (Safety Guardrails)**:
  - Chủ sở hữu **không thể tự vô hiệu hóa, tự hạ cấp hoặc tự xóa tài khoản của chính mình**. Nếu cố tình thực hiện $\rightarrow$ **400 INVALID_ACTION** (`"Chủ sở hữu không thể tự thao tác trên tài khoản của chính mình"`).
  - Không thể chỉnh sửa hoặc xóa tài khoản của một `OWNER` khác trừ khi được cấp quyền tương đương.

---

## 2. Phạm vi API

| # | Phân nhóm | Method | Path | Status OK |
|---|---|---|---|---|
| 13.1 | Quản lý Users & Admins | GET | `/api/v1/owner/users` | 200 |
| 13.2 | Chi tiết tài khoản | GET | `/api/v1/owner/users/{user_id}` | 200 |
| 13.3 | Thay đổi trạng thái tài khoản | PATCH | `/api/v1/owner/users/{user_id}/status` | 200 |
| 13.4 | Cập nhật vai trò tài khoản | PATCH | `/api/v1/owner/users/{user_id}/role` | 200 |
| 13.5 | Xóa vĩnh viễn tài khoản | DELETE | `/api/v1/owner/users/{user_id}` | 200 |
| 13.6 | Thống kê tổng quan hệ thống | GET | `/api/v1/owner/system-stats` | 200 |

Router: `APIRouter(prefix="/owner", tags=["Owner - Master Management"], dependencies=[Depends(require_owner)])`.

---

## 3. File cần tạo & cập nhật

- `app/schemas/owner.py`: Định nghĩa schemas cho danh sách, cập nhật trạng thái, vai trò, chi tiết và thống kê.
- `app/services/owner_service.py`: Nghiệp vụ quản lý user/admin, kiểm tra guardrails, vô hiệu hóa token khi user bị khóa/xóa.
- `app/api/v1/endpoints/owner.py`: Router các endpoint của Owner.
- `app/api/deps.py`: Bổ sung dependency `require_owner` và cập nhật `require_admin` chấp nhận cả `OWNER`.
- `app/models/user.py`: Bổ sung `OWNER = "OWNER"` vào `UserRole`.
- `tests/test_owner.py`: Bộ kiểm thử tự động toàn diện cho Plan 13.
- `backend/postman_json/13_owner.postman_collection.json`: Collection Postman chuẩn Schema v2.1.0.

---

## 4. Chi tiết từng endpoint

### 13.1 `GET /api/v1/owner/users?role=&is_active=&q=&page=1&limit=20`
Lấy danh sách người dùng, admin trong hệ thống.
- `role`: `USER`, `ADMIN`, `OWNER` (tùy chọn).
- `is_active`: `true` hoặc `false` (tùy chọn).
- `q`: Tìm kiếm theo `username`, `email`, hoặc `nickname`.
- `page`: Mặc định 1.
- `limit`: Mặc định 20, tối đa 100.

**Response 200**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "a0000000-0000-0000-0000-000000000001",
        "username": "admin_exhibition",
        "email": "admin@exhibition.edu.vn",
        "nickname": "Ban Quản Trị",
        "role": "ADMIN",
        "avatar_url": "https://example.com/avatar.jpg",
        "bio": "Quản trị viên triển lãm",
        "is_active": true,
        "created_at": "2026-09-01T08:00:00Z",
        "updated_at": "2026-10-25T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_items": 125,
      "total_pages": 7
    }
  }
}
```

---

### 13.2 `GET /api/v1/owner/users/{user_id}`
Xem chi tiết một tài khoản kèm thống kê hoạt động (số tác phẩm, số nhật ký, số thông điệp đã tạo nếu là admin).

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "a0000000-0000-0000-0000-000000000001",
    "username": "admin_exhibition",
    "email": "admin@exhibition.edu.vn",
    "nickname": "Ban Quản Trị",
    "role": "ADMIN",
    "avatar_url": "https://example.com/avatar.jpg",
    "bio": "Quản trị viên triển lãm",
    "is_active": true,
    "stats": {
      "artworks_count": 15,
      "diaries_count": 3,
      "notifications_count": 45
    },
    "created_at": "2026-09-01T08:00:00Z",
    "updated_at": "2026-10-25T09:00:00Z"
  }
}
```

---

### 13.3 `PATCH /api/v1/owner/users/{user_id}/status`
Vô hiệu hóa (khóa) hoặc kích hoạt lại tài khoản bất kỳ.

**Request Body**
```json
{
  "is_active": false,
  "reason": "Vi phạm nghiêm trọng chính sách bảo mật nội bộ và tiêu chuẩn cộng đồng"
}
```

**Quy tắc nghiệp vụ**:
1. Không cho phép Owner tự khóa tài khoản của chính mình $\rightarrow$ 400 `INVALID_ACTION`.
2. Nếu tài khoản mục tiêu là `OWNER` $\rightarrow$ 403 `FORBIDDEN` (`"Không thể thay đổi trạng thái của tài khoản Chủ sở hữu khác"`).
3. Cập nhật `users.is_active = payload.is_active`.
4. Nếu vô hiệu hóa (`is_active = false`), toàn bộ phiên làm việc của user đó sẽ bị vô hiệu ngay lập tức khi gọi API tiếp theo vì `get_current_user` kiểm tra `user.is_active`.
5. Ghi nhận `AdminAuditLog` (`action_type = 'DEACTIVATE_USER'` hoặc `'ACTIVATE_USER'`).

**Response 200**
```json
{
  "success": true,
  "message": "Cập nhật trạng thái tài khoản thành công",
  "data": {
    "id": "a0000000-0000-0000-0000-000000000002",
    "username": "moderator_linh",
    "role": "ADMIN",
    "is_active": false,
    "updated_at": "2026-10-25T11:00:00Z"
  }
}
```

---

### 13.4 `PATCH /api/v1/owner/users/{user_id}/role`
Thăng chức hoặc hạ chức tài khoản giữa `USER` và `ADMIN`.

**Request Body**
```json
{
  "role": "ADMIN"
}
```

**Quy tắc nghiệp vụ**:
1. `role` hợp lệ: `USER`, `ADMIN`.
2. Không thể tự thay đổi vai trò của chính mình $\rightarrow$ 400 `INVALID_ACTION`.
3. Không thể hạ chức một `OWNER` khác qua endpoint này.
4. Cập nhật `users.role = payload.role`.
5. Ghi nhận `AdminAuditLog` (`action_type = 'UPDATE_USER_ROLE'`).

**Response 200**
```json
{
  "success": true,
  "message": "Cập nhật vai trò người dùng thành công",
  "data": {
    "id": "b2f67a21-98e3-4f93-b789-2144d18ec301",
    "username": "hoanghon_01",
    "old_role": "USER",
    "new_role": "ADMIN",
    "updated_at": "2026-10-25T11:05:00Z"
  }
}
```

---

### 13.5 `DELETE /api/v1/owner/users/{user_id}`
Xóa vĩnh viễn một tài khoản khỏi cơ sở dữ liệu.

**Quy tắc nghiệp vụ**:
1. Không thể tự xóa tài khoản của chính mình $\rightarrow$ 400 `INVALID_ACTION`.
2. Không thể xóa tài khoản của `OWNER` khác $\rightarrow$ 403 `FORBIDDEN`.
3. Xóa bản ghi trong `users`. Do các bảng liên quan có `ON DELETE CASCADE` (`artworks`, `diaries`, `notifications`, `artwork_interactions`,...), toàn bộ dữ liệu phụ thuộc sẽ được dọn dẹp sạch sẽ.
4. Ghi nhận `AdminAuditLog` (`action_type = 'DELETE_USER'`).

**Response 200**
```json
{
  "success": true,
  "message": "Đã xóa vĩnh viễn tài khoản người dùng khỏi hệ thống",
  "data": {
    "id": "b2f67a21-98e3-4f93-b789-2144d18ec301",
    "username": "hoanghon_01",
    "deleted_at": "2026-10-25T11:10:00Z"
  }
}
```

---

### 13.6 `GET /api/v1/owner/system-stats`
Xem thống kê phân bổ toàn hệ thống:
- Tổng số users, tổng số admins, tổng số chủ sở hữu.
- Số tài khoản đang hoạt động vs bị khóa.
- Tổng số tác phẩm (chờ duyệt, đã duyệt, lưu trữ) qua 3 phòng.
- Tổng số nhật ký cá nhân & nhật ký cộng đồng.
- Tổng số thông điệp capsule & số lượt rút.

**Response 200**
```json
{
  "success": true,
  "data": {
    "users_summary": {
      "total_users": 1500,
      "active_users": 1480,
      "deactivated_users": 20,
      "by_role": {
        "USER": 1490,
        "ADMIN": 9,
        "OWNER": 1
      }
    },
    "exhibition_summary": {
      "total_artworks": 350,
      "pending_artworks": 12,
      "approved_artworks": 310,
      "archived_artworks": 28
    },
    "diaries_summary": {
      "total_diaries": 2400,
      "public_diaries": 850,
      "pending_approval": 5
    },
    "capsules_summary": {
      "total_capsules": 120,
      "total_draws": 15800
    }
  }
}
```

---

## 5. Test bắt buộc cho Plan 13
- [ ] User thường hoặc Admin gọi endpoint của `/owner/*` $\rightarrow$ 403 `FORBIDDEN`.
- [ ] Owner tự khóa chính mình hoặc tự xóa chính mình $\rightarrow$ 400 `INVALID_ACTION`.
- [ ] Owner khóa thành công tài khoản của một Admin $\rightarrow$ tài khoản admin đó bị chuyển `is_active = False`, request tiếp theo bằng token của admin đó bị từ chối 401 `INACTIVE_ACCOUNT`.
- [ ] Owner kích hoạt lại tài khoản Admin $\rightarrow$ `is_active = True`.
- [ ] Owner thay đổi vai trò tài khoản: từ `USER` thành `ADMIN` và ngược lại thành công.
- [ ] Owner xóa vĩnh viễn tài khoản $\rightarrow$ dữ liệu user bị xóa khỏi database.
- [ ] Owner xem thống kê toàn hệ thống `system-stats` trả về các số liệu chính xác.

# PLAN 12 — Nhóm API 12: Admin Studio & Audit Log (`/api/v1/admin/studio`)

> Đọc `plan_00_foundation.md` trước. Nguồn: API spec trang 71–74.
> **Toàn bộ nhóm API yêu cầu quyền ADMIN hoặc OWNER** (`dependencies=[Depends(require_admin)]`).
> Quản lý việc Admin/Owner xuất bản bài viết trực tiếp (không qua kiểm duyệt) và theo dõi lịch sử thao tác quản trị trên toàn bộ hệ thống triển lãm (`admin_audit_logs`).

## 1. Phạm vi

| # | Method | Path | Status OK |
|---|---|---|---|
| 12.1 | POST | `/api/v1/admin/studio/artworks` | 201 |
| 12.2 | GET | `/api/v1/admin/studio/audit-logs` | 200 |
| 12.3 | POST | `/api/v1/admin/studio/users/{user_id}/request-deletion` | 200 |

Router: `APIRouter(prefix="/admin/studio", tags=["Admin - Studio & Audit Log"])`.

> **Lưu ý về quyền hạn**: Admin **không có quyền trực tiếp xóa tài khoản** người dùng hoặc admin khác. Khi phát hiện tài khoản vi phạm nghiêm trọng cần xóa, Admin gửi yêu cầu xóa tài khoản đến Owner qua API `12.3`. Chỉ duy nhất **Chủ sở hữu (Owner)** mới có thẩm quyền phê duyệt xóa vĩnh viễn tài khoản (Plan 13).

## 2. File cần tạo
- `app/models/admin_audit_log.py` (đã định nghĩa bảng tại plan_00 §2.5)
- `app/schemas/admin_studio.py`
- `app/services/admin_studio_service.py`
- `app/services/audit_log_service.py` (ghi log khi tạo/sửa/duyệt/lưu trữ tác phẩm)
- `app/api/v1/endpoints/admin_studio.py`

---

## 3. Chi tiết endpoint

### 12.1 `POST /admin/studio/artworks`
**Request Body**
```json
{
  "room_id": 1, // 1 (Đổ vỡ), 2 (Lồng đèn Hy vọng), 3 (Cây Thông điệp)
  "title_vi": "Bức tường im lặng",
  "title_en": "The Silent Wall",
  "author_display_name": "Triển Lãm Ký Ức (Ban Quản Trị)",
  "short_content_vi": "Tác phẩm mở màn cho không gian triển lãm Đổ Vỡ mùa thu 2026.",
  "short_content_en": "The opening piece for Broken Exhibition Autumn 2026.",
  "content_vi": "Có những im lặng không phải vì không còn điều gì để nói...",
  "content_en": "There are silences not because there is nothing left to say...",
  "media_url": "https://cdn.exhibition.com/artworks/2026/room-1/curator-piece-1.webp",
  "is_anonymous": false,

  // Thuộc tính riêng cho Phòng 2 (nếu room_id = 2)
  "target_date": null,
  "visibility": "PUBLIC",

  // Thuộc tính riêng cho Phòng 3 (nếu room_id = 3)
  "tag_category": null,
  "color_code": null
}
```

**Quy tắc nghiệp vụ**:
1. `room_id ∈ {1, 2, 3}`.
   - Nếu `room_id = 1`: Phải có `media_url`.
   - Nếu `room_id = 2`: Validate `visibility` (`PUBLIC` hoặc `PRIVATE`), `target_date` nếu có.
   - Nếu `room_id = 3`: Validate cặp `tag_category` và `color_code` theo bảng màu quy chuẩn.
2. **Yêu cầu Song ngữ**: Bắt buộc cung cấp đầy đủ cả bản tiếng Việt và tiếng Anh (`title_vi`, `title_en`, `short_content_vi`, `short_content_en`, `content_vi`, `content_en` không được để trống). Tự động đồng bộ `title = title_vi`, `short_content = short_content_vi`, `content = content_vi`.
3. Tự động thiết lập:
   - `user_id = admin.id`
   - `status = 'APPROVED'`
   - `reviewed_by = admin.id`
   - `reviewed_at = CURRENT_TIMESTAMP`
4. **Tự động ghi Audit Log**:
   - `AuditLogService.log(artwork=new_artwork, admin_id=admin.id, action_type='CREATE_DIRECT', note='Admin xuất bản bài viết trực tiếp qua Studio')`.

**Response 201 Created**
```json
{
  "success": true,
  "message": "Đã xuất bản tác phẩm trực tiếp lên phòng triển lãm thành công",
  "data": {
    "id": "8f7e6d5c-4b3a-2f1e-0d9c-8b7a6f5e4d3c",
    "room_id": 1,
    "title": "Bức tường im lặng",
    "status": "APPROVED",
    "author_display_name": "Triển Lãm Ký Ức (Ban Quản Trị)",
    "media_url": "https://cdn.exhibition.com/artworks/2026/room-1/curator-piece-1.webp",
    "created_by": "e0a11223-14bc-4183-a212-094182410a88",
    "created_at": "2026-10-24T23:48:00Z"
  }
}
```

---

### 12.2 `GET /admin/studio/audit-logs?room_id=&admin_id=&action_type=&page=1&limit=15`
- `room_id`: Lọc theo phòng (1, 2, 3 - tùy chọn).
- `admin_id`: Lọc theo quản trị viên cụ thể.
- `action_type`: Lọc theo hành động (`CREATE_DIRECT`, `UPDATE`, `APPROVE`, `APPROVE_AND_UPLOAD_MEDIA`, `REJECT`, `ARCHIVE`).
- Sắp xếp: `performed_at DESC`.

**Response 200**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "log_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "artwork_id": "8f7e6d5c-4b3a-2f1e-0d9c-8b7a6f5e4d3c",
        "artwork_title": "Bức tường im lặng",
        "room_id": 1,
        "room_code": "BROKEN",
        "action_type": "CREATE_DIRECT",
        "created_by_admin": {
          "id": "e0a11223-14bc-4183-a212-094182410a88",
          "username": "admin_exhibition",
          "nickname": "Người Gác Cổng"
        },
        "last_updated_by_admin": {
          "id": "e0a11223-14bc-4183-a212-094182410a88",
          "username": "admin_exhibition",
          "nickname": "Người Gác Cổng"
        },
        "performed_at": "2026-10-24T23:48:00Z"
      },
      {
        "log_id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
        "artwork_id": "7a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
        "artwork_title": "Những mảnh vỡ mùa thu",
        "room_id": 1,
        "room_code": "BROKEN",
        "action_type": "APPROVE_AND_UPLOAD_MEDIA",
        "created_by_admin": null, // Bài viết do User gửi duyệt
        "last_updated_by_admin": {
          "id": "e0a11223-14bc-4183-a212-094182410a88",
          "username": "admin_exhibition",
          "nickname": "Người Gác Cổng"
        },
        "performed_at": "2026-10-24T23:40:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 15,
      "total_items": 120,
      "total_pages": 8
    }
  }
}
```

---

### 12.3 `POST /admin/studio/users/{user_id}/request-deletion`
Gửi yêu cầu xóa tài khoản đến Chủ sở hữu (Owner).

**Request Body**
```json
{
  "reason": "Tài khoản có hành vi phát tán nội dung độc hại liên tục, spam và quấy rối người dùng khác."
}
```

**Quy tắc nghiệp vụ**:
1. Yêu cầu quyền: `ADMIN` hoặc `OWNER`.
2. Target `user_id`: Phải tồn tại trong hệ thống. Nếu không tìm thấy $\rightarrow$ 404 `USER_NOT_FOUND`.
3. Admin không thể yêu cầu xóa chính mình $\rightarrow$ 400 `INVALID_ACTION`.
4. Không thể yêu cầu xóa tài khoản của `OWNER` $\rightarrow$ 403 `FORBIDDEN` (`"Không thể yêu cầu xóa tài khoản của Chủ sở hữu"`).
5. Tự động gửi thông báo (`type = 'SYSTEM'`) tới **toàn bộ tài khoản OWNER** trong hệ thống với tiêu đề: `"Yêu cầu xóa tài khoản từ Quản trị viên"`, nội dung chứa lý do và liên kết xử lý `target_url = f"/owner/users/{user_id}"`.
6. Ghi nhận `AdminAuditLog` (`action_type = 'REQUEST_DELETE_USER'`, `note = reason`).

**Response 200**
```json
{
  "success": true,
  "message": "Đã gửi yêu cầu xóa tài khoản đến Chủ sở hữu để xem xét phê duyệt",
  "data": {
    "target_user_id": "b2f67a21-98e3-4f93-b789-2144d18ec301",
    "target_username": "nguoidung_vipham",
    "requested_by": "e0a11223-14bc-4183-a212-094182410a88",
    "reason": "Tài khoản có hành vi phát tán nội dung độc hại...",
    "created_at": "2026-10-25T11:20:00Z"
  }
}
```

---

## 4. Test bắt buộc
- [ ] User bình thường gọi endpoint Studio → 403 `FORBIDDEN`.
- [ ] Admin xuất bản trực tiếp vào Phòng 1: Bài viết ngay lập tức có `status = 'APPROVED'` và xuất hiện trên Gallery của Phòng 1 mà không cần duyệt.
- [ ] Xuất bản thiếu `media_url` ở phòng 1 → 400.
- [ ] Mọi hành động duyệt (`APPROVE`), từ chối (`REJECT`), chỉnh sửa (`UPDATE`), lưu trữ (`ARCHIVE`), tạo mới (`CREATE_DIRECT`) đều ghi nhận chính xác 1 bản ghi vào `admin_audit_logs`.
- [ ] Audit log lọc chính xác theo `room_id`, `admin_id`, `action_type`.
- [ ] Admin gửi yêu cầu xóa tài khoản đến Owner: Tạo thông báo `SYSTEM` gửi đến Owner và ghi audit log `REQUEST_DELETE_USER`.
- [ ] Admin không thể tự yêu cầu xóa chính mình (400) và không thể yêu cầu xóa Owner (403).

---

## 5. Postman Collection để Test API
- **File đích**: [`backend/postman_json/12_admin_studio_audit.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/12_admin_studio_audit.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{adminToken}}`: Bearer Token của tài khoản ADMIN (bắt buộc)
  - `{{targetUserId}}`: ID của tài khoản người dùng vi phạm cần yêu cầu xóa
- **Danh sách requests cần có trong Collection**:
  1. `[12.1] Xuất bản trực tiếp tác phẩm Phòng 1 (POST /api/v1/admin/studio/artworks)` - Header `Bearer {{adminToken}}`, body gồm `room_id=1`, `media_url`, tiêu đề và nội dung. Kiểm tra status 201, `status = 'APPROVED'`.
  2. `[12.1] Xuất bản trực tiếp lồng đèn Phòng 2 (POST /api/v1/admin/studio/artworks)` - Body `room_id=2`, `visibility='PUBLIC'`.
  3. `[12.1] Xuất bản trực tiếp thông điệp Phòng 3 (POST /api/v1/admin/studio/artworks)` - Body `room_id=3`, `tag_category`, `color_code`.
  4. `[12.2] Lấy nhật ký quản trị toàn hệ thống (GET /api/v1/admin/studio/audit-logs)` - Header `Bearer {{adminToken}}`, phân trang page/limit, kiểm tra status 200.
  5. `[12.2] Lọc Audit Log theo loại hành động (GET /api/v1/admin/studio/audit-logs?action_type=CREATE_DIRECT)` - Kiểm tra status 200.
  6. `[12.2] Lọc Audit Log theo phòng (GET /api/v1/admin/studio/audit-logs?room_id=1)` - Kiểm tra status 200.
  7. `[12.3] Admin gửi yêu cầu xóa tài khoản đến Owner (POST /api/v1/admin/studio/users/{{targetUserId}}/request-deletion)` - Body `{ "reason": "..." }`, kiểm tra status 200.
  8. `[Quyền hạn] Test chặn người dùng thường (GET /api/v1/admin/studio/audit-logs)` - Header `Bearer {{accessToken}}`, kiểm tra status 403 `FORBIDDEN`.

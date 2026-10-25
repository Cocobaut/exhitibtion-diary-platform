# PLAN 12 — Nhóm API 12: Admin Studio & Audit Log (`/api/v1/admin/studio`)

> Đọc `plan_00_foundation.md` trước. Nguồn: API spec trang 71–74.
> **Toàn bộ nhóm API yêu cầu quyền ADMIN** (`dependencies=[Depends(require_admin)]`).
> Quản lý việc Admin xuất bản bài viết trực tiếp (không qua kiểm duyệt) và theo dõi lịch sử thao tác quản trị trên toàn bộ hệ thống triển lãm (`admin_audit_logs`).

## 1. Phạm vi

| # | Method | Path | Status OK |
|---|---|---|---|
| 12.1 | POST | `/api/v1/admin/studio/artworks` | 201 |
| 12.2 | GET | `/api/v1/admin/studio/audit-logs` | 200 |

Router: `APIRouter(prefix="/admin/studio", tags=["Admin - Studio & Audit Log"])`.

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
  "title": "Bức tường im lặng",
  "author_display_name": "Triển Lãm Ký Ức (Ban Quản Trị)",
  "short_content": "Tác phẩm mở màn cho không gian triển lãm Đổ Vỡ mùa thu 2026.",
  "content": "Có những im lặng không phải vì không còn điều gì để nói...",
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
2. Tự động thiết lập:
   - `user_id = admin.id`
   - `status = 'APPROVED'`
   - `reviewed_by = admin.id`
   - `reviewed_at = CURRENT_TIMESTAMP`
3. **Tự động ghi Audit Log**:
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

## 4. Test bắt buộc
- [ ] User bình thường gọi endpoint Studio → 403 `FORBIDDEN`.
- [ ] Admin xuất bản trực tiếp vào Phòng 1: Bài viết ngay lập tức có `status = 'APPROVED'` và xuất hiện trên Gallery của Phòng 1 mà không cần duyệt.
- [ ] Xuất bản thiếu `media_url` ở phòng 1 → 400.
- [ ] Mọi hành động duyệt (`APPROVE`), từ chối (`REJECT`), chỉnh sửa (`UPDATE`), lưu trữ (`ARCHIVE`), tạo mới (`CREATE_DIRECT`) đều ghi nhận chính xác 1 bản ghi vào `admin_audit_logs`.
- [ ] Audit log lọc chính xác theo `room_id`, `admin_id`, `action_type`.

---

## 5. Postman Collection để Test API
- **File đích**: [`backend/postman_json/12_admin_studio_audit.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/12_admin_studio_audit.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{adminToken}}`: Bearer Token của tài khoản ADMIN (bắt buộc)
- **Danh sách requests cần có trong Collection**:
  1. `[12.1] Xuất bản trực tiếp tác phẩm Phòng 1 (POST /api/v1/admin/studio/artworks)` - Header `Bearer {{adminToken}}`, body gồm `room_id=1`, `media_url`, tiêu đề và nội dung. Kiểm tra status 201, `status = 'APPROVED'`.
  2. `[12.1] Xuất bản trực tiếp lồng đèn Phòng 2 (POST /api/v1/admin/studio/artworks)` - Body `room_id=2`, `visibility='PUBLIC'`.
  3. `[12.1] Xuất bản trực tiếp thông điệp Phòng 3 (POST /api/v1/admin/studio/artworks)` - Body `room_id=3`, `tag_category`, `color_code`.
  4. `[12.2] Lấy nhật ký quản trị toàn hệ thống (GET /api/v1/admin/studio/audit-logs)` - Header `Bearer {{adminToken}}`, phân trang page/limit, kiểm tra status 200.
  5. `[12.2] Lọc Audit Log theo loại hành động (GET /api/v1/admin/studio/audit-logs?action_type=CREATE_DIRECT)` - Kiểm tra status 200.
  6. `[12.2] Lọc Audit Log theo phòng (GET /api/v1/admin/studio/audit-logs?room_id=1)` - Kiểm tra status 200.
  7. `[Quyền hạn] Test chặn người dùng thường (GET /api/v1/admin/studio/audit-logs)` - Header `Bearer {{accessToken}}`, kiểm tra status 403 `FORBIDDEN`.

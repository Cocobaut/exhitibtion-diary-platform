# PLAN 09 — Nhóm API 9: Quản lý 3 phòng triển lãm (`/api/v1/admin/rooms/{room_id}/artworks`)

> Đọc `plan_00_foundation.md` trước. Nguồn: API spec trang 52–60.
> **Toàn bộ nhóm API này yêu cầu quyền ADMIN** (`dependencies=[Depends(require_admin)]`). Người dùng không phải Admin → **403 Forbidden**.
> Tham số `room_id`: 1 (Đổ vỡ), 2 (Lồng đèn Hy vọng), 3 (Cây Thông điệp).

## 1. Phạm vi

| # | Phân nhóm | Method | Path | Status OK |
|---|---|---|---|---|
| 9.1.1 | Chờ duyệt | GET | `/api/v1/admin/rooms/{room_id}/artworks/pending` | 200 |
| 9.1.2 | Chờ duyệt | POST | `/api/v1/admin/rooms/{room_id}/artworks/upload-artwork-image` | 200 |
| 9.1.3 | Chờ duyệt | POST | `/api/v1/admin/rooms/{room_id}/artworks/{artwork_id}/approve` | 200 |
| 9.1.4 | Chờ duyệt | POST | `/api/v1/admin/rooms/{room_id}/artworks/{artwork_id}/reject` | 200 |
| 9.2.1 | Đang trưng bày | GET | `/api/v1/admin/rooms/{room_id}/artworks/approved` | 200 |
| 9.2.2 | Đang trưng bày | PUT | `/api/v1/admin/rooms/{room_id}/artworks/{artwork_id}` | 200 |
| 9.2.3 | Đang trưng bày | PATCH | `/api/v1/admin/rooms/{room_id}/artworks/{artwork_id}/archive` | 200 |

Router: `APIRouter(prefix="/admin/rooms/{room_id}/artworks", tags=["Admin - Exhibition Rooms Management"])`.

## 2. File cần tạo
- `app/schemas/admin_rooms.py`
- `app/services/admin_room_service.py`
- `app/api/v1/endpoints/admin_rooms.py`
- Tích hợp: `StorageService`, `NotificationService`, `AuditLogService` (plan_00 §6.4)

---

## 3. Chi tiết endpoint

### 9.1.1 `GET /admin/rooms/{room_id}/artworks/pending?page=1&limit=15&sort=oldest`
- `room_id ∈ {1, 2, 3}`. Sai → 404.
- `sort`: `oldest` (mặc định: bài gửi trước duyệt trước - `created_at ASC`) hoặc `latest` (`created_at DESC`).
- Trả về thông tin chi tiết bài viết kèm thông tin người gửi gốc (`users.username`, `users.email`).
- Khóa phân trang đặc thù trong response: **`total_pending`** (thay vì `total_items`).

**Response 200**
```json
{
  "success": true,
  "data": {
    "room_id": 1,
    "room_code": "BROKEN",
    "items": [
      {
        "id": "9c8b7a6f-5e4d-3c2b-1a0f-987654321fed",
        "title": "Bức thư gửi vào hư không",
        "author_display_name": "Bụi Thời Gian",
        "short_content": "Một câu chuyện chưa từng kể...",
        "content": "Chúng tôi gặp nhau vào một ngày mùa đông...",
        "media_url": null,
        "is_anonymous": false,
        "target_date": null,
        "tag_category": null,
        "color_code": null,
        "created_at": "2026-10-24T17:15:00Z",
        "author": {
          "id": "b2f67a21-98e3-4f93-b789-2144d18ec301",
          "username": "hoanghon_01",
          "email": "hoanghon@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 15,
      "total_pending": 8,
      "total_pages": 1
    }
  }
}
```

### 9.1.2 `POST /admin/rooms/{room_id}/artworks/upload-artwork-image`
- Dùng trong Modal biên tập bài chờ duyệt để Admin upload tranh vẽ minh họa.
- Form field: `image` (WebP, PNG, JPG; tối đa 10MB).
- Dùng `StorageService.save(file, folder=f"artworks/{room_id}", ...)` trả về `media_url`.

**Response 200**
```json
{
  "success": true,
  "message": "Tải ảnh nghệ thuật lên thành công",
  "data": {
    "media_url": "https://cdn.exhibition.com/artworks/2026/room-1/illus_9c8b7a6f.webp"
  }
}
```

### 9.1.3 `POST /admin/rooms/{room_id}/artworks/{artwork_id}/approve`
**Request Body**
```json
{
  "title": "Bức thư gửi vào hư không (Đã biên tập)",
  "author_display_name": "Bụi Thời Gian",
  "short_content": "Một câu chuyện chưa từng kể...",
  "content": "Chúng tôi gặp nhau...",
  "media_url": "https://cdn.exhibition.com/artworks/2026/room-1/illus_9c8b7a6f.webp",
  "tag_category": null,
  "color_code": null
}
```
**Quy tắc nghiệp vụ**:
1. Với `room_id = 1`: **Bắt buộc** phải có `media_url` (Phòng tranh). Thiếu → 400 `MISSING_MEDIA_URL`.
2. Với `room_id = 2, 3`: `media_url` là tùy chọn. (Nếu `room_id = 3`, validate cặp `tag_category` và `color_code`).
3. Cập nhật `artworks`: `status = 'APPROVED'`, `reviewed_by = admin.id`, `reviewed_at = CURRENT_TIMESTAMP`, cập nhật nội dung hiệu đính.
4. **Tự động kích hoạt Notification**: Tạo thông báo `type = 'SYSTEM'`, `sender_id = admin.id`, `recipient_id = author_id`, tiêu đề: `"Tác phẩm của bạn đã được trưng bày!"`, nội dung chúc mừng và link `target_url = f"/rooms/{room_id}/artworks/{artwork_id}"`.
5. **Ghi Audit Log**: `AuditLogService.log(action_type='APPROVE' hoặc 'APPROVE_AND_UPLOAD_MEDIA')`.

**Response 200**
```json
{
  "success": true,
  "message": "Phê duyệt tác phẩm thành công và đã xuất bản lên triển lãm",
  "data": {
    "id": "9c8b7a6f-5e4d-3c2b-1a0f-987654321fed",
    "room_id": 1,
    "status": "APPROVED",
    "reviewed_by": "e0a11223-14bc-4183-a212-094182410a88",
    "reviewed_at": "2026-10-24T23:55:00Z",
    "media_url": "https://cdn.exhibition.com/artworks/2026/room-1/illus_9c8b7a6f.webp",
    "notification_sent": true
  }
}
```

### 9.1.4 `POST /admin/rooms/{room_id}/artworks/{artwork_id}/reject`
**Request Body**
```json
{
  "admin_note": "Tác phẩm chưa thể xuất bản do chứa từ ngữ tiêu cực cực đoan, vi phạm tiêu chuẩn cộng đồng về không gian chữa lành."
}
```
**Quy tắc nghiệp vụ**:
1. Cập nhật: `status = 'REJECTED'`, `admin_note = :admin_note`, `reviewed_by = admin.id`, `reviewed_at = CURRENT_TIMESTAMP`.
2. **Tự động kích hoạt Notification**: Gửi thông báo `type = 'SYSTEM'` tới tác giả kèm lý do trong `admin_note`, `target_url = f"/rooms/{room_id}"`.
3. Ghi Audit Log: `action_type = 'REJECT'`.

**Response 200**
```json
{
  "success": true,
  "message": "Đã từ chối tác phẩm và gửi phản hồi đến người dùng",
  "data": {
    "id": "9c8b7a6f-5e4d-3c2b-1a0f-987654321fed",
    "status": "REJECTED",
    "admin_note": "Tác phẩm chưa thể xuất bản do...",
    "reviewed_by": "e0a11223-14bc-4183-a212-094182410a88",
    "reviewed_at": "2026-10-24T23:56:00Z"
  }
}
```

---

### 9.2.1 `GET /admin/rooms/{room_id}/artworks/approved?q=&page=1&limit=15&sort=latest`
- `sort`: `latest` (mặc định), `most_viewed` (`view_count DESC`), `most_interacted` (tổng reactions DESC).
- Response bao gồm **`summary`** thống kê cả phòng:
  - `total_approved_artworks`: Tổng số bài `status = 'APPROVED'` trong phòng.
  - `total_views`: Tổng lượt xem `sum(view_count)` trong phòng.
  - `total_reactions`: Tổng tương tác trên toàn bộ tác phẩm trong phòng.

**Response 200**
```json
{
  "success": true,
  "data": {
    "summary": {
      "room_id": 1,
      "room_code": "BROKEN",
      "total_approved_artworks": 64,
      "total_views": 18240,
      "total_reactions": 4350
    },
    "items": [
      {
        "id": "7a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
        "title": "Những mảnh vỡ mùa thu",
        "author_display_name": "Kẻ Độc Hành",
        "media_url": "https://cdn.exhibition.com/artworks/broken-autumn.webp",
        "view_count": 343,
        "reactions_count": 254,
        "status": "APPROVED",
        "reviewed_at": "2026-10-20T14:30:00Z",
        "author": {
          "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "username": "kedochanh",
          "email": "kedochanh@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 15,
      "total_items": 64,
      "total_pages": 5
    }
  }
}
```

### 9.2.2 `PUT /admin/rooms/{room_id}/artworks/{artwork_id}`
- Admin chỉnh sửa tác phẩm đang hiển thị (tiêu đề, nội dung, ảnh minh họa nghệ thuật).
- Ghi Audit Log: `action_type = 'UPDATE'`.

**Response 200**
```json
{
  "success": true,
  "message": "Cập nhật nội dung tác phẩm thành công",
  "data": {
    "id": "7a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "updated_at": "2026-10-24T23:58:00Z"
  }
}
```

### 9.2.3 `PATCH /admin/rooms/{room_id}/artworks/{artwork_id}/archive`
**Request Body**
```json
{
  "admin_note": "Tạm thời gỡ bỏ khỏi triển lãm theo yêu cầu giải quyết khiếu nại nội dung."
}
```
**Quy tắc**: Không xóa bản ghi, chỉ cập nhật `status = 'ARCHIVED'` và lưu `admin_note`. Ghi Audit Log `action_type = 'ARCHIVE'`.

**Response 200**
```json
{
  "success": true,
  "message": "Đã gỡ tác phẩm khỏi không gian trưng bày và chuyển vào kho lưu trữ",
  "data": {
    "id": "7a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "status": "ARCHIVED",
    "archived_by": "e0a11223-14bc-4183-a212-094182410a88",
    "updated_at": "2026-10-24T23:59:00Z"
  }
}
```

---

## 4. Test bắt buộc
- [ ] User bình thường (`role = 'USER'`) gọi bất kỳ endpoint nào trong nhóm 9 → 403 `FORBIDDEN`.
- [ ] Approve bài phòng 1 không có `media_url` → 400 `MISSING_MEDIA_URL`.
- [ ] Approve bài phòng 2/3 không bắt buộc `media_url`.
- [ ] Khi Approve hoặc Reject: Tác giả bài viết nhận được đúng 1 thông báo tương ứng trong hộp thư notification; ghi đúng 1 bản ghi vào `admin_audit_logs`.
- [ ] Archive tác phẩm: `status` đổi thành `ARCHIVED`, bài viết ngay lập tức biến mất khỏi gallery công khai của phòng đó.

---

## 5. Postman Collection để Test API
- **File đích**: [`backend/postman_json/09_admin_rooms.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/09_admin_rooms.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{adminToken}}`: Bearer Token của tài khoản ADMIN (bắt buộc)
  - `{{pendingArtworkId}}`: Tự động lưu ID tác phẩm đang chờ duyệt
  - `{{approvedArtworkId}}`: Tự động lưu ID tác phẩm đã duyệt để sửa hoặc lưu trữ
- **Danh sách requests cần có trong Collection**:
  1. `[9.1.1] Lấy danh sách tác phẩm chờ duyệt Phòng 1 (GET /api/v1/admin/rooms/1/artworks/pending)` - Header `Bearer {{adminToken}}`, test script lưu `{{pendingArtworkId}}`.
  2. `[9.1.2] Upload ảnh nghệ thuật minh họa (POST /api/v1/admin/rooms/1/artworks/upload-artwork-image)` - Form-data file ảnh (WebP/PNG/JPG max 10MB), nhận về `media_url`.
  3. `[9.1.3] Phê duyệt tác phẩm Phòng 1 (POST /api/v1/admin/rooms/1/artworks/{{pendingArtworkId}}/approve)` - Body gồm tiêu đề, nội dung hiệu đính và `media_url`. Kiểm tra status 200, `status = 'APPROVED'`, `notification_sent = true`.
  4. `[9.1.4] Từ chối tác phẩm kèm lý do (POST /api/v1/admin/rooms/1/artworks/{{pendingArtworkId}}/reject)` - Body `{ "admin_note": "..." }`, kiểm tra status 200.
  5. `[9.2.1] Danh sách tác phẩm đang trưng bày kèm thống kê (GET /api/v1/admin/rooms/1/artworks/approved)` - Kiểm tra trường `summary` và danh sách bài. Test script lưu `{{approvedArtworkId}}`.
  6. `[9.2.2] Chỉnh sửa tác phẩm đang trưng bày (PUT /api/v1/admin/rooms/1/artworks/{{approvedArtworkId}})` - Cập nhật nội dung bài viết.
  7. `[9.2.3] Gỡ bỏ tác phẩm vào kho lưu trữ Archive (PATCH /api/v1/admin/rooms/1/artworks/{{approvedArtworkId}}/archive)` - Body `{ "admin_note": "..." }`, kiểm tra `status = 'ARCHIVED'`.
  8. `[Quyền hạn] Test chặn người dùng thường (GET /api/v1/admin/rooms/1/artworks/pending)` - Header `Bearer {{accessToken}}` (role USER), kiểm tra status 403 `FORBIDDEN`.

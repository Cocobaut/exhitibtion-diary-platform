# PLAN 10 — Nhóm API 10: Quản lý trang nhật ký (`/api/v1/admin/diaries`)

> Đọc `plan_00_foundation.md` và `plan_08_diaries.md` trước. Nguồn: API spec trang 60–65.
> **Toàn bộ nhóm API yêu cầu quyền ADMIN hoặc OWNER** (`dependencies=[Depends(require_admin)]`). Không phải Admin hoặc Owner → **403 Forbidden**.

## 1. Phạm vi

| # | Method | Path | Status OK |
|---|---|---|---|
| 10.1 | GET | `/api/v1/admin/diaries/pending` | 200 |
| 10.2 | PATCH | `/api/v1/admin/diaries/{diary_id}/approve` | 200 |
| 10.3 | PATCH | `/api/v1/admin/diaries/{diary_id}/reject` | 200 |
| 10.4 | GET | `/api/v1/admin/diaries/approved` | 200 |
| 10.5 | PATCH | `/api/v1/admin/diaries/{diary_id}/revoke` | 200 |

Router: `APIRouter(prefix="/admin/diaries", tags=["Admin - Diaries Moderation"])`.

## 2. File cần tạo
- `app/schemas/admin_diaries.py`
- `app/services/admin_diary_service.py`
- `app/api/v1/endpoints/admin_diaries.py`
- Tích hợp: `NotificationService`

---

## 3. Chi tiết endpoint

### 10.1 `GET /admin/diaries/pending?page=1&limit=15`
- Điều kiện: `is_public = TRUE AND is_approved = FALSE`.
- Trả về thông tin tác giả gốc (`users.username`, `users.nickname`).
- Phân trang dùng trường **`total_pending`** (theo đúng mẫu spec).

**Response 200**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
        "entry_date": "2026-10-24",
        "title": "Lời cảm ơn gửi đến những ngày đã qua",
        "mood": "grateful",
        "content": "Cảm ơn những thất bại...",
        "media_urls": ["https://cdn.exhibition.com/diaries/memories-2026.webp"],
        "author": {
          "id": "b2f67a21-98e3-4f93-b789-2144d18ec301",
          "username": "hoanghon_01",
          "nickname": "Người Lữ Khách"
        },
        "created_at": "2026-10-24T19:00:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 15, "total_pending": 4, "total_pages": 1 }
  }
}
```

### 10.2 `PATCH /admin/diaries/{diary_id}/approve`
Body: Trống.

**Logic**:
1. Tìm bài nhật ký: phải tồn tại và `is_public = TRUE`. Không thấy → 404.
2. `UPDATE diaries SET is_approved = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = :diary_id`.
3. **Notification**: Gửi thông báo `type = 'SYSTEM'` cho tác giả:
   - Tiêu đề: `"Nhật ký của bạn đã được xuất bản ra cộng đồng!"`.
   - Body: `"Bài nhật ký '${diary.title}' đã được ban quản trị phê duyệt hiển thị trên Tab Cộng đồng."`.
   - `target_url`: `f"/diaries/community/{diary_id}"`.

**Response 200**
```json
{
  "success": true,
  "message": "Đã phê duyệt bài nhật ký hiển thị lên Tab Cộng đồng",
  "data": {
    "diary_id": "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
    "is_public": true,
    "is_approved": true,
    "updated_at": "2026-10-24T23:45:00Z"
  }
}
```

### 10.3 `PATCH /admin/diaries/{diary_id}/reject`
**Request Body**
```json
{
  "reason": "Bài viết chứa thông tin riêng tư nhạy cảm hoặc chưa phù hợp với tính chất không gian chia sẻ cộng đồng."
}
```
**Logic**:
1. Cập nhật: `is_public = FALSE`, `is_approved = FALSE` (Bài viết vẫn an toàn trong sổ tay riêng tư của user).
2. **Notification**: Gửi thông báo `type = 'SYSTEM'` tới tác giả kèm nội dung `reason`, `target_url = "/diaries"`.

**Response 200**
```json
{
  "success": true,
  "message": "Đã từ chối chia sẻ công khai. Bài viết vẫn được lưu trữ an toàn trong sổ tay riêng tư của người dùng.",
  "data": {
    "diary_id": "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
    "is_public": false,
    "is_approved": false
  }
}
```

### 10.4 `GET /admin/diaries/approved?q=&page=1&limit=15`
- Điều kiện: `is_public = TRUE AND is_approved = TRUE`.
- `q`: Tìm theo tiêu đề hoặc username tác giả.
- Sắp xếp: `created_at DESC`.

**Response 200**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
        "entry_date": "2026-10-23",
        "title": "Hôm nay mình đã học được cách buông bỏ",
        "author": {
          "id": "a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d",
          "nickname": "Mây Mùa Hạ",
          "username": "maymuaha"
        },
        "reactions_total": 90,
        "created_at": "2026-10-23T20:00:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 15, "total_items": 52, "total_pages": 4 }
  }
}
```

### 10.5 `PATCH /admin/diaries/{diary_id}/revoke`
**Request Body**
```json
{
  "admin_reason": "Nội dung nhận được phản ánh không phù hợp với chuẩn mực cộng đồng."
}
```
**Logic**:
1. Thu hồi quyền công khai: Cập nhật `is_public = FALSE, is_approved = FALSE`.
2. **Notification**: Gửi thông báo giải thích lý do gỡ bài tới tác giả, `target_url = "/diaries"`.

**Response 200**
```json
{
  "success": true,
  "message": "Đã gỡ bài viết khỏi Tab Cộng đồng thành công",
  "data": {
    "diary_id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    "is_public": false,
    "is_approved": false
  }
}
```

---

## 4. Test bắt buộc
- [ ] User thường gọi endpoint nhóm 10 → 403 `FORBIDDEN`.
- [ ] Approve: Bài viết xuất hiện ngay tại `GET /api/v1/diaries/community`; tác giả nhận thông báo đúng.
- [ ] Reject: Bài viết chuyển về `is_public=false`, biến mất khỏi hàng chờ duyệt, tác giả nhận thông báo kèm lý do.
- [ ] Revoke: Bài viết đang hiển thị ngoài cộng đồng lập tức biến mất khỏi `/community`.

---

## 5. Postman Collection để Test API
- **File đích**: [`backend/postman_json/10_admin_diaries.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/10_admin_diaries.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{adminToken}}`: Bearer Token của tài khoản ADMIN (bắt buộc)
  - `{{pendingDiaryId}}`: Tự động lưu ID bài nhật ký đang chờ duyệt ra cộng đồng
  - `{{approvedDiaryId}}`: Lưu ID bài nhật ký cộng đồng đang hiển thị
- **Danh sách requests cần có trong Collection**:
  1. `[10.1] Danh sách nhật ký công khai chờ duyệt (GET /api/v1/admin/diaries/pending)` - Header `Bearer {{adminToken}}`, test script lưu `{{pendingDiaryId}}`.
  2. `[10.2] Phê duyệt hiển thị lên Tab Cộng đồng (PATCH /api/v1/admin/diaries/{{pendingDiaryId}}/approve)` - Body trống, kiểm tra status 200, `is_approved = true`.
  3. `[10.3] Từ chối phê duyệt công khai (PATCH /api/v1/admin/diaries/{{pendingDiaryId}}/reject)` - Body `{ "reason": "..." }`, kiểm tra status 200, `is_public = false`.
  4. `[10.4] Danh sách nhật ký cộng đồng đang hiển thị (GET /api/v1/admin/diaries/approved)` - Tìm kiếm theo `q`, phân trang page/limit. Test script lưu `{{approvedDiaryId}}`.
  5. `[10.5] Gỡ bỏ bài viết khỏi Tab Cộng đồng (PATCH /api/v1/admin/diaries/{{approvedDiaryId}}/revoke)` - Body `{ "admin_reason": "..." }`, kiểm tra `is_public = false`.
  6. `[Quyền hạn] Test chặn người dùng không phải Admin (GET /api/v1/admin/diaries/pending)` - Header `Bearer {{accessToken}}`, kiểm tra status 403 `FORBIDDEN`.

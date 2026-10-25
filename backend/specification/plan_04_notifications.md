# PLAN 04 — Nhóm API 4: Thông báo (`/api/v1/notifications`)

> Đọc `plan_00_foundation.md` trước. Nguồn: API spec trang 12–16.
> Bảng: `notifications`. Nhóm này **chỉ đọc/cập nhật**; việc **tạo** thông báo do `NotificationService.create` (plan_00 §6.1) đảm nhận, được gọi từ plan 05, 07, 08, 09, 10.

## 1. Phạm vi

| # | Method | Path | Quyền | Status OK |
|---|---|---|---|---|
| 4.1 | GET | `/api/v1/notifications/unread-count` | Authenticated | 200 |
| 4.2 | GET | `/api/v1/notifications` | Authenticated | 200 |
| 4.3 | PATCH | `/api/v1/notifications/{notification_id}/read` | Authenticated | 200 |
| 4.4 | PATCH | `/api/v1/notifications/read-all` | Authenticated | 200 |

> [!IMPORTANT]
> Khai báo route `/read-all` và `/unread-count` **trước** route có path param `/{notification_id}/...` để tránh xung đột match.

## 2. File cần tạo
- `app/models/notification.py` (quan hệ `sender` → `User`, lazy="raise"; dùng `selectinload`/join khi cần)
- `app/services/notification_service.py` (gồm cả `create` dùng chung + các hàm đọc)
- `app/schemas/notification.py`
- `app/api/v1/endpoints/notifications.py` (tag `"Notifications"`)

---

## 3. Chi tiết endpoint

### 4.1 `GET /notifications/unread-count`
**Logic**: `SELECT count(*) FROM notifications WHERE recipient_id = :uid AND is_read = FALSE` — điều kiện phải viết **đúng dạng `is_read = FALSE`** để planner dùng partial index `idx_notifications_recipient_unread`.

**Response 200** `{ "success": true, "data": { "unread_count": 3 } }`

### 4.2 `GET /notifications?page=1&limit=15&is_read=`
- `page` mặc định 1; `limit` mặc định 15, tối đa 50; `is_read`: `true|false|bỏ trống`.

**Logic**: `WHERE recipient_id = :uid [AND is_read = :is_read] ORDER BY created_at DESC`, `LEFT JOIN users sender`.

**Ánh xạ `sender`** (luôn là object, không bao giờ `null`):
| Điều kiện | `sender` |
|---|---|
| `sender_id` có giá trị | `{ "nickname": sender.nickname, "avatar_url": sender.avatar_url }` |
| `sender_id IS NULL` và `type = 'INTERACTION'` | `{ "nickname": "Người Bạn Ẩn Danh", "avatar_url": null }` |
| `sender_id IS NULL` và type khác | `{ "nickname": "Ban Quản Trị", "avatar_url": null }` |

**Response 200**
```json
{ "success": true,
  "data": {
    "items": [ { "id": "<uuid>", "type": "SYSTEM", "title": "...", "body": "...", "target_url": "/rooms/1/artworks/<id>",
                 "is_read": false, "sender": { "nickname": "Ban Quản Trị", "avatar_url": "..." }, "created_at": "..." } ],
    "pagination": { "page": 1, "limit": 15, "total_items": 18, "total_pages": 2 } } }
```

### 4.3 `PATCH /notifications/{notification_id}/read`
Body trống.

**Logic**: `UPDATE notifications SET is_read = TRUE WHERE id = :id AND recipient_id = :uid RETURNING id, target_url`. Không có dòng nào → 404 (không phân biệt "không tồn tại" và "của người khác" để tránh lộ thông tin). Idempotent: đã đọc rồi vẫn trả 200.

**Response 200**
```json
{ "success": true, "message": "Đã đánh dấu thông báo là đã đọc",
  "data": { "notification_id": "<uuid>", "is_read": true, "target_url": "/rooms/1/artworks/<id>" } }
```
**Lỗi**: 404 `NOTIFICATION_NOT_FOUND` — `"Không tìm thấy thông báo"`.

### 4.4 `PATCH /notifications/read-all`
Body trống.

**Logic**: `UPDATE notifications SET is_read = TRUE WHERE recipient_id = :uid AND is_read = FALSE` → `affected_rows = result.rowcount`.

**Response 200**
```json
{ "success": true, "message": "Đã đánh dấu tất cả thông báo là đã đọc", "data": { "affected_rows": 2 } }
```

---

## 4. Bảng nguồn sinh thông báo (để tham chiếu chéo)
| Nguồn | Plan | type | sender_id | title | target_url |
|---|---|---|---|---|---|
| Admin duyệt tác phẩm | 09 | SYSTEM | admin | `Tác phẩm của bạn đã được trưng bày!` | `/rooms/{room_id}/artworks/{artwork_id}` |
| Admin từ chối tác phẩm | 09 | SYSTEM | admin | `Tác phẩm chưa thể xuất bản` | `/rooms/{room_id}` |
| Reaction trên tác phẩm phòng 1/3 | 05, 07 | INTERACTION | `NULL` | `Có người vừa gửi đồng cảm đến bạn` | `/rooms/{room_id}/artworks/{artwork_id}` |
| Reaction trên nhật ký cộng đồng | 08 | INTERACTION | `NULL` | `Có người vừa gửi đồng cảm đến bạn` | `/diaries/community/{diary_id}` |
| Admin duyệt / từ chối / gỡ nhật ký | 10 | SYSTEM | admin | xem plan_10 | xem plan_10 |

## 5. Test bắt buộc
- [ ] Không token → 401 (cả 4).
- [ ] `unread-count` chỉ đếm thông báo của chính user, chưa đọc.
- [ ] List sắp xếp `created_at DESC`; lọc `is_read=false` đúng; không thấy thông báo của user khác.
- [ ] `sender` đúng 3 trường hợp ánh xạ ở §3 (4.2).
- [ ] Mark-read thông báo của user khác → 404; mark-read 2 lần → 200 cả hai.
- [ ] `read-all` trả `affected_rows` đúng; gọi lần 2 → `affected_rows = 0`.
- [ ] `PATCH /notifications/read-all` không bị route `/{notification_id}/read` nuốt.
- [ ] `EXPLAIN` query unread-count dùng `idx_notifications_recipient_unread` (kiểm tra thủ công).

## 6. Điểm mơ hồ & quyết định mặc định
| Spec | Quyết định |
|---|---|
| Không ghi quyền hạn | Authenticated |
| Ví dụ thông báo từ chối có `target_url: "/diaries"` cho một **tác phẩm** | Tác phẩm bị từ chối dùng `/rooms/{room_id}`; nhật ký bị từ chối dùng `/diaries` |
| Không có xoá thông báo | Không hiện thực |

---

## 7. Postman Collection để Test API
- **File đích**: [`backend/postman_json/04_notifications.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/04_notifications.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{accessToken}}`: Bearer Token người nhận thông báo
  - `{{notificationId}}`: Tự động lưu `data.items[0].id` khi lấy danh sách thông báo
- **Danh sách requests cần có trong Collection**:
  1. `[4.1] Đếm số lượng thông báo chưa đọc (GET /api/v1/notifications/unread-count)` - Header `Bearer {{accessToken}}`, kiểm tra status 200, trường `unread_count`.
  2. `[4.2] Lấy danh sách thông báo (GET /api/v1/notifications)` - Phân trang page/limit, test script lưu `{{notificationId}}`.
  3. `[4.2] Lọc thông báo chưa đọc (GET /api/v1/notifications?is_read=false)` - Kiểm tra status 200.
  4. `[4.3] Đánh dấu một thông báo đã đọc (PATCH /api/v1/notifications/{{notificationId}}/read)` - Kiểm tra status 200, trả về `is_read = true`.
  5. `[4.4] Đánh dấu tất cả thông báo đã đọc (PATCH /api/v1/notifications/read-all)` - Kiểm tra status 200, trường `affected_rows`.

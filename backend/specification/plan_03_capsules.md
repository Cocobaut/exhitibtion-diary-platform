# PLAN 03 — Nhóm API 3: Máy nhả thông điệp (`/api/v1/capsules`)

> Đọc `plan_00_foundation.md` trước. Nguồn: API spec trang 8–11.
> Bảng liên quan: `message_capsules`, `user_capsule_draws`.

## 1. Phạm vi

| # | Method | Path | Quyền | Status OK |
|---|---|---|---|---|
| 3.1 | POST | `/api/v1/capsules/draw` | Authenticated | 200 |
| 3.2 | PATCH | `/api/v1/capsules/draws/{draw_id}/save` | Authenticated | 200 |
| 3.3 | GET | `/api/v1/capsules/saved` | Authenticated | 200 |
| 3.4 | DELETE | `/api/v1/capsules/saved/{draw_id}` | Authenticated | 200 |

Spec không ghi quyền hạn, nhưng mọi thao tác gắn với `user_id` → **bắt buộc đăng nhập** (`get_current_user`).

## 2. File cần tạo
- `app/models/message_capsule.py`, `app/models/user_capsule_draw.py`
- `app/schemas/capsule.py`
- `app/services/capsule_service.py`
- `app/api/v1/endpoints/capsules.py` (tag `"Capsules"`)

Query param `category` (3.1, 3.3): enum `HEALING | COURAGE | PERSPECTIVE`, giá trị khác → 400.

---

## 3. Chi tiết endpoint

### 3.1 `POST /capsules/draw?category=HEALING`
Body: trống.

**Logic** (1 transaction):
1. Chọn ngẫu nhiên 1 capsule: `SELECT id FROM message_capsules WHERE is_approved = TRUE [AND category = :category] ORDER BY random() LIMIT 1` (dùng index `idx_capsules_approved_category`). Không có → 404.
   - Nếu kho lớn (>10k) có thể đổi sang `OFFSET floor(random()*count)`; không cần ở bản đầu.
2. `UPDATE message_capsules SET draw_count = draw_count + 1 WHERE id = :id RETURNING message, category` (tăng nguyên tử, không đọc-sửa-ghi trong Python).
3. `INSERT user_capsule_draws(user_id, capsule_id, is_saved=FALSE) RETURNING id, drawn_at`.

**Response 200**
```json
{ "success": true, "message": "Rút thông điệp thành công",
  "data": { "draw_id": "<uuid>", "capsule_id": 104, "message": "Dù hôm nay...", "category": "HEALING", "is_saved": false, "drawn_at": "2026-10-24T16:45:10Z" } }
```
**Lỗi**: 404 `CAPSULE_POOL_EMPTY` — `"Kho thông điệp hiện đang trống hoặc chưa có thông điệp nào được duyệt"`.

### 3.2 `PATCH /capsules/draws/{draw_id}/save`
**Request** `{ "is_saved": true }` — bắt buộc, boolean (cho phép `false` để bỏ lưu, tương đương 3.4).

**Logic**
1. Tìm draw theo `id`. Không có → 404.
2. `draw.user_id != current_user.id` → 403.
3. Cập nhật `is_saved`.

**Response 200**
```json
{ "success": true, "message": "Đã lưu thông điệp vào sổ tay cá nhân",
  "data": { "draw_id": "<uuid>", "is_saved": true, "updated_at": "2026-10-24T16:46:00Z" } }
```
- Bảng `user_capsule_draws` **không có cột `updated_at`** → trả thời điểm server xử lý (`datetime.now(timezone.utc)`).
- Nếu `is_saved=false` → message `"Đã bỏ lưu thông điệp khỏi sổ tay"`.

**Lỗi**
| Status | error_code | message |
|---|---|---|
| 403 | `FORBIDDEN` | `"Bạn không có quyền cập nhật lượt rút này"` |
| 404 | `DRAW_NOT_FOUND` | `"Không tìm thấy lượt rút thông điệp"` |

### 3.3 `GET /capsules/saved?page=1&limit=10&category=`
- Mặc định `page=1`, `limit=10`, tối đa `limit=50`.

**Logic**
```sql
SELECT d.id AS draw_id, c.id AS capsule_id, c.message, c.category, d.drawn_at
FROM user_capsule_draws d JOIN message_capsules c ON c.id = d.capsule_id
WHERE d.user_id = :uid AND d.is_saved = TRUE [AND c.category = :category]
ORDER BY d.drawn_at DESC
LIMIT :limit OFFSET (:page-1)*:limit
```
+ query `COUNT(*)` cùng điều kiện. Vẫn hiển thị capsule đã bị admin tắt (`is_approved=FALSE`) vì user đã lưu.

**Response 200**
```json
{ "success": true,
  "data": { "items": [ { "draw_id": "...", "capsule_id": 104, "message": "...", "category": "HEALING", "drawn_at": "..." } ],
            "pagination": { "page": 1, "limit": 10, "total_items": 12, "total_pages": 2 } } }
```

### 3.4 `DELETE /capsules/saved/{draw_id}`
**Logic**: tìm draw → 404 nếu không có **hoặc** `is_saved = FALSE`; 403 nếu không phải chủ; set `is_saved = FALSE` (không xoá bản ghi — giữ lịch sử rút).

**Response 200** `{ "success": true, "message": "Đã bỏ lưu thông điệp khỏi sổ tay" }`

**Lỗi**: như 3.2.

---

## 4. Test bắt buộc
- [ ] Không token → 401 (cả 4).
- [ ] Draw khi kho rỗng / mọi capsule `is_approved=FALSE` → 404.
- [ ] Draw thành công: `draw_count` tăng đúng 1; có bản ghi `user_capsule_draws` với `is_saved=false`.
- [ ] Draw với `category=COURAGE` chỉ trả capsule COURAGE; `category=FOO` → 400.
- [ ] 20 request draw song song → `draw_count` tăng đúng 20.
- [ ] Save draw của user khác → 403; draw không tồn tại → 404; UUID sai định dạng → 404.
- [ ] Saved list sắp xếp `drawn_at DESC`, phân trang đúng `total_pages`, lọc category đúng.
- [ ] DELETE saved → bản ghi vẫn còn, `is_saved=false`; DELETE lại lần 2 → 404.

## 5. Điểm mơ hồ & quyết định mặc định
| Spec | Quyết định |
|---|---|
| Không ghi quyền hạn | Authenticated |
| 3.2 trả `updated_at` nhưng bảng không có cột | Trả thời điểm xử lý |
| 3.4 "set is_saved = FALSE hoặc xoá mềm" | `is_saved = FALSE` |
| Có tạo notification type `CAPSULE` khi rút? | Không (spec không yêu cầu) |

---

## 6. Postman Collection để Test API
- **File đích**: [`backend/postman_json/03_capsules.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/03_capsules.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{accessToken}}`: Bearer Token người dùng đang đăng nhập
  - `{{drawId}}`: Tự động lưu `data.draw_id` sau khi rút thông điệp để dùng cho các request tiếp theo
- **Danh sách requests cần có trong Collection**:
  1. `[3.1] Rút thông điệp ngẫu nhiên (POST /api/v1/capsules/draw)` - Header `Bearer {{accessToken}}`, test script tự động gán `pm.environment.set("drawId", pm.response.json().data.draw_id)`.
  2. `[3.1] Rút thông điệp theo thể loại (POST /api/v1/capsules/draw?category=COURAGE)` - Query param category, kiểm tra status 200.
  3. `[3.2] Lưu thông điệp vào sổ tay (PATCH /api/v1/capsules/draws/{{drawId}}/save)` - Body `{ "is_saved": true }`, kiểm tra status 200.
  4. `[3.3] Lấy danh sách thông điệp đã lưu (GET /api/v1/capsules/saved)` - Phân trang page/limit, kiểm tra status 200.
  5. `[3.4] Bỏ lưu thông điệp khỏi sổ tay (DELETE /api/v1/capsules/saved/{{drawId}})` - Kiểm tra status 200.

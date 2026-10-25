# PLAN 06 — Nhóm API 6: Phòng 2 "Lồng đèn Hy vọng" (`/api/v1/rooms/2`)

> Đọc `plan_00_foundation.md` và `plan_05_room1_broken.md` (dùng chung model/`artwork_query_service`). Nguồn: API spec trang 25–31.
> Tiêu đề nhóm trong spec ghi "(room_id = 3)" là **lỗi gõ** — đúng là `room_id = 2`.
> Cột đặc thù: `target_date`, `is_opened`, `visibility`.

## 1. Phạm vi

| # | Method | Path | Quyền | Status OK |
|---|---|---|---|---|
| 6.1 | GET | `/api/v1/rooms/2/artworks` | Public (tùy chọn token) | 200 |
| 6.2 | POST | `/api/v1/rooms/2/artworks/{artwork_id}/open` | Public với PUBLIC; Auth với PRIVATE | 200 / 423 |
| 6.3 | POST | `/api/v1/rooms/2/artworks` | Authenticated | 201 |
| 6.4 | GET | `/api/v1/rooms/2/search` | Public (tùy chọn token) | 200 |

Router: `APIRouter(prefix="/rooms/2", tags=["Room 2 - Hope Lanterns"])`.

## 2. File cần tạo
- `app/schemas/room2.py`, `app/services/room2_service.py`, `app/api/v1/endpoints/room2.py`

## 3. Quy tắc dùng chung của phòng 2

**Tập lồng đèn mà một người xem được ("visible set"):**
```sql
room_id = 2 AND (
      (visibility = 'PUBLIC'  AND status = 'APPROVED')
   OR (visibility = 'PRIVATE' AND user_id = :current_user_id)   -- chỉ khi có user
)
```
Khách: chỉ nhánh PUBLIC. Lồng đèn PRIVATE luôn có `status='APPROVED'` (tự duyệt khi tạo — 6.3).

**Trường tính toán** (tính ở Python với `now = datetime.now(UTC)`):
| Trường | Công thức |
|---|---|
| `is_mine` | `user is not None and artwork.user_id == user.id` |
| `is_unlockable` | `target_date is None or target_date <= now` |
| `remaining_seconds` | `0 if is_unlockable else int((target_date - now).total_seconds())` |

---

## 4. Chi tiết endpoint

### 6.1 `GET /rooms/2/artworks?filter=all&limit=30`
- `filter ∈ {all, mine, opened, locked}` (mặc định `all`); `limit` mặc định 30, **tối đa 100** (vượt → 400). Không phân trang.

| filter | Điều kiện thêm (trên visible set) |
|---|---|
| `all` | — |
| `mine` | `user_id = :uid` (gồm cả PUBLIC đã duyệt **và** PUBLIC đang PENDING của chính mình? → **không**, chỉ trong visible set); không token → 401 |
| `opened` | `is_opened = TRUE` |
| `locked` | `target_date > now()` |

Sắp xếp `created_at DESC`.

**Item** (không trả `content`)
```json
{ "id": "...", "title": "...", "author_display_name": "...", "visibility": "PRIVATE", "is_mine": true,
  "target_date": "2027-08-18T00:00:00Z", "is_unlockable": false, "remaining_seconds": 25661700,
  "is_opened": false, "media_url": null, "created_at": "..." }
```
**Response 200**: `{ "success": true, "data": { "items": [...], "total_lanterns": <số item trả về> } }`
`total_lanterns` = **tổng số bản ghi khớp điều kiện** (COUNT, không bị cắt bởi `limit`).

### 6.2 `POST /rooms/2/artworks/{artwork_id}/open`
Body trống. Dùng `get_optional_user`.

**Logic**
1. Tìm artwork `id=:id AND room_id=2`. Không thấy → 404.
2. Kiểm tra quyền xem:
   - `PUBLIC`: phải `status='APPROVED'`, không → 404.
   - `PRIVATE`: không có user → 401; `user_id != user.id` → **404** (không tiết lộ sự tồn tại thư riêng của người khác).
3. Kiểm tra khoá thời gian: `target_date IS NOT NULL AND target_date > now()` → **423** (áp dụng cho cả PUBLIC và PRIVATE — xem §6).
4. Hợp lệ: `UPDATE artworks SET is_opened = TRUE, view_count = view_count + 1 WHERE id = :id RETURNING *`.

**Response 200**
```json
{ "success": true, "message": "Lồng đèn đã hạ cánh. Chúc mừng bạn đã chạm tới bức thư tương lai!",
  "data": { "id": "...", "title": "...", "author_display_name": "...", "content": "...", "media_url": "...",
            "visibility": "PRIVATE", "target_date": "...", "is_opened": true, "view_count": 1, "created_at": "..." } }
```
**Response 423** (raise `AppException(423, ...)`)
```json
{ "success": false, "error_code": "TIME_CAPSULE_LOCKED",
  "message": "Bức thư này đang lơ lửng trên tầng mây cao và chưa đến lúc hạ cánh.",
  "data": { "target_date": "2027-08-18T00:00:00Z", "remaining_seconds": 25661700 } }
```
**Lỗi khác**: 401 `UNAUTHORIZED`, 404 `ARTWORK_NOT_FOUND` (`"Không tìm thấy lồng đèn"`).

### 6.3 `POST /rooms/2/artworks`
**Request**
| Trường | Quy tắc |
|---|---|
| `author_display_name` | tuỳ chọn, ≤50 |
| `title` | bắt buộc, 3–150 |
| `content` | bắt buộc, ≥10, ≤20 000 |
| `short_content` | bắt buộc, 5–300 |
| `target_date` | bắt buộc, ISO-8601 có timezone (không có TZ → coi là UTC), phải **> now()** |
| `visibility` | `PUBLIC` \| `PRIVATE`, bắt buộc |
| `is_anonymous` | boolean, mặc định false |

**Logic**
1. Rate limit giống plan_05 §5.5 (dùng chung helper).
2. `status = 'PENDING'` nếu PUBLIC; `status = 'APPROVED'` nếu PRIVATE (không cần admin, `reviewed_by` để NULL).
3. INSERT với `room_id=2`, `is_opened=FALSE`, `media_url=NULL`.

**Response 201** — message theo visibility:
- PUBLIC: `"Lồng đèn của bạn đang được chuẩn bị, chúng mình sẽ thông báo trong hộp tin nhắn cho bạn sau khi tác phẩm hoàn thành"`
- PRIVATE: `"Lồng đèn hy vọng đã được thả bay lên bầu trời riêng của bạn!"`
```json
{ "success": true, "message": "...",
  "data": { "id": "...", "room_id": 2, "title": "...", "visibility": "PUBLIC", "status": "PENDING", "target_date": "...", "created_at": "..." } }
```
**Lỗi**: 400 `INVALID_TARGET_DATE` — `"Ngày mở khóa không hợp lệ hoặc nằm trong quá khứ"`; 400 `VALIDATION_ERROR`; 429.

### 6.4 `GET /rooms/2/search?q=&filter=all&page=1&limit=15`
- `q` bắt buộc. `filter ∈ {all, mine, opened, locked}` (cùng nghĩa 6.1; `mine` không token → 401). `limit` mặc định 15, tối đa 50.
- `SearchService.search_artworks(room_id=2, …)` với **bắt buộc** áp visible set §3. Field tìm: `title`, `content`, `author_display_name`.
- **Không đưa `content` của lồng đèn đang khoá vào highlight** (tránh lộ nội dung chưa đến ngày): với item `is_unlockable = false` chỉ highlight `title`/`author_display_name`.

**Item**
```json
{ "id": "...", "title": "Mong <em>mẹ</em> luôn bình an và mỉm cười", "author_display_name": "...", "visibility": "PUBLIC",
  "is_opened": true, "is_unlockable": true, "target_date": "...", "highlight": { "title": ["Mong <em>mẹ</em> ..."] } }
```
**Response 200**: `{ "success": true, "data": { "items": [...], "pagination": { "page", "limit", "total_hits" } } }`

---

## 5. Test bắt buộc
- [ ] Khách chỉ thấy PUBLIC+APPROVED; user A thấy thêm PRIVATE của A, không thấy PRIVATE của B.
- [ ] PUBLIC PENDING không xuất hiện (kể cả với chính tác giả).
- [ ] `remaining_seconds`/`is_unlockable` đúng với target_date tương lai, quá khứ, NULL.
- [ ] `limit=101` → 400; `filter=mine` không token → 401; `total_lanterns` = COUNT thật.
- [ ] Open PUBLIC đã đến hạn bởi khách → 200, `is_opened=true`, `view_count` +1.
- [ ] Open khi `target_date` tương lai → 423 đúng body (`error_code`, `data.remaining_seconds`).
- [ ] Open PRIVATE không token → 401; PRIVATE của người khác → 404.
- [ ] Create PUBLIC → `PENDING` + message PUBLIC; PRIVATE → `APPROVED` + message PRIVATE.
- [ ] Create `target_date` quá khứ → 400 `INVALID_TARGET_DATE`.
- [ ] Search không trả PRIVATE của người khác; item đang khoá không có `highlight.content`.

## 6. Điểm mơ hồ & quyết định mặc định
| Spec | Quyết định |
|---|---|
| 6.2: "Nếu target_date > NOW() VÀ người dùng cố tình đọc lồng đèn **riêng tư** chưa đến ngày → 423" — không nói rõ PUBLIC chưa đến ngày | **Khoá cả PUBLIC** chưa đến hạn (nhất quán với filter `locked` và ý nghĩa "thư tương lai"). Nếu muốn PUBLIC đọc tự do, chỉ cần bỏ điều kiện ở bước 3 với PUBLIC |
| `target_date` có bắt buộc không | Bắt buộc với user (6.3); có thể NULL với bài admin tạo (plan_12) → `is_unlockable = true` |
| `total_lanterns` = số item trả về hay tổng? | Tổng (COUNT) |
| `is_opened` là toàn cục, không theo từng người | Giữ theo DB: 1 người mở → `is_opened=TRUE` cho mọi người |

---

## 7. Postman Collection để Test API
- **File đích**: [`backend/postman_json/06_room2_hope.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/06_room2_hope.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{accessToken}}`: Bearer Token người dùng đang đăng nhập
  - `{{lanternId}}`: Tự động lưu ID của lồng đèn được tạo hoặc duyệt
- **Danh sách requests cần có trong Collection**:
  1. `[6.1] Lấy danh sách lồng đèn bầu trời đêm (GET /api/v1/rooms/2/artworks)` - Public, query limit=30, filter=all|mine|opened|locked.
  2. `[6.2] Kéo thả & Mở lồng đèn thành công (POST /api/v1/rooms/2/artworks/{{lanternId}}/open)` - Trường hợp target_date <= now. Trả về status 200, nội dung thư và `is_opened = true`.
  3. `[6.2-Lỗi 423] Mở lồng đèn đang khóa thời gian (POST /api/v1/rooms/2/artworks/{{lanternId}}/open)` - Trường hợp target_date ở tương lai. Kiểm tra status 423, error_code `TIME_CAPSULE_LOCKED`, `remaining_seconds`.
  4. `[6.3] Thả lồng đèn công khai PUBLIC (POST /api/v1/rooms/2/artworks)` - Header `Bearer {{accessToken}}`, visibility='PUBLIC', target_date tương lai. Kiểm tra status 201, `status = 'PENDING'`. Test script lưu `{{lanternId}}`.
  5. `[6.3] Thả lồng đèn riêng tư PRIVATE (POST /api/v1/rooms/2/artworks)` - Header `Bearer {{accessToken}}`, visibility='PRIVATE'. Kiểm tra status 201, `status = 'APPROVED'`.
  6. `[6.4] Tìm kiếm lồng đèn bầu trời đêm (GET /api/v1/rooms/2/search?q=ước mơ)` - Kiểm tra status 200.

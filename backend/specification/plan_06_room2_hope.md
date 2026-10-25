# PLAN 06 — Nhóm API 6: Phòng 2 "Lồng đèn Hy vọng" (`/api/v1/rooms/2`)

> Đọc `plan_00_foundation.md` và `plan_05_room1_broken.md` (dùng chung model/`artwork_query_service`). Nguồn: API spec trang 25–31.
> Tiêu đề nhóm trong spec ghi "(room_id = 3)" là **lỗi gõ** — đúng là `room_id = 2`.
> Cột đặc thù: `target_date`, `is_opened`, `visibility`.

## 1. Phạm vi

| # | Method | Path | Quyền | Status OK |
|---|---|---|---|---|
| 6.1 | GET | `/api/v1/rooms/2/artworks` | Public (tùy chọn token) | 200 |
| 6.2 | POST | `/api/v1/rooms/2/artworks/{artwork_id}/open` | Public với PUBLIC; Auth với PRIVATE | 200 |
| 6.3 | POST | `/api/v1/rooms/2/artworks` | Authenticated | 201 |
| 6.4 | GET | `/api/v1/rooms/2/search` | Public (tùy chọn token) | 200 |
| 6.5 | GET | `/api/v1/rooms/2/artworks/ready-to-fall` | Authenticated | 200 |
| 6.6 | DELETE | `/api/v1/rooms/2/artworks/{artwork_id}` | Authenticated | 200 |
| 6.7 | GET | `/api/v1/rooms/2/artworks/my-personal` | Authenticated | 200 |
| 6.8 | GET | `/api/v1/rooms/2/artworks/random-opened` | Public | 200 |
| 6.9 | POST | `/api/v1/rooms/2/artworks/{artwork_id}/save` | Authenticated | 200 |
| 6.10 | DELETE | `/api/v1/rooms/2/artworks/{artwork_id}/save` | Authenticated | 200 |

Router: `APIRouter(prefix="/rooms/2", tags=["Room 2 - Hope Lanterns"])`.

## 2. File liên quan
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

### 6.1 `GET /rooms/2/artworks?filter=all&limit=30&title=&author_display_name=`
- `filter ∈ {all, mine, opened, locked}` (mặc định `all`); `limit` mặc định 30, **tối đa 100** (vượt → 400). Không phân trang.
- **Bộ lọc bổ sung (Filter parameters)**:
  - `title`: Lọc theo tiêu đề lồng đèn (không phân biệt hoa thường, tìm kiếm chuỗi con trong `title`, `title_vi`, hoặc `title_en`).
  - `author_display_name`: Lọc theo tên hiển thị của tác giả (không phân biệt hoa thường, tìm kiếm chuỗi con trong `author_display_name`).

| filter | Điều kiện thêm (trên visible set) |
|---|---|
| `all` | — |
| `mine` | `user_id = :uid` (gồm cả PUBLIC đã duyệt **và** PUBLIC đang PENDING của chính mình? → **không**, chỉ trong visible set); không token → 401 |
| `opened` | `is_opened = TRUE` |
| `locked` | `target_date > now()` |

Sắp xếp `created_at DESC`.

**Item** (trả về đầy đủ tiêu đề, tóm tắt và nội dung song ngữ)
```json
{ "id": "...", "original_language": "vi", "title": "...", "title_vi": "...", "title_en": "...", 
  "author_display_name": "...", "visibility": "PRIVATE", "is_mine": true,
  "short_content": "...", "short_content_vi": "...", "short_content_en": "...",
  "content": "...", "content_vi": "...", "content_en": "...",
  "target_date": "2027-08-18T00:00:00Z", "is_unlockable": false, "remaining_seconds": 25661700,
  "is_opened": false, "media_url": null, "created_at": "..." }
```
**Response 200**: `{ "success": true, "data": { "items": [...], "total_lanterns": <số item trả về> } }`
`total_lanterns` = **tổng số bản ghi khớp điều kiện** (COUNT, không bị cắt bởi `limit`).

### 6.2 `POST /rooms/2/artworks/{artwork_id}/open` (Kéo thả & Mở lồng đèn)
Body trống. Dùng `get_optional_user`.

**Logic**
1. Tìm artwork `id=:id AND room_id=2`. Không thấy → 404 `ARTWORK_NOT_FOUND`.
2. Kiểm tra quyền xem (visible set):
   - `PUBLIC`: phải `status='APPROVED'`, không → 404.
   - `PRIVATE`: không có user → 401; `user_id != user.id` → **404** (không tiết lộ sự tồn tại thư riêng của người khác).
3. **Quy tắc mở**: Người dùng có thể kéo thả và mở lồng đèn nếu nó nằm trong visible set (PUBLIC đã duyệt hoặc PRIVATE của bản thân) mà **không bị giới hạn bởi thời gian khóa**, người dùng tự do mở khi mong muốn (không còn trả về lỗi 423 `TIME_CAPSULE_LOCKED`).
4. Hợp lệ: `UPDATE artworks SET is_opened = TRUE, view_count = view_count + 1 WHERE id = :id RETURNING *`.

**Response 200**
```json
{ "success": true, "message": "Lồng đèn đã hạ cánh. Chúc mừng bạn đã chạm tới bức thư tương lai!",
  "data": { "id": "...", "original_language": "vi", "title": "...", "title_vi": "...", "title_en": "...",
            "author_display_name": "...", 
            "short_content": "...", "short_content_vi": "...", "short_content_en": "...",
            "content": "...", "content_vi": "...", "content_en": "...", "media_url": "...",
            "visibility": "PRIVATE", "target_date": "...", "is_opened": true, "view_count": 1, "created_at": "..." } }
```
**Lỗi**: 401 `UNAUTHORIZED`, 404 `ARTWORK_NOT_FOUND` (`"Không tìm thấy lồng đèn"`).

### 6.3 `POST /rooms/2/artworks`
**Request**
| Trường | Quy tắc |
|---|---|
| `original_language` | tuỳ chọn, enum `vi` hoặc `en`, mặc định `vi` |
| `title` | bắt buộc, 3–150 (theo `original_language`) |
| `content` | bắt buộc, ≥10, ≤20 000 (theo `original_language`) |
| `short_content` | bắt buộc, 5–300 (theo `original_language`) |
| `target_date` | bắt buộc, ISO-8601 có timezone (không có TZ → coi là UTC), phải **> now()** |
| `visibility` | `PUBLIC` \| `PRIVATE`, bắt buộc |
| `is_anonymous` | boolean, mặc định false |

> **Ràng buộc tên tác giả**: Người dùng **không được tự nhập** `author_display_name`. Backend tự động gán `author_display_name = current_user.nickname`. Nếu `is_anonymous = true`, hệ thống lưu cờ ẩn danh và khi hiển thị công chúng sẽ là `"Người Bạn Ẩn Danh"`.

**Logic**
1. Rate limit giống plan_05 §5.5 (dùng chung helper).
2. `status = 'PENDING'` nếu PUBLIC; `status = 'APPROVED'` nếu PRIVATE (không cần admin, `reviewed_by` để NULL).
3. INSERT với `room_id=2`, `author_display_name=current_user.nickname`, `is_opened=FALSE`, `media_url=NULL`. Gán giá trị tiêu đề và nội dung vào cột ngôn ngữ tương ứng (`title_vi` hoặc `title_en`).

**Response 201** — message theo visibility:
- PUBLIC: `"Lồng đèn của bạn đang được chuẩn bị, chúng mình sẽ thông báo trong hộp tin nhắn cho bạn sau khi tác phẩm hoàn thành"`
- PRIVATE: `"Lồng đèn hy vọng đã được thả bay lên bầu trời riêng của bạn!"`
```json
{ "success": true, "message": "...",
  "data": { "id": "...", "room_id": 2, "original_language": "vi", "title": "...", "title_vi": "...", "title_en": "...", 
            "author_display_name": "Người Thắp Đèn", 
            "short_content": "...", "short_content_vi": "...", "short_content_en": "...",
            "content": "...", "content_vi": "...", "content_en": "...",
            "visibility": "PUBLIC", "status": "PENDING", "target_date": "...", "created_at": "..." } }
```
**Lỗi**: 400 `INVALID_TARGET_DATE` — `"Ngày mở khóa không hợp lệ hoặc nằm trong quá khứ"`; 400 `VALIDATION_ERROR`; 429.

### 6.4 `GET /rooms/2/search?q=&filter=all&page=1&limit=15`
- `q` bắt buộc. `filter ∈ {all, mine, opened, locked}` (cùng nghĩa 6.1; `mine` không token → 401). `limit` mặc định 15, tối đa 50.
- `SearchService.search_artworks(room_id=2, …)` với **bắt buộc** áp visible set §3.
- **Phạm vi tìm kiếm**: Từ khóa `q` đối sánh trên **toàn bộ 10 trường nội dung và song ngữ**:
  `title`, `title_vi`, `title_en`, `short_content`, `short_content_vi`, `short_content_en`, `content`, `content_vi`, `content_en`, `author_display_name` (hỗ trợ cả tiếng Việt có dấu và không dấu).
- **Dữ liệu trả về**: Mỗi item trả về đầy đủ các trường: `title` (kèm `_vi`, `_en`), `short_content` (kèm `_vi`, `_en`), `content` (kèm `_vi`, `_en`), `author_display_name`, `visibility`, `is_opened`, `is_unlockable`, `target_date`, `highlight` (hỗ trợ bọc `<em>` cho `title`, `short_content` và `content`).
- **Bảo vệ nội dung lồng đèn đang khóa**: **Không đưa `content` của lồng đèn đang khoá vào highlight** (tránh lộ nội dung chưa đến ngày): với item `is_unlockable = false` chỉ highlight `title`, `short_content` hoặc `author_display_name`, trường `content` hiển thị nội dung được che mờ hoặc rỗng nếu chưa mở khóa.

**Item**
```json
{ 
  "id": "...", 
  "title": "Mong <em>mẹ</em> luôn bình an và mỉm cười", 
  "title_vi": "Mong mẹ luôn bình an và mỉm cười", 
  "title_en": "Wishing mom peace and smiles", 
  "author_display_name": "...", 
  "short_content": "Lời nhắn gửi <em>yêu thương</em>...", 
  "short_content_vi": "Lời nhắn gửi yêu thương...", 
  "short_content_en": "Message of love...",
  "content": "Con chỉ mong sao gia đình mình luôn <em>hạnh phúc</em>...", 
  "content_vi": "Con chỉ mong sao gia đình mình luôn hạnh phúc...", 
  "content_en": "I only wish our family always happy...",
  "visibility": "PUBLIC", 
  "is_opened": true, 
  "is_unlockable": true, 
  "target_date": "...", 
  "highlight": { 
    "title": ["Mong <em>mẹ</em> luôn bình an"],
    "short_content": ["Lời nhắn gửi <em>yêu thương</em>..."],
    "content": ["...gia đình mình luôn <em>hạnh phúc</em>..."]
  } 
}
```
**Response 200**: `{ "success": true, "data": { "items": [...], "pagination": { "page", "limit", "total_hits" } } }`

### 6.5 `GET /rooms/2/artworks/ready-to-fall?include_opened=false` (Lấy lồng đèn của bản thân đến thời điểm rơi xuống)
- **Quyền**: Authenticated (yêu cầu Bearer Token).
- **Mục đích**: Phục vụ Frontend kiểm tra thời điểm thực tế để kích hoạt animation lồng đèn của bản thân rơi xuống từ bầu trời đêm để người dùng bắt lấy và đọc bức thư.
- **Quy tắc thời gian**: Lấy lồng đèn của bản thân đến thời điểm rơi xuống hoặc trước thời điểm hiện tại, đảm bảo thời điểm rơi xuống luôn **`target_date <= now()`**.
- **Query Parameters**:
  - `include_opened` (bool, mặc định `false`): nếu `false`, chỉ lấy các lồng đèn chưa mở (`is_opened = false`). Nếu `true`, bao gồm cả lồng đèn đã mở.
- **Điều kiện lọc**:
  - `room_id = 2`
  - `user_id = current_user.id`
  - `status = 'APPROVED'` (bao gồm cả PRIVATE và PUBLIC đã được phê duyệt)
  - `target_date IS NOT NULL AND target_date <= now()`
- **Dữ liệu trả về**: Trả về đầy đủ các thông tin của lồng đèn bao gồm cả `short_content` (kèm `_vi`, `_en`) và `content` (kèm `_vi`, `_en`).

**Response 200**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "c0000000-0000-0000-0000-000000000021",
        "original_language": "vi",
        "title": "Bức thư gửi tương lai",
        "title_vi": "Bức thư gửi tương lai",
        "title_en": "Letter to the Future",
        "author_display_name": "Ánh Dương",
        "short_content": "Lời nhắn nhủ gửi tương lai...",
        "short_content_vi": "Lời nhắn nhủ gửi tương lai...",
        "short_content_en": "A message to the future...",
        "content": "Nội dung bức thư đầy đủ gửi tới chính bản thân khi đến thời điểm...",
        "content_vi": "Nội dung bức thư đầy đủ gửi tới chính bản thân khi đến thời điểm...",
        "content_en": "Full letter content to myself when the time comes...",
        "visibility": "PRIVATE",
        "status": "APPROVED",
        "target_date": "2026-10-25T12:00:00Z",
        "is_opened": false,
        "media_url": null,
        "created_at": "2026-10-20T08:00:00Z"
      }
    ],
    "total": 1
  }
}
```
**Lỗi**: 401 `UNAUTHORIZED`.

### 4.6 `DELETE /rooms/2/artworks/{artwork_id}` (Xóa lồng đèn của bản thân nếu chưa được public)
- **Quyền**: Authenticated (`Bearer {{accessToken}}`).
- **Mục đích**: Cho phép tác giả chủ động xóa lồng đèn hy vọng của chính mình khi chưa được phê duyệt công khai trên bầu trời đêm.

**Logic xử lý**:
1. Tìm artwork `id=:artwork_id AND room_id=2`. Không thấy → 404 `ARTWORK_NOT_FOUND`.
2. Kiểm tra quyền sở hữu: `artwork.user_id != current_user.id` → **404 `ARTWORK_NOT_FOUND`** (không tiết lộ sự tồn tại của thư người khác).
3. Kiểm tra điều kiện công khai:
   - Nếu `artwork.visibility == 'PUBLIC' AND artwork.status == 'APPROVED'`: Tác phẩm đã được admin duyệt và đã xuất hiện công khai trên bầu trời → **Chặn xóa**, trả về lỗi **400 `CANNOT_DELETE_PUBLIC_LANTERN`** với thông điệp: `"Không thể xóa lồng đèn đã được công khai trên bầu trời đêm"`.
   - Nếu `artwork.status == 'PENDING'` (kể cả PUBLIC đang chờ duyệt) HOẶC `artwork.visibility == 'PRIVATE'` (lồng đèn riêng tư chưa từng public) → **Cho phép xóa**.
4. Thực hiện xóa vĩnh viễn khỏi cơ sở dữ liệu (`DELETE FROM artworks WHERE id = :id`).

**Response 200**:
```json
{
  "success": true,
  "message": "Xóa lồng đèn thành công"
}
```
**Lỗi**:
- 400 `CANNOT_DELETE_PUBLIC_LANTERN`: `"Không thể xóa lồng đèn đã được công khai trên bầu trời đêm"`
- 401 `UNAUTHORIZED`: Thiếu hoặc sai token
- 404 `ARTWORK_NOT_FOUND`: `"Không tìm thấy lồng đèn"`

### 6.7 `GET /rooms/2/artworks/my-personal`
* **Mục đích**: Widget đếm ngược thời gian lồng đèn cá nhân hạ xuống ở góc phòng 2.
* **Quyền hạn**: Authenticated
* **Response 200**:
```json
{
  "success": true,
  "data": {
    "has_lantern": true,
    "lantern": {
      "id": "lt_mine_01",
      "title": "Gửi mình của năm 2030",
      "target_date": "2030-10-24T09:00:00Z",
      "remaining_seconds": 126144000,
      "days": 1460,
      "hours": 4,
      "minutes": 12,
      "seconds": 9,
      "is_opened": false,
      "symbol": "heart"
    }
  }
}
```

### 6.8 `GET /rooms/2/artworks/random-opened`
* **Mục đích**: Rút ngẫu nhiên một bức thư lồng đèn đã mở công khai trên bầu trời đêm.
* **Quyền hạn**: Public
* **Response 200**: Trả về 1 object lồng đèn có `is_opened = true` và `visibility = 'PUBLIC'`, hoặc `null` nếu chưa có lồng đèn nào mở.

### 6.9 `POST /rooms/2/artworks/{artwork_id}/save`
* **Mục đích**: Lưu bức thư lồng đèn vào Sổ tay Ký ức của người dùng.
* **Quyền hạn**: Authenticated
* **Logic**:
  - Kiểm tra `artwork_id` tồn tại trong `artworks` thuộc `room_id = 2`.
  - Nếu `visibility = 'PRIVATE'`, chỉ chính chủ mới được lưu.
  - Ghi nhận vào bảng `user_saved_artworks`.
* **Response 200**:
```json
{
  "success": true,
  "message": "Đã lưu bức thư lồng đèn vào sổ tay",
  "data": {
    "artwork_id": "7b8f9e01-1234-4567-89ab-cdef01234567",
    "is_saved": true,
    "saved_at": "2026-10-26T03:00:00Z"
  }
}
```

### 6.10 `DELETE /rooms/2/artworks/{artwork_id}/save`
* **Mục đích**: Bỏ lưu bức thư lồng đèn khỏi Sổ tay Ký ức.
* **Quyền hạn**: Authenticated
* **Response 200**:
```json
{
  "success": true,
  "message": "Đã bỏ lưu bức thư khỏi sổ tay"
}
```


---

## 5. Test bắt buộc
- [ ] Khách chỉ thấy PUBLIC+APPROVED; user A thấy thêm PRIVATE của A, không thấy PRIVATE của B.
- [ ] PUBLIC PENDING không xuất hiện (kể cả với chính tác giả).
- [ ] `remaining_seconds`/`is_unlockable` đúng với target_date tương lai, quá khứ, NULL.
- [ ] `limit=101` → 400; `filter=mine` không token → 401; `total_lanterns` = COUNT thật.
- [ ] Kéo thả & Mở lồng đèn trong visible set thành công bất cứ lúc nào (kể cả target_date tương lai) → 200, `is_opened=true`, `view_count` +1, không bị chặn 423.
- [ ] Open PRIVATE không token → 401; PRIVATE của người khác → 404.
- [ ] Lấy lồng đèn đến hạn rơi xuống (`GET /ready-to-fall`) không token → 401; có token trả đúng lồng đèn `target_date <= now()` của bản thân.
- [ ] Create PUBLIC → `PENDING` + message PUBLIC; PRIVATE → `APPROVED` + message PRIVATE.
- [ ] Create `target_date` quá khứ → 400 `INVALID_TARGET_DATE`.
- [ ] Search không trả PRIVATE của người khác; item đang khoá không có `highlight.content`.
- [ ] Xóa lồng đèn của bản thân (`DELETE /artworks/{id}`): không token → 401; xóa của người khác → 404; xóa bài đã PUBLIC APPROVED → 400 `CANNOT_DELETE_PUBLIC_LANTERN`; xóa bài PUBLIC PENDING và bài PRIVATE → 200 thành công.

## 6. Điểm mơ hồ & quyết định mặc định
| Spec | Quyết định |
|---|---|
| 6.2: Mở lồng đèn | Người dùng có thể kéo thả và mở lồng đèn nếu nó nằm trong visible set mà không phụ thuộc vào `target_date`. Bỏ mã lỗi 423 |
| 6.5: Lồng đèn rơi xuống | Dành riêng cho lồng đèn của chính người dùng (`user_id = current_user.id`) đã đến hạn (`target_date <= now()`) để frontend hiển thị hiệu ứng rơi |
| 6.6: Xóa lồng đèn | Chỉ cho phép xóa khi lồng đèn của chính mình và chưa được duyệt công khai (không phải PUBLIC APPROVED). Bị chặn với lỗi 400 nếu đã public |
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
- **Danh sách requests trong Collection**:
  1. `[6.1] Lấy danh sách lồng đèn bầu trời đêm (GET /api/v1/rooms/2/artworks)` - Public, query limit=30, filter=all|mine|opened|locked, title, author_display_name.
  2. `[6.2] Kéo thả & Mở lồng đèn thành công (POST /api/v1/rooms/2/artworks/{{lanternId}}/open)` - Mở lồng đèn trong visible set (status 200, nội dung thư và `is_opened = true`).
  3. `[6.3] Thả lồng đèn công khai PUBLIC (POST /api/v1/rooms/2/artworks)` - Header `Bearer {{accessToken}}`, visibility='PUBLIC', target_date tương lai. Kiểm tra status 201, `status = 'PENDING'`. Test script lưu `{{lanternId}}`.
  4. `[6.3] Thả lồng đèn riêng tư PRIVATE (POST /api/v1/rooms/2/artworks)` - Header `Bearer {{accessToken}}`, visibility='PRIVATE'. Kiểm tra status 201, `status = 'APPROVED'`. Test script lưu `{{lanternId}}`.
  5. `[6.4] Tìm kiếm lồng đèn bầu trời đêm (GET /api/v1/rooms/2/search?q=ước mơ)` - Kiểm tra status 200, tìm kiếm 10 trường song ngữ.
  6. `[6.5] Lấy lồng đèn của bản thân đến thời điểm rơi xuống (GET /api/v1/rooms/2/artworks/ready-to-fall)` - Header `Bearer {{accessToken}}`, kiểm tra status 200 và danh sách lồng đèn đến hạn rơi.
  7. `[6.6] Xóa lồng đèn của bản thân khi chưa public (DELETE /api/v1/rooms/2/artworks/{{lanternId}})` - Header `Bearer {{accessToken}}`, kiểm tra status 200.

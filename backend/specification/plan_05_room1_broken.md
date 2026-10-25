# PLAN 05 — Nhóm API 5: Phòng 1 "Đổ vỡ" (`/api/v1/rooms/1`)

> Đọc `plan_00_foundation.md` trước. Nguồn: API spec trang 17–24.
> Bảng: `artworks` (room_id = 1), `artwork_interactions`, `users`. Cần cột bổ sung `author_display_name`, `is_anonymous` (plan_00 §2.1).

## 1. Phạm vi

| # | Method | Path | Quyền | Status OK |
|---|---|---|---|---|
| 5.1 | GET | `/api/v1/rooms/1/artworks` | Public (tùy chọn token) | 200 |
| 5.2 | GET | `/api/v1/rooms/1/artworks/{artwork_id}` | Public (tùy chọn token) | 200 |
| 5.3 | POST | `/api/v1/rooms/1/artworks/{artwork_id}/reactions` | Authenticated | 200 |
| 5.4 | GET | `/api/v1/rooms/1/search` | Public (tùy chọn token) | 200 |
| 5.5 | POST | `/api/v1/rooms/1/artworks` | Authenticated | 201 |

Router: `APIRouter(prefix="/rooms/1", tags=["Room 1 - Broken"])`. Hằng `ROOM_ID = 1`.

## 2. File cần tạo
- `app/models/room.py`, `app/models/artwork.py`, `app/models/artwork_interaction.py` (dùng chung cho phòng 2, 3, admin)
- `app/schemas/room1.py`
- `app/services/artwork_query_service.py` (truy vấn/hiển thị dùng chung 3 phòng: tên hiển thị §6.6 plan_00, tăng view)
- `app/services/room1_service.py`
- `app/api/v1/endpoints/room1.py`
- Dùng: `ReactionService`, `SearchService`, `NotificationService`

**Điều kiện "hiển thị công khai" phòng 1:** `room_id = 1 AND status = 'APPROVED'`.

Reaction hợp lệ phòng 1: `HEART`, `HUG`, `SYMPATHY` (KHÔNG có `INSPIRED`).
Object `reactions` luôn có đủ: `{ "HEART": n, "HUG": n, "SYMPATHY": n, "total": n }`.

---

## 3. Chi tiết endpoint

### 5.1 `GET /rooms/1/artworks?page=1&limit=12&filter=all&title=&author_display_name=`
- `page` mặc định 1; `limit` mặc định 12, tối đa 50.
- `filter ∈ {all, my_artworks, most_sympathetic, latest}`, mặc định `all`; giá trị khác → 400.
- **Bộ lọc bổ sung (Filter parameters)**:
  - `title`: Lọc theo tiêu đề tác phẩm (không phân biệt hoa thường, tìm kiếm chuỗi con trong `title`, `title_vi`, hoặc `title_en`).
  - `author_display_name`: Lọc theo tên hiển thị của tác giả (không phân biệt hoa thường, tìm kiếm chuỗi con trong `author_display_name`).

| filter | Điều kiện thêm | Sắp xếp |
|---|---|---|
| `all` | — | `created_at DESC` |
| `latest` | — | `created_at DESC` |
| `most_sympathetic` | — | tổng reaction DESC, rồi `created_at DESC` (subquery `COUNT(artwork_interactions)` hoặc `LEFT JOIN … GROUP BY`) |
| `my_artworks` | `user_id = current_user.id`; **không có token → 401** | `created_at DESC` |

**Logic**
1. Query trang hiện tại + `COUNT(*)` (kết hợp các điều kiện lọc `title`, `author_display_name` nếu có).
2. `ReactionService.summary(ids, ROOM1_REACTIONS)` 1 lần.
3. Nếu có user: `ReactionService.my_reactions(ids, user.id)` → `my_reaction` = reaction đầu tiên (phòng 1 chỉ cho 1 reaction / user) hoặc `null`.

**Item**
```json
{ "id": "<uuid>", "title": "...", "short_content": "...", "media_url": "...",
  "author_display_name": "Kẻ Độc Hành", "is_anonymous": false, "view_count": 342,
  "reactions": { "HEART": 45, "HUG": 89, "SYMPATHY": 120, "total": 254 },
  "my_reaction": "HUG", "created_at": "..." }
```
**Response 200**: `{ "success": true, "data": { "items": [...], "pagination": { "page", "limit", "total_items", "total_pages" } } }`
Không trả `content`, `user_id`.

### 5.2 `GET /rooms/1/artworks/{artwork_id}?lang=vi`
**Logic**
1. Tìm artwork `id = :id AND room_id = 1 AND status = 'APPROVED'`; không thấy → 404.
2. `UPDATE artworks SET view_count = view_count + 1 WHERE id = :id RETURNING view_count` (nguyên tử; trả giá trị **sau khi tăng**).
3. Reactions + `my_reaction` như 5.1.
4. Trả về cả các trường song ngữ `title_vi`, `title_en`, `short_content_vi`, `short_content_en`, `content_vi`, `content_en`. Trường `title`, `short_content`, `content` ưu tiên hiển thị theo `lang` (mặc định `vi`).

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "room_id": 1,
    "original_language": "vi",
    "title": "...",
    "title_vi": "Những mảnh vỡ...",
    "title_en": "Broken pieces...",
    "short_content": "...",
    "short_content_vi": "...",
    "short_content_en": "...",
    "content": "...",
    "content_vi": "...",
    "content_en": "...",
    "author_display_name": "...",
    "is_anonymous": false,
    "media_url": "...",
    "view_count": 343,
    "reactions": { "HEART": 45, "HUG": 89, "SYMPATHY": 120, "total": 254 },
    "my_reaction": "HUG",
    "created_at": "..."
  }
}
```
**Lỗi**: 404 `ARTWORK_NOT_FOUND` — `"Không tìm thấy tác phẩm"`.

### 5.3 `POST /rooms/1/artworks/{artwork_id}/reactions`
**Request** `{ "reaction_type": "SYMPATHY" }` — enum `HEART|HUG|SYMPATHY`, khác → 400.

**Quy tắc phòng 1: mỗi user tối đa 1 reaction / tác phẩm.** (Ràng buộc DB `uq_artwork_user_reaction` cho phép nhiều loại; giới hạn 1 thực thi ở tầng service.)

**Logic** (1 transaction, `SELECT … FOR UPDATE` các reaction hiện có của user trên artwork này):
1. Artwork phải `room_id=1 AND status='APPROVED'`, không → 404.
2. Lấy reaction hiện có `existing` của user:
   - `existing.type == reaction_type` → **xoá** (toggle off) → `current_reaction = null`, message `"Đã gỡ bỏ cảm xúc"`.
   - `existing` khác loại → xoá cái cũ, insert cái mới → `current_reaction = reaction_type`, message `"Cảm ơn bạn đã gửi sự đồng cảm đến tác phẩm"`.
   - Không có → insert → như trên.
3. Khi **thêm mới** (không phải đổi loại, không phải gỡ) và `artwork.user_id != current_user.id` → `NotificationService.create(recipient_id=artwork.user_id, type='INTERACTION', sender_id=None, title="Có người vừa gửi đồng cảm đến bạn", body=<xem dưới>, target_url=f"/rooms/1/artworks/{id}")`.
   - body theo loại: `HUG` → `"Một người bạn ẩn danh vừa gửi một cái Ôm ấm áp đến tác phẩm của bạn."`, `HEART` → `"Một người bạn ẩn danh vừa thả tim cho tác phẩm của bạn."`, `SYMPATHY` → `"Một người bạn ẩn danh vừa gửi sự đồng cảm đến tác phẩm của bạn."`
4. Tính lại `reactions_summary` sau thay đổi.

**Response 200**
```json
{ "success": true, "message": "Cảm ơn bạn đã gửi sự đồng cảm đến tác phẩm",
  "data": { "artwork_id": "<uuid>", "current_reaction": "SYMPATHY",
            "reactions_summary": { "HEART": 45, "HUG": 88, "SYMPATHY": 121, "total": 254 } } }
```
(khoá là `reactions_summary`, khác với `reactions` ở 5.1/5.2 — giữ đúng spec.)

### 5.4 `GET /rooms/1/search?q=&scope=all&page=1&limit=12`
- `q` bắt buộc, 1–100 ký tự sau strip. `scope ∈ {all, mine}`; `mine` không token → 401. `limit` mặc định 12, tối đa 50.
- Dùng `SearchService.search_artworks(room_id=1, ...)` (plan_00 §6.5). Chỉ tìm trong `status='APPROVED'`; `scope=mine` thêm `user_id = current_user.id`.
- **Phạm vi tìm kiếm**: Từ khóa `q` tìm kiếm và đối sánh trên **toàn bộ 10 trường nội dung và song ngữ**:
  `title`, `title_vi`, `title_en`, `short_content`, `short_content_vi`, `short_content_en`, `content`, `content_vi`, `content_en`, `author_display_name`.
  Tác phẩm sẽ xuất hiện trong kết quả nếu từ khóa `q` xuất hiện ở bất kỳ trường nào trong số trên (hỗ trợ cả tiếng Việt có dấu và không dấu). Highlight trả về snippets bọc thẻ `<em>...</em>` cho các field có từ khóa khớp (`title`, `short_content`, `content`).
- **Dữ liệu trả về**: Mỗi item trả về đầy đủ các trường nội dung: `title` (kèm `_vi`, `_en`), `short_content` (kèm `_vi`, `_en`), `content` (kèm `_vi`, `_en`), `author_display_name`, `media_url`, `reactions_total`, `view_count`, `highlight`.

**Item**
```json
{ 
  "id": "...", 
  "title": "Những mảnh vỡ <em>mùa thu</em>", 
  "title_vi": "Những mảnh vỡ mùa thu",
  "title_en": "Broken pieces of Autumn",
  "author_display_name": "...",
  "short_content": "Một thoáng <em>buồn</em> rơi nghiêng...", 
  "short_content_vi": "Một thoáng buồn rơi nghiêng...",
  "short_content_en": "A glimpse of sadness...",
  "content": "Những ngày tháng <em>đổ vỡ</em> ấy đã dạy tôi trưởng thành...",
  "content_vi": "Những ngày tháng đổ vỡ ấy đã dạy tôi trưởng thành...",
  "content_en": "Those broken days taught me to grow up...",
  "media_url": "...", 
  "highlight": { 
    "title": ["Những mảnh vỡ <em>mùa thu</em>"],
    "short_content": ["Một thoáng <em>buồn</em> rơi..."],
    "content": ["...những ngày tháng <em>đổ vỡ</em>..."] 
  }, 
  "reactions_total": 254, 
  "view_count": 343 
}
```
**Response 200**: `{ "success": true, "data": { "items": [...], "pagination": { "page": 1, "limit": 12, "total_hits": 5 } } }` (không có `total_pages`).

### 5.5 `POST /rooms/1/artworks`
**Request**
| Trường | Quy tắc |
|---|---|
| `original_language` | tuỳ chọn, enum `vi` hoặc `en`, mặc định `vi` |
| `title` | bắt buộc, strip, 3–150 (theo `original_language`) |
| `short_content` | bắt buộc, strip, 10–300 (theo `original_language`) |
| `content` | bắt buộc, strip, ≥30 ký tự, ≤20 000 (theo `original_language`) |
| `is_anonymous` | boolean, mặc định `false` |

> **Ràng buộc tên tác giả**: Người dùng **không được tự nhập** `author_display_name`. Nếu client truyền lên sẽ bị bỏ qua. Hệ thống tự động gán `author_display_name = current_user.nickname`. Nếu `is_anonymous = true`, hệ thống lưu cờ ẩn danh và khi hiển thị ra ngoài công chúng sẽ là `"Người Bạn Ẩn Danh"`.

Các trường khác (`status`, `media_url`, `room_id`, `user_id`…) bị bỏ qua.

**Logic**
1. Rate limit: đếm artwork của user (mọi phòng) có `created_at > now() - ARTWORK_RATE_LIMIT_WINDOW` (mặc định 10 phút); ≥ `ARTWORK_RATE_LIMIT_MAX` (mặc định 3) → 429. Cấu hình trong `config.py`.
2. `INSERT artworks(user_id, room_id=1, original_language, title, short_content, content, author_display_name=current_user.nickname, is_anonymous, status='PENDING', media_url=NULL, visibility='PUBLIC')`. Gán `title_vi = title` nếu `original_language == 'vi'` (hoặc `title_en = title` nếu `'en'`). Bản dịch còn lại sẽ do Admin biên tập ở khâu duyệt bài.

**Response 201**
```json
{
  "success": true,
  "message": "Tác phẩm của bạn đang được chuẩn bị, chúng mình sẽ thông báo trong hộp tin nhắn cho bạn sau khi tác phẩm hoàn thành",
  "data": {
    "id": "<uuid>",
    "room_id": 1,
    "original_language": "vi",
    "title": "...",
    "author_display_name": "Bụi Thời Gian",
    "status": "PENDING",
    "created_at": "..."
  }
}
```
`author_display_name` trong response = giá trị hiển thị theo plan_00 §6.6 (nếu `is_anonymous=true` thì hiển thị `"Người Bạn Ẩn Danh"`, ngược lại hiển thị `current_user.nickname`).

**Lỗi**: 400 `VALIDATION_ERROR` (`"Tiêu đề hoặc nội dung quá ngắn/để trống"`), 429 `RATE_LIMITED` (`"Bạn gửi bài quá nhanh, vui lòng thử lại sau ít phút"`).

---

## 4. Test bắt buộc
- [ ] List chỉ chứa tác phẩm `room_id=1, APPROVED`; PENDING/REJECTED/ARCHIVED và tác phẩm phòng 2/3 không xuất hiện.
- [ ] Khách (không token): `my_reaction = null`; `filter=my_artworks` → 401.
- [ ] Token hết hạn trên endpoint public → vẫn 200, như khách.
- [ ] `most_sympathetic` sắp xếp đúng theo tổng reaction.
- [ ] `is_anonymous=true` → `author_display_name == "Người Bạn Ẩn Danh"`; response không chứa `user_id`.
- [ ] Detail tăng `view_count` đúng 1 mỗi lần; detail tác phẩm PENDING → 404; tác phẩm phòng 2 qua path phòng 1 → 404.
- [ ] Reaction: thêm → đổi loại → bấm lại cùng loại → kiểm tra `current_reaction` lần lượt `X`, `Y`, `null` và summary đúng; DB không bao giờ có 2 reaction của cùng user trên 1 tác phẩm.
- [ ] Reaction `INSPIRED` → 400. Không token → 401.
- [ ] Reaction lần đầu tạo 1 notification INTERACTION (`sender_id NULL`) cho tác giả; tác giả tự react → không tạo; đổi loại → không tạo thêm.
- [ ] Search `q` rỗng → 400; `scope=mine` không token → 401; kết quả chứa `<em>`.
- [ ] Create → 201, DB `status='PENDING'`, `media_url NULL`; gửi `"status":"APPROVED"` vẫn PENDING; content quá ngắn → 400; bài thứ 4 trong 10 phút → 429.

## 5. Điểm mơ hồ & quyết định mặc định
| Spec | Quyết định |
|---|---|
| `author_display_name`, `is_anonymous` không có trong DB spec | Thêm cột (plan_00 §2.1) |
| Ý nghĩa `is_anonymous=true` khi đã có bút danh | Ẩn hoàn toàn → "Người Bạn Ẩn Danh" |
| `filter=all` và `latest` đều sắp xếp mới nhất | Giống nhau |
| `my_artworks` có gồm bài PENDING/REJECTED của chính mình? | Không — chỉ APPROVED (theo mô tả "thẻ bài đã được duyệt") |
| 5.4 yêu cầu Elasticsearch | Fallback PostgreSQL FTS (plan_00 §6.5) |
| Ngưỡng rate limit 429 không ghi | 3 bài / 10 phút / user, cấu hình được |
| Reaction có sinh thông báo? | Có (suy ra từ ví dụ thông báo INTERACTION ở API 4.2) |

---

## 6. Postman Collection để Test API
- **File đích**: [`backend/postman_json/05_room1_broken.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/05_room1_broken.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{accessToken}}`: Bearer Token người dùng đang đăng nhập
  - `{{artworkIdRoom1}}`: Tự động lưu `data.items[0].id` khi duyệt danh sách hoặc khi tạo mới tác phẩm
- **Danh sách requests cần có trong Collection**:
  1. `[5.1] Lấy danh sách tác phẩm Gallery (GET /api/v1/rooms/1/artworks)` - Public, phân trang page/limit, lọc `filter=all|latest|most_sympathetic`.
  2. `[5.1] Lấy danh sách tác phẩm của tôi (GET /api/v1/rooms/1/artworks?filter=my_artworks)` - Header `Bearer {{accessToken}}`.
  3. `[5.2] Xem chi tiết tác phẩm (GET /api/v1/rooms/1/artworks/{{artworkIdRoom1}})` - Kiểm tra status 200, trường `view_count` tăng.
  4. `[5.3] Thả tương tác cảm xúc Toggle (POST /api/v1/rooms/1/artworks/{{artworkIdRoom1}}/reactions)` - Body `{ "reaction_type": "SYMPATHY" }`, test script kiểm tra toggle on/off.
  5. `[5.4] Tìm kiếm toàn văn tác phẩm (GET /api/v1/rooms/1/search?q=mùa thu)` - Kiểm tra status 200, trả về `highlight`.
  6. `[5.5] Trưng bày tác phẩm mới (POST /api/v1/rooms/1/artworks)` - Header `Bearer {{accessToken}}`, body gồm `title`, `content`, `short_content`, `author_display_name`. Test script lưu `{{artworkIdRoom1}}`.

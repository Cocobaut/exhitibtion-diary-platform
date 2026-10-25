# PLAN 07 — Nhóm API 7: Phòng 3 "Cây thông điệp" (`/api/v1/rooms/3`)

> Đọc `plan_00_foundation.md` và `plan_05_room1_broken.md` (dùng chung model/`artwork_query_service`). Nguồn: API spec trang 32–39.
> Hằng số: `ROOM_ID = 3`. Cột đặc thù: `tag_category`, `color_code`.

## 1. Phạm vi

| # | Method | Path | Quyền | Status OK |
|---|---|---|---|---|
| 7.1 | GET | `/api/v1/rooms/3/artworks` | Public (tùy chọn token) | 200 |
| 7.2 | GET | `/api/v1/rooms/3/artworks/{artwork_id}` | Public (tùy chọn token) | 200 |
| 7.3 | POST | `/api/v1/rooms/3/artworks/{artwork_id}/energy` | Authenticated | 200 |
| 7.4 | POST | `/api/v1/rooms/3/artworks` | Authenticated | 201 |
| 7.5 | GET | `/api/v1/rooms/3/search` | Public (tùy chọn token) | 200 |

Router: `APIRouter(prefix="/rooms/3", tags=["Room 3 - Community Tree"])`.

## 2. File cần tạo
- `app/schemas/room3.py`, `app/services/room3_service.py`, `app/api/v1/endpoints/room3.py`

## 3. Quy chuẩn danh mục & mã màu (Color Legend)

| `tag_category` | `color_code` | `label` |
|---|---|---|
| `ENCOURAGEMENT` | `#FFD700` | Lời khích lệ, động viên kiên trì |
| `HEALING` | `#98FB98` | Lời chữa lành, bình an tâm hồn |
| `GRATITUDE` | `#FFB6C1` | Lời cảm ơn, trân trọng cuộc sống |
| `PERSPECTIVE` | `#87CEFA` | Lời chia sẻ góc nhìn cuộc sống |

- Mã màu lưu chữ hoa (chuẩn hoá `upper()`). Cặp `(tag_category, color_code)` phải khớp đúng bảng trên; gửi lệch cặp → 400.
- Khái niệm "Năng lượng" ở phòng 3:
  - Phản ứng `INSPIRED` trên UI hiển thị là **`ENERGY`**.
  - Phản ứng `HEART` trên UI hiển thị là **`HEART`**.
  - Tổng reactions: `{ "ENERGY": count(INSPIRED), "HEART": count(HEART), "total": count(INSPIRED) + count(HEART) }`.
  - `has_received_energy`: `TRUE` nếu user hiện tại đã thả `INSPIRED` trên dải ruy-băng này.

---

## 4. Chi tiết endpoint

### 7.1 `GET /rooms/3/artworks?category=&color_code=&filter=all&limit=50`
- `category`: `ENCOURAGEMENT | HEALING | GRATITUDE | PERSPECTIVE`.
- `color_code`: mã màu hex (hỗ trợ cả `%23FFD700` và `#FFD700`).
- `filter ∈ {all, mine}` (mặc định `all`; `mine` không token → 401).
- `limit`: mặc định 50, **tối đa 150** (vượt → 400). Không phân trang số (dành cho render toàn bộ cành cây).

**Logic**
1. Lấy danh sách dải thông điệp: `room_id = 3 AND status = 'APPROVED' [AND tag_category = :category] [AND color_code = :color_code] [AND user_id = :uid] ORDER BY created_at DESC LIMIT :limit`.
2. Lấy `reactions` cho từng item (`ReactionService.summary` với loại `INSPIRED` mapped sang `ENERGY`, và `HEART`).
3. Nếu có token user: kiểm tra xem user đã thả `INSPIRED` chưa → gán `has_received_energy` (`true`/`false`). Nếu chưa login → `false`.

**Response 200**
```json
{
  "success": true,
  "data": {
    "color_legend": [
      { "category": "ENCOURAGEMENT", "color_code": "#FFD700", "label": "Lời khích lệ, động viên kiên trì" },
      { "category": "HEALING", "color_code": "#98FB98", "label": "Lời chữa lành, bình an tâm hồn" },
      { "category": "GRATITUDE", "color_code": "#FFB6C1", "label": "Lời cảm ơn, trân trọng cuộc sống" },
      { "category": "PERSPECTIVE", "color_code": "#87CEFA", "label": "Lời chia sẻ góc nhìn cuộc sống" }
    ],
    "items": [
      {
        "id": "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f",
        "title": "Bạn đã làm tốt hơn bạn nghĩ rất nhiều!",
        "author_display_name": "Người Gieo Hạt",
        "tag_category": "ENCOURAGEMENT",
        "color_code": "#FFD700",
        "reactions": { "ENERGY": 142, "HEART": 98, "total": 240 },
        "has_received_energy": true,
        "created_at": "2026-10-22T08:30:00Z"
      }
    ],
    "total_ribbons": 1
  }
}
```

### 7.2 `GET /rooms/3/artworks/{artwork_id}`
**Logic**
1. Tìm tác phẩm `room_id = 3 AND id = :artwork_id AND status = 'APPROVED'`. Không thấy → 404.
2. `UPDATE artworks SET view_count = view_count + 1 WHERE id = :id`.
3. Trả về toàn văn nội dung (`content`), bộ đếm `reactions` và cờ `has_received_energy`.

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f",
    "room_id": 3,
    "original_language": "vi",
    "title": "Bạn đã làm tốt hơn bạn nghĩ rất nhiều!",
    "title_vi": "Bạn đã làm tốt hơn bạn nghĩ rất nhiều!",
    "title_en": "You have done much better than you think!",
    "author_display_name": "Người Gieo Hạt",
    "tag_category": "ENCOURAGEMENT",
    "color_code": "#FFD700",
    "content": "Có những ngày bạn cảm thấy mệt mỏi...",
    "content_vi": "Có những ngày bạn cảm thấy mệt mỏi...",
    "content_en": "There are days when you feel exhausted...",
    "reactions": { "ENERGY": 142, "HEART": 98, "total": 240 },
    "has_received_energy": true,
    "view_count": 521,
    "created_at": "2026-10-22T08:30:00Z"
  }
}
```

### 7.3 `POST /rooms/3/artworks/{artwork_id}/energy`
**Request**
```json
{
  "action_type": "INSPIRED" // Hoặc "HEART"
}
```
**Quy tắc**:
- `action_type ∈ {'INSPIRED', 'HEART'}` (lưu ý: client gửi `INSPIRED` để đại diện cho nút "Nhận năng lượng").
- Cơ chế **Toggle độc lập** cho từng loại reaction (user có thể vừa thả INSPIRED vừa thả HEART).
- Nếu đã tồn tại reaction cùng loại của user trên bài viết này → **Xoá** (Hủy tương tác), trả `current_action = null`, message `"Đã hoàn tác tương tác năng lượng"`.
- Nếu chưa có → **Thêm mới**, trả `current_action = action_type`, message `"Bạn vừa tiếp nhận nguồn năng lượng tích cực từ dải thông điệp này!"` (với INSPIRED) hoặc `"Cảm ơn bạn đã gửi lời khích lệ!"` (với HEART).
- Tạo notification nếu là thả mới và không phải tác giả (Notification INTERACTION).

**Response 200 (Thêm mới thành công)**
```json
{
  "success": true,
  "message": "Bạn vừa tiếp nhận nguồn năng lượng tích cực từ dải thông điệp này!",
  "data": {
    "artwork_id": "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f",
    "current_action": "INSPIRED",
    "reactions": { "ENERGY": 143, "HEART": 98, "total": 241 }
  }
}
```
**Response 200 (Hủy tương tác)**
```json
{
  "success": true,
  "message": "Đã hoàn tác tương tác năng lượng",
  "data": {
    "artwork_id": "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f",
    "current_action": null,
    "reactions": { "ENERGY": 142, "HEART": 98, "total": 240 }
  }
}
```

### 7.4 `POST /rooms/3/artworks`
**Request**
```json
{
  "original_language": "vi",
  "author_display_name": "Ánh Sáng Ban Mai",
  "title": "Mọi giông bão rồi sẽ tan",
  "tag_category": "HEALING",
  "color_code": "#98FB98",
  "content": "Gửi người đang đọc dòng này...",
  "short_content": "Một chiếc ôm dịu dàng gửi tới bạn hôm nay."
}
```
**Validation & Logic**
1. `original_language`: enum `vi` hoặc `en`, mặc định `vi`.
2. Validate `tag_category` và `color_code` phải khớp chuẩn mục §3. Sai → 400 `INVALID_CATEGORY_COLOR`.
3. Rate limit: tối đa 3 bài / 10 phút.
4. Kiểm tra biến môi trường `ROOM3_AUTO_APPROVE` (trong `config.py`):
   - Mặc định `FALSE`: lưu `status = 'PENDING'`, message: `"Dải thông điệp của bạn đang được chuẩn bị để treo lên cây, chúng mình sẽ thông báo qua hộp tin nhắn ngay khi hoàn tất!"`.
   - Nếu `TRUE`: lưu `status = 'APPROVED'`, message: `"Dải thông điệp đã được treo lên cây!"`.
5. INSERT vào `artworks` với `room_id = 3`, `visibility = 'PUBLIC'`. Gán giá trị gốc vào cột ngôn ngữ tương ứng (`title_vi` hoặc `title_en`). Khi admin duyệt, admin sẽ biên tập đủ 2 bản song ngữ.

**Response 201**
```json
{
  "success": true,
  "message": "Dải thông điệp của bạn đang được chuẩn bị để treo lên cây, chúng mình sẽ thông báo qua hộp tin nhắn ngay khi hoàn tất!",
  "data": {
    "id": "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
    "room_id": 3,
    "title": "Mọi giông bão rồi sẽ tan",
    "tag_category": "HEALING",
    "color_code": "#98FB98",
    "author_display_name": "Ánh Sáng Ban Mai",
    "status": "PENDING",
    "created_at": "2026-10-24T18:50:00Z"
  }
}
```

### 7.5 `GET /rooms/3/search?q=&category=&color_code=&scope=all&page=1&limit=15`
- `q`: từ khóa tìm kiếm trong `title`, `content`, `author_display_name`.
- `category`, `color_code`: bộ lọc kết hợp tùy chọn.
- `scope`: `all` (mặc định) hoặc `mine` (yêu cầu token).
- Trả về `energy_count` (= số reaction `INSPIRED`).

**Response 200**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f",
        "title": "Bạn đã làm <em>tốt</em> hơn bạn nghĩ rất nhiều!",
        "author_display_name": "Người Gieo Hạt",
        "tag_category": "ENCOURAGEMENT",
        "color_code": "#FFD700",
        "highlight": { "title": ["Bạn đã làm <em>tốt</em> hơn bạn nghĩ rất nhiều!"] },
        "energy_count": 142
      }
    ],
    "pagination": { "page": 1, "limit": 15, "total_hits": 1 }
  }
}
```

---

## 5. Test bắt buộc
- [ ] List phòng 3 trả về đúng `color_legend` 4 màu cố định.
- [ ] Gửi sai cặp màu - danh mục khi tạo bài (ví dụ `HEALING` với `#FFD700`) → 400 `INVALID_CATEGORY_COLOR`.
- [ ] `limit > 150` → 400.
- [ ] Tương tác năng lượng: bấm lần 1 `INSPIRED` → `ENERGY` tăng 1, `current_action = "INSPIRED"`, `has_received_energy = true`; bấm lần 2 cùng loại → `current_action = null`, `has_received_energy = false`.
- [ ] Khách vãng lai xem list: `has_received_energy = false`.
- [ ] Tạo bài phòng 3 với `ROOM3_AUTO_APPROVE = False` → `status = 'PENDING'`.
- [ ] Search có highlight đúng trường và lọc chuẩn theo `category`, `color_code`.

---

## 6. Postman Collection để Test API
- **File đích**: [`backend/postman_json/07_room3_community.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/07_room3_community.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{accessToken}}`: Bearer Token người dùng đang đăng nhập
  - `{{ribbonId}}`: Tự động lưu ID của dải thông điệp để tương tác hoặc xem chi tiết
- **Danh sách requests cần có trong Collection**:
  1. `[7.1] Lấy danh sách dải thông điệp trên cây (GET /api/v1/rooms/3/artworks)` - Public, kiểm tra trả về `color_legend` và danh sách ruy-băng. Test script lưu `{{ribbonId}}`.
  2. `[7.1] Lọc dải thông điệp theo thể loại và màu sắc (GET /api/v1/rooms/3/artworks?category=HEALING&color_code=%2398FB98)` - Kiểm tra status 200.
  3. `[7.2] Xem chi tiết thông điệp Popup Modal (GET /api/v1/rooms/3/artworks/{{ribbonId}})` - Kiểm tra status 200, trường `view_count` tăng.
  4. `[7.3] Tương tác tiếp sức "Nhận năng lượng" (POST /api/v1/rooms/3/artworks/{{ribbonId}}/energy)` - Body `{ "action_type": "INSPIRED" }`, test script kiểm tra toggle on/off.
  5. `[7.3] Tương tác "Thả tim khích lệ" (POST /api/v1/rooms/3/artworks/{{ribbonId}}/energy)` - Body `{ "action_type": "HEART" }`.
  6. `[7.4] Treo thông điệp mới lên cây (POST /api/v1/rooms/3/artworks)` - Header `Bearer {{accessToken}}`, body gồm `title`, `content`, `tag_category`, `color_code`.
  7. `[7.4-Lỗi] Treo thông điệp sai mã màu quy chuẩn (POST /api/v1/rooms/3/artworks)` - Kiểm tra status 400.
  8. `[7.5] Tìm kiếm thông điệp trên cây (GET /api/v1/rooms/3/search?q=bình yên)` - Kiểm tra status 200, trường `energy_count`.

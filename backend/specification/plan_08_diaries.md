# PLAN 08 — Nhóm API 8: Nhật ký cá nhân & Cộng đồng (`/api/v1/diaries`)

> Đọc `plan_00_foundation.md` trước. Nguồn: API spec trang 40–51.
> Bảng liên quan: `diaries`, `diary_interactions` (bảng mở rộng ở plan_00 §2.2), `users`.

## 1. Phạm vi

| # | Nhóm con | Method | Path | Quyền | Status OK |
|---|---|---|---|---|---|
| 8.1 | Bản thân | GET | `/api/v1/diaries/me` | Authenticated | 200 |
| 8.2 | Bản thân | GET | `/api/v1/diaries/me/{diary_id}` | Authenticated | 200 |
| 8.3 | Bản thân | POST | `/api/v1/diaries` | Authenticated | 201 |
| 8.4 | Bản thân | PUT | `/api/v1/diaries/me/{diary_id}` | Authenticated | 200 |
| 8.5 | Bản thân | DELETE | `/api/v1/diaries/me/{diary_id}` | Authenticated | 200 |
| 8.6 | Bản thân | POST | `/api/v1/diaries/upload-media` | Authenticated | 200 |
| 8.7 | Bản thân | GET | `/api/v1/diaries/stats/moods` | Authenticated | 200 |
| 8.2.1 | Cộng đồng | GET | `/api/v1/diaries/community` | Public (tùy chọn token) | 200 |
| 8.2.2 | Cộng đồng | GET | `/api/v1/diaries/community/{diary_id}` | Public (tùy chọn token) | 200 |
| 8.2.3 | Cộng đồng | POST | `/api/v1/diaries/community/{diary_id}/reactions` | Authenticated | 200 |
| 8.3.1 | Tìm kiếm | GET | `/api/v1/diaries/search` | Auth (scope=mine) / Public (community) | 200 |

Router: `APIRouter(prefix="/diaries", tags=["Diaries"])`.
> [!IMPORTANT]
> Cần sắp xếp thứ tự routes cẩn thận: Đặt `/me`, `/stats/moods`, `/upload-media`, `/community`, `/search` **trước** các route có path variable `/{diary_id}` để tránh nhầm route.

## 2. File cần tạo
- `app/models/diary.py`, `app/models/diary_interaction.py`
- `app/schemas/diary.py`
- `app/services/diary_service.py`
- `app/api/v1/endpoints/diaries.py`
- Dùng: `StorageService` (upload media), `SearchService`, `NotificationService`

---

## 3. Chi tiết endpoint

### 8.1 `GET /diaries/me?view_mode=timeline&year=&month=&mood=&page=1&limit=15`
- `view_mode`: `timeline` (mặc định) hoặc `calendar`.
- `year`, `month`: số nguyên lọc thời gian cho chế độ lịch.
- `mood`: `calm | melancholy | grateful | anxious` (hoặc tùy biến chuỗi tâm trạng).
- `page` mặc định 1, `limit` mặc định 15 (tối đa 50).

**Logic**
1. Lấy bài viết của `current_user.id`: `user_id = :uid [AND mood = :mood] [AND EXTRACT(YEAR FROM entry_date) = :year] [AND EXTRACT(MONTH FROM entry_date) = :month]`.
2. Sắp xếp: `ORDER BY entry_date DESC, created_at DESC`.
3. Sinh trường `snippet`: 150 ký tự đầu của `content` kèm `...`.

**Response 200**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "entry_date": "2026-10-24",
        "title": "Một buổi chiều tĩnh lặng bên tách trà",
        "mood": "calm",
        "snippet": "Hôm nay công việc tạm gác lại một bên...",
        "media_urls": ["https://cdn.exhibition.com/diaries/tea-cup.webp"],
        "is_public": false,
        "is_encrypted": false,
        "created_at": "2026-10-24T17:30:00Z",
        "updated_at": "2026-10-24T17:30:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 15, "total_items": 42, "total_pages": 3 }
  }
}
```

### 8.2 `GET /diaries/me/{diary_id}`
- Chỉ xem được bài viết của chính mình: `id = :diary_id AND user_id = :uid`. Không thấy hoặc của người khác → 404 (hoặc 403).

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "entry_date": "2026-10-24",
    "original_language": "vi",
    "title": "Một buổi chiều tĩnh lặng bên tách trà",
    "title_vi": "Một buổi chiều tĩnh lặng bên tách trà",
    "title_en": "A quiet afternoon with tea",
    "mood": "calm",
    "content": "Toàn văn nội dung nhật ký...",
    "content_vi": "Toàn văn nội dung nhật ký...",
    "content_en": "Full diary content in English...",
    "media_urls": ["https://cdn.exhibition.com/diaries/tea-cup.webp"],
    "is_public": false,
    "is_approved": true,
    "is_encrypted": false,
    "created_at": "2026-10-24T17:30:00Z",
    "updated_at": "2026-10-24T17:30:00Z"
  }
}
```

### 8.3 `POST /diaries`
**Request Body**
```json
{
  "entry_date": "2026-10-24",
  "original_language": "vi",
  "title": "Lời cảm ơn gửi đến những ngày đã qua",
  "mood": "grateful",
  "content": "Cảm ơn những thất bại...",
  "media_urls": ["https://cdn.exhibition.com/diaries/memories-2026.webp"],
  "is_public": true,
  "is_encrypted": false
}
```
**Quy tắc nghiệp vụ**:
- `original_language`: enum `vi` hoặc `en` (mặc định `vi`). Gán bản gốc vào cột tương ứng (`title_vi`/`content_vi` hoặc `title_en`/`content_en`).
- Nếu `is_public = FALSE`: Tự động gán `is_approved = TRUE` (Nhật ký riêng tư không cần duyệt). Message: `"Lưu nhật ký riêng tư thành công"`.
- Nếu `is_public = TRUE`: Tự động gán `is_approved = FALSE` (Chờ Admin duyệt trước khi hiển thị ra Tab Cộng đồng). Message: `"Lưu nhật ký thành công! Bài viết đã được đưa vào hàng đợi kiểm duyệt để hiển thị trên Tab Cộng đồng."`.
  Khi Admin duyệt bài đăng công khai, Admin sẽ biên tập bổ sung ngôn ngữ còn lại.

**Response 201**
```json
{
  "success": true,
  "message": "Lưu nhật ký thành công! Bài viết đã được đưa vào hàng đợi kiểm duyệt để hiển thị trên Tab Cộng đồng.",
  "data": {
    "id": "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
    "entry_date": "2026-10-24",
    "title": "Lời cảm ơn gửi đến những ngày đã qua",
    "mood": "grateful",
    "is_public": true,
    "is_approved": false,
    "created_at": "2026-10-24T19:00:00Z"
  }
}
```

### 8.4 `PUT /diaries/me/{diary_id}`
- Cập nhật bài viết của chính mình.
- **Quy tắc duyệt lại**: Nếu bài viết đang công khai hoặc chuyển sang `is_public = TRUE`, hệ thống tự động reset `is_approved = FALSE` để Admin duyệt lại nội dung mới đã sửa.

**Response 200**
```json
{
  "success": true,
  "message": "Cập nhật bài nhật ký thành công",
  "data": {
    "id": "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
    "title": "Lời cảm ơn gửi đến những ngày đã qua (Bản cập nhật)",
    "updated_at": "2026-10-24T19:15:00Z"
  }
}
```

### 8.5 `DELETE /diaries/me/{diary_id}`
- Xóa vĩnh viễn bài nhật ký (`DELETE FROM diaries WHERE id = :id AND user_id = :uid`). Cascade tự động xóa các reactions liên quan.

**Response 200** `{ "success": true, "message": "Đã xóa bài nhật ký vĩnh viễn" }`

### 8.6 `POST /diaries/upload-media`
- Nhận mảng `files: list[UploadFile]` (tối đa 5 ảnh, định dạng webp/jpeg/png, max 5MB/ảnh).
- Sử dụng `StorageService` để lưu vào thư mục `diaries/`.

**Response 200**
```json
{
  "success": true,
  "data": {
    "urls": [
      "https://cdn.exhibition.com/diaries/upload-uuid-1.webp",
      "https://cdn.exhibition.com/diaries/upload-uuid-2.webp"
    ]
  }
}
```

### 8.7 `GET /diaries/stats/moods`
- Thống kê phân bố cảm xúc nhật ký của người dùng hiện tại.
- **Quyền hạn**: Authenticated
- **Response 200**:
```json
{
  "success": true,
  "data": {
    "total_diaries": 28,
    "mood_counts": {
      "Hy vọng": 12,
      "Bình yên": 8,
      "Biết ơn": 5,
      "Trầm lắng": 2,
      "Mệt mỏi": 1
    }
  }
}
```

---

### 8.2.1 `GET /diaries/community?mood=&sort=latest&page=1&limit=12`
- Điều kiện: `is_public = TRUE AND is_approved = TRUE`.
- `sort`: `latest` (mặc định - sắp xếp `created_at DESC`) hoặc `most_sympathetic` (sắp xếp theo tổng số reaction giảm dần).
- Trả kèm thông tin tác giả: `{ "nickname", "avatar_url" }` và `reactions: { "HEART", "HUG", "total" }`.
- Nếu có token: trả thêm `my_reaction` (hoặc `null`).

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
        "mood": "calm",
        "snippet": "Đôi khi việc giữ chặt lấy một ký ức...",
        "media_urls": [],
        "author": { "nickname": "Mây Mùa Hạ", "avatar_url": "https://..." },
        "reactions": { "HEART": 32, "HUG": 58, "total": 90 },
        "my_reaction": "HUG",
        "created_at": "2026-10-23T20:00:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 12, "total_items": 84, "total_pages": 7 }
  }
}
```

### 8.2.2 `GET /diaries/community/{diary_id}`
- Chỉ xem được bài viết có `is_public = TRUE AND is_approved = TRUE`. Nếu tác giả chuyển về private hoặc chưa duyệt → 404.

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    "entry_date": "2026-10-23",
    "title": "Hôm nay mình đã học được cách buông bỏ",
    "mood": "calm",
    "content": "Toàn văn bài viết cộng đồng...",
    "media_urls": [],
    "author": { "nickname": "Mây Mùa Hạ", "avatar_url": "https://..." },
    "reactions": { "HEART": 32, "HUG": 58, "total": 90 },
    "my_reaction": "HUG",
    "created_at": "2026-10-23T20:00:00Z"
  }
}
```

### 8.2.3 `POST /diaries/community/{diary_id}/reactions`
**Request** `{ "reaction_type": "HUG" }` (`HEART | HUG | SYMPATHY`)
- Bảng `diary_interactions` có ràng buộc duy nhất `(diary_id, user_id)`. Mỗi user chỉ có tối đa 1 reaction trên 1 bài nhật ký.
- Cơ chế **Toggle**: Bấm lại reaction cũ → Xoá reaction (`current_reaction = null`). Bấm reaction mới → Thay thế reaction cũ.
- Tự động sinh notification loại `INTERACTION` cho tác giả bài viết nếu là thả mới (trừ khi tự react bài của mình).

**Response 200**
```json
{
  "success": true,
  "message": "Đã gửi sự đồng cảm đến tác giả",
  "data": {
    "diary_id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    "current_reaction": "HUG",
    "reactions": { "HEART": 32, "HUG": 59, "total": 91 }
  }
}
```

### 8.3.1 `GET /diaries/search?q=&scope=mine&mood=&from_date=&to_date=&page=1&limit=12`
- `scope`: `mine` (tìm trong bài của chính user - bắt buộc auth) hoặc `community` (tìm trong các bài `is_public=TRUE AND is_approved=TRUE`).
- Tìm kiếm từ khóa trong `title` và `content`, có highlight `<em>`.

**Response 200**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "entry_date": "2026-10-24",
        "title": "Một buổi chiều tĩnh lặng bên tách trà",
        "mood": "calm",
        "scope": "mine",
        "highlight": { "content": ["...mình ngồi ngắm <em>mưa</em> rơi ngoài hiên..."] },
        "created_at": "2026-10-24T17:30:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 12, "total_hits": 1 }
  }
}
```

---

## 4. Test bắt buộc
- [ ] Không token: Gọi `/diaries/me` → 401; gọi `/diaries/community` → 200 (`my_reaction = null`).
- [ ] Tạo bài với `is_public = false` → DB lưu `is_approved = true`.
- [ ] Tạo bài với `is_public = true` → DB lưu `is_approved = false`, không xuất hiện ở community cho đến khi Admin duyệt.
- [ ] Sửa bài từ private sang public → `is_approved` tự động bị reset về `false`.
- [ ] User A không thể xem detail hoặc sửa/xoá bài private của User B qua `/diaries/me/...` (phải trả 404 hoặc 403).
- [ ] Upload media: > 5 file hoặc file > 5MB → 400.
- [ ] Reaction cộng đồng: Toggle chuẩn, không bao giờ sinh duplicate reaction trong DB.

---

## 5. Postman Collection để Test API
- **File đích**: [`backend/postman_json/08_diaries.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/08_diaries.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{accessToken}}`: Bearer Token người dùng đang đăng nhập
  - `{{diaryIdMe}}`: Tự động lưu ID bài nhật ký cá nhân vừa tạo
  - `{{diaryIdCommunity}}`: Lưu ID bài nhật ký công khai để xem và thả reaction
- **Danh sách requests cần có trong Collection**:
  1. `[8.1] Danh sách nhật ký cá nhân (GET /api/v1/diaries/me)` - Header `Bearer {{accessToken}}`, query `view_mode=timeline|calendar`.
  2. `[8.2] Chi tiết nhật ký cá nhân (GET /api/v1/diaries/me/{{diaryIdMe}})` - Kiểm tra status 200, nội dung đầy đủ.
  3. `[8.3] Viết nhật ký riêng tư (POST /api/v1/diaries)` - Body `is_public=false`, kiểm tra status 201, `is_approved=true`. Test script lưu `{{diaryIdMe}}`.
  4. `[8.3] Viết nhật ký công khai gửi duyệt (POST /api/v1/diaries)` - Body `is_public=true`, kiểm tra status 201, `is_approved=false`.
  5. `[8.4] Chỉnh sửa nhật ký cá nhân (PUT /api/v1/diaries/me/{{diaryIdMe}})` - Cập nhật `title`, `content`.
  6. `[8.5] Xóa nhật ký cá nhân (DELETE /api/v1/diaries/me/{{diaryIdMe}})` - Kiểm tra status 200.
  7. `[8.6] Upload ảnh đính kèm nhật ký (POST /api/v1/diaries/upload-media)` - Form-data danh sách ảnh, nhận về mảng `urls`.
  8. `[8.2.1] Danh sách nhật ký cộng đồng (GET /api/v1/diaries/community)` - Public, query `sort=latest|most_sympathetic`. Test script lưu `{{diaryIdCommunity}}`.
  9. `[8.2.2] Xem chi tiết nhật ký cộng đồng (GET /api/v1/diaries/community/{{diaryIdCommunity}})` - Public.
  10. `[8.2.3] Thả reaction đồng cảm (POST /api/v1/diaries/community/{{diaryIdCommunity}}/reactions)` - Header `Bearer {{accessToken}}`, body `{ "reaction_type": "HUG" }`.
  11. `[8.3.1] Tìm kiếm nhật ký cá nhân (GET /api/v1/diaries/search?q=mưa&scope=mine)` - Header `Bearer {{accessToken}}`.
  12. `[8.3.1] Tìm kiếm nhật ký cộng đồng (GET /api/v1/diaries/search?q=bình yên&scope=community)` - Public.

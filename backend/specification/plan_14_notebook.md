# PLAN 14 — Nhóm API 14: Sổ tay Ký ức Hợp nhất (`/api/v1/notebook`)

> Đọc `plan_00_foundation.md`, `plan_03_capsules.md`, `plan_06_room2_hope.md` trước.
> Nguồn: `frontend/specification/00_REQUIRED_ADDITIONAL_APIS.md` và `frontend/specification/07b_notebook_page.md`.
> Bảng liên quan: `user_capsule_draws`, `message_capsules`, `user_saved_artworks`, `artworks`, `users`.

---

## 1. Phạm vi

| # | Method | Path | Quyền | Status OK |
|---|---|---|---|---|
| 14.1 | GET | `/api/v1/notebook` | Authenticated | 200 |

Router: `APIRouter(prefix="/notebook", tags=["Unified Notebook"])`.

---

## 2. File triển khai
- `app/models/user_saved_artwork.py`: Model bảng lưu trữ thư lồng đèn Phòng 2 (`user_saved_artworks`).
- `app/schemas/notebook.py`: Chứa `NotebookItem`, `NotebookCounts`, `NotebookPagination`, `NotebookListData`, `NotebookListResponse`.
- `app/services/notebook_service.py`: Gom thông điệp hòm thư và thư lồng đèn phòng 2, hỗ trợ lọc nguồn (`source`), tìm kiếm (`search`), phân trang (`page`, `limit`).
- `app/api/v1/endpoints/notebook.py`: Endpoint chính.
- `backend/tests/test_notebook.py`: Bộ kiểm thử toàn diện.
- `backend/postman_json/14_notebook.postman_collection.json`: Bộ Postman collection.

---

## 3. Chi tiết endpoint

### 14.1 `GET /notebook?source=all|mailbox|lantern&search=&page=1&limit=20`

* **Quyền hạn**: Authenticated (`get_current_user`).
* **Query Parameters**:
  - `source`: `all | mailbox | lantern` (mặc định: `all`).
  - `search`: Chuỗi tìm kiếm trong tiêu đề, nội dung, tác giả hoặc thể loại (tùy chọn).
  - `page`: Số trang (bắt đầu từ 1, mặc định: 1).
  - `limit`: Số lượng mục trên mỗi trang (1..50, mặc định: 20).

* **Logic xử lý**:
  1. Lấy tất cả thông điệp đã lưu từ hòm thư (`user_capsule_draws` có `user_id = :uid AND is_saved = TRUE`), join với `message_capsules`.
  2. Lấy tất cả thư lồng đèn phòng 2 đã lưu (`user_saved_artworks` có `user_id = :uid`), join với `artworks` (`room_id = 2`) và `users` (tác giả).
  3. Chuẩn hóa dữ liệu sang cấu trúc `NotebookItem`:
     - **Mailbox**:
       - `id`: `nb_mb_{draw_id}`
       - `source`: `"mailbox"`
       - `source_label`: `"Hòm thư · " + category_label` (VD: `"Hòm thư · Can đảm"`)
       - `source_id`: `draw_id`
       - `category`: Tên thể loại (VD: `"Can đảm"`, `"Chữa lành"`, `"Góc nhìn"`)
       - `badge_class`: `"b-ok"`
       - `icon`: `"sparkle"`
       - `title`: `null`
       - `content`: Nội dung thông điệp
       - `author`: `"một người lạ ở Phòng 3, đã được kiểm duyệt"`
       - `symbol`: `null`
       - `saved_at`: ISO-8601 UTC string (`Z`)
     - **Lantern**:
       - `id`: `nb_lt_{saved_art_id}`
       - `source`: `"lantern"`
       - `source_label`: `"Lồng đèn hạ xuống · Phòng 2"`
       - `source_id`: `artwork_id`
       - `category`: `artwork.tag_category` (VD: `"Hy vọng"`)
       - `badge_class`: `"b-wait"`
       - `icon`: `"r2"`
       - `title`: Tiêu đề thư lồng đèn
       - `content`: Nội dung thư
       - `author`: Tên tác giả hiển thị hoặc nickname
       - `symbol`: Biểu tượng cảm xúc / màu sắc (VD: `"heart"`)
       - `saved_at`: ISO-8601 UTC string (`Z`)
  4. Lọc theo từ khóa `search` nếu có (so khớp không phân biệt hoa thường trong `title`, `content`, `short_content`, `author`, `category`).
  5. Đếm số lượng theo nguồn trên tập kết quả tìm kiếm:
     - `counts.all`: Tổng số mục
     - `counts.mailbox`: Số mục từ hòm thư
     - `counts.lantern`: Số mục từ lồng đèn
  6. Áp dụng bộ lọc `source` (`all`, `mailbox`, `lantern`).
  7. Sắp xếp theo ngày lưu giảm dần (`saved_at DESC`).
  8. Phân trang theo `page` và `limit`.

* **Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "nb_mb_01",
        "source": "mailbox",
        "source_label": "Hòm thư · Can đảm",
        "source_id": "drw_12345",
        "category": "Can đảm",
        "badge_class": "b-ok",
        "icon": "sparkle",
        "title": null,
        "content": "Can đảm không phải là không sợ. Can đảm là vẫn nộp đơn lần nữa, dù tay còn run.",
        "author": "một người lạ ở Phòng 3, đã được kiểm duyệt",
        "symbol": null,
        "saved_at": "2026-10-26T02:00:00Z"
      },
      {
        "id": "nb_lt_02",
        "source": "lantern",
        "source_label": "Lồng đèn hạ xuống · Phòng 2",
        "source_id": "art_67890",
        "category": "Hy vọng",
        "badge_class": "b-wait",
        "icon": "r2",
        "title": "Gửi mình của năm 2026,",
        "content": "Lúc viết thư này mình đang ngồi ở thư viện, vừa trượt kỳ thi IELTS lần hai...",
        "author": "Linh, 24.10.2023",
        "symbol": "heart",
        "saved_at": "2026-10-25T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_items": 12,
      "total_pages": 1,
      "counts": {
        "all": 12,
        "mailbox": 8,
        "lantern": 4
      }
    }
  }
}
```

---

## 4. Test bắt buộc
- [x] Không có token → 401 Unauthorized.
- [x] GET `/notebook` trả đủ 2 nguồn (`mailbox` và `lantern`) kèm đầy đủ object `counts`.
- [x] Lọc `?source=mailbox` chỉ trả về mục hòm thư.
- [x] Lọc `?source=lantern` chỉ trả về mục thư lồng đèn.
- [x] Tìm kiếm `?search=` tìm kiếm chính xác trên tiêu đề, nội dung, tác giả.
- [x] Phân trang `page`, `limit` hoạt động chuẩn xác.

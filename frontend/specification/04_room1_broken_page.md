# THỰC THI 04 — PHÒNG 1: TRIỂN LÃM ĐỔ VỠ
## Tệp hướng dẫn tích hợp: `Room1Page` (C1, C6), `ArtworkDetailModal` (C2), `SubmitArtworkModal` (C3–C5)

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**:
  - `C1 Triển lãm Đổ vỡ`: `src/pages/Room1_Broken/Room1Page.jsx`
  - `C2 Xem chi tiết tác phẩm`: `src/pages/Room1_Broken/ArtworkDetailModal.jsx`
  - `C3 Trưng bày tác phẩm`: `src/pages/Room1_Broken/SubmitArtworkModal.jsx`
  - `C4 Xác nhận`: `src/pages/Room1_Broken/ConfirmSubmitModal.jsx`
  - `C5 Đang được chuẩn bị`: `src/pages/Room1_Broken/ArtworkPreparedModal.jsx`
  - `C6 Tác phẩm của tôi`: Tab "Tác phẩm của tôi" trong `Room1Page.jsx`
- **Tệp dịch vụ (Service)**: `src/services/room1Service.js`
- **Tài liệu đặc tả backend tham chiếu**: `backend/specification/plan_05_room1_broken.md`.

---

## 2. Chi tiết luồng tích hợp API

### 2.1 Tải danh sách tác phẩm trên tường (`Room1Page.jsx` - C1)
- **Hành động kích hoạt**: Khi vào Phòng 1 (`useEffect`) hoặc khi chuyển đổi bộ lọc chip:
  - *Tất cả tác phẩm*: `filter = all`
  - *Nhiều đồng cảm nhất*: `sort_by = reactions`
  - *Tác phẩm của tôi*: `filter = mine`
- **Endpoint**: `GET /api/v1/rooms/1/artworks`
- **Query params**:
  - `sort_by=latest | reactions | views` (mặc định `latest`)
  - `mine=true | false` (nếu xem tác phẩm cá nhân)
  - `limit=20&offset=0`
- **Headers**: Public (nhưng nếu có token đăng nhập thì đính kèm `Authorization: Bearer <token>` để nhận biết bài của tôi và cảm xúc tôi đã thả).
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": 1,
          "title": "Email học bổng",
          "summary": "Ba năm nộp học bổng, ba lần mở email bằng đôi tay run.",
          "author_display_name": "Linh",
          "is_anonymous": false,
          "image_url": "https://storage.../artworks/window.jpg",
          "view_count": 1200,
          "reaction_counts": {
            "HEART": 61,
            "HUG": 118,
            "SYMPATHY": 35
          },
          "total_reactions": 214,
          "user_reaction": "HUG",
          "status": "APPROVED",
          "created_at": "2026-10-21T08:00:00Z"
        }
      ],
      "total": 1284
    }
  }
  ```
- **Hành động Frontend**:
  - Render thẻ `ArtworkCard` theo lưới `gallery` 4 cột dưới đèn rọi.
  - Hiển thị bút danh, lượt xem (ví dụ: `1,2k`), số cảm xúc và avatar biểu tượng cảm xúc dạng stack.

---

### 2.2 Xem chi tiết một tác phẩm (`ArtworkDetailModal.jsx` - C2)
- **Hành động kích hoạt**: Người dùng bấm vào một thẻ tác phẩm trên tường.
- **Endpoint**: `GET /api/v1/rooms/1/artworks/{artwork_id}`
- **Headers**: Public (tùy chọn token).
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "title": "Email học bổng",
      "summary": "Ba năm nộp học bổng...",
      "content": "Ba năm liền mình nộp học bổng. Lần nào cũng mở email với đôi tay run run...",
      "author_display_name": "Linh",
      "is_anonymous": false,
      "image_url": "https://storage.../artworks/window.jpg",
      "quote": "“Một lời từ chối mô tả một quyết định, không mô tả một con người.”",
      "view_count": 1201,
      "reaction_counts": { "HEART": 61, "HUG": 118, "SYMPATHY": 35 },
      "total_reactions": 214,
      "user_reaction": "HUG",
      "created_at": "2026-10-21T08:00:00Z"
    }
  }
  ```
- **Hành động Frontend**:
  - Mở modal chia 2 cột: Cột trái hiện tranh đóng khung lớn trong khung bảo tàng, cột phải hiển thị toàn văn câu chuyện, câu quote in nghiêng nổi bật và thanh thả cảm xúc.

---

### 2.3 Thả cảm xúc cho tác phẩm (Thương, Ôm an ủi, Đồng cảm)
- **Hành động kích hoạt**: Rê chuột vào thẻ (hiện picker) hoặc bấm vào nút cảm xúc trong modal chi tiết.
- **Endpoint**: `POST /api/v1/rooms/1/artworks/{artwork_id}/reactions`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "reaction_type": "HUG"
  }
  ```
  *(Các loại hợp lệ: `HEART` (Thương), `HUG` (Ôm an ủi), `SYMPATHY` (Đồng cảm)).*
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "message": "Cập nhật cảm xúc thành công",
    "data": {
      "artwork_id": 1,
      "current_reaction": "HUG",
      "reaction_counts": { "HEART": 61, "HUG": 119, "SYMPATHY": 35 },
      "total_reactions": 215
    }
  }
  ```
- **Cơ chế Toggle**: Nếu bấm lại đúng cảm xúc đang có -> Backend tự huỷ cảm xúc (`current_reaction: null`), số đếm giảm 1.

---

### 2.4 Tìm kiếm tác phẩm trong Phòng 1
- **Hành động kích hoạt**: Nhập từ khóa vào ô tìm kiếm ở `TopNav`.
- **Endpoint**: `GET /api/v1/rooms/1/search?q={keyword}&limit=20&offset=0`
- **Debounce**: Chờ 300ms sau khi người dùng ngừng gõ mới phát request.

---

### 2.5 Trưng bày tác phẩm mới (C3 -> C4 -> C5)
- **Màn hình C3**: Nhập Tiêu đề, Bút danh, Switch Ẩn danh, Tóm tắt (tối đa 120 ký tự), Câu chuyện đầy đủ.
- **Màn hình C4**: Bấm "Trưng bày" -> Mở modal xác nhận "Bạn có chắc chắn muốn tạo tác phẩm?".
- **Hành động bấm "Chắc chắn"**:
  - **Endpoint**: `POST /api/v1/rooms/1/artworks`
  - **Headers**: `Authorization: Bearer <token>`
  - **Request Body**:
    ```json
    {
      "title": "Mùa thi đại học năm ấy",
      "author_display_name": "Gió",
      "is_anonymous": false,
      "summary": "Mình đứng trước cổng trường thi cho tới khi người ta khoá cổng.",
      "content": "Sáng hôm đó mình dậy sớm hơn mọi ngày..."
    }
    ```
  - **Response 201 Created**:
    ```json
    {
      "success": true,
      "message": "Tác phẩm đã gửi, đang chờ chuẩn bị",
      "data": {
        "id": 9,
        "status": "PENDING"
      }
    }
    ```
  - **Màn hình C5**: Đóng form, mở modal *"Tác phẩm của bạn đang được chuẩn bị"*. Bài viết được đưa vào trạng thái `PENDING` để Admin vẽ tranh và kiểm duyệt.

---

### 2.6 Xem tác phẩm của tôi (C6)
- Khi lọc `mine=true`:
  - Bài `PENDING`: Hiện thẻ viền nét đứt vàng, icon đồng hồ: *"Tranh minh họa đang được vẽ · Đang được chuẩn bị"*.
  - Bài `REJECTED`: Hiện nhãn đỏ *"Chưa được trưng bày"* kèm lý do từ Admin và nút **"Sửa và gửi lại →"**.
  - Bài `APPROVED`: Trưng bày bình thường trên tường.

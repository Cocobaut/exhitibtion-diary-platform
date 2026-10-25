# THỰC THI 08 — TRANG QUẢN TRỊ: KIỂM DUYỆT 3 PHÒNG TRIỂN LÃM
## Tệp hướng dẫn tích hợp: `AdminPage`, `AdminPending` (H1), `AdminRejectModal` (H2), `AdminLive` (H3)

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**:
  - `Bảng Quản trị chung`: `src/pages/Admin/AdminPage.jsx`
  - `H1 Chờ phê duyệt`: `src/pages/Admin/AdminPending.jsx`
  - `H2 Từ chối kèm lý do`: `src/pages/Admin/AdminRejectModal.jsx`
  - `H3 Đang trưng bày & Thống kê`: `src/pages/Admin/AdminLive.jsx`
- **Tệp dịch vụ (Service)**: `src/services/adminRoomService.js`
- **Tài liệu đặc tả backend tham chiếu**: `backend/specification/plan_09_admin_rooms.md`.
- **Yêu cầu phân quyền**: Toàn bộ các API yêu cầu vai trò **`ADMIN`** hoặc **`OWNER`** (`Authorization: Bearer <token>`).

---

## 2. Chi tiết luồng tích hợp API

### 2.1 Tab Chờ phê duyệt (`AdminPending.jsx` - H1)
- **Hành động kích hoạt**: Khi Admin chọn tab phòng (Phòng 1, Phòng 2, hoặc Phòng 3) và chọn trạng thái **"Chờ phê duyệt"**.
- **Endpoint**: `GET /api/v1/admin/rooms/{room_id}/artworks/pending`
  *(Trong đó `room_id`: `1` - Đổ vỡ, `2` - Lồng đèn, `3` - Cây thông điệp).*
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": 9,
          "title": "Mùa thi đại học năm ấy",
          "summary": "Mình đứng trước cổng trường thi cho tới khi người ta khoá cổng.",
          "content": "Sáng hôm đó mình dậy sớm hơn mọi ngày... Cô Hằng lớp 12A3 trường Lê Quý Đôn...",
          "author_display_name": "Gió",
          "username": "@gio.nguyen",
          "user_id": "usr_789",
          "is_anonymous": false,
          "image_url": null,
          "status": "PENDING",
          "created_at": "2026-10-25T14:02:00Z",
          "locked_by": "An"
        }
      ],
      "total_pending": 12
    }
  }
  ```
- **Hành động Frontend**:
  - Render danh sách bài chờ bên cột trái (`400px`).
  - Khi click vào một bài: Hiển thị nội dung chi tiết bên cột phải để biên tập:
    - Admin có quyền chỉnh sửa câu chữ, gạch bỏ các chi tiết nhận dạng (tên trường, tên người thật...).
    - Khóa bài biên tập: Hiển thị badge *"An đang biên tập · bài được khoá cho An"* để các Admin khác không duyệt trùng lặp.

---

### 2.2 Đính kèm / Tải tranh minh họa cho tác phẩm Phòng 1
- **Hành động kích hoạt**: Bấm nút **"Tải ảnh khác"** hoặc **"Tạo bằng Gemini"**.
- **Endpoint**: `POST /api/v1/admin/rooms/{room_id}/artworks/upload-artwork-image`
- **Headers**: `Content-Type: multipart/form-data`, `Authorization: Bearer <token>`
- **Request Body**: `FormData` chứa `file: <binary>`.
- **Response 200 OK**: Trả về `image_url`.
- **Hành động Frontend**:
  - Gán ảnh vào khung tranh minh họa bên phải và cập nhật khung *"Xem trước trên tường"*.
  - Lưu ý: Tại Phòng 1, tranh minh họa là **bắt buộc** trước khi phê duyệt.

---

### 2.3 Phê duyệt & Trưng bày tác phẩm
- **Hành động kích hoạt**: Bấm nút màu đỏ/vàng **"Phê duyệt & trưng bày"**.
- **Endpoint**: `POST /api/v1/admin/rooms/{room_id}/artworks/{artwork_id}/approve`
- **Request Body**:
  ```json
  {
    "title": "Mùa thi đại học năm ấy",
    "summary": "Mình đứng trước cổng trường thi cho tới khi người ta khoá cổng.",
    "content": "Sáng hôm đó mình dậy sớm hơn mọi ngày... Cô giáo chủ nhiệm đã gọi cho mình...",
    "image_url": "https://storage.../artworks/door.jpg",
    "quote": "“Thất bại là một khúc quanh, không phải điểm dừng chân.”",
    "author_display_name": "Gió",
    "is_anonymous": false
  }
  ```
- **Response 200 OK**:
  - Toast thông báo: *"Tác phẩm đã được phê duyệt và đưa lên triển lãm"*.
  - Hệ thống backend tự động tạo thông báo gửi tới chuông của tác giả bài viết.
  - Xóa bài khỏi hàng đợi chờ duyệt và giảm số lượng badge trên tab Phòng 1 (`12 -> 11`).

---

### 2.4 Từ chối kèm lý do (`AdminRejectModal.jsx` - H2)
- **Hành động kích hoạt**: Bấm nút **"Từ chối"** -> Mở modal `H2`.
- **Endpoint**: `POST /api/v1/admin/rooms/{room_id}/artworks/{artwork_id}/reject`
- **Request Body**:
  ```json
  {
    "rejection_reason_tag": "Chứa thông tin nhận dạng",
    "admin_note": "Câu chuyện của bạn rất chân thật. Bạn có thể bỏ tên trường và tên cô giáo rồi gửi lại giúp nhóm nhé"
  }
  ```
- **Response 200 OK**:
  - Trạng thái bài chuyển sang `REJECTED` (không bị xoá).
  - Tác giả nhận được thông báo kèm nút *"Sửa và gửi lại"*.
  - Đóng modal và chuyển sang bài chờ duyệt tiếp theo.

---

### 2.5 Tab Đang trưng bày & Quản lý lưu trữ (`AdminLive.jsx` - H3)
- **Hành động kích hoạt**: Chọn tab **"Đang trưng bày"**.
- **Endpoint**: `GET /api/v1/admin/rooms/{room_id}/artworks/approved?limit=20&offset=0`
- **Response 200 OK**:
  - Trả về thống kê phòng: Tổng tác phẩm, lượt xem, lượt thả cảm xúc, thời gian duyệt trung bình.
  - Danh sách bảng quản lý các tác phẩm đang treo trên tường.
- **Thao tác Sửa**: Gọi `PUT /api/v1/admin/rooms/{room_id}/artworks/{artwork_id}` để cập nhật tiêu đề, ảnh, câu chữ nếu có phản ánh từ cộng đồng.
- **Thao tác Lưu trữ (Archive)**: Gọi `PATCH /api/v1/admin/rooms/{room_id}/artworks/{artwork_id}/archive` khi có khiếu nại hoặc hết thời gian triển lãm (bài chuyển về `ARCHIVED`, biến mất khỏi tường nhưng không mất dữ liệu).

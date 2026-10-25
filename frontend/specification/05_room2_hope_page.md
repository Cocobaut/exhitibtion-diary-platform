# THỰC THI 05 — PHÒNG 2: BẦU TRỜI LỒNG ĐÈN HY VỌNG
## Tệp hướng dẫn tích hợp: `Room2Page` (D1), `ReleaseLanternModal` (D2), `LanternLandedModal` (D3)

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**:
  - `D1 Bầu trời lồng đèn`: `src/pages/Room2_Hope/Room2Page.jsx` & `src/pages/Room2_Hope/LanternSky.jsx`
  - `D2 Thả lồng đèn · hẹn ngày giờ`: `src/pages/Room2_Hope/ReleaseLanternModal.jsx`
  - `D3 Lồng đèn hạ xuống đúng giờ`: `src/pages/Room2_Hope/LanternLandedModal.jsx`
- **Tệp dịch vụ (Service)**: `src/services/room2Service.js`
- **Tài liệu đặc tả backend tham chiếu**: `backend/specification/plan_06_room2_hope.md`.

---

## 2. Chi tiết luồng tích hợp API

### 2.1 Tải danh sách lồng đèn đang bay trên bầu trời (`Room2Page.jsx` - D1)
- **Hành động kích hoạt**: Khi vào Phòng 2 hoặc bấm các chip lọc ("Tất cả", "Của tôi", "Lồng đèn đã mở", "Đang chờ ngày hạ xuống").
- **Endpoint**: `GET /api/v1/rooms/2/artworks`
- **Query params**:
  - `status_filter=all | opened | waiting`
  - `mine=true | false`
  - `limit=50&offset=0`
- **Headers**: Public (có token nếu lọc `mine=true` hoặc xem đèn riêng tư của mình).
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": 15,
          "title": "Gửi mình của năm 2030",
          "author_display_name": "Linh của năm 2026",
          "symbol": "heart",
          "visibility": "PRIVATE",
          "target_date": "2030-10-24T09:00:00Z",
          "is_opened": false,
          "is_ready_to_fall": false,
          "remaining_seconds": 126144000,
          "is_mine": true
        }
      ],
      "total_flying": 3402,
      "total_landed_this_year": 128
    }
  }
  ```
- **Hành động Frontend**:
  - Render các lồng đèn lơ lửng trên nền trời đêm SVG với các biểu tượng tương ứng (`heart`, `star`, `flower`, `spiral`, `wave`).
  - Lồng đèn riêng tư của bản thân bay cao nhất ở góc phải kèm thẻ widget đếm ngược ngày, giờ, phút, giây đến `target_date`.

---

### 2.2 Kiểm tra lồng đèn đã tới hẹn hạ xuống
- **Hành động kích hoạt**: Khi trang load hoặc khi đồng hồ đếm ngược chạm mốc `00:00:00`.
- **Endpoint**: `GET /api/v1/rooms/2/artworks/ready-to-fall`
- **Headers**: `Authorization: Bearer <token>`
- **Response 200 OK**:
  - Trả về danh sách lồng đèn có `target_date <= NOW()` và `is_opened = false`.
  - Nếu có lồng đèn tới hẹn: Kích hoạt animation lồng đèn từ từ rơi xuống giữa màn hình và sáng rực rỡ, kèm thông báo mời mở thư.

---

### 2.3 Kéo lồng đèn hạ xuống, Mở thư & Lưu vào Sổ tay (`LanternLandedModal.jsx` - D3)
- **Hành động kích hoạt**:
  - Người dùng bấm chuột hoặc **giữ chuột kéo lồng đèn xuống dưới** (tối thiểu 25px) trên bầu trời.
  - Hoặc bấm vào widget lồng đèn cá nhân đã đến hẹn, hoặc bấm thông báo *"Lồng đèn bạn thả ngày 24.10.2023 đã hạ xuống"*.
- **Endpoint mở thư**: `POST /api/v1/rooms/2/artworks/{artwork_id}/open`
- **Headers**: `Authorization: Bearer <token>` (bắt buộc với lồng đèn `PRIVATE`, tùy chọn với `PUBLIC`).
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "message": "Lồng đèn đã được mở",
    "data": {
      "id": 15,
      "title": "Gửi mình của năm 2026",
      "content": "Lúc viết thư này mình đang ngồi ở thư viện, vừa trượt kỳ thi IELTS lần hai...",
      "author_display_name": "Linh",
      "target_date": "2026-10-25T09:00:00Z",
      "created_at": "2023-10-24T14:00:00Z",
      "is_opened": true
    }
  }
  ```
- **Hành động Frontend & Lưu trữ Sổ tay**:
  - Mở modal thư nền giấy kem `D3` kèm lồng đèn tỏa sáng ở góc trái.
  - Hiển thị ngày viết thư trong quá khứ và toàn văn tâm sự.
  - Cung cấp 2 nút hành động:
    - **"Lưu vào sổ tay"**:
      - Gọi API lưu vào Sổ tay: `POST /api/v1/rooms/2/artworks/{artwork_id}/save` (hoặc lưu vào client storage `museum_notebook`).
      - Nút chuyển sang trạng thái *"Đã lưu vào sổ tay"*.
      - Thư sẽ xuất hiện trong không gian **Sổ tay Ký ức** (kèm nhãn `Lồng đèn hạ xuống · Phòng 2`).
      - **Lưu ý nghiệp vụ**: Bức thư được lưu vào **Sổ tay Ký ức**, **không lưu vào Nhật ký**.
    - **"Viết thư trả lời tương lai"**: Mở modal form thả lồng đèn mới `D2`.

---

### 2.4 Thả lồng đèn tương lai (`ReleaseLanternModal.jsx` - D2)
- **Hành động kích hoạt**: Bấm nút **"✦ Thả lồng đèn"**.
- **Endpoint**: `POST /api/v1/rooms/2/artworks`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "title": "Gửi mình của năm 2030",
    "content": "Hôm nay mình vừa trượt vòng phỏng vấn thứ ba. Mình viết lá thư này để cậu nhớ rằng đã có lúc mọi thứ thật khó, và mình vẫn đi tiếp...",
    "author_display_name": "Linh của năm 2026",
    "symbol": "heart",
    "visibility": "PRIVATE",
    "target_date": "2030-10-24T09:00:00Z"
  }
  ```
- **Quy tắc Nghiệp vụ**:
  - Nếu `visibility === 'PRIVATE'`: Đèn bay lên trời ngay lập tức, không cần duyệt.
  - Nếu `visibility === 'PUBLIC'`: Chuyển sang hàng chờ Admin phê duyệt trước khi xuất hiện trên bầu trời chung.
  - `target_date`: Phải là thời điểm trong tương lai (tối thiểu sau thời điểm hiện tại 1 giờ).
- **Response 201 Created**:
  - Đóng form, kích hoạt animation lồng đèn bay vút lên bầu trời đêm.
  - Cập nhật lại danh sách lồng đèn.

---

### 2.5 Tìm kiếm & Xóa lồng đèn
- **Tìm kiếm**: `GET /api/v1/rooms/2/search?q={keyword}`.
- **Xóa lồng đèn riêng tư**: `DELETE /api/v1/rooms/2/artworks/{artwork_id}` (Người tạo có quyền thu hồi lồng đèn riêng của mình).

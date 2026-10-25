# THỰC THI 06 — PHÒNG 3: CÂY THÔNG ĐIỆP ĐỘNG VIÊN CỘNG ĐỒNG
## Tệp hướng dẫn tích hợp: `Room3Page` (E1), `ReadLeafModal` (E2), `HangLeafModal` (E3)

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**:
  - `E1 Cây thông điệp`: `src/pages/Room3_Tree/Room3Page.jsx` & `src/pages/Room3_Tree/WishTree.jsx`
  - `E2 Đọc một chiếc lá`: `src/pages/Room3_Tree/ReadLeafModal.jsx`
  - `E3 Treo thông điệp`: `src/pages/Room3_Tree/HangLeafModal.jsx`
- **Tệp dịch vụ (Service)**: `src/services/room3Service.js`
- **Tài liệu đặc tả backend tham chiếu**: `backend/specification/plan_07_room3_community.md`.

---

## 2. Bảng quy chuẩn Màu sắc & Thể loại Lá

| Mã thể loại (`tag_category`) | Tên danh mục (`label`) | Mã màu (`color_code`) | Ý nghĩa thông điệp |
|---|---|---|---|
| `KL` | **Khích lệ** | `#E2BC55` (Vàng) | Lời khích lệ, động viên kiên trì, không bỏ cuộc |
| `CL` | **Chữa lành** | `#94C590` (Xanh lá) | Lời chữa lành, vỗ về, bình an tâm hồn |
| `BO` | **Biết ơn** | `#E9A2AE` (Hồng) | Lời cảm ơn, trân trọng cuộc sống và những người xung quanh |
| `GN` | **Góc nhìn** | `#8FBCD9` (Xanh dương) | Lời chia sẻ góc nhìn cuộc sống tích cực, mở rộng nhân sinh quan |

---

## 3. Chi tiết luồng tích hợp API

### 3.1 Tải danh mục lá & Toàn bộ lá trên cây (`Room3Page.jsx` - E1)
- **Hành động kích hoạt**: Khi vào Phòng 3 hoặc bấm chọn lọc danh mục (Tất cả, Khích lệ, Chữa lành, Biết ơn, Góc nhìn, Của tôi).

#### Gọi 1: Tải danh mục lá (Color Legend)
- **Endpoint**: `GET /api/v1/rooms/3/leaf-categories`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": [
      { "tag_category": "KL", "label": "Khích lệ", "color_code": "#E2BC55" },
      { "tag_category": "CL", "label": "Chữa lành", "color_code": "#94C590" },
      { "tag_category": "BO", "label": "Biết ơn", "color_code": "#E9A2AE" },
      { "tag_category": "GN", "label": "Góc nhìn", "color_code": "#8FBCD9" }
    ]
  }
  ```

#### Gọi 2: Tải danh sách lá trên cây
- **Endpoint**: `GET /api/v1/rooms/3/artworks`
- **Query params**:
  - `category=KL | CL | BO | GN` (nếu lọc theo loại lá)
  - `mine=true | false` (nếu lọc lá của tôi)
  - `limit=100&offset=0`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": 45,
          "title": "Gửi bạn đang mệt mỏi",
          "summary": "Hôm nay nghỉ ngơi cũng là một cách cố gắng...",
          "author_display_name": "Mây",
          "tag_category": "CL",
          "color_code": "#94C590",
          "energy_count": 86,
          "heart_count": 214,
          "created_at": "2026-10-18T08:00:00Z"
        }
      ],
      "total_leaves": 862
    }
  }
  ```
- **Hành động Frontend**:
  - Render các chiếc lá đung đưa trên cành cây đại thụ SVG.
  - Khi hover vào một chiếc lá -> Chiếc lá phát sáng viền trắng và hiện popup xem nhanh: Tên thông điệp, Tác giả, và nhãn thể loại.

---

### 3.2 Đọc trọn vẹn thông điệp trên chiếc lá (`ReadLeafModal.jsx` - E2)
- **Hành động kích hoạt**: Nhấp chuột vào một chiếc lá trên cây hoặc popup xem nhanh.
- **Endpoint**: `GET /api/v1/rooms/3/artworks/{artwork_id}`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "id": 45,
      "title": "Gửi bạn đang mệt mỏi",
      "content": "Hôm nay nghỉ ngơi cũng là một cách cố gắng. Cái cây cũng đâu ra lá quanh năm.",
      "author_display_name": "Mây",
      "tag_category": "CL",
      "color_code": "#94C590",
      "energy_count": 86,
      "heart_count": 214,
      "user_has_energized": false,
      "user_has_hearted": false,
      "created_at": "2026-10-18T08:00:00Z"
    }
  }
  ```
- **Hành động Frontend**:
  - Mở modal `E2` với hình chiếc lá lớn mang đúng màu của thể loại.
  - Nội dung lời nhắn hiển thị bằng font chữ viết tay ấm áp (`var(--hand)`).

---

### 3.3 Tương tác: "Nhận năng lượng" & "Thả tim"
- **Hành động kích hoạt**: Bấm nút **"Nhận năng lượng"** hoặc **"Thả tim"** trong modal đọc lá.
- **Endpoint**: `POST /api/v1/rooms/3/artworks/{artwork_id}/energy`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "action_type": "ENERGY"
  }
  ```
  *(Giá trị hợp lệ: `ENERGY` hoặc `HEART`).*
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "message": "Đã nhận năng lượng từ chiếc lá",
    "data": {
      "artwork_id": 45,
      "energy_count": 87,
      "heart_count": 214,
      "user_has_energized": true
    }
  }
  ```
- **Hành động Frontend**:
  - Nút sáng lên viền vàng cam rực rỡ, số đếm tăng lên 1 kèm hiệu ứng hạt ánh sáng.

---

### 3.4 Treo thông điệp mới lên cây (`HangLeafModal.jsx` - E3)
- **Hành động kích hoạt**: Bấm nút **"✦ Treo thông điệp"**.
- **Endpoint**: `POST /api/v1/rooms/3/artworks`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "title": "Cho bạn đang ôn thi",
    "content": "Bạn không cần phải nhanh, chỉ cần đừng dừng lại",
    "author_display_name": "Mây",
    "tag_category": "KL"
  }
  ```
- **Xử lý Nghiệp vụ**:
  - Bắt buộc kiểm tra độ dài nội dung (1–280 ký tự).
  - Tự động map `tag_category` sang mã màu tương ứng cho chiếc lá preview bên phải.
  - Thông điệp gửi lên sẽ ở trạng thái `PENDING` để ban quản trị duyệt trước khi chính thức xuất hiện trên cây.
- **Response 201 Created**:
  - Hiển thị Toast: *"Thông điệp đã gửi duyệt. Bạn sẽ nhận thông báo khi lá được treo lên cây!"*.
  - Đóng form `E3`.

---

### 3.5 Tìm kiếm lời động viên
- **Endpoint**: `GET /api/v1/rooms/3/search?q={keyword}&limit=20&offset=0`.

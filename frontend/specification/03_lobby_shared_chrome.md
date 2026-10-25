# THỰC THI 03 — SẢNH CHÍNH & THANH CÔNG CỤ DÙNG CHUNG
## Tệp hướng dẫn tích hợp: `LobbyPage` (B1), `MailboxModal` (B2), `NotificationDropdown` (B3)

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**:
  - `B1 Sảnh chính`: `src/pages/Lobby/LobbyPage.jsx` & `src/pages/Lobby/LobbyScene.jsx`
  - `B2 Hòm thư · rút thông điệp`: `src/components/overlays/MailboxModal.jsx`
  - `B3 Hộp thông báo`: `src/components/overlays/NotificationDropdown.jsx`
  - `B4 Đổi bảng màu`: `src/components/overlays/ThemeDropdown.jsx`
  - Thanh tiêu đề chung: `src/components/layout/TopNav.jsx`
- **Tệp dịch vụ (Services)**:
  - `src/services/capsuleService.js`
  - `src/services/notificationService.js`
- **Tài liệu đặc tả backend tham chiếu**: `plan_03_capsules.md`, `plan_04_notifications.md`.

---

## 2. Chi tiết luồng tích hợp API

### 2.1 Chuông thông báo & Đếm số lượng chưa đọc (`TopNav.jsx`)
- **Hành động kích hoạt**: Khi vào bất kỳ trang nào có `TopNav` (hoặc định kỳ mỗi 30–60 giây).
- **Endpoint**: `GET /api/v1/notifications/unread-count`
- **Headers**: `Authorization: Bearer <token>`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "unread_count": 3
    }
  }
  ```
- **Hành động Frontend**:
  - Nếu `unread_count > 0`: Hiển thị chấm đỏ kèm con số trên icon chuông (`<span className="n">{unread_count}</span>`).
  - Nếu `unread_count === 0`: Ẩn badge đỏ.

---

### 2.2 Danh sách thông báo (`NotificationDropdown.jsx` - B3)
- **Hành động kích hoạt**: Người dùng bấm vào **Icon Chuông** ở góc trên bên phải.
- **Endpoint**: `GET /api/v1/notifications?limit=20&offset=0`
- **Headers**: `Authorization: Bearer <token>`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "notif_01",
          "title": "Tác phẩm đã được duyệt",
          "message": "Tác phẩm “Bài thi mình chắc chắn đã qua” đã được trưng bày ở Phòng 1.",
          "type": "ARTWORK_APPROVED",
          "related_entity_id": 2,
          "is_read": false,
          "created_at": "2026-10-25T14:30:00Z"
        },
        {
          "id": "notif_02",
          "title": "Tác phẩm chưa được duyệt",
          "message": "Lời nhắn “Cố lên nhé” chưa được treo lên cây. Lý do: nội dung còn chứa tên trường của bạn khác.",
          "type": "ARTWORK_REJECTED",
          "related_entity_id": 9,
          "is_read": false,
          "created_at": "2026-10-25T13:00:00Z"
        },
        {
          "id": "notif_03",
          "title": "Lồng đèn hạ xuống",
          "message": "Lồng đèn bạn thả ngày 24.10.2023 đã hạ xuống. Thư từ bạn của 3 năm trước đang chờ.",
          "type": "LANTERN_LANDED",
          "related_entity_id": 15,
          "is_read": false,
          "created_at": "2026-10-25T09:00:00Z"
        }
      ],
      "total": 3
    }
  }
  ```
- **Hành động khi click thông báo**:
  - Gọi `PATCH /api/v1/notifications/{id}/read` để đánh dấu đã đọc.
  - Tự động điều hướng đến đúng trang tương ứng:
    - `ARTWORK_APPROVED` hoặc `ARTWORK_REJECTED` -> Điều hướng tới Phòng 1 / Tác phẩm của tôi.
    - `LANTERN_LANDED` -> Điều hướng tới Phòng 2 và mở thư lồng đèn hạ xuống.
- **Hành động bấm "Đánh dấu tất cả là đã đọc"**:
  - Gọi `PATCH /api/v1/notifications/read-all`.
  - Cập nhật toàn bộ `is_read = true` trong danh sách và đặt `unread_count = 0`.

---

### 2.3 Máy nhả thông điệp (`MailboxModal.jsx` - B2)
- **Hành động kích hoạt**: Bấm vào **Hòm thư trên bệ phát sáng** hoặc tag **"✦ hòm thư · rút một thông điệp"** ở Sảnh chính.

#### Bước 1: Rút thông điệp mới
- **Endpoint**: `POST /api/v1/capsules/draw`
- **Query params (Tùy chọn)**: `category=HEALING | COURAGE | PERSPECTIVE` (Nếu chọn tab "Ngẫu nhiên" thì không gửi param `category`).
- **Headers**: `Authorization: Bearer <token>`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "message": "Rút thông điệp thành công",
    "data": {
      "draw_id": "drw_12345",
      "capsule_id": 128,
      "content": "Can đảm không phải là không sợ. Can đảm là vẫn nộp đơn lần nữa, dù tay còn run.",
      "category": "COURAGE",
      "author_name": "một người lạ ở Phòng 3, đã được kiểm duyệt",
      "is_saved": false,
      "drawn_at": "2026-10-26T02:00:00Z"
    }
  }
  ```
- **Hành động Frontend**:
  - Hiển thị thẻ thư trượt lên với hiệu ứng nhẹ.
  - Hiển thị nhãn chủ đề (Can đảm: vàng, Chữa lành: xanh, Góc nhìn: tím).
  - Nút **"Rút thông điệp mới"** gọi lại API `draw`.

#### Bước 2: Lưu thông điệp vào sổ tay
- **Hành động kích hoạt**: Bấm nút **"Lưu vào sổ tay"**.
- **Endpoint**: `PATCH /api/v1/capsules/draws/{draw_id}/save`
- **Headers**: `Authorization: Bearer <token>`
- **Response 200 OK**:
  - Đổi trạng thái nút thành *"Đã lưu vào sổ tay"*.
  - Tăng biến đếm thông điệp đã lưu: `Đã lưu (8) -> Đã lưu (9)`.

#### Bước 3: Xem danh sách thông điệp đã lưu (trong Sổ tay)
- **Endpoint**: `GET /api/v1/capsules/saved?limit=20&offset=0`
- **Bỏ lưu khỏi sổ tay**: `DELETE /api/v1/capsules/saved/{draw_id}`.

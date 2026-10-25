# THỰC THI 07 — KHÔNG GIAN NHẬT KÝ (BẢN THÂN & CỘNG ĐỒNG)
## Tệp hướng dẫn tích hợp: `DiaryPage`, `DiaryPersonal` (G1), `DiaryCommunity` (G2), `WriteDiaryModal` (G3)

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**:
  - `Trang chủ Nhật ký`: `src/pages/Diary/DiaryPage.jsx`
  - `G1 Nhật ký · Bản thân`: `src/pages/Diary/DiaryPersonal.jsx`
  - `G2 Nhật ký · Cộng đồng`: `src/pages/Diary/DiaryCommunity.jsx`
  - `G3 Viết nhật ký mới`: `src/pages/Diary/WriteDiaryModal.jsx`
- **Tệp dịch vụ (Service)**: `src/services/diaryService.js`
- **Tài liệu đặc tả backend tham chiếu**: `backend/specification/plan_08_diaries.md`.

---

## 2. Chi tiết luồng tích hợp API

### 2.1 Tab Bản thân: Danh sách & Đọc nhật ký riêng tư (`DiaryPersonal.jsx` - G1)
- **Hành động kích hoạt**: Khi vào trang Nhật ký ở tab **"Bản thân"**.

#### Bước 1: Lấy dòng thời gian các trang nhật ký
- **Endpoint**: `GET /api/v1/diaries/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": 101,
          "title": "Hôm nay lồng đèn rơi xuống",
          "excerpt": "Đọc lại thư mình viết ba năm trước, mình đã khóc một chút.",
          "mood": "Hy vọng",
          "entry_date": "2026-10-25",
          "visibility": "PRIVATE",
          "status": "APPROVED",
          "has_media": true,
          "created_at": "2026-10-25T10:00:00Z"
        },
        {
          "id": 102,
          "title": "Bữa cơm với mẹ",
          "excerpt": "Mẹ không hỏi điểm, mẹ chỉ hỏi mình ăn chưa.",
          "mood": "Biết ơn",
          "entry_date": "2026-10-19",
          "visibility": "COMMUNITY",
          "status": "PENDING",
          "has_media": false,
          "created_at": "2026-10-19T18:00:00Z"
        }
      ],
      "total": 4
    }
  }
  ```
- **Hành động Frontend**:
  - Render danh sách ngày tháng bên cột trái (`420px`).
  - Gắn tag bảo mật:
    - `visibility === 'PRIVATE'`: Icon ổ khoá *"Chỉ mình tôi"*.
    - `visibility === 'COMMUNITY' && status === 'PENDING'`: Badge vàng *"Chờ duyệt công khai"*.
    - `visibility === 'COMMUNITY' && status === 'APPROVED'`: Icon địa cầu *"Công khai"*.

#### Bước 2: Đọc chi tiết trang sổ bên phải
- **Endpoint**: `GET /api/v1/diaries/me/{diary_id}`
- **Response 200 OK**:
  - Trả về toàn bộ nội dung `content`, `image_url`, `caption`, `font_family`.
  - Render cuốn sổ mở bên phải với gáy sách đỏ bọc góc và ảnh chụp lưu niệm xoay nhẹ 2 độ.

---

### 2.2 Tab Cộng đồng: Khám phá nhật ký chia sẻ (`DiaryCommunity.jsx` - G2)
- **Hành động kích hoạt**: Nhấp vào tab **"Cộng đồng"** trên thanh chuyển đổi.
- **Endpoint**: `GET /api/v1/diaries/community`
- **Query params**: `limit=20&offset=0`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": 201,
          "title": "Cảm ơn người lạ ở trạm xe buýt",
          "excerpt": "Chị ấy cho mình mượn ô dù không quen biết. Hôm đó mình vừa bị từ chối học bổng.",
          "mood": "Biết ơn",
          "author_name": "Sóc",
          "reaction_count": 64,
          "user_reaction": null,
          "created_at": "2026-10-20T17:00:00Z"
        }
      ],
      "total": 42
    }
  }
  ```
- **Hành động Frontend**:
  - Render các trang nhật ký cộng đồng dạng thẻ xoay nhẹ ngẫu nhiên, viền bên trái mang dải màu tâm trạng (`MOODS`).
  - Cung cấp nút thả cảm xúc đồng cảm (Ôm an ủi, Đồng cảm) gọi API `POST /api/v1/diaries/community/{diary_id}/reactions`.

---

### 2.3 Viết nhật ký mới (`WriteDiaryModal.jsx` - G3)
- **Hành động kích hoạt**: Nhấp nút **"Viết nhật ký mới"**.

#### Bước 1: Upload hình ảnh (Nếu người dùng đính kèm ảnh)
- **Endpoint**: `POST /api/v1/diaries/upload-media`
- **Headers**: `Content-Type: multipart/form-data`, `Authorization: Bearer <token>`
- **Request Body**: `FormData` chứa `file: <binary>`.
- **Response 200 OK**: Trả về `media_url`.

#### Bước 2: Lưu trang nhật ký
- **Endpoint**: `POST /api/v1/diaries`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "title": "Một ngày bình thường",
    "entry_date": "2026-10-25",
    "mood": "Bình yên",
    "font_family": "Lora",
    "content": "Sáng nay trời mưa nhỏ. Mình ngồi ở quán quen, viết lại kế hoạch cho tháng tới mà không thấy áp lực như mọi khi...",
    "image_url": "https://storage.../diary/rain.jpg",
    "caption": "quán quen, chiều mưa",
    "visibility": "PRIVATE"
  }
  ```
- **Quy tắc Quyền riêng tư (`visibility`)**:
  - `PRIVATE` (Chỉ mình tôi): Lưu ngay vào sổ cá nhân, không qua kiểm duyệt.
  - `COMMUNITY` (Chia sẻ lên Cộng đồng): Lưu vào sổ cá nhân đồng thời gửi bản sao vào hàng đợi duyệt của Ban quản trị.
- **Response 201 Created**:
  - Toast thông báo thành công: *"Trang nhật ký đã được lưu"*.
  - Đóng modal `G3` và tải lại danh sách nhật ký.

---

### 2.4 Chỉnh sửa & Xóa nhật ký cá nhân
- **Chỉnh sửa**: `PUT /api/v1/diaries/me/{diary_id}` -> Cập nhật tiêu đề, nội dung, tâm trạng, ảnh.
- **Xóa trang**: `DELETE /api/v1/diaries/me/{diary_id}` -> Bật modal xác nhận xoá trước khi gọi API.
- **Tìm kiếm**: `GET /api/v1/diaries/search?q={keyword}&scope=mine|community`.

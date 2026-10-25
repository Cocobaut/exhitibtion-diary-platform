# THỰC THI 09 — TRANG QUẢN TRỊ: KIỂM DUYỆT NHẬT KÝ CỘNG ĐỒNG
## Tệp hướng dẫn tích hợp: Màn hình kiểm duyệt tab "Nhật ký" trong Bảng Quản trị

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**: Tab **"Nhật ký"** (số lượng chờ: 4) trong `src/pages/Admin/AdminPage.jsx`.
- **Tệp dịch vụ (Service)**: `src/services/adminDiaryService.js`.
- **Tài liệu đặc tả backend tham chiếu**: `backend/specification/plan_10_admin_diaries.md`.
- **Yêu cầu phân quyền**: Vai trò **`ADMIN`** hoặc **`OWNER`**.

---

## 2. Chi tiết luồng tích hợp API

### 2.1 Lấy danh sách nhật ký cộng đồng chờ duyệt
- **Hành động kích hoạt**: Khi Admin nhấp vào tab **"Nhật ký"** trên thanh tab quản trị.
- **Endpoint**: `GET /api/v1/admin/diaries/pending?limit=20&offset=0`
- **Headers**: `Authorization: Bearer <token>`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": 102,
          "title": "Bữa cơm với mẹ",
          "content": "Mẹ không hỏi điểm, mẹ chỉ hỏi mình ăn chưa. Lần đầu tiên sau nhiều tháng mình thấy bữa cơm gia đình ấm áp đến thế...",
          "mood": "Biết ơn",
          "author_name": "Sóc",
          "user_id": "usr_456",
          "username": "@soc.le",
          "media_url": null,
          "created_at": "2026-10-19T18:00:00Z"
        }
      ],
      "total_pending": 4
    }
  }
  ```
- **Hành động Frontend**:
  - Render bảng hoặc danh sách thẻ duyệt bài.
  - Hiển thị đầy đủ tâm trạng, nội dung, tác giả thật và bút danh hiển thị.

---

### 2.2 Phê duyệt nhật ký lên bảng Cộng đồng
- **Hành động kích hoạt**: Admin bấm nút **"Duyệt công khai"**.
- **Endpoint**: `PATCH /api/v1/admin/diaries/{diary_id}/approve`
- **Headers**: `Authorization: Bearer <token>`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "message": "Trang nhật ký đã được phê duyệt công khai"
  }
  ```
- **Hành động Frontend**:
  - Xóa dòng nhật ký khỏi bảng chờ duyệt.
  - Giảm badge số lượng chờ duyệt trên tab Nhật ký (`4 -> 3`).
  - Hệ thống tự động đẩy bài sang tab "Cộng đồng" ở màn hình Nhật ký của người dùng.

---

### 2.3 Từ chối duyệt công khai
- **Hành động kích hoạt**: Admin bấm **"Từ chối"** -> Nhập lý do (Ví dụ: nội dung mang tính công kích, lộ thông tin cá nhân).
- **Endpoint**: `PATCH /api/v1/admin/diaries/{diary_id}/reject`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "admin_note": "Bài viết chưa phù hợp để chia sẻ công khai do có chứa số điện thoại cá nhân."
  }
  ```
- **Response 200 OK**:
  - Bài viết không bị xoá, vẫn ở lại trong sổ nhật ký riêng của tác giả nhưng `visibility` được chuyển về `PRIVATE`.
  - Tác giả nhận thông báo lý do bài viết chưa thể chia sẻ lên cộng đồng.

---

### 2.4 Quản lý các trang nhật ký đang công khai & Thu hồi quyền
- **Danh sách đang công khai**: `GET /api/v1/admin/diaries/approved?limit=20&offset=0`.
- **Thu hồi bài viết (Revoke)**:
  - Khi có báo cáo vi phạm từ cộng đồng, Admin bấm **"Thu hồi về riêng tư"**.
  - **Endpoint**: `PATCH /api/v1/admin/diaries/{diary_id}/revoke`
  - **Request Body**:
    ```json
    {
      "reason": "Nhận được nhiều báo cáo phản cảm từ người đọc"
    }
    ```
  - **Response 200 OK**: Bài viết lập tức biến mất khỏi bảng Cộng đồng, đưa về trạng thái riêng tư của tác giả.

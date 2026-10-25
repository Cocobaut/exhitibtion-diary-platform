# THỰC THI 10 — TRANG QUẢN TRỊ: KHO THÔNG ĐIỆP HÒM THƯ (CAPSULES)
## Tệp hướng dẫn tích hợp: `AdminCapsules` (H4)

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**: Tab **"Kho thông điệp"** trong `src/pages/Admin/AdminCapsules.jsx` & `src/pages/Admin/AdminPage.jsx`.
- **Tệp dịch vụ (Service)**: `src/services/adminCapsuleService.js`.
- **Tài liệu đặc tả backend tham chiếu**: `backend/specification/plan_11_admin_capsules.md`.
- **Yêu cầu phân quyền**: Vai trò **`ADMIN`** hoặc **`OWNER`**.

---

## 2. Chi tiết luồng tích hợp API

### 2.1 Tải danh sách thông điệp trong kho (`AdminCapsules.jsx` - H4)
- **Hành động kích hoạt**: Khi Admin nhấp vào tab **"Kho thông điệp"**.
- **Endpoint**: `GET /api/v1/admin/capsules`
- **Query params**:
  - `category=COURAGE | HEALING | PERSPECTIVE` (tùy chọn lọc theo chủ đề)
  - `status=active | inactive | all` (mặc định `all`)
  - `limit=50&offset=0`
- **Headers**: `Authorization: Bearer <token>`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": 1,
          "content": "Can đảm không phải là không sợ. Can đảm là vẫn nộp đơn lần nữa.",
          "category": "COURAGE",
          "category_label": "Can đảm",
          "source": "Phòng 3 · Mây",
          "author_role": "ADMIN",
          "draw_count": 342,
          "is_active": true,
          "created_at": "2026-10-15T09:00:00Z"
        },
        {
          "id": 5,
          "content": "Một lời “không” đóng một cánh cửa, không đóng cả con đường.",
          "category": "PERSPECTIVE",
          "category_label": "Góc nhìn",
          "source": "Admin · Chi",
          "author_role": "ADMIN",
          "draw_count": 189,
          "is_active": false,
          "created_at": "2026-10-18T10:00:00Z"
        }
      ],
      "total_capsules": 412
    }
  }
  ```
- **Hành động Frontend**:
  - Render bảng bên trái hiển thị Nội dung thông điệp, Badge chủ đề (Can đảm, Chữa lành, Góc nhìn), Nguồn gốc, Số lượt người dùng đã rút và Switch Toggle Bật/Tắt.

---

### 2.2 Bật / Tắt trạng thái thông điệp (Toggle status)
- **Hành động kích hoạt**: Bấm vào nút chuyển đổi Switch (`.tog`) trên một dòng thông điệp.
- **Endpoint**: `PATCH /api/v1/admin/capsules/{capsule_id}/toggle-status`
- **Headers**: `Authorization: Bearer <token>`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "message": "Trạng thái thông điệp đã thay đổi",
    "data": {
      "id": 5,
      "is_active": true
    }
  }
  ```
- **Hành động Frontend**: Cập nhật ngay lập tức giao diện nút toggle mà không cần tải lại toàn bộ bảng. Khi bật, thông điệp sẽ ngay lập tức có cơ hội xuất hiện khi người dùng rút hòm thư ở Sảnh chính.

---

### 2.3 Thêm thông điệp mới vào kho (Thanh bên phải)
- **Hành động kích hoạt**: Chọn Chủ đề (Can đảm, Chữa lành, Góc nhìn), nhập Nội dung, chọn Bật ngay -> Bấm **"Lưu vào kho"**.
- **Endpoint**: `POST /api/v1/admin/capsules`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "content": "Bạn có thể bắt đầu lại bao nhiêu lần cũng được.",
    "category": "PERSPECTIVE",
    "is_active": true
  }
  ```
- **Response 201 Created**:
  ```json
  {
    "success": true,
    "message": "Thông điệp mới đã được thêm vào kho",
    "data": {
      "id": 413,
      "content": "Bạn có thể bắt đầu lại bao nhiêu lần cũng được.",
      "category": "PERSPECTIVE",
      "is_active": true
    }
  }
  ```
- **Hành động Frontend**:
  - Thêm bản ghi mới lên đầu danh sách bảng.
  - Reset form nhập liệu về trống.
  - Toast thông báo thành công.

---

### 2.4 Chỉnh sửa & Xóa thông điệp
- **Chỉnh sửa**: `PUT /api/v1/admin/capsules/{capsule_id}` (Cho phép sửa lại câu từ cho trau chuốt hơn).
- **Xóa vĩnh viễn**: `DELETE /api/v1/admin/capsules/{capsule_id}` (Xóa các câu không còn phù hợp khỏi hòm thư).

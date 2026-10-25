# THỰC THI 02 — TRANG HỒ SƠ CÁ NHÂN & CÀI ĐẶT TÀI KHOẢN
## Tệp hướng dẫn tích hợp màn hình: `ProfilePage` & `AccountSettingsModal`

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**: `src/pages/Profile/ProfilePage.jsx` hoặc Modal cài đặt tài khoản khi click Avatar `L` trên `Sidebar.jsx`.
- **Tệp dịch vụ (Service)**: `src/services/userService.js`.
- **Tài liệu đặc tả backend tham chiếu**: `backend/specification/plan_02_user_profile.md`.

---

## 2. Chi tiết luồng tích hợp API

### 2.1 Tải thông tin hồ sơ hiện tại
- **Hành động kích hoạt**: Khi trang hồ sơ được mở (`useEffect`) hoặc khi ứng dụng khởi động để đồng bộ trạng thái mới nhất của user.
- **Endpoint**: `GET /api/v1/users/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "message": "Lấy thông tin tài khoản thành công",
    "data": {
      "id": "e9b27b9c-...",
      "username": "linh.ng",
      "email": "linh@example.com",
      "nickname": "Linh",
      "role": "USER",
      "avatar_url": "https://storage.../avatars/linh.jpg",
      "created_at": "2026-10-21T08:00:00Z"
    }
  }
  ```
- **Hành động Frontend**:
  - Gán dữ liệu vào state `profile`.
  - Hiển thị chữ cái đầu hoặc ảnh đại diện ở góc dưới `Sidebar`.
  - Hiển thị lời chào tại Sảnh: *"Chào {profile.nickname || profile.username}, hôm nay bạn muốn ghé đâu?"*.

---

### 2.2 Cập nhật Biệt danh (Nickname)
- **Hành động kích hoạt**: Người dùng chỉnh sửa Biệt danh và nhấn **"Lưu thay đổi"**.
- **Endpoint**: `PATCH /api/v1/users/me`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "nickname": "Linh Mùa Thu"
  }
  ```
- **Response 200 OK**:
  - Cập nhật state `nickname` trong context toàn cục.
  - Hiển thị Toast thông báo: *"Cập nhật hồ sơ thành công"*.

---

### 2.3 Đổi mật khẩu trong tài khoản
- **Hành động kích hoạt**: Điền Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới -> Nhấn **"Cập nhật mật khẩu"**.
- **Endpoint**: `PUT /api/v1/users/me/password`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "current_password": "OldPassword123@",
    "new_password": "NewStrongPassword456@"
  }
  ```
- **Xử lý lỗi**:
  - `400 WEAK_PASSWORD`: Báo lỗi mật khẩu mới không đạt chuẩn.
  - `400 SAME_PASSWORD`: Báo lỗi *"Mật khẩu mới không được trùng với mật khẩu cũ"*.
  - `401 INCORRECT_PASSWORD`: Báo lỗi *"Mật khẩu hiện tại không chính xác"*.
- **Phản hồi 200 OK**:
  - Reset các ô nhập mật khẩu.
  - Toast: *"Đổi mật khẩu thành công"*.

---

### 2.4 Cập nhật Ảnh đại diện (Avatar)
- **Hành động kích hoạt**: Người dùng chọn file ảnh từ máy tính (JPEG, PNG, WebP ≤ 5MB).
- **Endpoint**: `POST /api/v1/users/me/avatar`
- **Headers**: `Content-Type: multipart/form-data`, `Authorization: Bearer <token>`
- **Request Body**: `FormData` chứa `file: <binary>`.
- **Response 200 OK**:
  ```json
  {
    "success": true,
    "message": "Cập nhật ảnh đại diện thành công",
    "data": {
      "avatar_url": "https://storage.../avatars/new_avatar.jpg"
    }
  }
  ```
- **Hành động Frontend**:
  - Thay thế chữ đại diện `L` trên `Sidebar` bằng thẻ `<img src={data.avatar_url} />`.

# THỰC THI 01 — TRANG XÁC THỰC: ĐĂNG NHẬP, ĐĂNG KÝ & KHÔI PHỤC MẬT KHẨU
## Tệp hướng dẫn tích hợp màn hình: `LoginPage` (A1), `RegisterModal`, `ForgotPasswordModal`

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**: 
  - `A1 Đăng nhập`: `src/pages/Auth/LoginPage.jsx`
  - Modal Đăng ký: `src/pages/Auth/RegisterModal.jsx` (hoặc mở rộng trong `LoginPage`)
  - Modal Quên/Đổi mật khẩu: `src/pages/Auth/ForgotPasswordModal.jsx`
- **Tệp dịch vụ (Service)**: `src/services/authService.js`
- **Tài liệu đặc tả backend tham chiếu**: `backend/specification/plan_01_auth.md`.

---

## 2. Chi tiết luồng tích hợp API

### 2.1 Chức năng: Đăng nhập (`LoginPage.jsx`)
- **Hành động kích hoạt**: Người dùng nhập Tên đăng nhập/Email và Mật khẩu, bấm nút **"Bước vào bảo tàng"**.
- **Endpoint**: `POST /api/v1/auth/login`
- **Quyền hạn**: Public (Không cần token).
- **Request Body**:
  ```json
  {
    "account": "linh.ng",
    "password": "StrongPassword123@"
  }
  ```
- **Xử lý Response thành công (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Đăng nhập thành công",
    "body": {
      "access_token": "eyJhbGciOi...",
      "token_type": "Bearer",
      "expires_in": 86400,
      "user": {
        "id": "e9b27b9c-...",
        "username": "linh.ng",
        "email": "linh@example.com",
        "nickname": "Linh",
        "role": "USER",
        "avatar_url": null
      }
    }
  }
  ```
  - **Hành động Frontend**:
    1. Lưu `access_token` vào `localStorage`.
    2. Cập nhật state `currentUser` trong `AuthContext`.
    3. Kiểm tra `user.role`:
       - Nếu `role === 'ADMIN'` hoặc `'OWNER'`: Kích hoạt nút **"Quản trị"** trên thanh `Sidebar`.
       - Nếu `role === 'USER'`: Ẩn mục quản trị.
    4. Điều hướng vào **Sảnh chính** (`/` - `LobbyPage`).
- **Xử lý lỗi**:
  - `401 INVALID_CREDENTIALS`: Hiển thị thông báo đỏ bên dưới form: *"Tài khoản hoặc mật khẩu không chính xác"*.
  - `403 ACCOUNT_LOCKED`: Hiển thị thông báo *"Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên"*.

---

### 2.2 Chức năng: Đăng ký tài khoản
- **Hành động kích hoạt**: Bấm **"Chưa có tài khoản? Đăng ký"** -> Nhập thông tin -> Bấm **"Tạo tài khoản"**.
- **Endpoint**: `POST /api/v1/auth/register`
- **Request Body**:
  ```json
  {
    "username": "linh_ng",
    "email": "linh@example.com",
    "password": "StrongPassword123@",
    "nickname": "Linh Thơ Thẩn"
  }
  ```
- **Xử lý Response thành công (201 Created)**:
  - Hiển thị Toast thông báo: *"Tài khoản tạo thành công. Mời bạn đăng nhập"*.
  - Tự động điền `account` sang form đăng nhập hoặc gọi luôn API login.
- **Xử lý lỗi**:
  - `400 WEAK_PASSWORD`: *"Mật khẩu cần tối thiểu 8 ký tự gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt"*.
  - `409 USERNAME_TAKEN`: *"Tên đăng nhập đã tồn tại trên hệ thống"*.
  - `409 EMAIL_TAKEN`: *"Email đã tồn tại trên hệ thống"*.

---

### 2.3 Chức năng: Quên / Khôi phục mật khẩu
- **Hành động kích hoạt**: Bấm link **"Quên mật khẩu?"** -> Nhập Username, Email đã đăng ký và Mật khẩu mới -> Bấm **"Đặt lại mật khẩu"**.
- **Endpoint**: `POST /api/v1/auth/change-password`
- **Request Body**:
  ```json
  {
    "username": "linh_ng",
    "email": "linh@example.com",
    "new_password": "NewStrongPassword123@"
  }
  ```
- **Xử lý Response thành công (200 OK)**:
  - Hiển thị thông báo thành công: *"Đổi mật khẩu thành công. Mời bạn đăng nhập bằng mật khẩu mới"*.
  - Đóng modal và chuyển về form Login.

---

### 2.4 Chức năng: Đăng xuất
- **Hành động kích hoạt**: Bấm vào Avatar góc dưới cùng thanh `Sidebar` -> Chọn **"Đăng xuất"**.
- **Endpoint**: `POST /api/v1/auth/logout`
- **Headers**: `Authorization: Bearer <access_token>`
- **Hành động Frontend**:
  1. Gọi API thu hồi token vào blacklist ở máy chủ.
  2. Bất kể API trả về thành công hay lỗi mạng, lập tức xoá `access_token` và `user_info` khỏi `localStorage`.
  3. Reset state `currentUser` về `null`.
  4. Điều hướng về màn hình `LoginPage`.

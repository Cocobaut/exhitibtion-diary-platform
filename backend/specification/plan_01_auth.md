# PLAN 01 — Nhóm API 1: Xác thực & khôi phục mật khẩu (`/api/v1/auth`)

> Đọc `plan_00_foundation.md` trước. Nguồn: API spec trang 1–4.

## 1. Phạm vi

| # | Method | Path | Quyền | Status OK |
|---|---|---|---|---|
| 1.1 | POST | `/api/v1/auth/register` | Public | 201 |
| 1.2 | POST | `/api/v1/auth/login` | Public | 200 |
| 1.3 | POST | `/api/v1/auth/change-password` | Public | 200 |
| 1.4 | POST | `/api/v1/auth/logout` | Authenticated | 200 |

**Lưu ý:** nhóm này trả payload trong khoá **`body`** (không phải `data`) cho 1.1 và 1.2.

## 2. File cần tạo/sửa
- `app/models/user.py` (refactor theo plan_00 §1), `app/models/revoked_token.py` (không cần dùng bảng `password_reset_tokens`)
- `app/schemas/auth.py` (thêm schema `ChangePasswordRequest`)
- `app/services/auth_service.py`
- `app/core/security.py` (thêm `jti`, `role`, `expires_in=86400`)
- `app/api/v1/endpoints/auth.py` (triển khai `/register`, `/login`, `/change-password`, `/logout`; **xoá** `/me`, `/refresh-token`, `/login/access-token`, `/forgot-password`, `/reset-password`)
- `app/core/config.py`: `JWT_EXPIRE_SECONDS=86400` (không bắt buộc cấu hình SMTP phức tạp cho reset token)

## 3. Quy tắc validate dùng chung
| Trường | Quy tắc | Lỗi |
|---|---|---|
| `username` | regex `^[A-Za-z0-9_]{3,50}$`; lưu nguyên dạng, so sánh **không phân biệt hoa thường** (`lower(username)`) | 400 |
| `email` | `EmailStr`, chuẩn hoá `strip().lower()`, ≤255 | 400 |
| `password` / `new_password` | 8–128 ký tự, có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số, 1 ký tự đặc biệt | 400 `WEAK_PASSWORD`, message `"Mật khẩu quá yếu: cần tối thiểu 8 ký tự gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt"` |
| `nickname` | strip, 1–50 ký tự | 400 |

Đặt validator mật khẩu trong `app/core/security.py::validate_password_strength()` để plan_02 dùng lại.

---

## 4. Chi tiết endpoint

### 1.1 `POST /auth/register`
**Request**
```json
{ "username": "hoanghon_01", "email": "hoanghon@example.com", "password": "StrongPassword123@", "nickname": "Người Lữ Khách" }
```
**Logic**
1. Validate theo §3.
2. Kiểm tra trùng: `lower(username)` và `email`. Trùng → 409.
3. `INSERT users(username, email, password_hash=bcrypt(password), nickname, role='USER', is_active=TRUE)`.
4. Bắt `IntegrityError` (race condition) → 409.

**Response 201**
```json
{ "success": true, "message": "Tài khoản tạo thành công",
  "body": { "id": "<uuid>", "username": "hoanghon_01", "email": "hoanghon@example.com", "nickname": "Người Lữ Khách", "role": "USER" } }
```
**Lỗi**
| Status | error_code | message |
|---|---|---|
| 400 | `VALIDATION_ERROR` / `WEAK_PASSWORD` | theo §3 |
| 409 | `USERNAME_TAKEN` | `"Tên đăng nhập đã tồn tại trên hệ thống"` |
| 409 | `EMAIL_TAKEN` | `"Email đã tồn tại trên hệ thống"` |

Client **không được** tự đặt `role` (bỏ qua nếu gửi lên — schema không có trường `role`).

### 1.2 `POST /auth/login`
**Request**
```json
{ "account": "hoanghon_01", "password": "StrongPassword123@" }
```
**Logic**
1. `account` chứa `@` → tìm theo `email = lower(account)`; ngược lại tìm theo `lower(username) = lower(account)`.
2. Không thấy user **hoặc** sai mật khẩu → 401 (cùng một message, không tiết lộ trường nào sai). Vẫn chạy `bcrypt.checkpw` với hash giả khi không thấy user để tránh timing attack.
3. Mật khẩu đúng nhưng `is_active = FALSE` → 403.
4. Tạo JWT (plan_00 §5.1).
5. `message` phụ thuộc role:
   - `USER` → `"Đăng nhập thành công"`
   - `ADMIN` → `"Đăng nhập quyền quản trị viên thành công"`

**Response 200**
```json
{ "success": true, "message": "Đăng nhập thành công",
  "body": {
    "access_token": "<jwt>", "token_type": "Bearer", "expires_in": 86400,
    "user": { "id": "<uuid>", "username": "...", "email": "...", "nickname": "...", "role": "USER", "avatar_url": null } } }
```
`token_type` phải là `"Bearer"` (B hoa).

**Lỗi**
| Status | error_code | message |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | `"Tài khoản hoặc mật khẩu không chính xác"` |
| 403 | `ACCOUNT_LOCKED` | `"Tài khoản của bạn đang bị khóa"` |

### 1.3 `POST /auth/forgot-password`
Gom luồng khôi phục / đổi mật khẩu thành một bước đơn giản (không cần token gửi email).

**Request**
```json
{
  "username": "hoanghon_01",
  "email": "hoanghon@example.com",
  "new_password": "NewStrongPassword123@"
}
```

**Logic**
1. Validate `username`, `email`, `new_password` theo §3.
2. Tìm user khớp cả `lower(username) = lower(req.username)` VÀ `email = lower(req.email)`.
3. Không tìm thấy user hoặc username/email không khớp nhau → trả lỗi 400 `INVALID_CREDENTIALS` với message `"Tài khoản hoặc email không chính xác"` (không tiết lộ thông tin chi tiết).
4. Nếu user tồn tại nhưng `is_active = FALSE` → 403 `ACCOUNT_LOCKED` (`"Tài khoản của bạn đang bị khóa"`).
5. Cập nhật `password_hash = bcrypt(new_password)`, `updated_at = now()`.

**Response 200**
```json
{
  "success": true,
  "message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới."
}
```

**Lỗi**
| Status | error_code | message |
|---|---|---|
| 400 | `VALIDATION_ERROR` / `WEAK_PASSWORD` | theo §3 |
| 400 | `INVALID_CREDENTIALS` | `"Tài khoản hoặc email không chính xác"` |
| 403 | `ACCOUNT_LOCKED` | `"Tài khoản của bạn đang bị khóa"` |

### 1.4 `POST /auth/logout`
**Headers** `Authorization: Bearer <access_token>`

**Logic**: lấy `jti`, `exp` từ token hiện tại → `INSERT INTO revoked_tokens(jti, expires_at) ON CONFLICT DO NOTHING`. `get_current_user` (plan_00 §5.2) phải từ chối token có `jti` đã thu hồi.
Dọn dẹp: job/khởi động xoá `revoked_tokens` có `expires_at < now()` (có thể làm trong lifespan).

**Response 200** `{ "success": true, "message": "Đăng xuất thành công" }`

**Lỗi**: 401 `UNAUTHORIZED` khi không có/sai token.

---

## 5. Test bắt buộc
- [ ] Register thành công → 201, `body.role == "USER"`, DB lưu bcrypt hash (không lưu plaintext).
- [ ] Register trùng username (khác hoa thường) → 409 `USERNAME_TAKEN`; trùng email → 409 `EMAIL_TAKEN`.
- [ ] Register mật khẩu `abc` → 400 `WEAK_PASSWORD`; email sai → 400.
- [ ] Gửi `"role": "ADMIN"` khi register → user vẫn là `USER`.
- [ ] Login bằng username và bằng email đều thành công; `expires_in == 86400`; `token_type == "Bearer"`.
- [ ] Login admin → message `"Đăng nhập quyền quản trị viên thành công"`.
- [ ] Login sai mật khẩu / user không tồn tại → 401 cùng message.
- [ ] Login user bị khoá → 403.
- [ ] Change-password với username hoặc email không tồn tại / không khớp → 400 `INVALID_CREDENTIALS`.
- [ ] Change-password với mật khẩu mới quá yếu → 400 `WEAK_PASSWORD`.
- [ ] Change-password thành công → 200; sau đó đăng nhập bằng mật khẩu mới thành công, mật khẩu cũ thất bại.
- [ ] Change-password với user bị khoá (`is_active = FALSE`) → 403.
- [ ] Logout → 200; gọi endpoint cần auth bằng token cũ → 401.

## 6. Điểm mơ hồ trong spec & quyết định mặc định
| Spec | Mâu thuẫn | Quyết định |
|---|---|---|
| 1.3 mô tả "nhận email và username" / "Yêu cầu đổi mật khẩu" | 1.3 & 1.4 chia làm forgot-password gửi link token qua mail và reset-password riêng | **Gom 1.3 và 1.4 thành endpoint duy nhất `POST /auth/change-password`**: nhận `username`, `email`, `new_password` trực tiếp, xác thực cặp username+email và cập nhật mật khẩu ngay |
| 1.3 lỗi tài khoản/email không chính xác | Spec ban đầu có lỗi 401 | Chuẩn hóa trả về 400 `INVALID_CREDENTIALS` `"Tài khoản hoặc email không chính xác"` |
| 1.2 không có refresh token | Code cũ có refresh token | Bỏ refresh token |
| "Mật khẩu quá yếu" không có quy tắc | — | Dùng quy tắc §3 |

---

## 7. Postman Collection để Test API
- **File đích**: [`backend/postman_json/01_auth.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/01_auth.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{accessToken}}`: Tự động lưu giá trị từ `response.body.access_token` khi chạy request Đăng nhập (USER)
  - `{{adminToken}}`: Tự động lưu giá trị từ `response.body.access_token` khi đăng nhập tài khoản ADMIN
- **Danh sách requests cần có trong Collection**:
  1. `[1.1] Đăng ký tài khoản mới (POST /api/v1/auth/register)` - Kèm test script kiểm tra status 201, `body.role == 'USER'`.
  2. `[1.1-Lỗi] Đăng ký trùng username/email (POST /api/v1/auth/register)` - Kiểm tra status 409.
  3. `[1.2] Đăng nhập tài khoản USER (POST /api/v1/auth/login)` - Test script tự động gán `pm.environment.set("accessToken", pm.response.json().body.access_token)`.
  4. `[1.2] Đăng nhập tài khoản ADMIN (POST /api/v1/auth/login)` - Test script tự động gán `pm.environment.set("adminToken", pm.response.json().body.access_token)`.
  5. `[1.2-Lỗi] Đăng nhập sai mật khẩu (POST /api/v1/auth/login)` - Kiểm tra status 401.
  6. `[1.3] Đổi mật khẩu trực tiếp (POST /api/v1/auth/change-password)` - Body gồm `username`, `email`, `new_password`, kiểm tra status 200.
  7. `[1.3-Lỗi] Đổi mật khẩu sai thông tin (POST /api/v1/auth/change-password)` - Kiểm tra status 400.
  8. `[1.4] Đăng xuất (POST /api/v1/auth/logout)` - Header `Bearer {{accessToken}}`, kiểm tra status 200.

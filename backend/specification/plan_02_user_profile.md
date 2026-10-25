# PLAN 02 — Nhóm API 2: Hồ sơ cá nhân & tài khoản (`/api/v1/users/me`)

> Đọc `plan_00_foundation.md` trước. Nguồn: API spec trang 5–7.
> Tiêu đề nhóm trong spec ghi `/api/v1/users/profile` nhưng **mọi endpoint đều dùng `/api/v1/users/me`** → theo endpoint.

## 1. Phạm vi

| # | Method | Path | Quyền | Status OK |
|---|---|---|---|---|
| 2.1 | GET | `/api/v1/users/me` | Authenticated | 200 |
| 2.2 | PATCH | `/api/v1/users/me` | Authenticated | 200 |
| 2.3 | PUT | `/api/v1/users/me/password` | Authenticated | 200 |
| 2.4 | POST | `/api/v1/users/me/avatar` | Authenticated | 200 |

Payload trong khoá **`data`**.

## 2. File cần tạo/sửa
- `app/schemas/user.py` (viết lại: `UserMeOut`, `UserProfilePatch`, `UserProfilePatchOut`, `ChangePasswordIn`, `AvatarOut`)
- `app/services/user_service.py` (viết lại, bỏ logic cũ STUDENT/full_name…)
- `app/api/v1/endpoints/users.py` (viết lại; **xoá** các endpoint admin CRUD user cũ — không có trong spec)
- Dùng `StorageService` (plan_00 §6.3), `validate_password_strength` (plan_01 §3)

---

## 3. Chi tiết endpoint

### 2.1 `GET /users/me`
**Logic**: trả `current_user`.

**Response 200**
```json
{ "success": true,
  "data": { "id": "<uuid>", "username": "hoanghon_01", "email": "hoanghon@example.com", "nickname": "Người Lữ Khách",
            "role": "USER", "avatar_url": "https://...", "bio": "Gửi những tâm sự...", "theme_preference": "museum", "created_at": "2026-10-24T15:30:00Z" } }
```
Không có `message`. Không trả `password_hash`, `is_active`, `updated_at`.

### 2.2 `PATCH /users/me` (partial update)
**Request** — mọi trường đều tùy chọn; chỉ cập nhật trường **có mặt** trong body (`model_dump(exclude_unset=True)`):
| Trường | Quy tắc |
|---|---|
| `nickname` | strip, 1–50 ký tự; **không** cho `null` |
| `bio` | ≤255 ký tự; cho phép `null` hoặc `""` (lưu `NULL`) |
| `avatar_url` | URL `http(s)://`, ≤2048; cho phép `null` để xoá ảnh |
| `theme_preference` | Enum: `museum`, `moss`, `plum`, `paper` (mặc định: `museum`) |

Trường khác (`username`, `email`, `role`, `is_active`…) → **bỏ qua** (cấu hình schema `extra="ignore"`). Body rỗng `{}` → 400 `VALIDATION_ERROR` `"Không có trường nào để cập nhật"`.

**Logic**: update → `RETURNING` / refresh để lấy `updated_at` mới do trigger DB sinh.

**Response 200**
```json
{ "success": true, "message": "Cập nhật hồ sơ thành công",
  "data": { "id": "<uuid>", "nickname": "...", "bio": "...", "avatar_url": "...", "theme_preference": "moss", "updated_at": "2026-10-24T16:05:00Z" } }
```

### 2.3 `PUT /users/me/password`
**Request** `{ "current_password": "StrongPassword123@", "new_password": "NewStrongPassword456@" }`

**Logic**
1. `verify_password(current_password, user.password_hash)` sai → 400 `WRONG_CURRENT_PASSWORD`.
2. `new_password == current_password` (hoặc `verify_password(new, hash)` đúng) → 400 `PASSWORD_UNCHANGED`.
3. `validate_password_strength(new_password)` → 400 `WEAK_PASSWORD`.
4. Cập nhật `password_hash`.

**Response 200** `{ "success": true, "message": "Đổi mật khẩu thành công" }`

**Lỗi**
| Status | error_code | message |
|---|---|---|
| 400 | `WRONG_CURRENT_PASSWORD` | `"Mật khẩu hiện tại không đúng"` |
| 400 | `PASSWORD_UNCHANGED` | `"Mật khẩu mới không được trùng với mật khẩu cũ"` |
| 400 | `WEAK_PASSWORD` | như plan_01 |

### 2.4 `POST /users/me/avatar`
**Request**: `multipart/form-data`, field **`file`**; chỉ `image/png`, `image/jpeg`; tối đa **5 MB**.

**Logic**
1. Thiếu `file` → 400 `VALIDATION_ERROR`.
2. `StorageService.save(file, folder="avatars", filename_stem=f"{user.id}-{uuid4().hex[:8]}")` (validate MIME + magic bytes + size).
3. **Cập nhật luôn** `users.avatar_url = url` (để FE không phải gọi thêm PATCH).
4. (Tuỳ chọn) xoá file avatar cũ nếu nó thuộc storage nội bộ.

**Response 200**
```json
{ "success": true, "message": "Tải ảnh đại diện thành công", "data": { "avatar_url": "https://.../avatars/<file>" } }
```
**Lỗi**: 400 `FILE_TOO_LARGE` (`"Ảnh vượt quá dung lượng 5MB"`), 400 `UNSUPPORTED_FILE_TYPE` (`"Chỉ chấp nhận ảnh PNG hoặc JPEG"`).

---

## 4. Test bắt buộc
- [ ] Không có token → 401 cho cả 4 endpoint.
- [ ] GET `/users/me` trả đủ 8 trường, không lộ `password_hash`.
- [ ] PATCH chỉ `bio` → `nickname` giữ nguyên; `updated_at` thay đổi.
- [ ] PATCH `{"role":"ADMIN"}` → role không đổi (và body chỉ có trường bị bỏ qua → 400 "Không có trường nào để cập nhật").
- [ ] PATCH `nickname` 51 ký tự → 400.
- [ ] Đổi mật khẩu: sai mật khẩu hiện tại → 400; trùng mật khẩu cũ → 400; thành công → login bằng mật khẩu mới OK.
- [ ] Upload PNG 1MB → 200, `avatar_url` được lưu vào DB.
- [ ] Upload file `.txt` đổi đuôi `.png` → 400 (magic bytes); upload 6MB → 400.

## 5. Điểm mơ hồ & quyết định mặc định
| Spec | Quyết định |
|---|---|
| Prefix nhóm `/users/profile` khác endpoint `/users/me` | Dùng `/users/me` |
| 2.4 "trả về URL để gán vào avatar_url" — không rõ có tự lưu không | Tự lưu vào DB **và** trả URL |
| Ví dụ 2.4 trả `.webp` dù upload png/jpeg | Không bắt buộc chuyển đổi; nếu muốn convert sang WebP thì thêm `Pillow` |

---

## 6. Postman Collection để Test API
- **File đích**: [`backend/postman_json/02_user_profile.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/02_user_profile.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{accessToken}}`: Bearer Token người dùng đang đăng nhập
- **Danh sách requests cần có trong Collection**:
  1. `[2.1] Lấy thông tin cá nhân hiện tại (GET /api/v1/users/me)` - Header `Bearer {{accessToken}}`, test script kiểm tra status 200, trả đủ `username`, `email`, `nickname`, `bio`, `avatar_url`.
  2. `[2.1-Lỗi] Lấy thông tin không có Token (GET /api/v1/users/me)` - Kiểm tra status 401.
  3. `[2.2] Cập nhật hồ sơ (PATCH /api/v1/users/me)` - Body cập nhật `nickname`, `bio`, kiểm tra status 200.
  4. `[2.3] Đổi mật khẩu chủ động (PUT /api/v1/users/me/password)` - Body gồm `current_password`, `new_password`.
  5. `[2.3-Lỗi] Đổi mật khẩu sai mật khẩu hiện tại (PUT /api/v1/users/me/password)` - Kiểm tra status 400.
  6. `[2.4] Tải lên ảnh đại diện Avatar (POST /api/v1/users/me/avatar)` - Form-data file ảnh (PNG/JPG), kiểm tra status 200, nhận về `avatar_url`.

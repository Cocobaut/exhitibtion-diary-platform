# PLAN 00 — Nền tảng chung (BẮT BUỘC hoàn thành trước mọi nhóm API)

> Nguồn: `API_Specification.pdf` (74 trang, 12 nhóm API) + `Database_Specification.pdf` (8 entity).
> Mọi plan `plan_01` → `plan_12` đều **giả định plan này đã xong**. Agent hiện thực một nhóm API phải đọc file này trước.

---

## 0. Danh mục plan & thứ tự hiện thực

| Thứ tự | File | Nhóm API | Prefix |
|---|---|---|---|
| 0 | `plan_00_foundation.md` | Nền tảng chung | — |
| 1 | `plan_01_auth.md` | Nhóm 1: Xác thực & khôi phục mật khẩu | `/api/v1/auth` |
| 2 | `plan_02_user_profile.md` | Nhóm 2: Hồ sơ cá nhân | `/api/v1/users/me` |
| 3 | `plan_04_notifications.md` | Nhóm 4: Thông báo | `/api/v1/notifications` |
| 4 | `plan_03_capsules.md` | Nhóm 3: Máy nhả thông điệp | `/api/v1/capsules` |
| 5 | `plan_05_room1_broken.md` | Nhóm 5: Phòng 1 (Đổ vỡ) | `/api/v1/rooms/1` |
| 6 | `plan_06_room2_hope.md` | Nhóm 6: Phòng 2 (Lồng đèn) | `/api/v1/rooms/2` |
| 7 | `plan_07_room3_community.md` | Nhóm 7: Phòng 3 (Cây thông điệp) | `/api/v1/rooms/3` |
| 8 | `plan_08_diaries.md` | Nhóm 8: Nhật ký | `/api/v1/diaries` |
| 9 | `plan_09_admin_rooms.md` | Nhóm 9: Admin quản lý 3 phòng | `/api/v1/admin/rooms/{room_id}/artworks` |
| 10 | `plan_10_admin_diaries.md` | Nhóm 10: Admin quản lý nhật ký | `/api/v1/admin/diaries` |
| 11 | `plan_11_admin_capsules.md` | Nhóm 11: Admin kho thông điệp | `/api/v1/admin/capsules` |
| 12 | `plan_12_admin_studio_audit.md` | Nhóm 12: Admin Studio & Audit Log | `/api/v1/admin/studio` |
| 13 | `plan_13_owner.md` | Nhóm 13: Owner Quản trị tối cao | `/api/v1/owner` |

Thứ tự khuyến nghị: 00 → 01 → 02 → 04 (vì nhiều nhóm sinh thông báo) → các nhóm còn lại. Nhóm 9–12 cần `AuditLogService` (mục 6.4), Nhóm 13 dành cho Owner.

---

## 1. Hiện trạng code & việc phải refactor

Code hiện tại trong `backend/app/` được dựng **trước** khi có spec và **KHÔNG khớp** schema:

| Hiện tại | Theo spec | Hành động |
|---|---|---|
| `User.id: int` autoincrement | `UUID` `gen_random_uuid()` | Đổi sang `UUID(as_uuid=True)` |
| `hashed_password` | `password_hash` | Đổi tên cột |
| `full_name`, `student_id`, `faculty`, `is_superuser` | `username`, `nickname`, `bio` | Xoá cột cũ, thêm cột mới |
| `UserRole`: ADMIN/STUDENT/VISITOR/EVALUATOR | `role IN ('USER','ADMIN','OWNER')` | Enum chuẩn hóa gồm `USER`, `ADMIN`, `OWNER` |
| `TimestampMixin` dùng default phía Python | DB có `DEFAULT CURRENT_TIMESTAMP` + trigger `updated_at` | Dùng `server_default=func.now()`; KHÔNG set `onupdate` (trigger lo) — hoặc giữ cả hai, không xung đột |
| `main.py` gọi `Base.metadata.create_all` | Schema nguồn là `database/schema.sql` | **Bỏ** `create_all` khỏi lifespan; DB được tạo bằng `schema.sql` |
| `UserService.seed_first_superuser` | Seed bằng `database/seed.sql` | Giữ seed bằng code nhưng theo cột mới (username/nickname) — hoặc bỏ, chọn một |
| JWT `sub` = int, có refresh token | `sub` = UUID, `expires_in = 86400`, **không có refresh token** trong spec | Xem `plan_01` |
| Endpoint `/auth/me`, `/auth/change-password`, `/auth/refresh-token`, `/auth/login/access-token`, toàn bộ `/users` (admin CRUD) | Không có trong spec | **Xoá** (spec dùng `/users/me`, `/users/me/password`) |
| Lỗi validation trả 422 (mặc định FastAPI) | Spec dùng **400** | Override handler (mục 4) |

> [!WARNING]
> `database/seed.sql` chứa `password_hash` admin là **chuỗi giả**, không phải bcrypt hash thật của `AdminPassword@2026` → admin seed **không đăng nhập được**. Phải sinh hash thật bằng `bcrypt.hashpw(b"AdminPassword@2026", bcrypt.gensalt()).decode()` và thay vào seed.

---

## 2. Bổ sung schema (DB spec thiếu cho API spec)

API spec dùng một số trường/bảng **không có** trong DB spec. Tạo file `backend/database/03_extensions.sql` (chạy sau `01_schema.sql`, `02_seed.sql`) với nội dung sau. Đồng bộ luôn vào `schema.sql`.

```sql
-- 2.1 Bút danh & ẩn danh cho tác phẩm (API 5.1, 5.5, 6.3, 7.4, 9.x, 12.1)
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS author_display_name VARCHAR(50) NULL;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE;

-- 2.2 Reaction cho nhật ký cộng đồng (API 8.2.1–8.2.3) — DB spec không có bảng này
CREATE TABLE IF NOT EXISTS diary_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diary_id UUID NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('HEART','HUG','SYMPATHY')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_diary_user_reaction UNIQUE (diary_id, user_id)   -- 1 user = 1 reaction / bài
);

-- 2.3 Token đặt lại mật khẩu (API 1.3, 1.4)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,      -- SHA-256 hex của token gốc
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.4 Thu hồi access token khi logout (API 1.5)
CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti VARCHAR(64) PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.5 Audit log thao tác admin (API 12.2; được ghi bởi nhóm 9 và 12)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artwork_id UUID NULL REFERENCES artworks(id) ON DELETE SET NULL,
    artwork_title VARCHAR(150) NOT NULL,          -- snapshot tại thời điểm thao tác
    room_id SMALLINT NOT NULL REFERENCES rooms(id),
    admin_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(40) NOT NULL CHECK (action_type IN
        ('CREATE_DIRECT','UPDATE','APPROVE','APPROVE_AND_UPLOAD_MEDIA','REJECT','ARCHIVE')),
    note TEXT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_filter ON admin_audit_logs (room_id, admin_id, action_type, performed_at DESC);

-- 2.6 Tìm kiếm tiếng Việt không dấu (fallback khi không có Elasticsearch)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2.7 Hỗ trợ Song ngữ (Tiếng Việt & Tiếng Anh) cho Tác phẩm, Nhật ký, và Thông điệp Máy nhả
-- 2.7.1 Kho thông điệp (Capsules)
ALTER TABLE message_capsules ADD COLUMN IF NOT EXISTS message_vi TEXT NOT NULL DEFAULT '';
ALTER TABLE message_capsules ADD COLUMN IF NOT EXISTS message_en TEXT NOT NULL DEFAULT '';

-- 2.7.2 Tác phẩm (Artworks)
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS original_language VARCHAR(5) NOT NULL DEFAULT 'vi';
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS title_vi VARCHAR(150) NULL;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS title_en VARCHAR(150) NULL;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS short_content_vi TEXT NULL;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS short_content_en TEXT NULL;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS content_vi TEXT NULL;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS content_en TEXT NULL;

-- 2.7.3 Nhật ký (Diaries)
ALTER TABLE diaries ADD COLUMN IF NOT EXISTS original_language VARCHAR(5) NOT NULL DEFAULT 'vi';
ALTER TABLE diaries ADD COLUMN IF NOT EXISTS title_vi VARCHAR(150) NULL;
ALTER TABLE diaries ADD COLUMN IF NOT EXISTS title_en VARCHAR(150) NULL;
ALTER TABLE diaries ADD COLUMN IF NOT EXISTS content_vi TEXT NULL;
ALTER TABLE diaries ADD COLUMN IF NOT EXISTS content_en TEXT NULL;
```

---

## 3. Cấu trúc thư mục đích

```
app/
├── core/
│   ├── config.py          # + JWT_EXPIRE_SECONDS=86400, UPLOAD_*, SMTP_*, ELASTICSEARCH_URL, ROOM3_AUTO_APPROVE, ARTWORK_RATE_LIMIT_*
│   ├── database.py
│   ├── security.py        # bcrypt + JWT (sub=UUID str, role, jti, exp)
│   ├── responses.py       # MỚI: success()/paginated helpers
│   ├── exceptions.py      # MỚI: AppException + handlers
│   └── constants.py       # MỚI: enum, bảng màu phòng 3, chuỗi hiển thị cố định
├── models/                # 1 file / bảng: user, room, artwork, diary, diary_interaction,
│                          # message_capsule, user_capsule_draw, notification, artwork_interaction,
│                          # password_reset_token, revoked_token, admin_audit_log
├── schemas/               # 1 file / nhóm API
├── services/              # nghiệp vụ; router KHÔNG chứa logic
│   ├── notification_service.py   # dùng chung (mục 6.1)
│   ├── reaction_service.py       # dùng chung (mục 6.2)
│   ├── storage_service.py        # dùng chung (mục 6.3)
│   ├── audit_log_service.py      # dùng chung (mục 6.4)
│   ├── search_service.py         # dùng chung (mục 6.5)
│   └── <nhóm>_service.py
└── api/
    ├── deps.py            # get_db, get_current_user, get_optional_user, require_admin
    └── v1/endpoints/
        auth.py, users.py, capsules.py, notifications.py,
        room1.py, room2.py, room3.py, diaries.py,
        admin_rooms.py, admin_diaries.py, admin_capsules.py, admin_studio.py
```

---

## 4. Quy ước response & lỗi (áp dụng toàn hệ thống)

### 4.1 Response thành công
Spec dùng **2 khoá khác nhau** — phải giữ đúng từng endpoint:
- Nhóm 1 (`register`, `login`): payload nằm trong khoá **`body`**.
- Tất cả nhóm còn lại: payload nằm trong khoá **`data`**.
- Một số endpoint chỉ có `success` + `message` (không có `data`).

```python
# app/core/responses.py
def ok(data=None, message: str | None = None, key: str = "data") -> dict:
    out = {"success": True}
    if message is not None: out["message"] = message
    if data is not None: out[key] = data
    return out
```
Router trả `JSONResponse(status_code=..., content=jsonable_encoder(ok(...)))` hoặc khai báo `status_code` trên decorator.

### 4.2 Response lỗi (chuẩn hoá, theo mẫu 423 ở API 6.2)
```json
{ "success": false, "error_code": "SNAKE_UPPER_CODE", "message": "Thông điệp tiếng Việt", "data": null }
```
```python
# app/core/exceptions.py
class AppException(Exception):
    def __init__(self, status_code: int, error_code: str, message: str, data: dict | None = None): ...
```
Đăng ký handler trong `main.py` cho:
- `AppException` → đúng format trên.
- `RequestValidationError` → **400** `VALIDATION_ERROR`, `data = {"errors": [{"field": "...", "message": "..."}]}`.
- `StarletteHTTPException` → giữ status, `error_code` = `HTTP_<status>`.
- `Exception` → 500 `INTERNAL_ERROR` (không lộ stacktrace).

### 4.3 Error code dùng chung
| Status | error_code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body/query sai |
| 401 | `UNAUTHORIZED` | Thiếu/sai/hết hạn/đã thu hồi token trên endpoint bắt buộc đăng nhập |
| 403 | `FORBIDDEN` | Sai quyền (không phải admin, không phải chủ sở hữu) |
| 403 | `ACCOUNT_LOCKED` | `is_active = FALSE` |
| 404 | `NOT_FOUND` / mã cụ thể | Không tìm thấy |
| 409 | `CONFLICT` / mã cụ thể | Trùng dữ liệu |
| 429 | `RATE_LIMITED` | Spam |

### 4.4 Phân trang
- Query: `page` (int ≥1, mặc định theo từng endpoint), `limit` (int ≥1, mặc định & tối đa theo từng endpoint; nếu spec không ghi tối đa → **100**).
- Output mặc định: `{"page", "limit", "total_items", "total_pages"}`; `total_pages = ceil(total_items / limit)` (0 nếu không có bản ghi).
- **Ngoại lệ tên khoá** (giữ đúng spec): endpoint search dùng `total_hits` (không có `total_pages`); admin pending dùng `total_pending`. Ghi rõ trong từng plan.

### 4.5 Định dạng dữ liệu
- `TIMESTAMPTZ` → ISO-8601 UTC có hậu tố `Z` (vd `2026-10-24T15:30:00Z`). Cấu hình Pydantic serializer chung.
- `DATE` → `YYYY-MM-DD`.
- UUID → chuỗi thường. `message_capsules.id` → số nguyên.
- Path param UUID sai định dạng → **404** (không phải 400/422), tránh lộ thông tin.

---

## 5. Xác thực & phân quyền

### 5.1 JWT
- HS256, `SECRET_KEY` từ env. Claims: `sub` (user UUID str), `role` (`USER|ADMIN`), `jti` (uuid4 hex), `iat`, `exp = iat + 86400`.
- Không có refresh token (spec không định nghĩa).

### 5.2 Dependencies (`app/api/deps.py` — viết lại)
| Dependency | Hành vi |
|---|---|
| `get_current_user` | Bắt buộc `Authorization: Bearer`. Lỗi decode / `jti` nằm trong `revoked_tokens` / user không tồn tại → 401 `UNAUTHORIZED`. `is_active = FALSE` → 403 `ACCOUNT_LOCKED`. |
| `get_optional_user` | Dùng cho endpoint "Public (tùy chọn Token)". Không có header → `None`. Token lỗi/hết hạn → **`None`** (coi như khách, không chặn trang public). |
| `require_admin` | `get_current_user` + `role == 'ADMIN'`, sai → 403 `FORBIDDEN`, message `"Yêu cầu quyền Quản trị viên"`. Áp dụng cho **toàn bộ** router `/admin/*` qua `APIRouter(dependencies=[Depends(require_admin)])`. |

Dùng `HTTPBearer(auto_error=False)` thay cho `OAuth2PasswordBearer` (login của spec là JSON, không phải form).

---

## 6. Service dùng chung

### 6.1 `NotificationService.create(db, *, recipient_id, type, title, body, target_url=None, sender_id=None) -> Notification`
- Chỉ `INSERT`, **không commit** — commit cùng transaction của nghiệp vụ gọi nó.
- `type ∈ {INTERACTION, CAPSULE, SYSTEM, REMINDER}`.
- Quy ước `sender`:
  - Thông báo kiểm duyệt (SYSTEM) từ admin → `sender_id = admin.id`.
  - Thông báo tương tác (INTERACTION) → `sender_id = NULL` để **bảo toàn ẩn danh** (khi hiển thị → "Người Bạn Ẩn Danh", xem plan_04).
  - Không gửi thông báo khi người tương tác chính là tác giả.

### 6.2 `ReactionService` (artwork_interactions)
- `summary(db, artwork_ids: list[UUID], types: list[str]) -> dict[UUID, dict]` — 1 query `GROUP BY artwork_id, reaction_type`; luôn trả đủ key với giá trị 0 + `total`.
- `my_reactions(db, artwork_ids, user_id) -> dict[UUID, list[str]]`.
- Tránh N+1: list endpoint gọi summary 1 lần cho cả trang.
- Hành vi toggle khác nhau giữa phòng 1 và phòng 3 — xem plan_05 và plan_07.

### 6.3 `StorageService`
- Interface: `async save(file: UploadFile, folder: str, filename_stem: str) -> str (public URL)`.
- Mặc định `LocalStorage`: ghi vào `backend/uploads/<folder>/`, mount `app.mount("/static", StaticFiles(directory="uploads"))`, URL = `${PUBLIC_BASE_URL}/static/<folder>/<file>`.
- Có thể thêm `S3Storage`/`CloudinaryStorage` sau bằng env `STORAGE_BACKEND`.
- Validate: MIME (`content_type`) **và** magic bytes (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WEBP `RIFF....WEBP`); vượt dung lượng → 400 `FILE_TOO_LARGE`; sai định dạng → 400 `UNSUPPORTED_FILE_TYPE`. Đọc theo chunk, dừng khi vượt giới hạn.

### 6.4 `AuditLogService.log(db, *, artwork, admin_id, action_type, note=None)`
- Ghi vào `admin_audit_logs` (snapshot `artwork_title`, `room_id`). Không commit riêng.
- Được gọi bởi: plan_09 (APPROVE / APPROVE_AND_UPLOAD_MEDIA / REJECT / UPDATE / ARCHIVE), plan_12 (CREATE_DIRECT).

### 6.5 `SearchService` (API 5.4, 6.4, 7.5, 8.3.1)
Spec yêu cầu Elasticsearch, nhưng hạ tầng hiện **chưa có** ES. Thiết kế:
- Interface `search_artworks(room_id, q, filters, user, page, limit)` và `search_diaries(...)` trả `(items, total_hits)`, mỗi item có `highlight: dict[str, list[str]]`.
- **Phạm vi tìm kiếm của `q` trên Tác phẩm (`artworks`)**:
  Tìm kiếm toàn diện trên **tất cả các trường nội dung và song ngữ**:
  `title`, `title_vi`, `title_en`, `short_content`, `short_content_vi`, `short_content_en`, `content`, `content_vi`, `content_en`, `author_display_name`.
  Một tác phẩm được coi là khớp nếu từ khóa `q` xuất hiện ở **bất kỳ trường nào** trong số các trường trên.
- **Backend mặc định `PostgresSearchBackend`**:
  - Điều kiện FTS & Unaccent: Sử dụng `to_tsvector` kết hợp `plainto_tsquery` trên toàn bộ các trường text/bilingual, đồng thời dùng `unaccent(lower(...)) LIKE unaccent(lower('%' || :q || '%'))` để hỗ trợ tìm kiếm tiếng Việt không dấu (gõ không dấu vẫn tìm ra bài viết có dấu).
  - Highlight: Sử dụng `ts_headline('simple', <field>, plainto_tsquery('simple', :q), 'StartSel=<em>, StopSel=</em>')`. Bất kỳ trường nào (`title`, `content`, `short_content`, v.v.) có chứa từ khóa khớp đều được sinh snippet chứa thẻ `<em>...</em>` trong object `highlight`.
  - Trường `title` trong item kết quả trả về **bản đã highlight** nếu có từ khóa khớp ở tiêu đề.
  - Sắp xếp: Ưu tiên `ts_rank` DESC (độ liên quan cao nhất lên đầu), tiếp theo là `created_at` DESC.
- `ElasticsearchBackend` (tùy chọn, bật khi có `ELASTICSEARCH_URL`): index `artworks_index`, `diaries_index`; multi_match fields gồm toàn bộ 10 trường trên; đồng bộ index khi tạo/sửa/duyệt/lưu trữ. **Không bắt buộc ở phiên bản đầu.**
- `q` rỗng/thiếu → 400 `VALIDATION_ERROR`.

### 6.6 Ràng buộc và Hiển thị tên tác giả tác phẩm (`author_display_name`)
- **Ràng buộc khi tạo bài (Plan 05, 06, 07)**:
  - Người dùng **KHÔNG được tự nhập** `author_display_name` khi đăng tác phẩm lên các phòng triển lãm. Trường này bị loại bỏ khỏi Request Body phía client.
  - Backend **bắt buộc tự động gán** `artworks.author_display_name = current_user.nickname` từ tài khoản người dùng đang đăng nhập.
  - *(Ngoại lệ duy nhất)*: Chỉ tại Plan 12 (Admin Studio) khi Admin/Ban Quản Trị xuất bản tác phẩm chính thức thì Admin mới được chỉ định tên hiển thị đại diện như `"Triển Lãm Ký Ức (Ban Quản Trị)"`.
- **Hiển thị ra ngoài công chúng (Output)**:
```
author_display_name (output) =
    "Người Bạn Ẩn Danh"            nếu artworks.is_anonymous = TRUE
    artworks.author_display_name   nếu is_anonymous = FALSE (được gán bằng nickname người dùng)
```
Endpoint public **không bao giờ** trả `user_id`/`username`/`email` của tác giả.

### 6.7 Hằng số (`app/core/constants.py`)
```python
ROOM_BROKEN, ROOM_HOPE, ROOM_COMMUNITY = 1, 2, 3
ROOM3_COLOR_LEGEND = [
  {"category": "ENCOURAGEMENT", "color_code": "#FFD700", "label": "Lời khích lệ, động viên kiên trì"},
  {"category": "HEALING",       "color_code": "#98FB98", "label": "Lời chữa lành, bình an tâm hồn"},
  {"category": "GRATITUDE",     "color_code": "#FFB6C1", "label": "Lời cảm ơn, trân trọng cuộc sống"},
  {"category": "PERSPECTIVE",   "color_code": "#87CEFA", "label": "Lời chia sẻ góc nhìn cuộc sống"},
]
CAPSULE_CATEGORIES = ["HEALING", "COURAGE", "PERSPECTIVE"]
ROOM1_REACTIONS = ["HEART", "HUG", "SYMPATHY"]
DIARY_REACTIONS = ["HEART", "HUG", "SYMPATHY"]
ANONYMOUS_NAME = "Người Bạn Ẩn Danh"
```

---

## 7. Kiểm thử chung
- `pytest` + `pytest-asyncio` + `httpx.AsyncClient(transport=ASGITransport(app))`.
- DB test: PostgreSQL thật (docker), mỗi test chạy trong transaction rollback; nạp `01_schema.sql` + `03_extensions.sql` một lần mỗi session.
- Fixtures: `user`, `other_user`, `admin`, `locked_user`, `auth_headers(user)`, `rooms` (seed 3 phòng).
- Mỗi plan có mục "Test bắt buộc"; một nhóm chỉ coi là xong khi toàn bộ test pass.

## 8. Definition of Done (mỗi nhóm)
1. Path, method, query, body, status code, khoá JSON và **chuỗi `message` tiếng Việt khớp nguyên văn** spec.
2. Không logic nghiệp vụ trong router.
3. Không N+1 query ở endpoint danh sách.
4. Test bắt buộc pass.
5. Endpoint hiển thị đúng trên `/docs` với tag tên nhóm.

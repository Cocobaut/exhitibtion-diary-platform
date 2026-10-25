# 🎓 User & Authentication Service - FastAPI Backend API

Hệ thống Backend RESTful API phục vụ module **Quản lý Người dùng & Xác thực Phân quyền (User Management & Auth API)**, được xây dựng chuẩn Enterprise bằng **FastAPI**, **PostgreSQL (asyncpg)**, **SQLAlchemy 2.0 (Async)** và cơ chế xác thực **JWT (Access & Refresh Token) + RBAC**.

---

## 🚀 Công nghệ sử dụng

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **Database**: PostgreSQL 16 (Hỗ trợ AsyncIO driver `asyncpg`)
- **ORM**: SQLAlchemy 2.0 (Async Session) & Alembic (Database Migrations)
- **Data Validation & Settings**: Pydantic v2 & Pydantic-Settings
- **Bảo mật & Xác thực**:
  - Mã hóa mật khẩu: `bcrypt`
  - Token chuẩn: `PyJWT` (Access Token + Refresh Token)
  - Phân quyền (RBAC): `ADMIN` (Quản trị viên), `STUDENT` (Sinh viên), `VISITOR` (Khách), `EVALUATOR` (Giám khảo)
- **Containerization**: Docker & Docker Compose (tích hợp Adminer Web GUI quản lý DB)

---

## 📁 Cấu trúc thư mục (Clean Architecture)

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py               # Dependency injection (get_db, get_current_user, require_roles)
│   │   └── v1/
│   │       ├── api.py            # Tổng hợp Router API v1
│   │       └── endpoints/
│   │           ├── auth.py       # Đăng ký, đăng nhập (JSON & OAuth2 Form), Refresh token, Profile (/me)
│   │           └── users.py      # Quản lý người dùng, phân quyền (Dành cho Admin)
│   ├── core/
│   │   ├── config.py             # Cấu hình Pydantic BaseSettings, nạp từ file .env
│   │   ├── database.py           # Thiết lập kết nối AsyncEngine & AsyncSession
│   │   └── security.py           # Logic băm mật khẩu bcrypt và mã hóa/giải mã JWT
│   ├── models/                   # SQLAlchemy ORM Models
│   │   ├── base.py               # TimestampMixin (created_at, updated_at)
│   │   └── user.py               # User Model & UserRole Enum
│   ├── schemas/                  # Pydantic Schemas (Request/Response Validation)
│   │   ├── token.py              # Token & RefreshToken schemas
│   │   └── user.py               # UserRegister, UserLogin, UserUpdate, UserResponse
│   ├── services/                 # Business Logic Layer
│   │   └── user_service.py       # Logic xác thực, CRUD tài khoản, seed admin
│   └── main.py                   # Điểm khởi chạy FastAPI, cấu hình CORS, Lifespan auto-seed
├── alembic/                      # Quản lý database migrations
│   ├── env.py
│   └── versions/
├── alembic.ini
├── Dockerfile                    # Docker build cho FastAPI backend
├── docker-compose.yml            # Khởi chạy PostgreSQL, Backend & Adminer
├── requirements.txt              # Danh sách thư viện Python
├── .env & .env.example           # Cấu hình môi trường
├── run.py                        # Script chạy nhanh backend bằng lệnh python run.py
└── README.md
```

---

## ⚡ Hướng dẫn cài đặt & Chạy ứng dụng

### Cách 1: Khởi chạy 1-Click bằng Docker (Khuyên dùng)

Yêu cầu máy tính đã cài Docker Desktop.

1. Mở terminal tại thư mục `backend/`:
   ```bash
   docker compose up -d --build
   ```
2. Sau khi chạy, các dịch vụ sẽ sẵn sàng:
   - **FastAPI API & Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Adminer (Trình quản lý giao diện PostgreSQL)**: [http://localhost:8080](http://localhost:8080)
     - *System*: `PostgreSQL`
     - *Server*: `db`
     - *Username*: `postgres`
     - *Password*: `postgrespassword`
     - *Database*: `exhibition_diary_db`

---

### Cách 2: Khởi chạy trên máy cục bộ (Local Python)

1. **Tạo và kích hoạt môi trường ảo (Virtualenv)**:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. **Cài đặt thư viện dependencies**:
   ```powershell
   python -m pip install -r requirements.txt
   ```

3. **Cấu hình Database trong file `.env`**:
   - Nếu bạn dùng PostgreSQL:
     ```env
     DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/exhibition_diary_db
     ```
   - *Mẹo test nhanh với SQLite (không cần cài server DB)*:
     ```env
     DATABASE_URL=sqlite+aiosqlite:///./exhibition_diary.db
     ```

4. **Khởi chạy máy chủ phát triển**:
   ```powershell
   python run.py
   # hoặc:
   uvicorn app.main:app --reload --port 8000
   ```

---

## 🔑 Tài khoản Quản trị viên (Admin) mặc định

Hệ thống được lập trình tự động kiểm tra và khởi tạo tài khoản Superuser đầu tiên khi khởi động:

- **Email**: `admin@exhibition.edu.vn`
- **Password**: `AdminPassword@2026`
- **Vai trò (Role)**: `ADMIN` (Toàn quyền quản trị hệ thống)

---

## 📑 Danh sách API Endpoints

### 1. Authentication & Profile (`/api/v1/auth`)
| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Công khai | Đăng ký tài khoản (Mặc định: Sinh viên / Khách) |
| `POST` | `/api/v1/auth/login` | Công khai | Đăng nhập bằng JSON (Email & Password) |
| `POST` | `/api/v1/auth/login/access-token` | Công khai | Đăng nhập chuẩn OAuth2 Form (Dùng nút Authorize Swagger) |
| `POST` | `/api/v1/auth/refresh-token` | Công khai | Nhận access token mới từ refresh token |
| `GET` | `/api/v1/auth/me` | Authenticated | Lấy thông tin tài khoản hiện tại |
| `PUT` | `/api/v1/auth/me` | Authenticated | Cập nhật thông tin cá nhân |
| `PUT` | `/api/v1/auth/change-password` | Authenticated | Đổi mật khẩu |

### 2. Quản lý Người dùng & Phân quyền (`/api/v1/users`)
| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users` | Admin | Danh sách người dùng (Tìm kiếm theo MSSV/tên/email, lọc theo role) |
| `POST` | `/api/v1/users` | Admin | Tạo người dùng mới với role tùy chọn |
| `GET` | `/api/v1/users/{id}` | Authenticated | Xem chi tiết người dùng |
| `PUT` | `/api/v1/users/{id}` | Admin | Thay đổi role, khóa/mở khóa tài khoản |

---

## 🧪 Tài liệu tương tác Swagger UI

Truy cập: **[http://localhost:8000/docs](http://localhost:8000/docs)**
- Nhấn nút **Authorize** ở góc trên bên phải Swagger UI để đăng nhập và tự động gửi Bearer token vào tất cả request có bảo mật.

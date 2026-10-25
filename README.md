# 🌟 Project Exhibition & Diary Platform

Nền tảng Quản lý Triển lãm Dự án và Nhật ký Tiến độ (HCMUT Business Communication Project).

## 📂 Cấu trúc Repository

- [`backend/`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend): Source code Backend xây dựng bằng **FastAPI**, **PostgreSQL (asyncpg)**, **SQLAlchemy 2.0 (Async)** và xác thực **JWT + RBAC**.
  - Đầy đủ các module: Xác thực & Phân quyền, Quản lý tài khoản, Dự án/Gian hàng triển lãm, Nhật ký tiến độ theo tuần (Logbook).
  - Hỗ trợ Docker Compose 1-click & Alembic migrations.
  - Xem hướng dẫn chi tiết tại [backend/README.md](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/README.md).

## 🚀 Khởi động nhanh Backend

```bash
cd backend
docker compose up -d
```
Truy cập tài liệu API tự động tại: [http://localhost:8000/docs](http://localhost:8000/docs)

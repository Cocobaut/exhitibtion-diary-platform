# Bảo Tàng Gọi Tên Cảm Xúc (The Name of Feeling Museum)

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Google Gemini](https://img.shields.io/badge/AI_Copilot-Google_Gemini-8E75C4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![Bilingual](https://img.shields.io/badge/Language-VI_%7C_EN-FFB74D?style=flat-square)](#-hỗ-trợ-song-ngữ-toàn-diện)

Nền tảng web cho phép mọi người chia sẻ những lần vấp ngã, gửi thư cho chính mình trong tương lai, để lại lời động viên cho người lạ và viết nhật ký cảm xúc trong một không gian an toàn, có kiểm duyệt.

Dự án được thực hiện trong khuôn khổ Community Project của học phần **Business Communication**, Trường Đại học Bách Khoa – ĐHQG TP.HCM (HCMUT).

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Các không gian trải nghiệm](#2-các-không-gian-trải-nghiệm)
3. [Vai trò và phân quyền](#3-vai-trò-và-phân-quyền)
4. [Ngôn ngữ của nội dung người dùng](#4-ngôn-ngữ-của-nội-dung-người-dùng)
5. [AI Copilot cho ban quản trị](#5-ai-copilot-cho-ban-quản-trị)
6. [Bảo mật](#6-bảo-mật)
7. [Kiến trúc và công nghệ](#7-kiến-trúc-và-công-nghệ)
8. [Cấu trúc thư mục](#8-cấu-trúc-thư-mục)
9. [Chạy dự án trên máy cá nhân](#9-chạy-dự-án-trên-máy-cá-nhân)
10. [Kiểm thử](#10-kiểm-thử)
11. [Biến môi trường](#11-biến-môi-trường)
12. [Triển khai production](#12-triển-khai-production)

---

## 1. Tổng quan

Bảo Tàng Gọi Tên Cảm Xúc mô phỏng một bảo tàng gồm một sảnh chính và ba phòng triển lãm. Mỗi phòng dành cho một cách bày tỏ cảm xúc khác nhau. Người dùng có thể:

- Kể về một lần vấp ngã và nhận lại sự đồng cảm thay vì lời phán xét.
- Viết thư cho chính mình, hẹn ngày mở trong tương lai.
- Để lại lời động viên ngắn cho những người đang cần nghe.
- Ghi nhật ký cảm xúc riêng tư, hoặc chọn chia sẻ với cộng đồng.

Mọi nội dung công khai đều qua ban quản trị duyệt trước khi hiển thị. Khi phê duyệt, ban quản trị có thể dùng AI để chấm điểm an toàn, gợi ý bản viết lại và dịch nháp.

Giao diện hỗ trợ tiếng Việt và tiếng Anh. Khách chưa đăng nhập vẫn xem được toàn bộ nội dung công khai. Khi họ muốn tương tác, hệ thống mời đăng nhập.

---

## 2. Các không gian trải nghiệm

| Không gian | Mục đích | Tương tác chính |
| :--- | :--- | :--- |
| **Sảnh** | Điểm bắt đầu, dẫn tới các phòng | Hòm thư, lối vào Nhật ký, thông báo |
| **Phòng 1 – Triển lãm Đổ vỡ** | Kể về một lần vấp ngã. Mỗi câu chuyện được ban quản trị vẽ tranh minh họa rồi treo lên tường | Thương, Ôm an ủi, Đồng cảm; lưu vào Sổ tay |
| **Phòng 2 – Bầu trời Lồng đèn** | Viết thư cho tương lai và chọn ngày mở thư. Lồng đèn riêng tư bay lên ngay; lồng đèn công khai bay lên sau khi được duyệt | Mở thư khi đến hạn, gửi cảm xúc, lưu vào Sổ tay |
| **Phòng 3 – Cây Thông điệp** | Treo lời động viên ngắn lên cây, chia theo 4 chủ đề: Khích lệ, Chữa lành, Biết ơn, Góc nhìn | Tiếp sức, Thương; lưu vào Sổ tay |
| **Nhật ký** | Ghi nhật ký kèm tâm trạng (Bình yên, Trầm lắng, Biết ơn, Hy vọng, Mệt mỏi) và tối đa 5 ảnh. Có thể giữ riêng hoặc gửi duyệt để chia sẻ | Tab Bản thân và tab Cộng đồng |
| **Hòm thư** | Rút ngẫu nhiên một lời nhắn do ban quản trị soạn, theo chủ đề Can đảm, Chữa lành, Góc nhìn | Rút lời nhắn khác, lưu vào Sổ tay |
| **Sổ tay** | Nơi lưu những tác phẩm, lá thư và lời nhắn người dùng muốn giữ lại | Lọc theo nguồn, tìm kiếm, bỏ lưu |

Ở Phòng 1, phần tóm tắt trên thẻ là tuỳ chọn. Nếu người dùng để trống, hệ thống lấy câu đầu tiên của câu chuyện.

---

## 3. Vai trò và phân quyền

| Chức năng | Khách | Thành viên | Admin | Owner |
| :--- | :---: | :---: | :---: | :---: |
| Xem các phòng, tác phẩm, lá thư, lời động viên | Có | Có | Có | Có |
| Gửi cảm xúc, lưu vào Sổ tay | Mời đăng nhập | Có | Có | Có |
| Gửi tác phẩm, thả lồng đèn, treo lời động viên | Không | Có | Có | Có |
| Viết và quản lý nhật ký cá nhân | Không | Có | Có | Có |
| Duyệt, chỉnh sửa, lưu trữ nội dung các phòng và nhật ký | Không | Không | Có | Có |
| Studio minh họa, quản lý kho lời nhắn Hòm thư | Không | Không | Có | Có |
| Xem nhật ký thao tác quản trị | Không | Không | Có | Có |
| Cấp hoặc thu hồi quyền Admin | Không | Không | Không | Có |
| Cấu hình nhà cung cấp AI và API key | Không | Không | Không | Có |

Bản production không có tài khoản tạo sẵn. Tài khoản Owner đầu tiên được tạo bằng script; sau đó Owner cấp quyền Admin cho các thành viên đã đăng ký (xem [DEPLOY.md](DEPLOY.md)).

---

## 4. Ngôn ngữ của nội dung người dùng

Nút VI/EN chỉ đổi ngôn ngữ giao diện. Bài viết của người dùng luôn hiển thị đúng ngôn ngữ mà tác giả đã viết.

- **Khi đăng bài:** backend tự nhận diện bài viết bằng tiếng Việt hay tiếng Anh từ chính nội dung (`backend/app/core/language.py`), không dựa vào ngôn ngữ giao diện. Tiếng Việt gõ không dấu cũng được nhận diện.
- **Khi duyệt bài:** bản dịch không bắt buộc. Admin có thể tự nhập bản dịch, hoặc bấm "Dịch bằng AI" để có bản nháp rồi đọc lại trước khi lưu. Cột nội dung gốc của tác giả không bao giờ bị ghi đè.
- **Khi đọc bài:** nếu bài đã có bản dịch sang ngôn ngữ đang chọn, dưới nội dung có liên kết "Xem bản dịch" để người đọc tự bật.
- **Nhật ký riêng tư** không bao giờ được gửi đi dịch.

Lời nhắn trong Hòm thư do ban quản trị soạn sẵn cả hai thứ tiếng, nên vẫn đổi theo ngôn ngữ giao diện.

---

## 5. AI Copilot cho ban quản trị

AI chỉ hỗ trợ ban quản trị và không tự đăng bất kỳ nội dung nào. Owner bật hoặc tắt AI, chọn nhà cung cấp (Google Gemini hoặc API tương thích OpenAI) và nhập API key trên trang Owner. Key được mã hoá AES-256-GCM trước khi lưu vào database.

```mermaid
flowchart LR
    A["Người dùng gửi bài"] --> B["Hàng chờ duyệt"]
    B --> C["Admin mở bài"]
    C -->|"Phân tích bằng AI"| D["Lọc từ cấm và thông tin cá nhân<br/>+ LLM chấm điểm theo rubric 100 điểm"]
    D --> E["Điểm, danh sách vi phạm,<br/>gợi ý phòng phù hợp, bản viết lại"]
    C -->|"Dịch bằng AI"| F["Bản dịch nháp VI ↔ EN"]
    C -->|"Sinh tranh"| G["Tranh minh họa theo cảm xúc bài viết"]
    E --> H["Admin quyết định"]
    F --> H
    G --> H
    H -->|"Duyệt"| I["Hiển thị công khai"]
    H -->|"Từ chối"| J["Thông báo kèm lý do cho tác giả"]
```

| Chức năng | Dịch vụ | Mô tả |
| :--- | :--- | :--- |
| Kiểm duyệt | `ai_moderation_service.py`, `badwords_service.py` | Lọc từ cấm (kể cả teencode, leet), phát hiện số điện thoại, mạng xã hội, số tài khoản; LLM chấm điểm theo rubric và đề xuất bản viết lại không thêm tình tiết |
| Dịch nháp | `ai_translation_service.py` | Dịch tiêu đề, tóm tắt, nội dung, giữ giọng văn tác giả; admin đọc lại trước khi lưu |
| Sinh tranh | `ai_image_service.py` | Tạo tranh minh họa từ nội dung bài viết; có ảnh dự phòng khi nhà cung cấp không phản hồi |
| Chọn model | `ai_discovery_service.py` | Tự truy vấn danh sách model khả dụng của API key khi model cấu hình không còn hoạt động |

### Đánh giá thực nghiệm

Pipeline kiểm duyệt được đo trên 32 kịch bản trong `Agent/golden_dataset.json`. Một số kết quả chính:

| Chỉ số | Gemini `gemini-3-flash-preview` | Rule engine offline |
| :--- | :---: | :---: |
| Tỷ lệ hoàn thành tác vụ | 84,38% | 87,50% |
| Độ chính xác phán quyết duyệt / không duyệt | 93,75% | 93,75% |
| Định tuyến đúng phòng | 100% | 100% |
| Tuân thủ JSON schema | 100% | 100% |
| F1 phát hiện vi phạm | 97,40% | 98,96% |
| Trích dẫn vi phạm khớp nguyên văn bài gốc | 100% | 100% |
| Độ trễ trung vị | khoảng 2,3 giây | khoảng 1,3 ms |

Báo cáo đầy đủ nằm ở [`Agent/EVALUATION_REPORT.md`](Agent/EVALUATION_REPORT.md). Chạy lại bộ đánh giá:

```bash
python Agent/evaluate_agent.py                                   # rule engine offline
python Agent/evaluate_agent.py --provider gemini --api-key <KEY> --model gemini-3-flash-preview
```

---

## 6. Bảo mật

- Mật khẩu băm bằng bcrypt và phải có chữ hoa, chữ thường, số, ký tự đặc biệt.
- JWT có thể thu hồi khi đăng xuất.
- Quên mật khẩu dùng link một lần gửi qua email, hết hạn sau 15 phút. Phản hồi không tiết lộ email nào đã đăng ký.
- Giới hạn số lần đăng nhập sai và số lần yêu cầu email đặt lại mật khẩu.
- Giới hạn tần suất gửi tác phẩm.
- Backend từ chối khởi động với `SECRET_KEY` mặc định khi `DEBUG=False`. Trang tài liệu API chỉ mở ở chế độ debug.
- Trên production chỉ reverse proxy (Caddy, HTTPS tự động) mở cổng ra ngoài. Database và backend nằm trong mạng nội bộ của Docker.

---

## 7. Kiến trúc và công nghệ

```mermaid
flowchart LR
    U["Trình duyệt"] -->|"HTTPS"| C["Caddy<br/>(chỉ có ở production)"]
    C --> N["nginx<br/>React SPA"]
    N -->|"/api, /static"| B["FastAPI"]
    B --> P[("PostgreSQL")]
    B --> V[("Volume uploads")]
    B -.->|"khi Owner bật AI"| L["Gemini / OpenAI API"]
    B -.->|"SMTP"| M["Email"]
```

| Thành phần | Công nghệ |
| :--- | :--- |
| Frontend | React 18, Vite 5, Axios; phục vụ bằng nginx |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 (async), asyncpg |
| Cơ sở dữ liệu | PostgreSQL 16 |
| Xác thực | JWT (PyJWT), bcrypt |
| AI | Google Gemini hoặc API tương thích OpenAI, gọi qua httpx |
| Hạ tầng | Docker Compose; Caddy cho HTTPS ở production |

---

## 8. Cấu trúc thư mục

```
exhitibtion-diary-platform/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # auth, users, room1-3, diaries, capsules, notebook,
│   │   │                        # notifications, admin_*, owner, owner_ai
│   │   ├── core/                # cấu hình, bảo mật, mã hoá, nhận diện ngôn ngữ, giới hạn tần suất
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   └── services/            # nghiệp vụ: phòng, nhật ký, kiểm duyệt, AI, email...
│   ├── database/
│   │   ├── 01_schema.sql              # cấu trúc bảng
│   │   ├── 02_seed.sql                # dữ liệu demo kèm tài khoản mẫu (chỉ dùng cho dev)
│   │   ├── 02_seed_production.sql     # dữ liệu hệ thống, không có tài khoản
│   │   └── badwords_seed.json         # từ điển từ ngữ vi phạm
│   ├── scripts/create_owner.py  # tạo tài khoản Owner đầu tiên
│   ├── tests/                   # pytest
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/          # thành phần dùng chung, overlay, layout, admin
│   │   ├── context/             # Auth, GuestGuard, Language, Theme
│   │   ├── pages/               # Lobby, Room1-3, Diary, Notebook, Admin, Owner, Profile, Auth
│   │   └── services/            # client gọi API
│   ├── nginx.conf               # proxy /api và /static sang backend
│   └── Dockerfile
├── Agent/                       # bộ dữ liệu và script đánh giá AI Copilot
├── deploy/
│   ├── Caddyfile                # reverse proxy và HTTPS cho production
│   └── backup.sh                # sao lưu database và ảnh tải lên
├── docker-compose.yml           # môi trường dev
├── docker-compose.prod.yml      # môi trường production
└── DEPLOY.md                    # hướng dẫn triển khai lên Azure
```

---

## 9. Chạy dự án trên máy cá nhân

### Cách khuyến nghị: Docker Compose

Yêu cầu: Docker và Docker Compose.

```bash
cp .env.example .env
# Điền SECRET_KEY, ví dụ: openssl rand -hex 32
docker compose up -d --build
```

| Địa chỉ | Nội dung |
| :--- | :--- |
| http://localhost:3000 | Ứng dụng |
| http://localhost:8000/docs | Tài liệu API (cần `DEBUG=True` trong `.env`) |
| http://localhost:8080 | Adminer, bật bằng `docker compose --profile tools up -d` |

Lần chạy đầu, PostgreSQL tự tạo bảng từ `01_schema.sql` và nạp dữ liệu demo từ `02_seed.sql`. Muốn nạp lại từ đầu, chạy `docker compose down -v && docker compose up -d`. Lệnh này xoá toàn bộ dữ liệu hiện có.

Nếu cổng bị trùng, đổi `FRONTEND_PORT` hoặc `BACKEND_PORT` trong `.env`. Ở chế độ dev, email quên mật khẩu được in ra log của backend (`docker compose logs backend`) thay vì gửi thật.

**Tài khoản demo** (chỉ có trong `02_seed.sql`, không dùng cho production):

| Vai trò | Tên đăng nhập | Mật khẩu |
| :--- | :--- | :--- |
| Owner | `owner_master` | `AdminPassword@2026` |
| Admin | `admin_exhibition` | `AdminPassword@2026` |
| Thành viên | `minh_tam` | `UserPassword@2026` |

### Chạy thủ công

Yêu cầu: Python 3.10 trở lên, Node.js 18 trở lên, PostgreSQL 15 trở lên.

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate            # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env                # chỉnh DATABASE_URL và SECRET_KEY

psql "postgresql://user:pass@localhost:5432/exhibition_diary_db" -f database/01_schema.sql
psql "postgresql://user:pass@localhost:5432/exhibition_diary_db" -f database/02_seed.sql

uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev                         # http://localhost:3000
```

Mặc định frontend gọi API tại `http://localhost:8000/api/v1`. Có thể đổi bằng biến `VITE_API_BASE_URL` trong `frontend/.env`.

---

## 10. Kiểm thử

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

Bộ test dùng SQLite trong bộ nhớ nên không cần PostgreSQL. Phạm vi kiểm thử gồm xác thực và đặt lại mật khẩu, giới hạn tần suất, các phòng, nhật ký, hòm thư, thông báo, quản trị, Owner, AI Copilot, song ngữ và việc giữ ngôn ngữ gốc của bài viết.

---

## 11. Biến môi trường

Docker Compose đọc file `.env` ở thư mục gốc. Mẫu cho dev nằm ở `.env.example`, mẫu cho production nằm ở `.env.production.example`.

| Biến | Bắt buộc | Mô tả |
| :--- | :---: | :--- |
| `SECRET_KEY` | Có | Ký JWT và mã hoá API key AI. Tạo bằng `openssl rand -hex 32`, giữ cố định |
| `DEBUG` | Không | `True` để bật trang tài liệu API. Production luôn là `False` |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Có | Thông tin database |
| `DOMAIN` | Production | Tên miền, không kèm `https://` |
| `ACME_EMAIL` | Production | Email nhận thông báo chứng chỉ HTTPS |
| `PUBLIC_BASE_URL` | Không | URL công khai dùng để tạo đường dẫn ảnh tải lên |
| `BACKEND_CORS_ORIGINS` | Không | Danh sách origin được phép, ngăn cách bằng dấu phẩy |
| `EMAIL_BACKEND` | Không | `console` (in ra log) hoặc `smtp` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Khi dùng SMTP | Máy chủ gửi email, ví dụ Gmail với App password |
| `EMAILS_FROM_EMAIL`, `EMAILS_FROM_NAME` | Khi dùng SMTP | Địa chỉ và tên người gửi |
| `FRONTEND_PORT`, `BACKEND_PORT` | Không | Cổng khi chạy dev, mặc định 3000 và 8000 |

API key của nhà cung cấp AI không đặt trong biến môi trường. Owner nhập key trên trang Owner, và hệ thống lưu key ở dạng đã mã hoá.

---

## 12. Triển khai production

Hướng dẫn từng bước triển khai lên máy ảo Azure for Students nằm trong [DEPLOY.md](DEPLOY.md). Tài liệu gồm tạo máy ảo, trỏ tên miền, cấu hình HTTPS, tạo tài khoản Owner, sao lưu tự động, khôi phục dữ liệu và cập nhật phiên bản.

```bash
cp .env.production.example .env     # điền đầy đủ
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend python -m scripts.create_owner
```

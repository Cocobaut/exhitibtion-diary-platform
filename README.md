# 🏛️ Bảo Tàng Gọi Tên Cảm Xúc (The Name of Feeling Museum)
> *Nền tảng Không gian Nghệ thuật Số Trị liệu, Lưu giữ Nhật ký và Triển lãm Cảm xúc Đa chiều*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Google Gemini](https://img.shields.io/badge/AI_Copilot-Google_Gemini-8E75C4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![Bilingual](https://img.shields.io/badge/Language-VI_%7C_EN-FFB74D?style=flat-square)](#-hỗ-trợ-song-ngữ-toàn-diện)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#)

---

## 📖 Mục lục

- [1. Giới thiệu Tổng quan](#1-giới-thiệu-tổng-quan)
- [2. Bản đồ Không gian Trải nghiệm](#2-bản-đồ-không-gian-trải-nghiệm)
  - [🏛️ Sảnh chính (Lobby & Shared Chrome)](#-sảnh-chính-lobby--shared-chrome)
  - [🥀 Phòng 01: Triển lãm Đổ vỡ (Broken Exhibition)](#-phòng-01-triển-lãm-đổ-vỡ-broken-exhibition)
  - [🏮 Phòng 02: Thả đèn Hy vọng (Lanterns of Hope)](#-phòng-02-thả-đèn-hy-vọng-lanterns-of-hope)
  - [🌿 Phòng 03: Cây Nguyện Ước (Wish Tree)](#-phòng-03-cây-nguyện-ước-wish-tree)
  - [📖 Nhật ký Cảm xúc & Cộng đồng (Diary & Community)](#-nhật-ký-cảm-xúc--cộng-đồng-diary--community)
  - [📬 Hòm thư (Mailbox) & 📑 Sổ tay Lưu giữ (Notebook)](#-hòm-thư-mailbox--sổ-tay-lưu-giữ-notebook)
- [3. Ma trận Phân quyền Người dùng (RBAC)](#3-ma-trận-phân-quyền-người-dùng-rbac)
- [4. Các Tính năng Nổi bật](#4-các-tính-năng-nổi-bật)
- [5. Kiến trúc & Luồng Hoạt động của AI Copilot Agent](#5-kiến-trúc--luồng-hoạt-động-của-ai-copilot-agent)
  - [📊 Đánh giá Thực nghiệm & Bộ Metric của AI Copilot Agent](#-đánh-giá-thực-nghiệm--bộ-metric-của-ai-copilot-agent)
- [6. Cấu trúc Dự án (Repository Structure)](#6-cấu-trúc-dự-án-repository-structure)
- [7. Hướng dẫn Khởi chạy & Cài đặt (Getting Started)](#7-hướng-dẫn-khởi-chạy--cài-đặt-getting-started)
  - [Yêu cầu môi trường](#yêu-cầu-môi-trường)
  - [Khởi chạy Backend](#khởi-chạy-backend)
  - [Khởi chạy Frontend](#khởi-chạy-frontend)
- [8. Biến Môi trường (Environment Variables)](#8-biến-môi-trường-environment-variables)

---

## 1. Giới thiệu Tổng quan

**Bảo Tàng Gọi Tên Cảm Xúc** (*The Name of Feeling Museum*) là một nền tảng web ứng dụng nghệ thuật số tương tác cao, kết hợp giữa tâm lý học trị liệu (Art & Narrative Therapy), nhật ký cá nhân và công nghệ trí tuệ nhân tạo (Generative & Moderation AI Agent).

Được thiết kế theo phong cách mỹ cảm cổ điển đương đại (*Warm Parchment & Analog Paper Aesthetic*), bảo tàng tạo ra một chốn dừng chân tĩnh lặng trên không gian số, nơi mỗi người tham quan có thể:
1. Nhìn nhận và sẻ chia những vết thương, thất bại đời thường mà không sợ phán xét.
2. Gửi gắm những ước nguyện tương lai theo từng mốc thời gian xác định.
3. Nhận về sự an ủi, năng lượng tích cực từ những người đồng hành ẩn danh.
4. Trải nghiệm hệ sinh thái tương tác cảm xúc nhân văn thay thế cho các nút like/thả tim thông thường.

---

## 2. Bản đồ Không gian Trải nghiệm

```
                             ┌───────────────────────────────┐
                             │       LOBBY (SẢNH CHÍNH)      │
                             │   - Lễ tân đón tiếp           │
                             │   - Hòm thư bảo tàng          │
                             │   - Sổ tay cá nhân            │
                             │   - Thông báo thời gian thực  │
                             └──────────────┬────────────────┘
                                            │
         ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
         ▼                  ▼                               ▼                  ▼
┌─────────────────┐  ┌─────────────────┐             ┌─────────────────┐  ┌─────────────────┐
│     PHÒNG 01    │  │     PHÒNG 02    │             │     PHÒNG 03    │  │     NHẬT KÝ     │
│ Triển lãm Đổ vỡ │  │ Thả đèn Hy vọng │             │  Cây Nguyện Ước │  │ Cá nhân & C/đồng│
│ (Tranh & Thất bại)│ (Hộp thời gian)  │             │ (Lá trao gửi)   │  │ (Tâm trạng/Mood)│
└─────────────────┘  └─────────────────┘             └─────────────────┘  └─────────────────┘
```

### 🏛️ Sảnh chính (Lobby & Shared Chrome)
- **Cổng định hướng**: Điểm khởi đầu dẫn lối đến 3 phòng triển lãm và khu vực nhật ký.
- **Thanh điều hướng toàn cảnh (Top Navigation)**: Tích hợp bộ chuyển đổi ngôn ngữ (VI 🇻🇳 / EN 🇬🇧), công cụ tìm kiếm ngữ nghĩa theo phòng, lối tắt đến Hòm thư, Sổ tay lưu giữ và Quản trị viên (nếu có quyền).
- **Hệ thống Guest Guard**: Cho phép khách vãng lai tự do khám phá và chiêm ngưỡng toàn bộ tác phẩm; nhẹ nhàng gợi ý đăng nhập/đăng ký khi thực hiện hành động tương tác sâu.

### 🥀 Phòng 01: Triển lãm Đổ vỡ (Broken Exhibition)
- **Ý niệm**: Tôn vinh vẻ đẹp của sự vấp ngã (Kintsugi spirit) – biến những câu chuyện tan vỡ thành các tác phẩm nghệ thuật.
- **Quy trình đóng góp (Exhibit Artwork)**:
  - Khách tham quan chia sẻ câu chuyện thất bại/vấp ngã của bản thân.
  - Trường *Tiêu đề ngắn / Tóm tắt trên thẻ* (`short_content`) được thiết kế linh hoạt: **không bắt buộc nhập**, hệ thống sẽ tự động phân tích và trích xuất câu đầu tiên của câu chuyện để đưa vào thẻ tóm tắt.
  - Tác phẩm được gửi vào hàng đợi duyệt (`PENDING`), sau đó Giám tuyển (Admin) hoặc AI Copilot sẽ sáng tác tranh minh họa độc bản và treo lên bức tường triển lãm.
- **Tương tác cảm xúc**: Ôm an ủi (🫂 Warm Hug), Thương (❤️ Care), Đồng cảm (🌿 Empathy).

### 🏮 Phòng 02: Thả đèn Hy vọng (Lanterns of Hope)
- **Ý niệm**: Hộp thời gian cảm xúc (*Emotional Time Capsule*). Thả những ước vọng, lời nhắn nhủ vào lồng đèn bay trên bầu trời đêm.
- **Tính năng lồng đèn**:
  - Tùy chỉnh màu sắc, biểu tượng lồng đèn (trái tim, ngôi sao, hoa sen...).
  - Thiết lập **Ngày hạ cánh (Target Arrival Date)**: Lồng đèn sẽ bay lơ lửng giữa biển trời đêm theo tọa độ ngẫu nhiên.
  - Khi đến ngày hẹn, lồng đèn chính thức hạ cánh và mở nội dung cho cộng đồng ghé thăm.
- **Tương tác**: Mở đọc thư lồng đèn hạ cánh, phản hồi thư gửi tương lai, thả cảm xúc đồng cảm và lưu vào sổ tay.

### 🌿 Phòng 03: Cây Nguyện Ước (Wish Tree)
- **Ý niệm**: Cây đại thụ kết nối cộng đồng bằng những chiếc lá lời nhắn yêu thương.
- **Phân loại lá theo danh mục (Tag Categories)**:
  - 🟢 **Bình yên** (*Peace & Calm*)
  - 🟡 **Hy vọng** (*Hope & Dreams*)
  - 🟣 **Chữa lành** (*Healing & Recovery*)
  - 🔴 **Tri ân** (*Gratitude & Love*)
- **Tương tác**: Treo lá nguyện ước mới, nhấp đọc lá đung đưa trên cây, tiếp sức (⚡ Energize) và thả tim (❤️ Care).

### 📖 Nhật ký Cảm xúc & Cộng đồng (Diary & Community)
- **Nhật ký Cá nhân**:
  - Trình soạn thảo hoài niệm với phông chữ viết tay, bảng màu tâm trạng (Bình yên, Trầm lắng, Biết ơn, Hy vọng, Mệt mỏi).
  - Đính kèm hình ảnh kỷ niệm.
  - Tùy chọn quyền riêng tư: Giữ kín cho riêng mình (*Private*) hoặc gửi duyệt để chia sẻ đến Nhật ký cộng đồng (*Community*).
- **Nhật ký Cộng đồng**:
  - Không gian đọc chậm những trang viết chân thành đã được đội ngũ quản trị kiểm duyệt.
  - Bộ 3 nút cảm xúc tương tác trực tiếp (`HEART`, `HUG`, `SYMPATHY`).

### 📬 Hòm thư (Mailbox) & 📑 Sổ tay Lưu giữ (Notebook)
- **Hòm thư**: Nhận thông báo khi tác phẩm được vẽ xong và treo tường, lồng đèn chạm đích, lá nhận năng lượng hoặc thư phản hồi từ ban quản trị.
- **Sổ tay cá nhân (Notebook)**: Nơi cất giữ vĩnh viễn các tác phẩm, lá cây, lồng đèn mà bạn đã bấm lưu trong suốt hành trình tham quan.

---

## 3. Ma trận Phân quyền Người dùng (RBAC)

Hệ thống triển khai mô hình kiểm soát truy cập phân quyền nghiêm ngặt với 4 cấp độ:

| Chức năng / Hành động | GUEST (Khách) | USER (Thành viên) | ADMIN (Giám tuyển) | OWNER (Chủ bảo tàng) |
| :--- | :---: | :---: | :---: | :---: |
| **Xem các phòng, đọc tác phẩm, lá cây, lồng đèn** | ✅ | ✅ | ✅ | ✅ |
| **Thả cảm xúc (Reactions) đa dạng** | 🔒 *(Gợi ý đăng nhập)* | ✅ | ✅ | ✅ |
| **Lưu tác phẩm, lồng đèn, lá vào Sổ tay** | 🔒 *(Gợi ý đăng nhập)* | ✅ | ✅ | ✅ |
| **Gửi tác phẩm mới (Phòng 1)** | ❌ | ✅ | ✅ | ✅ |
| **Thả lồng đèn hẹn giờ (Phòng 2)** | ❌ | ✅ | ✅ | ✅ |
| **Treo lá nguyện ước (Phòng 3)** | ❌ | ✅ | ✅ | ✅ |
| **Viết & Quản lý Nhật ký cá nhân** | ❌ | ✅ | ✅ | ✅ |
| **Phê duyệt nội dung (Pending Queue)** | ❌ | ❌ | ✅ | ✅ |
| **Studio minh họa tranh & gán trích dẫn (Admin Studio)** | ❌ | ❌ | ✅ | ✅ |
| **Quản lý tác phẩm đang trưng bày (Admin Live)** | ❌ | ❌ | ✅ | ✅ |
| **Xem lịch sử thao tác kiểm duyệt (Audit Logs)** | ❌ | ❌ | ✅ | ✅ |
| **Cấu hình AI Copilot & Gemini API Key** | ❌ | ❌ | ❌ | ✅ |
| **Phân quyền người dùng (Thăng/Hạ cấp Admin)** | ❌ | ❌ | ❌ | ✅ |

---

## 4. Các Tính năng Nổi bật

### ✨ 1. Hệ sinh thái Cảm xúc Đa diện (Human-Centric Reactions)
Thay vì các lượt like nông cạn, hệ thống chuẩn hóa 5 cung bậc đồng cảm sâu sắc:
- ❤️ **Thương / Care** (`HEART`): Dành cho những nỗi đau cần được ôm ấp.
- 🫂 **Ôm an ủi / Warm Hug** (`HUG`): Trao một cái ôm ấm áp giữa giông bão.
- 🌿 **Đồng cảm / Empathy** (`SYMPATHY`): Thấu hiểu vì tôi cũng từng trải qua.
- ⚡ **Tiếp sức / Energize** (`ENERGY`): Truyền động lực mạnh mẽ để đứng lên.
- ✨ **Truyền cảm hứng / Inspire** (`INSPIRED`): Khơi dậy niềm tin và hy vọng.

### 🌐 2. Hỗ trợ Song ngữ Toàn diện (100% Bilingual VI / EN)
- Chuyển đổi ngôn ngữ chỉ với một cú nhấp chuột mà không tải lại trang.
- Nội dung do người dùng gửi lên được hỗ trợ hiển thị song ngữ với tiêu đề, tóm tắt và câu chuyện chi tiết.
- Toàn bộ nhãn, thông báo popup, bộ đếm cảm xúc, thông báo duyệt đều được bản địa hóa chuẩn xác.

### 🛡️ 3. Cơ chế Guest Guard Tự nhiên
- Người dùng chưa đăng nhập không bị chặn xem trang.
- Khi người dùng thực hiện hành động đòi hỏi tài khoản (thả cảm xúc, lưu sổ tay, đăng bài), một thông điệp trang nhã tương ứng sẽ xuất hiện, giải thích lý do cần đăng nhập và dẫn đến form xác thực nhanh.

### ✍️ 4. Tự động Trích xuất Thông minh (Auto-Extract First Sentence)
- Khi trưng bày tác phẩm Phòng 1, nếu người dùng muốn tập trung viết toàn bộ tâm sự mà không muốn bận tâm nghĩ tiêu đề ngắn (`summary`), hệ thống tự động nhận diện và trích xuất câu văn đầu tiên của câu chuyện.
- Thẻ xem trước (Preview Card) bên cạnh tự động phản ánh trực quan theo thời gian thực.

---

## 5. Kiến trúc & Luồng Hoạt động của AI Copilot Agent

Nền tảng tích hợp hệ thống **AI Copilot Agent** thông minh, đóng vai trò như một Trợ lý Giám tuyển số giúp tự động hóa quy trình kiểm duyệt và sáng tạo nghệ thuật.

```mermaid
flowchart TD
    A["Người dùng gửi bài viết / Tác phẩm"] --> B["Bộ lọc An toàn Căn bản (Pre-Filter)"]
    B -->|"Phát hiện từ khóa cấm / Spam"| C["Tự động từ chối hoặc Đánh dấu Cảnh báo"]
    B -->|"Hợp lệ"| D["AI Copilot Moderation Agent"]
    
    subgraph AI_Copilot_Pipeline ["Quy trình Phân tích AI Agent"]
        D --> E["1. Đánh giá Nội dung (Safety Scoring)"]
        E --> F["2. Phân tích Cảm xúc & Chủ đề (Sentiment & Themes)"]
        F --> G["3. Đề xuất Quyết định (Approve / Flag / Reject)"]
        G --> H["4. Tạo Tranh Minh Họa Nghệ thuật (Art Painting Gen)"]
        H --> I["5. Trích xuất Câu Danh ngôn Ý nghĩa (Quote Extractor)"]
        I --> J["6. Biên dịch Song ngữ VI - EN"]
    end
    
    AI_Copilot_Pipeline --> K{"Loại tác vụ"}
    K -->|"Admin Pending"| L["Bảng điều khiển Giám tuyển (Admin Dashboard)"]
    K -->|"Admin Studio"| M["Phòng Sáng tác Tranh Minh họa"]
    
    L --> N["Admin kiểm tra kết quả AI đánh giá"]
    N -->|"Duyệt tác phẩm"| O["Xuất bản lên Tường Triển lãm Trực tiếp"]
    N -->|"Yêu cầu chỉnh sửa"| P["Gửi thông báo phản hồi vào Hòm thư User"]
```

### Chi tiết các mắt xích của Agent:
1. **Dynamic Model Discovery**: Agent tự động kết nối API Key do Owner cung cấp, tự động truy vấn danh sách model khả dụng từ Google Gemini (ví dụ: `gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-2.5-pro`...) và lựa chọn model hoạt động ổn định nhất, tránh việc hardcode model gây lỗi 503/404.
2. **Safety & Toxicity Scoring**: Phân tích câu chuyện theo các thang đo nhạy cảm, bạo lực, xúc phạm danh dự, tự hại; đưa ra điểm an toàn (0 - 100) và lý do chi tiết bằng tiếng Việt.
3. **Curatorial Painting Suggestion**: Đọc nội dung sâu sắc và tự động khởi tạo hạt giống nghệ thuật (`seed`), phong cách tranh canvas (`window`, `rain`, `warmth`, `fog`...) phù hợp với giai điệu cảm xúc câu chuyện.
4. **Bilingual Synthesis**: Tự động hỗ trợ biên dịch tóm tắt và nội dung sang tiếng Anh/tiếng Việt giúp mở rộng tệp khán giả toàn cầu.

---

### 📊 Đánh giá Thực nghiệm & Bộ Metric của AI Copilot Agent

Hệ thống AI Copilot (`AiModerationService`, `BadWordsService`, `AiImageService`, `AiDiscoveryService`) được kiểm thử và đo lường định lượng bằng bộ **Golden Dataset 32 kịch bản đại diện** (`Agent/golden_dataset.json`) cùng **6 tác vụ tổng hợp tranh nghệ thuật `1024x1024`**, thông qua script benchmark tự động [`Agent/evaluate_agent.py`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/Agent/evaluate_agent.py).

#### 1. Bảng Tổng Hợp Kết Quả Đo Thực Nghiệm (Live Gemini API vs. Deterministic Rule Engine)

Khi kết nối với Google Gemini Developer API (tự động phát hiện **50 models khả dụng** trong tài khoản), hệ thống được đo lường trên 3 cấu hình thực tế:
- **Live Gemini Dynamic Discovery (`gemini-flash-lite-latest`)**: Khi model cấu hình mặc định (`gemini-2.5-flash`) trả về `HTTP 404` đối với khóa API mới, Agent tự động kích hoạt **Dynamic Model Discovery** quét danh sách model và chuyển hướng sang `gemini-flash-lite-latest`.
- **Live Gemini Direct (`gemini-3-flash-preview` Hybrid)**: Gọi trực tiếp model thế hệ mới `gemini-3-flash-preview` kết hợp cơ chế tự động fallback về Rule Engine khi chạm ngưỡng Rate Limit (`HTTP 429`).
- **Offline Rule Engine Baseline**: Vận hành thuần bằng tầng Rule Engine xác định nội bộ.

| Nhóm Metric | Đại lượng Đánh giá (Selected Metric) | Live Gemini (`gemini-flash-lite-latest` Dynamic) | Live Gemini (`gemini-3-flash-preview` Hybrid) | Offline Rule Engine Baseline | Nhận xét Kỹ thuật |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **A. Task Quality** | **Task Success Rate (Overall)** | **81.25%** | **84.38%** | **87.50%** | Hoàn thành trọn vẹn cả 4 tiêu chí (Schema + Verdict + Room + Rewrite) |
| **A. Task Quality** | **Verdict Accuracy (`APPROVE` / `DISAPPROVE`)** | **93.75%** (30/32) | **93.75%** (30/32) | **93.75%** (30/32) | Độ chính xác phán quyết ở ngưỡng 60 điểm rất ổn định |
| **A. Task Quality** | **Rubric Score Range Accuracy** | **90.62%** (29/32) | **93.75%** (30/32) | **93.75%** (30/32) | Điểm trừ bám sát bảng trọng số Rubric 100 điểm (-25 PII, -20 Ads, -15 Room/Profanity) |
| **A. Task Quality** | **Room Routing Accuracy (Room 1/2/3)** | **87.50%** (28/32) | **100.00%** (32/32) | **100.00%** (32/32) | Phát hiện chính xác bài viết tiêu cực gửi nhầm vào Phòng Hy Vọng (Room 2) |
| **A. Task Quality** | **JSON Schema Compliance Rate** | **96.88%** (31/32) | **100.00%** (32/32) | **100.00%** (32/32) | Tuân thủ chặt chẽ cấu trúc Pydantic Schema `ModerateArtData` |
| **A. Task Quality** | **Art Image Synthesis Success Rate** | **100.00%** (6/6) | **100.00%** (6/6) | **100.00%** (6/6) | Gemini sinh trực tiếp mã `<svg>` nghệ thuật `1024x1024` theo mood bài viết |
| **A. Efficiency** | **Average Steps & Loop Failure Rate** | **2.91 steps \| 0% loop** | **3.00 steps \| 0% loop** | **3.00 steps \| 0% loop** | Chuỗi xử lý cố định 3 bước, không xảy ra vòng lặp vô tận |
| **B. Grounding** | **Violation Detection F1-Score** | **93.19%** | **97.40%** | **98.96%** | `gemini-3-flash` đạt **Precision 96.35%**, **Recall 100.00%** |
| **B. Grounding** | **Evidence Quote Grounding** | **100.00%** | **100.00%** | **100.00%** | 100% trích dẫn lỗi (`quote`) khớp nguyên văn trong bài gốc |
| **B. Grounding** | **PII & Profanity Sanitization Rate** | **99.19%** ⭐ | **95.83%** | **95.83%** | **Live LLM vượt trội hơn Rule Engine** khi làm sạch từ lóng ngữ cảnh (`vãi đái`, `bullshit`, `asshole`) |
| **B. Grounding** | **Core Meaning Preservation Rate** | **98.39%** | **100.00%** | **100.00%** | Giữ nguyên vẹn các từ khóa cốt truyện của tác giả |
| **B. Grounding** | **Strict No-Hallucination Faithfulness** | **90.32%** | **90.62%** | **93.75%** | Không bịa đặt thêm tình tiết ngoài văn bản gốc |
| **C. System Perf** | **E2E Moderation Latency (P50)** | **21,863.8 ms** *(gồm 404 fallback)* | **2,260.5 ms** *(Direct LLM: **4.3s – 6.7s**)* | **1.30 ms** | Gọi trực tiếp `gemini-3-flash-preview` mất trung bình **~4.8 giây/bài** |
| **C. System Perf** | **E2E Moderation Latency (P95 / P99)** | **38,852.9 ms / 41,873.1 ms** | **20,306.3 ms / 21,946.5 ms** | **1.69 ms / 7.66 ms** | Đuôi P95 tăng khi gặp HTTP timeout hoặc retry qua dynamic models |
| **C. Cost & Token** | **Avg Token Usage & Cost / 1,000 Tasks** | **747 tokens \| $0.2160** | **759 tokens \| $0.2166** | **750 tokens \| $0.2029** | ~`606 prompt tokens` + `153 completion tokens` (~5,500 VNĐ / 1,000 tác vụ) |

#### 2. Điểm Nhấn Kỹ Thuật Rút Ra Từ Đợt Benchmark Thực Tế
- **Chất lượng viết lại văn bản trung tính (`Sanitization Rate = 99.19%`)**: Live Gemini xử lý mượt mà các ca khó theo ngữ cảnh mà Rule Engine tĩnh không bao phủ hết (ví dụ: chuyển cụm *"buồn vãi đái"* thành *"buồn vô cùng"* trong `TC_016`, đồng thời phân biệt chính xác từ cảm thán *"buồn quá"* trong `TC_018` mà không phạt nhầm).
- **Khả năng tự phục hồi (`Self-Healing Dynamic Discovery`)**: Khi gặp model bị ngừng hỗ trợ (`HTTP 404`) hoặc quá tải hạn ngạch (`HTTP 429` / `HTTP 503`), cơ chế **Dynamic Model Discovery + Hybrid Fallback** tự động chuyển đổi sang `gemini-flash-lite-latest`, `gemini-3-flash-preview` và Rule Engine, đảm bảo tỷ lệ uptime 100%.

#### 3. Cách Chạy Bộ Benchmark Đánh Giá Agent
```powershell
# 1. Chạy đánh giá với Live Google Gemini API:
.\venv\Scripts\python.exe -X utf8 Agent\evaluate_agent.py --provider gemini --api-key "YOUR_GEMINI_API_KEY" --model gemini-3-flash-preview

# 2. Chạy đánh giá ở chế độ Deterministic Offline Baseline:
.\venv\Scripts\python.exe -X utf8 Agent\evaluate_agent.py
```
*(Báo cáo phân tích đầy đủ và dữ liệu kết quả chi tiết từng test case được lưu tại `Agent/EVALUATION_REPORT.md` và `Agent/evaluation_results.json`)*.

---

## 6. Cấu trúc Dự án (Repository Structure)

```
Project_exhibition_diary_platform/
├── backend/                             # FASTAPI BACKEND SERVICE
│   ├── app/
│   │   ├── api/v1/                      # API Endpoints (RESTful Routes)
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py              # Đăng ký, Đăng nhập, JWT Refresh
│   │   │   │   ├── user_profile.py      # Thông tin cá nhân, Đổi bí danh
│   │   │   │   ├── room1.py             # Tác phẩm, Tương tác Phòng 1
│   │   │   │   ├── room2.py             # Lồng đèn thời gian Phòng 2
│   │   │   │   ├── room3.py             # Lá nguyện ước Phòng 3
│   │   │   │   ├── diaries.py           # Nhật ký cá nhân & Nhật ký cộng đồng
│   │   │   │   ├── notebook.py          # Sổ tay lưu trữ cá nhân
│   │   │   │   ├── notifications.py     # Hòm thư & Thông báo
│   │   │   │   ├── admin_rooms.py       # Quản trị & Duyệt tác phẩm các phòng
│   │   │   │   ├── admin_studio.py      # Studio vẽ tranh & gán quote
│   │   │   │   └── owner.py             # Quản lý AI Copilot, Users, API Keys
│   │   ├── core/                        # Cấu hình hệ thống, Bảo mật, Hằng số
│   │   │   ├── config.py                # Pydantic Settings
│   │   │   ├── security.py              # Băm mật khẩu bcrypt, JWT tokens
│   │   │   └── constants.py             # Định nghĩa ROOM_IDS, REACTIONS
│   │   ├── db/                          # Database connection & Async Session
│   │   ├── models/                      # SQLAlchemy 2.0 ORM Models
│   │   ├── schemas/                     # Pydantic Schemas (Validation)
│   │   └── services/                    # Business Logic Services
│   │       ├── ai_copilot_service.py    # Dịch vụ Gemini Agent thông minh
│   │       ├── room1_service.py         # Nghiệp vụ Phòng 1
│   │       ├── room2_service.py         # Nghiệp vụ Phòng 2
│   │       └── reaction_service.py      # Nghiệp vụ quản lý cảm xúc
│   ├── database/                        # 01_schema.sql, 02_seed.sql, badwords_seed.json
│   ├── Dockerfile                       # Docker image backend
│   └── requirements.txt                 # Thư viện phụ thuộc Python
│
├── frontend/                            # REACT + VITE FRONTEND SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                  # Icons, Painting Canvas, Reactions, TopNav
│   │   │   └── auth/                    # Modal Đăng nhập / Đăng ký
│   │   ├── context/
│   │   │   ├── AuthContext.jsx          # Trạng thái đăng nhập & User Profile
│   │   │   ├── GuestGuardContext.jsx    # Cơ chế chặn & gợi ý hành động khách
│   │   │   └── LanguageContext.jsx      # Quản lý Song ngữ VI / EN
│   │   ├── pages/
│   │   │   ├── Lobby/                   # Sảnh bảo tàng chính
│   │   │   ├── Room1_Broken/            # Phòng 01: Triển lãm Đổ vỡ
│   │   │   ├── Room2_Hope/              # Phòng 02: Bầu trời Lồng đèn Hy vọng
│   │   │   ├── Room3_Tree/              # Phòng 03: Cây Nguyện ước
│   │   │   ├── Diary/                   # Nhật ký cá nhân & Cộng đồng
│   │   │   ├── Notebook/                # Sổ tay lưu giữ cá nhân
│   │   │   └── Admin/                   # Cổng quản trị Admin & Studio AI
│   │   ├── services/                    # Axios API Clients
│   │   ├── App.jsx                      # Router & App Shell
│   │   └── main.jsx                     # Entry Point
│   ├── Dockerfile                       # Build Vite + phục vụ bằng nginx
│   ├── nginx.conf                       # Proxy /api và /static sang backend
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml                   # db + backend + frontend (+ adminer)
└── README.md                            # Tài liệu tổng quan dự án
```

---

## 7. Hướng dẫn Khởi chạy & Cài đặt (Getting Started)

> Deploy lên máy chủ thật (Azure, HTTPS, sao lưu): xem **[DEPLOY.md](DEPLOY.md)**. Bản production dùng `docker-compose.prod.yml` và không có tài khoản mẫu.

### Cách nhanh nhất: Docker Compose

Chỉ cần Docker. Lần chạy đầu, Postgres tự tạo bảng từ `backend/database/01_schema.sql` và nạp dữ liệu mẫu từ `02_seed.sql`.

```bash
cp .env.example .env
# Điền SECRET_KEY vào .env, ví dụ: openssl rand -hex 32
docker compose up -d --build
```

- Ứng dụng: http://localhost:3000 (nginx proxy `/api` và `/static` sang backend, không cần cấu hình CORS)
- API docs: http://localhost:8000/docs
- Adminer (tùy chọn): `docker compose --profile tools up -d`, mở http://localhost:8080 (server `db`)
- Đổi cổng nếu bị trùng: chỉnh `FRONTEND_PORT` / `BACKEND_PORT` trong `.env`
- Nạp lại dữ liệu mẫu từ đầu: `docker compose down -v && docker compose up -d` (xóa toàn bộ dữ liệu cũ)

Tài khoản mẫu (chỉ có trong bản dev, dữ liệu từ `02_seed.sql`):

| Vai trò | Tài khoản | Mật khẩu |
| :--- | :--- | :--- |
| OWNER | `owner_master` | `AdminPassword@2026` |
| ADMIN | `admin_exhibition` | `AdminPassword@2026` |
| USER | `minh_tam` | `UserPassword@2026` |

Chạy test backend: `cd backend && pip install -r requirements-dev.txt && pytest`

---

### Yêu cầu môi trường (chạy thủ công)
- **Python**: `>= 3.10`
- **Node.js**: `>= 18.x` & `npm` / `yarn`
- **PostgreSQL**: `>= 15.x` (hoặc sử dụng Docker)

---

### Khởi chạy Backend

1. **Di chuyển vào thư mục backend:**
   ```bash
   cd backend
   ```

2. **Tạo và kích hoạt môi trường ảo:**
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Cài đặt các gói thư viện phụ thuộc:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Cấu hình file môi trường `.env`:**
   Tạo file `.env` từ `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *(Cập nhật thông số kết nối PostgreSQL và Secret Key phù hợp)*

   Tạo bảng và dữ liệu mẫu cho database trống:
   ```bash
   psql "$DATABASE_URL_PSQL" -f database/01_schema.sql
   psql "$DATABASE_URL_PSQL" -f database/02_seed.sql
   ```
   *(`DATABASE_URL_PSQL` là chuỗi kết nối dạng `postgresql://user:pass@localhost:5432/exhibition_diary_db`)*

5. **Khởi chạy máy chủ phát triển Backend (Uvicorn):**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - API Docs Swagger: `http://localhost:8000/docs`
   - API Docs ReDoc: `http://localhost:8000/redoc`

---

### Khởi chạy Frontend

1. **Di chuyển vào thư mục frontend:**
   ```bash
   cd frontend
   ```

2. **Cài đặt các gói phụ thuộc npm:**
   ```bash
   npm install
   ```

3. **Khởi chạy máy chủ phát triển Frontend (Vite):**
   ```bash
   npm run dev
   ```
   - Ứng dụng sẽ hoạt động tại: `http://localhost:5173`

---

## 8. Biến Môi trường (Environment Variables)

### Backend (`backend/.env`)
| Tên biến | Giá trị mẫu | Mô tả |
| :--- | :--- | :--- |
| `PROJECT_NAME` | `Bảo Tàng Gọi Tên Cảm Xúc` | Tên hiển thị dịch vụ |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:password@localhost:5432/exhibition_db` | Chuỗi kết nối Async PostgreSQL |
| `SECRET_KEY` | `your-super-secret-jwt-key` | Khóa bí mật ký JWT Token |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` | Thời hạn Access Token (7 ngày) |
| `GEMINI_API_KEY` | `AIzaSy...` | Khóa API Google Gemini cho AI Copilot |
| `BACKEND_CORS_ORIGINS` | `["http://localhost:5173"]` | Danh sách domain Frontend cho phép CORS |

---

## 📄 Bản quyền & Đóng góp (License)
Dự án được xây dựng phục vụ nghiên cứu và trình bày học phần **Business Communication - Trường Đại học Bách Khoa ĐHQG-HCM (HCMUT)**.

*Trân trọng cảm ơn sự đồng hành và lắng nghe của bạn tại Bảo Tàng Gọi Tên Cảm Xúc.* 🌿

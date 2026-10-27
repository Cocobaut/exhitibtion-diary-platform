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
- [6. Mô phỏng Giao diện Người dùng (UI Mockups)](#6-mô-phỏng-giao-diện-người-dùng-ui-mockups)
- [7. Cấu trúc Dự án (Repository Structure)](#7-cấu-trúc-dự-án-repository-structure)
- [8. Hướng dẫn Khởi chạy & Cài đặt (Getting Started)](#8-hướng-dẫn-khởi-chạy--cài-đặt-getting-started)
  - [Yêu cầu môi trường](#yêu-cầu-môi-trường)
  - [Khởi chạy Backend](#khởi-chạy-backend)
  - [Khởi chạy Frontend](#khởi-chạy-frontend)
- [9. Biến Môi trường (Environment Variables)](#9-biến-môi-trường-environment-variables)

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
    A[Người dùng gửi bài viết / Tác phẩm] --> B[Bộ lọc An toàn Căn bản (Pre-Filter)]
    B -->|Phát hiện từ khóa cấm / Spam| C[Tự động từ chối hoặc Đánh dấu Cảnh báo]
    B -->|Hợp lệ| D[AI Copilot Moderation Agent]
    
    subgraph AI_Copilot_Pipeline [Quy trình Phân tích AI Agent]
        D --> E[1. Đánh giá Nội dung (Safety Scoring)]
        E --> F[2. Phân tích Cảm xúc & Chủ đề (Sentiment & Themes)]
        F --> G[3. Đề xuất Quyết định (Approve / Flag / Reject)]
        G --> H[4. Tạo Tranh Minh Họa Nghệ thuật (Art Painting Gen)]
        H --> I[5. Trích xuất Câu Danh ngôn Ý nghĩa (Quote Extractor)]
        I --> J[6. Biên dịch Song ngữ VI <-> EN]
    end
    
    AI_Copilot_Pipeline --> K{Loại tác vụ}
    K -->|Admin Pending| L[Bảng điều khiển Giám tuyển (Admin Dashboard)]
    K -->|Admin Studio| M[Phòng Sáng tác Tranh Minh họa]
    
    L --> N[Admin kiểm tra kết quả AI đánh giá]
    N -->|Duyệt tác phẩm| O[Xuất bản lên Tường Triển lãm Trực tiếp]
    N -->|Yêu cầu chỉnh sửa| P[Gửi thông báo phản hồi vào Hòm thư User]
```

### Chi tiết các mắt xích của Agent:
1. **Dynamic Model Discovery**: Agent tự động kết nối API Key do Owner cung cấp, tự động truy vấn danh sách model khả dụng từ Google Gemini (ví dụ: `gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-2.5-pro`...) và lựa chọn model hoạt động ổn định nhất, tránh việc hardcode model gây lỗi 503/404.
2. **Safety & Toxicity Scoring**: Phân tích câu chuyện theo các thang đo nhạy cảm, bạo lực, xúc phạm danh dự, tự hại; đưa ra điểm an toàn (0 - 100) và lý do chi tiết bằng tiếng Việt.
3. **Curatorial Painting Suggestion**: Đọc nội dung sâu sắc và tự động khởi tạo hạt giống nghệ thuật (`seed`), phong cách tranh canvas (`window`, `rain`, `warmth`, `fog`...) phù hợp với giai điệu cảm xúc câu chuyện.
4. **Bilingual Synthesis**: Tự động hỗ trợ biên dịch tóm tắt và nội dung sang tiếng Anh/tiếng Việt giúp mở rộng tệp khán giả toàn cầu.

---

## 6. Mô phỏng Giao diện Người dùng (UI Mockups)

### 1. Giao diện Triển lãm Phòng 01 (Broken Exhibition Gallery)
```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│  MUSEUM LOGO    [🏛️ Sảnh]  [Phòng 1]  [Phòng 2]  [Phòng 3]  [Nhật ký]     [🌐 VI] [👤 User]│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   PHÒNG 01 · TRIỂN LÃM ĐỔ VỠ                                                      │
│   "Nơi những vết nứt được hàn gắn bằng ánh sáng của sự sẻ chia"                   │
│                                                                                  │
│   [🔍 Tìm kiếm câu chuyện...]   [Tất cả] [Học tập] [Gia đình] [Tình cảm] [+ Trưng bày]  │
│                                                                                  │
│   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐         │
│   │ ┌────────────────┐ │  │ ┌────────────────┐ │  │ ┌────────────────┐ │         │
│   │ │                │ │  │ │                │ │  │ │                │ │         │
│   │ │  CANVAS ART    │ │  │ │  CANVAS ART    │ │  │ │  CANVAS ART    │ │         │
│   │ │  ILLUSTRATION  │ │  │ │  ILLUSTRATION  │ │  │ │  ILLUSTRATION  │ │         │
│   │ └────────────────┘ │  │ └────────────────┘ │  │ └────────────────┘ │         │
│   │ Mùa thi năm ấy     │  │ Bức thư chưa gửi   │  │ Ngã rẽ tuổi 22     │         │
│   │ "Ba năm nộp hồ sơ, │  │ "Mình cất kỹ lời   │  │ "Rời bỏ ngành học  │         │
│   │ mở mail tay run..."│  │ xin lỗi vào ngăn..."│  │ để bắt đầu lại..." │         │
│   │ 👤 Mây   🫂 42  👁️1.2k│  │ 👤 Ẩn danh 🫂 89 👁️2.5k│  │ 👤 Nam   🫂 15  👁️800 │         │
│   └────────────────────┘  └────────────────────┘  └────────────────────┘         │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Hộp thoại Đọc Tác Phẩm & Tương Tác Cảm Xúc (Artwork Detail Modal)
```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                              [X] │
│   ┌──────────────────────────┐   PHÒNG 01 · BẢO TÀNG ĐỔ VỠ                       │
│   │                          │                                                   │
│   │                          │   Mùa thi đại học năm ấy                          │
│   │     BỨC TRANH            │   ─────────────────────────────────────────────   │
│   │     MINH HỌA             │   "Ba năm nộp học bổng, ba lần mở email bằng     │
│   │     SƠN DẦU              │    đôi bàn tay run rẩy..."                        │
│   │     KHỔ LỚN              │                                                   │
│   │     (FRAME CỔ ĐIỂN)      │   Kể từ ngày ấy, tôi mới nhận ra rằng thất bại   │
│   │                          │   không phải là dấu chấm hết, mà là một lối rẽ    │
│   │                          │   đưa tôi đến với chính con người thật của mình...│
│   │                          │                                                   │
│   └──────────────────────────┘   — Bút danh: Mây · Ngày 18.10.2026               │
│                                                                                  │
│   ────────────────────────────────────────────────────────────────────────────   │
│   [❤️ Thương  128]  [🫂 Ôm an ủi  240]  [🌿 Đồng cảm  95]      [📑 Lưu sổ tay]    │
│   💬 463 người đã gửi gắm sự đồng cảm đến tác phẩm này.                          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3. Phòng 02: Bầu trời Lồng Đèn Đêm (Lantern Sky & Landed Letter)
```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🏮 BẦU TRỜI HY VỌNG                                            [+ Thả lồng đèn] │
│                                                                                  │
│                 🏮 (bay cao)                                                     │
│                                         🏮 (ngôi sao)                            │
│        🏮 (trái tim)                                                             │
│                                                        🏮 (hạ cánh)              │
│                                                            │                     │
│                             ┌──────────────────────────────┴─────────────────┐   │
│                             │ 🏮 LỒNG ĐÈN HẠ CÁNH (Giờ hẹn tương lai)    [X] │   │
│                             │ ────────────────────────────────────────────── │   │
│                             │ Gửi bản thân 3 năm sau:                        │   │
│                             │ "Hy vọng khi cậu đọc được lá thư này, cậu đã   │   │
│                             │  tìm thấy sự an yên trong tim..."              │   │
│                             │                                                │   │
│                             │ — Người gửi từ năm 2023                        │   │
│                             │ [❤️ 86]  [🫂 142]  [🌿 67]     [Viết thư trả lời] │   │
│                             └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Cấu trúc Dự án (Repository Structure)

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
│   ├── database/                        # Database scripts & .gitkeep
│   ├── Dockerfile                       # Docker image backend
│   ├── docker-compose.yml               # Cấu hình chạy nhanh Backend & DB
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
│   ├── package.json
│   └── vite.config.js
└── README.md                            # Tài liệu tổng quan dự án
```

---

## 8. Hướng dẫn Khởi chạy & Cài đặt (Getting Started)

### Yêu cầu môi trường
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

## 9. Biến Môi trường (Environment Variables)

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

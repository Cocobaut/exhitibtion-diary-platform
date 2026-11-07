# Bảo Tàng Gọi Tên Cảm Xúc (The Name of Feeling Museum)

[![Live Website](https://img.shields.io/badge/Live_Website-nameoffeeling.store-D4B06A?style=flat-square&logo=googlechrome&logoColor=white)](https://nameoffeeling.store/)
[![Microsoft Azure](https://img.shields.io/badge/Cloud-Microsoft_Azure-0078D4?style=flat-square&logo=microsoftazure&logoColor=white)](#12-triển-khai-lên-internet-bằng-microsoft-azure)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Google Gemini](https://img.shields.io/badge/AI_Copilot-Google_Gemini-8E75C4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![Bilingual](https://img.shields.io/badge/Language-VI_%7C_EN-FFB74D?style=flat-square)](#4-ngôn-ngữ-của-nội-dung-người-dùng)

🌐 **Website chính thức:** [The Name of Feeling Museum](https://nameoffeeling.store/)

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
12. [Triển khai lên Internet bằng Microsoft Azure](#12-triển-khai-lên-internet-bằng-microsoft-azure)

---

## 1. Tổng quan

Bảo Tàng Gọi Tên Cảm Xúc mô phỏng một bảo tàng gồm một sảnh chính và ba phòng triển lãm. Mỗi phòng dành cho một cách bày tỏ cảm xúc khác nhau. Người dùng có thể:

- Kể về một lần vấp ngã và nhận lại sự đồng cảm thay vì lời phán xét.
- Viết thư cho chính mình, hẹn ngày mở trong tương lai.
- Để lại lời động viên ngắn cho những người đang cần nghe.
- Ghi nhật ký cảm xúc riêng tư.

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
| **Nhật ký** | Ghi nhật ký riêng tư kèm tâm trạng (Bình yên, Trầm lắng, Biết ơn, Hy vọng, Mệt mỏi) và tối đa 5 ảnh | Tab Bản thân |
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

AI chỉ hỗ trợ ban quản trị và không tự đăng bất kỳ nội dung nào. Owner bật hoặc tắt AI, chọn nhà cung cấp (Google Gemini, DeepSeek, OpenAI hoặc các Custom API tương thích OpenAI) và nhập API key trên trang Owner. Key được mã hoá AES-256-GCM trước khi lưu vào database.

```mermaid
flowchart TD
    A["Người dùng nộp bài viết / thông điệp"] --> B["Hàng chờ duyệt của Admin"]
    B --> C["Admin mở chi tiết bài viết"]
    
    subgraph AI_PIPELINE ["Kiến Trúc AI Copilot Hybrid Đa Tầng (Bảo Mật & Phòng Thủ Chuyên Sâu)"]
        direction TB
        C -->|"1. Rate Limiting Gate"| RL["Admin Rate Limiter<br/>(8-20 req/phút/admin, chống cạn hạn ngạch)"]
        
        RL -->|"2. Lớp Luật Cứng"| RF["Rule Engine Pre-filter<br/>(Bắt buộc phát hiện PII SĐT/STK, từ cấm teencode/leet)"]
        
        RL -->|"3. Kiểm tra phòng 2 chiều"| RM["3-Room Appropriateness<br/>(Room 1 Đổ vỡ ↔ Room 2 Hy vọng ↔ Room 3 Cây thông điệp)"]
        
        RL -->|"4. Cách ly Prompt"| PI["Prompt Isolation Boundary<br/>(<untrusted_user_content>, chống Prompt Injection)"]
        
        PI -->|"5. Fast Fallback Controller"| LLM["LLM Reasoning Engine<br/>(Gemini / DeepSeek / OpenAI, timeout 6-8s)"]
        
        RF --> MERGE["Rule Merge Engine & Safe Score Clamping<br/>(Hợp nhất vi phạm, khóa điểm min, cấm ghi đè APPROVE)"]
        LLM --> MERGE
        RM --> MERGE
        
        C -->|"Dịch bằng AI"| TRANS["Bản dịch nháp song ngữ VI ↔ EN"]
        
        C -->|"Tạo ảnh bằng AI"| F1["Form 1: Nội dung chi tiết<br/>(Tiêu đề / Tóm tắt / Nội dung VI + EN, Admin chỉnh sửa)"]
        F1 --> PB["Image Prompt Builder<br/>(LLM chỉ thêm từ đệm + Hallucination Guard, fallback mẫu cố định)"]
        PB --> F2["Form 2: Xác nhận nội dung ảnh<br/>(Prompt VI / EN, Admin chỉnh sửa)"]
        F2 -->|"Copy"| COPY["Clipboard → Gemini cá nhân"]
        F2 -->|"Tạo ảnh bằng AI"| ART["Art Synthesis Engine<br/>(FLUX / DALL·E / Imagen, gửi nguyên văn prompt)"]
        ART --> SVG_GATE["SVG Sanitization Gate<br/>(Khử triệt để script, on*, iframe, chống Stored XSS)"]
    end
    
    MERGE --> H["Admin xem Điểm Rubric, Vi phạm, Gợi ý chuyển phòng & Bản viết lại"]
    TRANS --> H
    SVG_GATE --> H
    
    H -->|"Phê duyệt"| I["Trưng bày công khai lên Bảo tàng"]
    H -->|"Từ chối"| J["Gửi thông báo kèm lý do cho tác giả"]
```

| Chức năng | Dịch vụ & Chốt chặn bảo mật | Mô tả kỹ thuật |
| :--- | :--- | :--- |
| **Kiểm duyệt Hybrid** | `ai_moderation_service.py`, `badwords_service.py` | Kết hợp Rule Engine (bắt buộc 100% PII, từ cấm) với LLM phân tích ngữ cảnh. Khắc phục Rule Suppression Bug bằng cơ chế hợp nhất vi phạm và khóa điểm an toàn |
| **Chống Prompt Injection** | `ai_moderation_service.py` | Cách ly dữ liệu người dùng trong khối `<untrusted_user_content>`, cấm mô hình thực thi các câu lệnh thao túng điểm số |
| **Fast Fallback & Latency** | `ai_moderation_service.py` | Rút ngắn timeout gọi model xuống 6.0s - 8.0s, giới hạn tối đa 2 model dự phòng, loại bỏ hoàn toàn lỗi HTTP 504 Gateway Timeout (P99 giảm từ 41.8s xuống ~4.5s) |
| **Sinh tranh & Khử XSS** | `ai_image_service.py`, `main.py` | Gửi **nguyên văn** prompt đã được Admin/Owner xác nhận tới API sinh ảnh (Fal.ai FLUX, OpenAI DALL·E, Google Imagen); lọc sạch 100% vector Stored XSS trong mã SVG trước khi ghi đĩa + gán CSP header bảo vệ |
| **Soạn prompt tạo ảnh (Human-in-the-loop)** | `ai_image_prompt_service.py`, `AiImagePromptModal.jsx` | Luồng 2 form: Nội dung chi tiết → Xác nhận prompt → Copy / Tạo ảnh. LLM chỉ sắp xếp câu chữ và thêm từ đệm; Hallucination Guard tất định loại bỏ prompt chứa chi tiết/số liệu bịa đặt |
| **Chống SSRF** | `security.py`, `ai_discovery_service.py` | Thẩm định `base_url` của Custom Provider, chặn tuyệt đối kết nối tới localhost, loopback máy chủ, dải IP nội bộ RFC 1918 và Cloud Metadata (169.254.169.254) |
| **Quản lý hạn ngạch** | `admin_ai.py` | Rate Limiter phân tầng (8 req/phút cho sinh ảnh, 20 req/phút cho kiểm duyệt, dịch và soạn prompt), ngăn chặn tấn công từ chối ví (Denial of Wallet) |
| **Dịch nháp song ngữ** | `ai_translation_service.py` | Dịch tiêu đề, tóm tắt, nội dung giữa tiếng Việt và tiếng Anh; admin duyệt lại trước khi lưu |

### Tạo ảnh bằng AI – luồng 2 bước có xác nhận

API sinh ảnh thường đắt hoặc chưa được Owner cấu hình, nên nút **"Tạo ảnh bằng AI"** trong trang duyệt bài không gọi API sinh ảnh ngay mà mở một luồng 2 bước:

```mermaid
sequenceDiagram
    participant A as Admin / Owner
    participant FE as AiImagePromptModal
    participant BE as POST /admin/ai/build-image-prompt
    participant LLM as LLM (cấu hình Kiểm duyệt)
    participant IMG as POST /admin/ai/generate-image

    A->>FE: Bấm "Tạo ảnh bằng AI"
    FE-->>A: Form 1 – Tiêu đề, Tóm tắt, Nội dung (VI + EN), sửa được
    A->>FE: Chỉnh sửa rồi bấm "Tiếp tục → Soạn prompt"
    FE->>BE: Nội dung đã chỉnh sửa
    BE->>BE: Che PII / từ thô tục (Rule Engine)
    BE->>LLM: Nội dung trong <untrusted_user_content> + luật "chỉ thêm từ đệm"
    LLM-->>BE: prompt_vi, prompt_en
    BE->>BE: Hallucination Guard (ngân sách từ đệm, chặn số liệu bịa)<br/>không đạt → ghép bằng mẫu cố định
    BE-->>FE: Prompt VI/EN + trạng thái API sinh ảnh
    FE-->>A: Form 2 – Xác nhận nội dung ảnh, sửa được
    alt Copy
        A->>FE: Bấm "Copy" → sao chép prompt hiện tại (đã sửa hoặc bản gốc)
        A->>A: Tự dán vào Gemini cá nhân
    else Tạo ảnh bằng AI (chỉ bật khi Owner đã cấu hình API sinh ảnh)
        A->>FE: Bấm "Tạo ảnh bằng AI"
        FE->>IMG: final_prompt (gửi nguyên văn)
        IMG-->>FE: image_url → gán vào tranh minh họa của bài
    end
```

| Bước | Hành vi | Chống hallucination |
| :--- | :--- | :--- |
| **Form 1 – Nội dung chi tiết** | Điền sẵn tiêu đề, tóm tắt, nội dung song ngữ từ form duyệt bài; chỉnh sửa ở đây không làm thay đổi bài viết gốc | Chỉ dữ liệu Admin/Owner nhìn thấy mới được gửi đi |
| **Soạn prompt** | LLM của dịch vụ Kiểm duyệt (Gemini, DeepSeek, OpenAI…) sắp xếp lại câu chữ, thêm từ đệm và cụm phong cách cố định theo phòng | Prompt hệ thống cấm thêm nhân vật, đồ vật, địa điểm, màu sắc, sự kiện; Hallucination Guard tất định loại prompt vượt ngân sách từ đệm (900 ký tự) hoặc chứa con số không có trong nguồn. Nếu LLM chưa cấu hình hoặc lỗi thì ghép bằng **mẫu cố định** |
| **Form 2 – Xác nhận nội dung ảnh** | Hai tab Tiếng Việt / English, sửa tự do, có nút "Khôi phục bản gốc" | Admin/Owner là người duyệt cuối cùng |
| **Copy** | Sao chép đúng nội dung đang hiển thị (đã sửa, hoặc bản gốc nếu chưa sửa) để tự tạo bằng Gemini cá nhân | Luôn dùng được, kể cả khi chưa cấu hình API sinh ảnh |
| **Tạo ảnh bằng AI** | Gửi nguyên văn `final_prompt` tới API sinh ảnh, không tự thêm hậu tố phong cách. Nếu API lỗi, hệ thống dùng ảnh SVG tạm và báo cho Admin (`is_fallback_art`) | Nút bị khoá kèm lý do nếu Owner chưa bật hoặc chưa nhập key sinh ảnh |

API liên quan:

| Endpoint | Body chính | Kết quả |
| :--- | :--- | :--- |
| `POST /api/v1/admin/ai/build-image-prompt` | `art_id`, `target_room`, `title_vi/en`, `short_content_vi/en`, `content_vi/en` | `prompt_vi`, `prompt_en`, `model_used`, `is_template_fallback`, `image_gen_available`, `image_gen_unavailable_reason` |
| `POST /api/v1/admin/ai/generate-image` | `art_id`, `final_prompt` (khuyến nghị) hoặc `source_content` (cách cũ) | `image_url`, `visual_prompt`, `is_fallback_art` |

> Thay đổi này chỉ nằm ở code (schema Pydantic, service, endpoint, component React), **không cần migration database**.

### Đánh giá thực nghiệm

Pipeline kiểm duyệt được đo lường thực tế trên **32 kịch bản chuẩn mực** trong `Agent/golden_dataset.json` và 6 ca tổng hợp tranh nghệ thuật. Dưới đây là bảng đối sánh hiệu năng trước và sau khi nâng cấp kiến trúc:

| Chỉ số đánh giá (Evaluation Metric) | Live DeepSeek (`deepseek-chat` / Flash) ⭐ Mới | Live Gemini (`gemini-3-flash-preview`) | Deterministic Baseline (Offline Rule Engine) | Đánh giá & Nhận xét Kỹ thuật |
| :--- | :---: | :---: | :---: | :--- |
| **Tỷ lệ làm sạch PII & Từ cấm** | **100,0%** | 95,83% | 95,83% | **Đạt tuyệt đối 100%**: Rule Merge Engine triệt tiêu hoàn toàn nguy cơ lọt số điện thoại hoặc từ cấm |
| **Violation Detection Recall** | **100,0%** | 100,0% | 100,0% | Không bỏ sót bất kỳ vi phạm PII hoặc từ cấm điển hình nào trong tập Golden Dataset |
| **Độ chính xác phán quyết (`APPROVE` / `DISAPPROVE`)** | **90,62%** | 93,75% | 93,75% | Phán quyết nhất quán, khóa chặt quyền phê duyệt khi có vi phạm luật cứng |
| **Chấm điểm theo Rubric 100 điểm** | **93,75%** | 93,75% | 93,75% | Điểm trừ phản ánh chính xác khung trọng số Rubric chuẩn hóa |
| **Định tuyến đúng phòng (Room 1 / 2 / 3)** | **87,50%** | 100,0% | 100,0% | Nhận diện đúng sắc thái đổ vỡ, hy vọng và thông điệp khích lệ; chặn thù địch |
| **Tuân thủ JSON Schema Pydantic** | **100,0%** | 100,0% | 100,0% | 100% đầu ra tuân thủ nghiêm ngặt cấu trúc `ModerateArtData` |
| **Khử mã độc Stored XSS SVG** | **100,0%** | 100,0% | N/A | Bóc tách triệt để `<script>`, `onload`, `<foreignObject>` trước khi lưu trữ |
| **Độ trễ trung vị (P50 Latency)** | **~2,35 giây** | ~2,26 giây | ~1,30 ms | Tốc độ phản hồi thời gian thực cực kỳ mượt mà cho trải nghiệm duyệt bài |
| **Độ trễ đuôi P99 (Latency Ceiling)** | **~4,58 giây** ⚡ | ~21,95 giây *(Gemini Discovery: 41,8s)* | ~7,66 ms | **Giảm ~89% độ trễ trần**: Fast Fallback Controller chấm dứt lỗi 504 Gateway Timeout |
| **Chi phí ước tính / 1.000 tác vụ** | **~$0,28 USD** *(~7.000 VNĐ)* | ~$0,22 USD | ~$0,20 USD | Chi phí vận hành siêu tiết kiệm cho toàn bộ vòng đời kiểm duyệt cộng đồng |

Báo cáo chi tiết và dữ liệu đo lường từng test case được lưu trữ tại [`Agent/EVALUATION_REPORT.md`](Agent/EVALUATION_REPORT.md) và [`Agent/evaluation_results.json`](Agent/evaluation_results.json).

Để tái hiện lại bộ đo lường thực nghiệm:

```bash
# Đánh giá với Live DeepSeek API:
python Agent/evaluate_agent.py --provider openai --api-key <DEEPSEEK_KEY> --model deepseek-chat --base-url https://api.deepseek.com

# Đánh giá với Live Google Gemini API:
python Agent/evaluate_agent.py --provider gemini --api-key <GEMINI_KEY> --model gemini-2.5-flash

# Đánh giá Baseline Offline Rule Engine:
python Agent/evaluate_agent.py
```

---

## 6. Bảo mật

- Mật khẩu băm bằng bcrypt và phải có chữ hoa, chữ thường, số, ký tự đặc biệt.
- JWT có thể thu hồi khi đăng xuất. Đổi hoặc đặt lại mật khẩu thì mọi phiên đăng nhập cũ hết hiệu lực.
- Quên mật khẩu dùng link một lần gửi qua email, hết hạn sau 15 phút. API không trả token và không tiết lộ tài khoản nào tồn tại.
- Giới hạn số lần đăng nhập sai, yêu cầu email đặt lại mật khẩu, đăng ký tài khoản, viết nhật ký và tải ảnh.
- Giới hạn tần suất gửi tác phẩm.
- Ảnh đính kèm chỉ nhận file đã tải lên (`/static/...`) hoặc link `https://`; người dùng chỉ xoá được file của chính mình.
- Địa chỉ máy chủ AI tuỳ chỉnh bị chặn nếu trỏ vào mạng nội bộ (IPv4, IPv6), kiểm tra lại mỗi lần gọi.
- Production gửi kèm Content-Security-Policy, HSTS, X-Frame-Options và Permissions-Policy.
- `DEBUG` mặc định là `False`. Backend từ chối khởi động với `SECRET_KEY` mặc định khi `DEBUG=False`. Trang tài liệu API chỉ mở ở chế độ debug.
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
| Hạ tầng | Microsoft Azure, Docker Compose, Caddy (HTTPS tự động) |

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
| `SECRET_KEY` | Có | Ký JWT (và mã hoá API key AI nếu không đặt `AI_ENCRYPTION_KEY`). Tạo bằng `openssl rand -hex 32`, giữ cố định |
| `AI_ENCRYPTION_KEY` | Không | Khoá riêng để mã hoá API key AI. Tạo bằng `openssl rand -hex 32`, giữ cố định |
| `DEBUG` | Không | Mặc định `False`. Đặt `True` khi dev để bật trang tài liệu API và dùng được `SECRET_KEY` mặc định |
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

## 12. Triển khai lên Internet bằng Microsoft Azure

Toàn bộ hệ thống (**Frontend**, **Backend**, và **Database**) đã được triển khai và vận hành trực tuyến trên nền tảng đám mây **Microsoft Azure**:

- 🌐 **Website chính thức:** [The Name of Feeling Museum](https://nameoffeeling.store/)

### Kiến trúc triển khai trên Microsoft Azure

```mermaid
flowchart LR
    User["Người dùng Internet<br/>https://nameoffeeling.store"] -->|"HTTPS (443)"| AzureCloud["Microsoft Azure Cloud (Southeast Asia)"]
    subgraph AzureCloud["Hạ tầng Microsoft Azure"]
        Caddy["Caddy Reverse Proxy<br/>(Tự động cấp SSL/TLS)"] --> FE["Frontend (Nginx + React 18 SPA)"]
        FE -->|"/api/v1, /static"| BE["Backend (FastAPI / Python 3.12)"]
        BE --> DB[("Database (PostgreSQL 16)<br/>Azure Standard SSD")]
        BE --> Media[("Persistent Volume<br/>(Uploads & Media)")]
    end
```

| Tầng hệ thống | Dịch vụ trên Microsoft Azure | Vai trò vận hành |
| :--- | :--- | :--- |
| **Hạ tầng Đám mây & Mạng** | **Microsoft Azure Virtual Machine** (`Ubuntu Server 24.04 LTS`, Region *Southeast Asia*) + **Azure Static Public IP** & **Network Security Group (NSG)** | Máy chủ đám mây lưu trữ toàn bộ cụm dịch vụ; chỉ mở cổng `80/443` ra Internet với chứng chỉ HTTPS tự động (Caddy) và cô lập hoàn toàn mạng nội bộ |
| **Frontend** | **React 18 + Vite (Nginx Container)** trên Azure | Phục vụ giao diện [The Name of Feeling Museum](https://nameoffeeling.store/) tốc độ cao (nén gzip, cache tài nguyên tĩnh) và điều phối request `/api`, `/static` vào mạng nội bộ |
| **Backend** | **FastAPI + Uvicorn (Python 3.12 Container)** trên Azure | Xử lý toàn bộ REST API, xác thực JWT, kiểm duyệt & sinh ảnh bằng AI Copilot, dịch thuật song ngữ và gửi email SMTP |
| **Database & Lưu trữ** | **PostgreSQL 16 + Azure Standard SSD Managed Disk** | Lưu trữ bền vững toàn bộ cơ sở dữ liệu người dùng, tác phẩm, nhật ký, thông báo và khóa AI mã hóa trên ổ đĩa SSD của Microsoft Azure kèm cơ chế sao lưu định kỳ |

### Lệnh khởi chạy Production trên Microsoft Azure

Hướng dẫn chi tiết từng bước (khởi tạo máy ảo trên Microsoft Azure, trỏ tên miền `nameoffeeling.store`, cấu hình HTTPS, tạo tài khoản Owner, sao lưu tự động và cập nhật phiên bản) nằm trong [DEPLOY.md](DEPLOY.md).

```bash
cp .env.production.example .env     # điền DOMAIN=nameoffeeling.store và các biến bảo mật
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend python -m scripts.create_owner
```

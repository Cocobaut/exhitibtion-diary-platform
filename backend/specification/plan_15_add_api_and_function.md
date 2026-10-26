# KẾ HOẠCH CHI TIẾT CẢI TIẾN & TỐI ƯU HÓA CUỐI CÙNG CHO 3 PHÒNG TRIỂN LÃM
*(Museum of Feelings Platform - Final Revision Plan)*

> **Lưu ý**: Tài liệu này đóng vai trò bản đặc tả thiết kế & kế hoạch triển khai (RFC). Vui lòng xem qua chi tiết từng hạng mục. Khi bạn duyệt và xác nhận, toàn bộ các nội dung bên dưới sẽ được tiến hành triển khai đồng bộ.

---

## 1. PHÒNG 01: TRIỂN LÃM ĐỔ VỠ (BROKEN EXHIBITION)

### 1.1. Bổ sung Bộ lọc "Đã thả cảm xúc" (Reacted Posts Filter)
- **Hiện trạng**: Bộ lọc hiện tại chỉ gồm: `Tất cả` (`all`), `Của tôi` (`mine`), và `Nhiều đồng cảm nhất` (`most_sympathetic`).
- **Nhu cầu mới**: Thêm bộ lọc cho phép người dùng xem lại những bài viết/tác phẩm mà chính họ đã từng thả cảm xúc (icon: Tim, Ôm, Trầm trồ, Rơi lệ...).
- **Giải pháp Backend**:
  - Cập nhật API `GET /api/v1/rooms/1/artworks`:
    - Bổ sung giá trị `filter = "reacted"` (hoặc `"my_reactions"`).
    - Logic truy vấn cơ sở dữ liệu:
      ```sql
      SELECT a.* FROM artworks a
      WHERE a.room_id = 1 AND a.status = 'APPROVED'
        AND a.id IN (
          SELECT ai.artwork_id FROM artwork_interactions ai
          WHERE ai.user_id = :current_user_id
        )
      ORDER BY a.created_at DESC
      ```
    - Nếu khách vãng lai (Guest) chưa đăng nhập mà bấm filter này: Trả về yêu cầu đăng nhập hoặc hiển thị form login tại chỗ (GuestGuard).
- **Giải pháp Frontend**:
  - Bổ sung thẻ chip: `Đã thả cảm xúc` (tiếng Anh: `Reacted`) nằm ngay cạnh thẻ `Nhiều đồng cảm nhất`.
  - Tích hợp `guardAction`: Khi khách vãng lai nhấn vào, mở form đăng nhập ngay chính giữa màn hình như đã thiết lập.

---

### 1.2. Phân trang vô cực (Infinite Scroll) thay cho thanh trượt cố định
- **Hiện trạng**: Phòng 1 tải một mẻ cố định 30 tác phẩm. Thanh cuộn dọc trong `.gallery` chỉ cuộn trong danh sách đã tải sẵn đó.
- **Giải pháp**:
  - **Cơ chế tải từng trang (Batching)**: Mỗi lần tải 12 tác phẩm (`page=1, limit=12`).
  - **Intersection Observer**: Đặt một phần tử mỏ neo (`#sentinel-load-more`) ở cuối danh sách tác phẩm.
  - Khi người dùng cuộn xuống gần đáy danh sách:
    - Trình duyệt tự động kích hoạt gọi API trang tiếp theo (`page = page + 1`).
    - Nối mượt mà các tác phẩm mới vào danh sách hiện có (`setArtworks(prev => [...prev, ...newItems])`).
    - Hiệu ứng xuất hiện `fadeIn` êm ái cho các tác phẩm mới tải.
  - **Trạng thái UI**:
    - Hiển thị spinner nhẹ nhàng: *"✦ Đang thắp sáng thêm tác phẩm..."* khi đang tải tiếp.
    - Hiển thị *"✦ Bạn đã chiêm ngưỡng toàn bộ tác phẩm trong phòng ✦"* khi đã tải đến trang cuối cùng (`page >= total_pages`).
  - Khi người dùng đổi bộ lọc (All ⇄ Mine ⇄ Reacted ⇄ Most Sympathy) hoặc tìm kiếm: Reset trang về `page = 1` và cuộn lên đầu danh sách mượt mà.

---

## 2. PHÒNG 02: BẦU TRỜ LỒNG ĐÈN (LANTERN SKY)

### 2.1. Xóa bỏ 2 bộ lọc "Lồng đèn đã mở" và "Đang chờ ngày hạ xuống"
- **Lý do**:
  - Filter `opened` ("Lồng đèn đã mở") và `locked` ("Đang chờ ngày hạ xuống") gây bối rối cho khách tham quan và không phù hợp với trải nghiệm ngắm bầu trời lồng đèn chung.
  - Lồng đèn của cộng đồng thả lên bầu trời thì bất kỳ lúc nào người xem cũng có thể tự do bấm vào đọc ngay, không cần khái niệm "đã mở" đối với khách tham quan.
- **Giải pháp**:
  - **Frontend ([Room2Page.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Room2_Hope/Room2Page.jsx))**:
    - Rút gọn danh sách filter chỉ còn **2 thẻ cốt lõi**:
      1. `Tất cả` (`all`) — ngắm toàn bộ lồng đèn trên bầu trời.
      2. `Của tôi` (`mine`) — xem lồng đèn riêng của chính mình.
  - **Backend ([room2_service.py](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/app/services/room2_service.py))**:
    - Bỏ các nhánh xử lý `opened` và `locked`.
    - Danh sách bộ lọc hợp lệ chỉ còn: `{"all", "mine"}`.

---

### 2.2. Tính năng ẩn: Lồng đèn cá nhân tự động hạ xuống đúng thời hạn
- **Quy tắc phân biệt lồng đèn**:
  - **Lồng đèn Công khai (Public)**: Luôn bay lơ lửng trên bầu trời đêm. Người tham quan có thể nhấp chuột vào bất kỳ lồng đèn nào để đọc bức tâm thư và gửi lời chúc/thả tim. Không tự hạ xuống.
  - **Lồng đèn Cá nhân (Private / Gửi đến tương lai)**:
    - Mỗi khi người dùng thả lồng đèn gửi gắm tương lai, họ cài đặt một mốc thời gian (`target_date`).
    - **Tính năng chạy ngầm (Silent Check)**:
      - Ngay khi người dùng bước vào Phòng 02 (`Room2Page` mount):
      - Hệ thống tự động gọi API ngầm kiểm tra: Có lồng đèn cá nhân nào của họ có `target_date <= now()` và chưa hạ cánh (`is_opened = False` / chưa nhận)?
      - **Nếu đến hạn**:
        - Backend đánh dấu trong DB `is_opened = True` và ghi nhận thời gian hạ cánh.
        - Frontend hiển thị hiệu ứng lồng đèn riêng của bạn phát sáng lấp lánh và từ từ hạ xuống đồi cát.
        - Xuất hiện thông báo mời bạn chạm mở phong thư tương lai kèm hiệu ứng mở quà cảm xúc.
      - **Nếu chưa đến hạn**: Lồng đèn của bạn vẫn bay lượn ở tầm cao cùng đồng hồ đếm ngược nhỏ khi bạn hover vào nó.

---

## 3. PHÒNG 03: CÂY THÔNG ĐIỆP (WISH TREE)

### 3.1. Thu gọn chiều cao cây & Đảm bảo đỉnh cây luôn nằm dưới thanh Filter
- **Hiện trạng**:
  - Thanh Filter (`chips-row`) và `TopNav` đang nằm đè lên phần trên cùng của tán cây / chùm đèn phát sáng.
- **Giải pháp**:
  - **Cấu trúc vùng chứa**:
    - Thiết lập vùng Header cố định phía trên (`h-[110px]`) chứa đầy đủ `TopNav` và thanh Filter chips.
    - Khung Cây (`Tree Container`) được đặt bắt đầu ngay dưới thanh Filter, có khoảng đệm an toàn (`margin-top: 8px`).
    - Thu ngắn chiều cao tổng thể của cây trong SVG (`viewBox="0 0 1200 620"`), chiều cao hiển thị `h-[44vh] max-h-[380px] min-h-[260px]`.
    - Đỉnh cao nhất của cây và quầng sáng đèn luôn nằm cách mép dưới của hàng filter ít nhất **20px–30px**, tuyệt đối không bị chèn lấn lên bộ lọc.
  - Hỗ trợ cuộn dọc nhẹ nhàng nếu người dùng sử dụng màn hình quá ngắn (mobile/laptop nhỏ) để đảm bảo không một phần tử nào bị mất.

---

### 3.2. Giới hạn biên độ rung lắc cây (Chỉ từ -5° đến 5°)
- **Hiện trạng**: Khi tương tác kéo trượt hoặc rung lắc, nếu kéo mạnh thân cây có thể bị nghiêng nhiều.
- **Giải pháp**:
  - Khóa góc xoay của cây (`swayAngle`) bằng hàm `Math.max(-5, Math.min(5, angle))` trong [WishTree.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Room3_Tree/WishTree.jsx).
  - Animation rung khi nhận thông điệp (`@keyframes treeShake` trong [index.css](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/index.css)) được tinh chỉnh nhịp rung tinh tế (±3° đến ±5°), tạo độ rung lắc tự nhiên, trang nhã, không bị chao đảo quá mạnh.

---

### 3.3. Đồng nhất khối ánh sáng & Sửa lỗi đè lớp cành cây
- **Hiện trạng**: Các nhánh sau đè lên nhánh trước tạo cảm giác nét vẽ bị cắt vụn hoặc chồng lấn không tự nhiên; vệt sáng đèn chia làm nhiều mảng rời rạc.
- **Giải pháp**:
  1. **Đồng nhất quầng sáng đèn thành một khối (Unified Light Block)**:
     - Gộp chùm tia sáng thiên đình (`beam`) và quầng hào quang tán cây (`canopy aura`) thành một khối đồ họa đồng nhất nằm ở lớp nền phía sau toàn bộ cây (`z-index` thấp nhất của SVG).
     - Sử dụng Radial Gradient mềm (`url(#unifiedAura)`) với độ mờ viền mềm mại, tạo một quầng sáng ấm áp, huyền ảo bao trọn toàn bộ tán cây.
  2. **Liền mạch cấu trúc cành cây (Seamless Branch Layering)**:
     - Vẽ thân chính và các nhánh lớn theo thứ tự từ trong ra ngoài (thân cây -> 4 nhánh lớn -> nhánh phụ tầng 2 -> búp tầng 3).
     - Áp dụng `strokeLinejoin="round"` và `strokeLinecap="round"` cho toàn bộ khớp cành cùng chất liệu gradient vỏ gỗ (`url(#bark)`).
     - Tại các điểm phân chạc, bổ sung góc bo mượt mà để các nhánh giao nhau hòa quyện thành một cơ thể sống tự nhiên thay vì các đường thẳng cắt ngang nhau.
     - Lớp lá được render ở tầng trên cùng (top layer), mỗi chiếc lá gắn khít vào đúng đầu nhánh và phóng to khi hover (`scale-125`).

---

## 4. TỐI ƯU HÓA THANH TRƯỢT (CUSTOM SCROLLBARS) CHO PHÒNG 1, NHẬT KÝ & SỔ TAY

### 4.1. Đưa vị trí thanh trượt ra Sát Mép Phải & Chạm Đáy Màn Hình
- **Hiện trạng bất cập**:
  - Tại **Phòng 1** (`.gallery`), thanh cuộn nằm ở `right: 58px; max-height: calc(100% - 190px);`, khiến thanh cuộn bị lọt thỏm, lơ lửng ở mép ngoài cùng của grid tác phẩm thay vì ở mép màn hình.
  - Tại **Nhật ký** (`DiaryPersonal.jsx`, `DiaryCommunity.jsx`) và **Sổ tay** (`NotebookPage.jsx`), vùng cuộn cũng bị chặn ở `right: 30px; bottom: 30px;`.
- **Giải pháp bố cục**:
  - Mở rộng container cuộn ra tận cạnh biên của màn hình: `right: 0; bottom: 0;`.
  - Giữ khoảng cách thẩm mỹ cho nội dung bằng `padding-left` và `padding-right` bên trong (ví dụ `padding: 0 48px 40px 48px`).
  - **Kết quả**: Nội dung tác phẩm/nhật ký vẫn nằm ngay ngắn, thoáng đãng ở giữa, nhưng **thanh trượt cuộn trang sẽ nằm sát mép phải ngoài cùng của màn hình và kéo dài thẳng tắp xuống tận đáy dưới màn hình**.

### 4.2. Thiết kế thanh trượt tùy biến cao cấp (Bespoke Museum Scrollbars)
- Thay thế hoàn toàn thanh cuộn xám mặc định thô kệch của hệ điều hành bằng thanh trượt được custom riêng theo phong cách bảo tàng cổ điển:
  - **Độ mảnh tinh tế**: Chiều rộng thanh trượt thon gọn (`width: 6px` đến `8px`), không chiếm diện tích hiển thị.
  - **Đường ray (`::-webkit-scrollbar-track`)**: Màu trong suốt hoặc dải bóng mờ tinh tế hòa nhập vào màu nền sảnh bảo tàng.
  - **Tay trượt (`::-webkit-scrollbar-thumb`)**:
    - Bo tròn `border-radius: 999px`.
    - Màu sắc: Dải màu vàng đồng / gỗ sồi mạ nhạt (`rgba(195, 155, 105, 0.45)` trên nền sáng, `rgba(212, 176, 106, 0.45)` trên nền tối).
    - Hiệu ứng Hover: Sáng nhẹ lên (`rgba(212, 176, 106, 0.85)`) kèm transition mượt mà khi người dùng tương tác chuột.
  - **Chuẩn CSS hiện đại**: Đồng bộ thêm `scrollbar-width: thin; scrollbar-color: rgba(212,176,106,0.45) transparent;` để hỗ trợ tối ưu trên mọi trình duyệt hiện đại (Firefox, Chrome, Edge, Safari).

---

---

## 5. HỖ TRỢ ĐA NGÔN NGỮ (VI/EN) CHO TOÀN BỘ KHU VỰC QUẢN TRỊ (ADMIN PANEL)

### 5.1. Nút Chuyển Đổi Ngôn Ngữ tại Thanh Header Quản Trị
- Đặt nút chuyển đổi ngôn ngữ tinh tế (`VI | EN`) ngay góc trên bên phải thanh Header của Admin ([AdminPage.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Admin/AdminPage.jsx)), nằm cạnh nút chuông thông báo (tương tự như `TopNav` ở sảnh và các phòng).
- Đồng bộ trực tiếp với `LanguageContext`: Khi bấm đổi sang `EN` hoặc `VI`, toàn bộ hệ thống quản trị lập tức chuyển đổi mượt mà mà không cần tải lại trang.

### 5.2. Chuyển Đổi Ngôn Ngữ Toàn Bộ Thành Phần Quản Trị
1. **Các Tabs chuyển phòng & nghiệp vụ**:
   - `Phòng 1 (Đổ vỡ)` ⇄ `Room 1 (Broken)`
   - `Phòng 2 (Lồng đèn)` ⇄ `Room 2 (Lanterns)`
   - `Phòng 3 (Cây thông điệp)` ⇄ `Room 3 (Wish Tree)`
   - `Nhật ký` ⇄ `Diaries`
   - `Kho thông điệp` ⇄ `Message Vault`
   - `Studio` ⇄ `Studio`
   - `Nhật ký quản trị` ⇄ `Audit Log`
2. **Các phân đoạn trạng thái (Status Segments)**:
   - `Chờ phê duyệt` ⇄ `Pending Approval`
   - `Đang trưng bày` ⇄ `Currently Exhibited`
   - `Lưu trữ` ⇄ `Archived`
3. **Bảng dữ liệu & Hành động**:
   - Tiêu đề cột: `Tác phẩm / Tiêu đề` ⇄ `Artwork / Title`, `Tác giả / Bút danh` ⇄ `Author / Pen Name`, `Thời gian gửi` ⇄ `Submitted Time`, `Hành động` ⇄ `Actions`.
   - Các nút thao tác: `Phê duyệt` ⇄ `Approve`, `Từ chối` ⇄ `Reject`, `Lưu trữ` ⇄ `Archive`, `Khôi phục` ⇄ `Restore`, `Chỉnh sửa` ⇄ `Edit`.
   - Nội dung tác phẩm trong bảng: Tự động tải cột tương ứng theo ngôn ngữ (`localize(item, 'title')`, `localize(item, 'content')`).
4. **Modal Từ chối ([AdminRejectModal.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Admin/AdminRejectModal.jsx))**:
   - Dịch toàn bộ tiêu đề, danh sách lý do từ chối mẫu (Ngôn từ không phù hợp, Sai chủ đề, Trùng lặp...), nhãn ghi chú gửi tác giả và các nút xác nhận / hủy.

---

## 6. TỔNG HỢP CÁC FILE SẼ ĐƯỢC CHỈNH SỬA

| Thứ tự | File | Nội dung thay đổi chính |
| :---: | :--- | :--- |
| **1** | [backend/app/services/room1_service.py](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/app/services/room1_service.py) | Bổ sung filter `reacted` (lọc bài viết người dùng đã tương tác icon). |
| **2** | [frontend/src/pages/Room1_Broken/Room1Page.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Room1_Broken/Room1Page.jsx) | Thêm nút filter "Đã thả cảm xúc"; triển khai Infinite Scroll; mở rộng vùng cuộn sát mép phải `right: 0` và đáy `bottom: 0`. |
| **3** | [backend/app/services/room2_service.py](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/app/services/room2_service.py) | Xóa filter `opened`, `locked`; cập nhật logic kiểm tra và tự hạ lồng đèn cá nhân đúng hạn. |
| **4** | [frontend/src/pages/Room2_Hope/Room2Page.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Room2_Hope/Room2Page.jsx) | Xóa 2 thẻ filter `opened` & `locked`; giữ `all` và `mine`; chạy ngầm tự động nhận lồng đèn cá nhân đến hạn. |
| **5** | [frontend/src/pages/Room3_Tree/WishTree.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Room3_Tree/WishTree.jsx) | Thu gọn chiều cao cây, đỉnh cây nằm dưới filter; biên độ lắc tối đa ±5°; quầng sáng đồng nhất một khối; sắp xếp cành mượt mà. |
| **6** | [frontend/src/pages/Room3_Tree/Room3Page.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Room3_Tree/Room3Page.jsx) | Điều chỉnh khoảng cách đỉnh cây cách thanh filter 25px; tối ưu thanh trượt rút thông điệp bên phải. |
| **7** | [frontend/src/pages/Diary/DiaryPersonal.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Diary/DiaryPersonal.jsx) | Đưa thanh trượt danh sách và nội dung nhật ký ra sát mép phải và đáy màn hình. |
| **8** | [frontend/src/pages/Diary/DiaryCommunity.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Diary/DiaryCommunity.jsx) | Đưa container lưới nhật ký cộng đồng ra `right: 0; bottom: 0;` với padding trong thẩm mỹ. |
| **9** | [frontend/src/pages/Notebook/NotebookPage.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Notebook/NotebookPage.jsx) | Đưa container sổ tay ra sát mép phải `right: 0` và đáy `bottom: 0`. |
| **10** | [frontend/src/context/LanguageContext.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/context/LanguageContext.jsx) | Thêm từ điển song ngữ VI/EN cho tất cả các nhãn, bảng, nút bấm của Admin. |
| **11** | [frontend/src/pages/Admin/AdminPage.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Admin/AdminPage.jsx) | Bổ sung nút chuyển đổi VI/EN ở header Admin; áp dụng đa ngôn ngữ cho Tabs, Segments. |
| **12** | [frontend/src/pages/Admin/AdminPending.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Admin/AdminPending.jsx) | Song ngữ hóa bảng duyệt tác phẩm, cột, nút hành động Duyệt/Từ chối. |
| **13** | [frontend/src/pages/Admin/AdminRejectModal.jsx](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/pages/Admin/AdminRejectModal.jsx) | Song ngữ hóa modal từ chối tác phẩm và danh sách lý do mẫu. |
| **14** | [frontend/src/index.css](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/src/index.css) | Custom scrollbar mạ vàng đồng thanh mảnh cao cấp cho `.gallery`, `.diary-scroll`, `.notebook-scroll`. |

---

*Bạn vui lòng xem qua toàn bộ kế hoạch hoàn chỉnh tại [README_ROOMS_REVISION_PLAN.md](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/README_ROOMS_REVISION_PLAN.md). Nếu bạn thấy hoàn toàn ưng ý, hãy phản hồi lại để tôi tiến hành triển khai toàn bộ ngay lập tức!*

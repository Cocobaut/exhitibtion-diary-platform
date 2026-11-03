# Kế Hoạch Chi Tiết Nâng Cấp Giao Diện (UI Refactor Plan)

Tài liệu này mô tả chi tiết kế hoạch từng bước thực hiện các yêu cầu điều chỉnh giao diện (UI) từ Nhóm trưởng. Mỗi bước đều nêu rõ các file cần chỉnh sửa, logic nghiệp vụ, đoạn mã cụ thể và cách kiểm thử để đảm bảo hệ thống hoạt động trơn tru mà không làm hỏng backend hoặc cơ sở dữ liệu.

---

## Mục lục công việc

1. [Bước 1: Khôi phục giao diện Cây Cổ Thụ & Lá Rơi từ commit `[UPDATE] guest`](#bước-1-khôi-phục-giao-diện-cây-cổ-thụ--lá-rơi-từ-commit-update-guest)
2. [Bước 2: Đổi tên Room 1 thành "Triển lãm Hành trình" trên toàn bộ giao diện](#bước-2-đổi-tên-room-1-thành-triển-lãm-hành-trình-trên-toàn-bộ-giao-diện)
3. [Bước 3: Cập nhật nội dung Modal "Trưng bày tác phẩm" (Room 1)](#bước-3-cập-nhật-nội-dung-modal-trưng-bày-tác-phẩm-room-1)
4. [Bước 4: Tinh gọn Tab Nhật ký & Modal Viết Nhật ký](#bước-4-tinh-gọn-tab-nhật-ký--modal-viết-nhật-ký)
5. [Bước 5: Tinh giản Hòm thư - Chỉ giữ một nút Random tại "Lời nhắn khác"](#bước-5-tinh-giản-hòm-thư---chỉ-giữ-một-nút-random-tại-lời-nhắn-khác)
6. [Bước 6: Thiết kế & Tích hợp hiệu ứng Gacha Game rút thông điệp (Can đảm / Chữa lành / Sợ hãi)](#bước-6-thiết-kế--tích-hợp-hiệu-ứng-gacha-game-rút-thông-điệp-can-đảm--chữa-lành--sợ-hãi)

---

## Chi tiết từng bước thực hiện

### Bước 1: Khôi phục giao diện Cây Cổ Thụ & Lá Rơi từ commit `[UPDATE] guest`

#### 1. Mục tiêu
- Khôi phục visual cây cổ thụ tự nhiên với cành tán tỏa rộng, lá cây mềm mại (`leafPath`) từ commit `a86aa2d` (`[UPDATE] guest`), thay thế dạng ruy băng Tanzaku Nhật Bản hiện tại.
- Giữ nguyên toàn bộ chức năng xịn sò đã hoàn thiện:
  - Nút "Rút lá" trên thanh công cụ góc trên bên phải (`handleDrawWishClick` thông qua `ref.current.triggerDraw()`).
  - Bấm trực tiếp vào cây khiến cây rung lắc (`tree-shaking`) và thả lá rơi.
  - Đã lược bỏ thanh trượt ở góc dưới bên phải để tránh trùng lặp tính năng với nút "Rút lá" ở góc trên bên phải, giúp không gian cây thoáng và gọn gàng hơn.
  - **Lưu ý quan trọng**: Đổi các phần tử rơi xuống thành **những chiếc lá cây tự nhiên** chao lượn (`falling-leaf-particle`), không hiển thị lá thư/phong bì rơi.

#### 2. Các file cần chỉnh sửa
- `frontend/src/pages/Room3_Tree/WishTree.jsx`
- `frontend/src/pages/Room3_Tree/Room3Page.jsx` (đảm bảo props `ref`, `onDrawRandomLeaf`, `onOpenLeafModal` kết nối chuẩn xác)
- `frontend/src/index.css` (đảm bảo các keyframes `treeShake`, `sway`, `dynamicFallLeaf` hoạt động trơn tru)

#### 3. Chi tiết thực hiện trong `WishTree.jsx`
- Trích xuất lại bộ khung SVG cành cây tự nhiên (`growBoughs`, `branches`, `tips`, `t1Endpoints`) và hình dạng lá `leafPath(l, w) = M0 0 Q${f(l * 0.45)} ${f(-w)} ${f(l)} 0 Q${f(l * 0.45)} ${f(w)} 0 0Z`.
- Trong hàm `triggerDrawSuccess`:
  - Kích hoạt rung lắc cây (`isShaking = true`).
  - Sinh mảng hạt lá rơi `newLeaves` (màu sắc thuộc 4 nhóm danh mục, góc xoay `rotation`, độ trôi `drift`, độ trễ ngẫu nhiên).
  - Chọn 1 lá ngẫu nhiên từ danh sách `leaves` (hoặc fallback thông điệp) và gọi callback `onDrawRandomLeaf(randomItem)`.
- Giữ `forwardRef` với `useImperativeHandle(ref, () => ({ triggerDraw: triggerDrawSuccess }))` để nút ngoài `Room3Page` gọi được.
- Đặt sự kiện `onClick` trên thẻ `<svg>` của cây: khi click vào thân hoặc cành cây, gọi `triggerDrawSuccess()`.

---

### Bước 2: Đổi tên Room 1 thành "Triển lãm Hành trình" trên toàn bộ giao diện

#### 1. Mục tiêu
- Đổi tên Room 1 từ "Triển lãm Đổ vỡ - Kể về một lần vấp ngã" thành:
  - Tiêu đề chính: **"Triển lãm Hành trình"** (Tiếng Anh: **"Journey Exhibition"**)
  - Phụ đề / Slogan: **"Kể về cuộc sống dạo này của bạn"** (Tiếng Anh: **"Tell us about your life lately"**)
- Đồng bộ tên này tại:
  - Trang Lobby (Thẻ Plaque Phòng 1 & 3D Scene Door 1).
  - Trang Room 1 của khách (Tiêu đề, breadcrumb modal chi tiết tác phẩm).
  - Trang Quản trị (Admin) trong danh sách tab và bảng duyệt tác phẩm.
  - Trang Chủ sở hữu (Owner Dashboard).

#### 2. Các file cần chỉnh sửa
- `frontend/src/context/LanguageContext.jsx`:
  - `lobby_room01_title`: `'Triển lãm Hành trình'` (EN: `'Journey Exhibition'`)
  - `lobby_room01_count`: `'Kể về cuộc sống dạo này của bạn'` (EN: `'Tell us about your life lately'`)
  - `r1_name`: `'Triển lãm Hành trình'` (EN: `'Journey Exhibition'`)
  - `r1_story_title`: `'Câu chuyện hành trình'` (EN: `'The Journey Story'`)
- `frontend/src/pages/Lobby/LobbyPage.jsx`: Cập nhật tên phòng 1 dùng `t('lobby_room01_title')` và `t('lobby_room01_count')`.
- `frontend/src/pages/Room1_Broken/ArtworkDetailModal.jsx`: Đổi chuỗi text `PHÒNG 01 · TRIỂN LÃM ĐỔ VỠ` thành `PHÒNG 01 · TRIỂN LÃM HÀNH TRÌNH` (EN: `ROOM 01 · JOURNEY EXHIBITION`).
- `frontend/src/pages/Admin/AdminStudio.jsx`: Nhãn danh mục Room 1 tự động cập nhật qua `t('r1_name')`.
- `frontend/src/pages/Admin/AdminPage.jsx`: Nhãn tab Room 1 cập nhật thành `Triển lãm Hành trình` hoặc `Phòng 1 · Hành trình`.
- `frontend/src/pages/Owner/OwnerDashboardPage.jsx`: Cập nhật mô tả AI vẽ tranh: `"Vẽ tranh cho bài ở Triển lãm Hành trình dựa trên nội dung câu chuyện."`.

---

### Bước 3: Cập nhật nội dung Modal "Trưng bày Tác phẩm" (Room 1)

#### 1. Mục tiêu
- Khi người dùng bấm nút "Trưng bày Tác phẩm" ở Room 1, form modal mở ra.
- Dưới tiêu đề "Trưng bày tác phẩm", đổi dòng mô tả:
  - Cũ: *"Kể về một lần vấp ngã. Chúng mình sẽ vẽ tranh minh họa và treo lên tường giúp bạn."*
  - Mới: **"Kể về cuộc sống dạo này của bạn. Chúng mình sẽ vẽ tranh minh họa và treo lên tường giúp bạn."**
  - Bản tiếng Anh (nếu có): *"Tell us about your life lately. We will illustrate and hang your artwork on the exhibition wall."*

#### 2. Các file cần chỉnh sửa
- `frontend/src/pages/Room1_Broken/SubmitArtworkModal.jsx`:
  - Tìm đoạn render subheader dưới `Trưng bày tác phẩm` (dòng ~170) và thay thế text.
- `frontend/src/pages/Room1_Broken/Room1Page.jsx`:
  - Đổi thông báo bảo vệ đăng nhập `guardAction(..., 'trưng bày tác phẩm hành trình')` thay cho `'trưng bày tác phẩm đổ vỡ'`.

---

### Bước 4: Tinh gọn Tab Nhật ký & Modal Viết Nhật ký

#### 1. Mục tiêu
- **Trang Nhật ký (`DiaryPage.jsx`)**:
  - Bỏ thanh chuyển đổi 2 tab (Bản thân / Cộng đồng).
  - Bỏ hiển thị component `DiaryCommunity.jsx`, chỉ hiển thị nhật ký cá nhân của chính mình (`DiaryPersonal.jsx`).
  - Toàn bộ trải nghiệm trang sổ tay nhật ký trở thành không gian riêng tư, sâu lắng.
- **Modal Viết Nhật ký (`WriteDiaryModal.jsx`)**:
  - Bỏ phần chọn cảm xúc / tâm trạng (Mood Selector: Bình yên, Trầm lắng, Biết ơn, Hy vọng, Mệt mỏi) trên giao diện.
  - Phía payload gửi lên API: đặt mặc định `mood: null` (hoặc giữ nguyên không gửi field này) để không làm lỗi database hay schema backend.
  - Bỏ nút toggle/switch "Công khai lên cộng đồng" / "Riêng tư". Mặc định luôn lưu là nhật ký riêng tư (`is_public: false`, `visibility: 'PRIVATE'`).
- **Trang Admin (`AdminPage.jsx`)**:
  - Xóa tab "Nhật ký" (`admin_tab_diary`) khỏi thanh điều hướng tabs của Admin.
  - Bỏ gọi hàm `diaryPendingCount` và bỏ render component `AdminDiaries.jsx` để trang admin gọn gàng, chỉ tập trung kiểm duyệt tác phẩm triển lãm và hòm thư.

#### 2. Các file cần chỉnh sửa
- `frontend/src/pages/Diary/DiaryPage.jsx`:
  - Bỏ state `activeTab`.
  - Bỏ JSX thanh tab chuyển đổi `[Bản thân, Cộng đồng]`.
  - Luôn render `<DiaryPersonal ... />`.
- `frontend/src/pages/Diary/WriteDiaryModal.jsx`:
  - Ẩn/xóa khối JSX chọn Mood (`MOODS.map(...)`).
  - Ẩn/xóa khối JSX chọn Privacy (công khai / riêng tư).
  - Khi submit payload:
    ```javascript
    const payload = {
      title: title.trim(),
      entry_date: date,
      mood: null, // Mặc định null không làm ảnh hưởng backend
      content: content.trim(),
      font_family: selectedFont,
      is_public: false, // Luôn lưu riêng tư cho bản thân
      visibility: 'PRIVATE',
      media_urls: previewUrls,
    };
    ```
- `frontend/src/pages/Admin/AdminPage.jsx`:
  - Xóa phần tử `{ name: t('admin_tab_diary'), count: diaryPendingCount || 0 }` trong mảng `adminTabs`.
  - Bỏ case hiển thị `<AdminDiaries />`.

---

### Bước 5: Tinh giản Hòm thư - Chỉ giữ một nút Random tại "Lời nhắn khác"

#### 1. Mục tiêu
- Trong giao diện Hòm Thư (`MailboxModal.jsx`), hiện đang có một dãy các chip chọn chủ đề ("Ngẫu nhiên", "Can đảm", "Chữa lành", "Góc nhìn/Sợ hãi") và nút "Lời nhắn khác" ở phía dưới.
- Người dùng chỉ muốn một chức năng random duy nhất:
  - Bỏ hoàn toàn thanh chọn chip chủ đề trên header của modal.
  - Chỉ giữ lại duy nhất một nút bấm hành động ngẫu nhiên: **"Lời nhắn khác"** (hoặc "Rút lời nhắn").
  - Khi mở modal hoặc khi bấm nút "Lời nhắn khác", hệ thống tự động gọi hàm bốc ngẫu nhiên một thông điệp từ kho.

#### 2. Các file cần chỉnh sửa
- `frontend/src/components/overlays/MailboxModal.jsx`:
  - Bỏ đoạn mã render `{TOPIC_KEYS.map(...)}` ở header.
  - Tối ưu hàm `handleDraw`: gọi API `capsuleService.drawCapsule(null)` (backend sẽ tự động lấy ngẫu nhiên theo pool approved capsules).

---

### Bước 6: Thiết kế & Tích hợp hiệu ứng Gacha Game rút thông điệp (Can đảm / Chữa lành / Sợ hãi)

#### 1. Mục tiêu
- Thay vì chỉ đổi nội dung chữ một cách đơn điệu, bổ sung **hiệu ứng Gacha (Gacha Pull Animation)** đặc sắc như trong game khi người dùng bấm "Lời nhắn khác" hoặc lần đầu mở hòm thư:
  - **Phase 1: Gacha Shake & Sequential Popping Orbs (0 - 2000ms)**:
    - Thay vì 1 quả cầu đơn điệu, xuất hiện **3 bong bóng năng lượng màu hổ phách/đồng cổ (Warm Amber Glass)** đồng bộ hài hòa với không gian bảo tàng.
    - Ba bong bóng lần lượt rung rinh và **nổ từng cái tuần tự** (Sequential Pop):
      - *t = 620ms*: Bong bóng 1 (Bên trái) rung nảy và nổ bung hạt sáng.
      - *t = 1240ms*: Bong bóng 2 (Bên phải) rung nảy và nổ bung hạt sáng.
      - *t = 1860ms*: Bong bóng 3 (Ở giữa - lớn nhất) hấp thụ năng lượng và nổ bùng luồng sóng xung kích.
  - **Phase 2: Burst & Card Flip Reveal (1900ms - 2100ms)**: Vòng sóng xung kích tỏa ra, thẻ bài thông điệp xuất hiện và lật mở 3D ngoạn mục.
  - **Phase 3: Rarity / Element Aura với Icon Rỗng Ruột (2100ms trở đi)**:
    - Toàn bộ icon emoji đặc ruột trước đây được thay thế 100% bằng **icon nét viền rỗng (outline-only)** tinh tế:
      1. **Hệ Can Đảm (COURAGE)**: Icon ngọn lửa viền rỗng (`FlameOutlineIcon`), hào quang vàng ấm.
      2. **Hệ Chữa Lành (HEALING)**: Icon chiếc lá viền rỗng (`LeafOutlineIcon`), hào quang xanh ngọc dịu mát.
      3. **Hệ Sợ Hãi (PERSPECTIVE / FEAR)**: Icon mặt trăng lưỡi liềm viền rỗng (`MoonOutlineIcon`), hào quang tím huyền bí.
- **Tương thích Backend**:
  - Backend schema đang kiểm tra: `CHECK (category IN ('HEALING', 'COURAGE', 'PERSPECTIVE'))`.
  - Trên giao diện, ta map trực tiếp:
    - `COURAGE` $\rightarrow$ **"Thông điệp Can Đảm"**
    - `HEALING` $\rightarrow$ **"Thông điệp Chữa Lành"**
    - `PERSPECTIVE` $\rightarrow$ **"Thông điệp Sợ Hãi (Vượt qua nỗi sợ)"**
  - Giải pháp này giúp hiển thị đúng 3 loại theo yêu cầu của nhóm trưởng mà không cần sửa đổi bảng hay chạy lại migration cơ sở dữ liệu.

#### 2. Các file cần chỉnh sửa
- `frontend/src/components/overlays/MailboxModal.jsx`:
  - Thêm state quản lý trạng thái gacha: `gachaPhase: 'idle' | 'charging' | 'reveal'`.
  - Thêm animation CSS (Keyframes `@keyframes gachaBurst`, `@keyframes cardFlip3D`, `@keyframes gachaGlow`).
  - Giao diện thẻ bài kết quả với viền sáng neon tỏa hào quang theo loại category.
- `frontend/src/index.css`: Bổ sung các lớp CSS hỗ trợ hiệu ứng 3D transform (`perspective`, `transform-style: preserve-3d`).

---

## Bảng tổng hợp các file bị tác động theo bước

| Bước | Nội dung công việc | Danh sách file tác động |
| :--- | :--- | :--- |
| **Bước 1** | Khôi phục giao diện Cây Cổ Thụ & Lá Rơi từ commit `[UPDATE] guest` | `frontend/src/pages/Room3_Tree/WishTree.jsx`<br>`frontend/src/pages/Room3_Tree/Room3Page.jsx`<br>`frontend/src/index.css` |
| **Bước 2** | Đổi tên Room 1 thành "Triển lãm Hành trình" | `frontend/src/context/LanguageContext.jsx`<br>`frontend/src/pages/Lobby/LobbyPage.jsx`<br>`frontend/src/pages/Room1_Broken/ArtworkDetailModal.jsx`<br>`frontend/src/pages/Admin/AdminStudio.jsx`<br>`frontend/src/pages/Admin/AdminPage.jsx`<br>`frontend/src/pages/Owner/OwnerDashboardPage.jsx` |
| **Bước 3** | Đổi phụ đề modal "Trưng bày tác phẩm" (Room 1) | `frontend/src/pages/Room1_Broken/SubmitArtworkModal.jsx`<br>`frontend/src/pages/Room1_Broken/Room1Page.jsx` |
| **Bước 4** | Bỏ nhật ký cộng đồng & bỏ chọn mood & ẩn tab admin | `frontend/src/pages/Diary/DiaryPage.jsx`<br>`frontend/src/pages/Diary/WriteDiaryModal.jsx`<br>`frontend/src/pages/Admin/AdminPage.jsx` |
| **Bước 5** | Tinh giản Hòm thư, chỉ giữ nút random "Lời nhắn khác" | `frontend/src/components/overlays/MailboxModal.jsx` |
| **Bước 6** | Tích hợp hiệu ứng Gacha Game 3 hệ (Can đảm, Chữa lành, Sợ hãi) | `frontend/src/components/overlays/MailboxModal.jsx`<br>`frontend/src/index.css` |

---

## Kế hoạch kiểm thử & nghiệm thu (Verification Checklist)

1. **Kiểm tra Cây (Room 3)**:
   - [ ] Cây hiển thị đúng dáng cổ thụ sum sê cành lá tự nhiên (như bản commit `[UPDATE] guest`).
   - [ ] Nhấn nút "Rút lá" trên thanh công cụ hoặc click trực tiếp vào thân cây: cây rung chuyển và xuất hiện những chiếc lá cây thật bay lượn xuống đáy màn hình (không phải lá thư).
   - [ ] Modal đọc lời nhắn mở ra đúng nội dung chiếc lá vừa rút.
2. **Kiểm tra Tên Room 1**:
   - [ ] Trang Lobby: Biển tên hiển thị "PHÒNG 01 · Triển lãm Hành trình - Kể về cuộc sống dạo này của bạn".
   - [ ] Vào Room 1: Tên phòng và thanh điều hướng hiển thị đúng "Triển lãm Hành trình".
   - [ ] Modal nộp tác phẩm: Dưới tiêu đề hiện đúng câu "Kể về cuộc sống dạo này của bạn. Chúng mình sẽ vẽ tranh minh họa và treo lên tường giúp bạn."
   - [ ] Trang Admin & Owner: Các tab và bộ lọc hiển thị đồng bộ "Triển lãm Hành trình".
3. **Kiểm tra Tab Nhật ký**:
   - [ ] Trang Nhật ký chỉ còn không gian nhật ký cá nhân (không còn tab/nút bấm chuyển sang cộng đồng).
   - [ ] Bấm viết nhật ký mới: Form không còn bộ chọn cảm xúc (mood) và không còn switch công khai.
   - [ ] Lưu nhật ký: Lưu thành công vào tài khoản cá nhân, API không báo lỗi.
   - [ ] Trang Admin: Không còn tab "Nhật ký" gây rối mắt.
4. **Kiểm tra Hòm thư & Hiệu ứng Gacha**:
   - [ ] Mở hòm thư: Không còn thanh chip chọn chủ đề trên cùng.
   - [ ] Nhấn nút "Lời nhắn khác": Kích hoạt hoạt cảnh Gacha (rung nảy $\rightarrow$ bùng nổ ánh sáng $\rightarrow$ lật mở thẻ bài 3D).
   - [ ] Hiệu ứng màu viền/hào quang phản ánh chính xác 1 trong 3 nhóm: Can đảm (Vàng kim), Chữa lành (Xanh ngọc), Sợ hãi (Tím huyền ảo).
   - [ ] Nút "Lưu vào sổ tay" trong hòm thư vẫn hoạt động chuẩn xác.


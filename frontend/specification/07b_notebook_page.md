# THỰC THI 07B — SỔ TAY KÝ ỨC (NOTEBOOK PAGE)
## Tệp hướng dẫn tích hợp: `NotebookPage.jsx` (Không gian lưu trữ thông điệp & thư lồng đèn)

---

## 1. Màn hình tương ứng & Vị trí mã nguồn
- **Màn hình**:
  - `Trang Sổ tay Ký ức`: `src/pages/Notebook/NotebookPage.jsx`
  - `Thanh điều hướng bên trái (Icon bookmark)`: `src/components/layout/Sidebar.jsx`
  - `Modal Hòm thư (Nút Lưu vào sổ tay)`: `src/components/overlays/MailboxModal.jsx`
  - `Modal Lồng đèn hạ xuống (Nút Lưu vào sổ tay)`: `src/pages/Room2_Hope/LanternLandedModal.jsx`
- **Tệp dịch vụ (Services)**:
  - `src/services/notebookService.js` (hoặc kết hợp `capsuleService.js` & `room2Service.js`)
- **Tài liệu tham chiếu liên quan**:
  - `frontend/specification/00_REQUIRED_ADDITIONAL_APIS.md`
  - `backend/specification/plan_03_capsules.md`
  - `backend/specification/plan_06_room2_hope.md`

---

## 2. Ý nghĩa & Vai trò của Sổ tay trong Trải nghiệm Bảo tàng
* **Sổ tay Ký ức** là không gian riêng tư dành riêng cho người dùng để gìn giữ những câu chữ chạm vào cảm xúc nhất, đến từ 2 nguồn:
  1. **Từ Hòm thư (Capsules)**: Những thông điệp rút ngẫu nhiên ở sảnh chính ("Can đảm", "Chữa lành", "Góc nhìn").
  2. **Từ Lồng đèn hạ xuống (Room 2 Lantern Letters)**: Những bức thư gửi tương lai đã hạ cánh sau bao ngày tháng chờ đợi.
* **Quy tắc phân định cốt lõi**:
  * **Sổ tay (Notebook)**: Nơi lưu trữ bị động những lời động viên, thông điệp rút được hoặc thư lồng đèn đã mở.
  * **Nhật ký (Diary)**: Nơi chủ động giãi bày, viết nên những tâm sự riêng tư và chia sẻ câu chuyện lên cộng đồng.

---

## 3. Chi tiết luồng tích hợp API

### 3.1 Tải danh sách Sổ tay (`NotebookPage.jsx`)
- **Hành động kích hoạt**: Khi người dùng nhấn vào biểu tượng **Sổ tay** (Bookmark) ở thanh điều hướng bên trái.
- **Phương án 1 (API Hợp nhất đề xuất - Xem [00_REQUIRED_ADDITIONAL_APIS.md](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/frontend/specification/00_REQUIRED_ADDITIONAL_APIS.md))**:
  - **Endpoint**: `GET /api/v1/notebook?source=all|mailbox|lantern&page=1&limit=20&search=`
  - **Headers**: `Authorization: Bearer <token>`
- **Phương án 2 (Gọi song song các API hiện có)**:
  - Lấy thông điệp hòm thư: `GET /api/v1/capsules/saved?limit=50`
  - Lấy thư lồng đèn đã lưu: `GET /api/v1/rooms/2/artworks?filter=mine&opened=true`
  - Ghép và sắp xếp theo ngày lưu giảm dần (`saved_at DESC`) tại Client.
- **Dữ liệu trả về chuẩn hóa (Normalized Data)**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "nb_mb_01",
          "source": "mailbox",
          "source_label": "Hòm thư · Can đảm",
          "badge_class": "b-ok",
          "icon": "sparkle",
          "title": null,
          "content": "Can đảm không phải là không sợ. Can đảm là vẫn nộp đơn lần nữa, dù tay còn run.",
          "author": "một người lạ ở Phòng 3, đã được kiểm duyệt",
          "category": "Can đảm",
          "saved_at": "25.10.2026"
        },
        {
          "id": "nb_lt_02",
          "source": "lantern",
          "source_label": "Lồng đèn hạ xuống · Phòng 2",
          "badge_class": "b-wait",
          "icon": "r2",
          "title": "Gửi mình của năm 2026,",
          "content": "Lúc viết thư này mình đang ngồi ở thư viện, vừa trượt kỳ thi IELTS lần hai. Nếu cậu đọc được những dòng này, mong là cậu đã thôi so mình với người khác...",
          "author": "Linh, 24.10.2023",
          "symbol": "heart",
          "saved_at": "Hôm nay, 09:00"
        }
      ],
      "counts": {
        "all": 4,
        "mailbox": 2,
        "lantern": 2
      }
    }
  }
  ```

---

### 3.2 Bộ lọc nguồn & Tìm kiếm Client-Side
* **Bộ lọc nguồn (Source Chips)**:
  * `Tất cả`: Hiển thị toàn bộ các thẻ đã lưu.
  * `Từ Hòm thư`: Lọc các mục có `source === 'mailbox'`.
  * `Từ Lồng đèn`: Lọc các mục có `source === 'lantern'`.
* **Thanh tìm kiếm (`TopNav.jsx` - search input)**:
  * Lọc trực tiếp theo thời gian thực (real-time filter) trên trường `content`, `title`, `author`, hoặc `category`.

---

### 3.3 Thao tác "Bỏ lưu khỏi Sổ tay" (`onRemoveItem`)
- **Hành động kích hoạt**: Bấm nút **"Bỏ lưu"** ở góc phải chân mỗi thẻ ghi chú.
- **Tùy theo nguồn mục tin**:
  - **Nếu là Hòm thư (`source === 'mailbox'`)**:
    - Gọi API: `DELETE /api/v1/capsules/saved/{source_id}` (hoặc `PATCH /api/v1/capsules/draws/{id}/save` với body `{"is_saved": false}`).
  - **Nếu là Lồng đèn Phòng 2 (`source === 'lantern'`)**:
    - Gọi API: `DELETE /api/v1/rooms/2/artworks/{source_id}/save`.
- **Hành động Frontend**:
  - Gỡ ngay lập tức item đó khỏi state `notebookItems` (Optimistic UI update).
  - Đồng bộ danh sách mới vào `localStorage`.
  - Hiển thị Toast thông báo: *"Đã gỡ khỏi sổ tay"*.

---

### 3.4 Thao tác lưu từ Modal Phòng 2 (`LanternLandedModal.jsx`)
- **Hành động kích hoạt**: Khi lồng đèn hạ cánh, người dùng đọc thư và bấm **"Lưu vào sổ tay"**.
- **Endpoint**: `POST /api/v1/rooms/2/artworks/{artwork_id}/save`
- **Headers**: `Authorization: Bearer <token>`
- **Hành động Frontend**:
  - Chuyển nút sang trạng thái `btn main` với icon `check` và nhãn *"Đã lưu vào sổ tay"*.
  - Thêm đối tượng bức thư vào danh sách Sổ tay.
  - Người dùng có thể bấm vào mục **Sổ tay** trên sidebar để đọc lại bất kỳ lúc nào.

---

### 3.5 Cơ chế Fallback Offline & Lưu trữ cục bộ
* Để trải nghiệm của người dùng luôn liền mạch kể cả khi mạng chập chờn:
  * Khởi tạo state bằng:
    ```javascript
    const [notebookItems, setNotebookItems] = useState(() => {
      try {
        const saved = localStorage.getItem('museum_notebook');
        return saved ? JSON.parse(saved) : INITIAL_NOTEBOOK_ITEMS;
      } catch {
        return INITIAL_NOTEBOOK_ITEMS;
      }
    });
    ```
  * Bất kỳ thao tác Lưu hoặc Bỏ lưu đều được ghi nhận vào `localStorage` kèm thời gian thực.

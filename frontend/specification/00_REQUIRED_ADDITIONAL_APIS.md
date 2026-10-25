# ĐẶC TẢ CÁC API CẦN THỰC HIỆN BỔ SUNG
## Backend API Gap Analysis & New Requirements for Frontend Integration
### Nền tảng Triển lãm & Nhật ký "The Name of Feeling"

---

## 1. Tổng quan & Lý do tài liệu này ra đời
Sau khi đối chiếu kỹ lưỡng giữa:
1. **Toàn bộ giao diện người dùng hoàn thiện (Frontend React)**: gồm Sảnh chính, Hòm thư, Phòng 1 (Đổ vỡ), Phòng 2 (Bầu trời Lồng đèn), Phòng 3 (Cây Thông điệp), Không gian Nhật ký, **Sổ tay Ký ức (Trang mới bổ sung)**, và Trung tâm Quản trị.
2. **Bộ tài liệu đặc tả Backend hiện có (`backend/specification/plan_00` đến `plan_13`)**.

Chúng tôi phát hiện một số chức năng trên giao diện người dùng **đang thiếu hoặc cần chuẩn hóa các API tương ứng ở tầng Backend**. Tài liệu này liệt kê chi tiết các API cần bổ sung, cấu trúc Request/Response và đề xuất giải pháp schema cơ sở dữ liệu để đội ngũ Backend triển khai ngay trước khi tiến hành tích hợp.

---

## 2. Bảng tổng hợp các API cần bổ sung

| STT | Màn hình / Tính năng Frontend | Method | Đường dẫn API đề xuất | Mức độ ưu tiên | Tình trạng hiện tại |
|:---:|---|:---:|---|:---:|---|
| **1** | **Sổ tay: Lưu thư lồng đèn Phòng 2** | `POST` | `/api/v1/rooms/2/artworks/{id}/save` | 🔴 **Bắt buộc** | Chưa có (Backend mới chỉ có lưu capsule hòm thư) |
| **2** | **Sổ tay: Bỏ lưu thư lồng đèn Phòng 2** | `DELETE` | `/api/v1/rooms/2/artworks/{id}/save` | 🔴 **Bắt buộc** | Chưa có |
| **3** | **Sổ tay: API Hợp nhất (Unified Notebook)** | `GET` | `/api/v1/notebook` | 🟡 **Khuyến nghị cao** | Hiện tại Frontend phải gọi 2 API rời rạc |
| **4** | **Lưu bảng màu người dùng (Theme)** | `PATCH` | `/api/v1/users/me` (thêm trường `theme_preference`) | 🟡 **Cần thiết** | `PATCH /users/me` chưa có trường `theme_preference` |
| **5** | **Widget đếm ngược lồng đèn cá nhân** | `GET` | `/api/v1/rooms/2/artworks/my-personal` | 🟢 Tiện ích UX | Phải lọc qua query `?filter=mine` và tự tính ở client |
| **6** | **Rút ngẫu nhiên lồng đèn đã mở** | `GET` | `/api/v1/rooms/2/artworks/random-opened` | 🟢 Tiện ích UX | Đang phải tải danh sách lồng đèn rồi bốc random ở client |
| **7** | **Thống kê cảm xúc Nhật ký cá nhân** | `GET` | `/api/v1/diaries/stats/moods` | 🟢 Tiện ích UX | Client phải duyệt qua toàn bộ nhật ký để đếm |
| **8** | **Đánh dấu đã đọc nhiều thông báo** | `PATCH` | `/api/v1/notifications/bulk-read` | ⚪ Tối ưu | Chỉ có đọc từng cái hoặc đọc toàn bộ |

---

## 3. Chi tiết đặc tả kỹ thuật các API cần bổ sung

### 3.1 Nhóm API Sổ tay & Lưu trữ (Notebook / Bookmarks)

#### Vấn đề thực tế
* Trên giao diện, người dùng có thể bấm **"Lưu vào sổ tay"** từ 2 nguồn:
  1. **Hòm thư sảnh chính (Capsules)**: Backend đã có `PATCH /api/v1/capsules/draws/{id}/save` và `GET /api/v1/capsules/saved`.
  2. **Bức thư lồng đèn hạ xuống ở Phòng 2 (Lantern Letters)**: Người dùng mở thư lồng đèn và bấm *"Lưu vào sổ tay"* để đọc lại trong không gian Sổ tay bên trái. **Backend hiện chưa có API lưu bức thư này vào danh sách yêu thích/sổ tay của User.**

---

#### API 3.1.1: Lưu lồng đèn vào Sổ tay
* **Method**: `POST`
* **Path**: `/api/v1/rooms/2/artworks/{artwork_id}/save`
* **Quyền hạn**: Authenticated (`get_current_user`)
* **Logic Backend**:
  * Kiểm tra `artwork_id` có tồn tại trong `artworks` thuộc `room_id = 2` không.
  * Kiểm tra quyền xem (nếu `visibility = 'PRIVATE'` thì `user_id` phải là chính user đó).
  * Ghi nhận vào bảng liên kết `user_saved_artworks` (hoặc cập nhật cờ lưu).
* **Response 200 OK**:
  ```json
  {
    "success": true,
    "message": "Đã lưu bức thư lồng đèn vào sổ tay",
    "data": {
      "artwork_id": "7b8f9e01-1234-4567-89ab-cdef01234567",
      "is_saved": true,
      "saved_at": "2026-10-26T03:00:00Z"
    }
  }
  ```

---

#### API 3.1.2: Bỏ lưu lồng đèn khỏi Sổ tay
* **Method**: `DELETE`
* **Path**: `/api/v1/rooms/2/artworks/{artwork_id}/save`
* **Quyền hạn**: Authenticated (`get_current_user`)
* **Response 200 OK**:
  ```json
  {
    "success": true,
    "message": "Đã bỏ lưu bức thư khỏi sổ tay"
  }
  ```

---

#### API 3.1.3 (Khuyến nghị chuẩn RESTful): API Sổ tay hợp nhất (`/api/v1/notebook`)
Để trang Sổ tay của Frontend hiển thị mượt mà, phân trang và tìm kiếm đồng nhất trên một danh sách thay vì phải gọi song song 2 endpoint và tự ghép ở client, Backend nên cung cấp API hợp nhất:

* **Method**: `GET`
* **Path**: `/api/v1/notebook`
* **Query Params**:
  * `source`: `all | mailbox | lantern` (mặc định: `all`)
  * `search`: từ khóa tìm kiếm trong tiêu đề, nội dung hoặc tác giả
  * `page`: số trang (mặc định: 1)
  * `limit`: số bản ghi/trang (mặc định: 20, tối đa: 50)
* **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "nb_item_01",
          "source": "mailbox",
          "source_label": "Hòm thư · Can đảm",
          "source_id": "drw_12345",
          "category": "Can đảm",
          "badge_class": "b-ok",
          "icon": "sparkle",
          "title": null,
          "content": "Can đảm không phải là không sợ. Can đảm là vẫn nộp đơn lần nữa, dù tay còn run.",
          "author": "một người lạ ở Phòng 3, đã được kiểm duyệt",
          "saved_at": "2026-10-26T02:00:00Z"
        },
        {
          "id": "nb_item_02",
          "source": "lantern",
          "source_label": "Lồng đèn hạ xuống · Phòng 2",
          "source_id": "art_67890",
          "category": "Hy vọng",
          "badge_class": "b-wait",
          "icon": "r2",
          "title": "Gửi mình của năm 2026,",
          "content": "Lúc viết thư này mình đang ngồi ở thư viện, vừa trượt kỳ thi IELTS lần hai...",
          "author": "Linh, 24.10.2023",
          "symbol": "heart",
          "saved_at": "2026-10-25T09:00:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total_items": 12,
        "total_pages": 1,
        "counts": {
          "all": 12,
          "mailbox": 8,
          "lantern": 4
        }
      }
    }
  }
  ```

---

### 3.2 Nhóm API Lưu trữ Theme Bảng màu Người dùng

#### Vấn đề thực tế
* Người dùng có thể đổi giữa 4 theme:
  * `museum`: Bảo tàng chiều (mặc định)
  * `moss`: Rêu cổ
  * `plum`: Mận chín
  * `paper`: Giấy cũ
* Hiện tại `PATCH /api/v1/users/me` trong `plan_02_user_profile.md` chỉ nhận `nickname`, `bio`, `avatar_url`. Nếu người dùng đăng nhập trên thiết bị khác, theme sẽ bị reset về mặc định nếu không được lưu trong DB.

#### Đề xuất bổ sung
* Cập nhật bảng `users`: Thêm cột `theme_preference VARCHAR(20) DEFAULT 'museum'`.
* **Cập nhật endpoint `PATCH /api/v1/users/me`**:
  * Body chấp nhận:
    ```json
    {
      "theme_preference": "moss"
    }
    ```
  * Giá trị hợp lệ: Enum `museum | moss | plum | paper`.
* **Cập nhật endpoint `GET /api/v1/users/me`**:
  * Trả về trường `theme_preference` trong object `data` của người dùng để Frontend tự áp dụng thuộc tính `data-theme` ngay khi load trang.

---

### 3.3 Nhóm API Tiện ích Phòng 2 (Bầu trời Lồng đèn)

#### API 3.3.1: Lấy thông tin Lồng đèn Cá nhân (`my-personal`)
* **Mục đích**: Phục vụ widget đếm ngược thời gian lồng đèn hạ xuống ở góc trên bên phải Phòng 2 (`D1`).
* **Method**: `GET`
* **Path**: `/api/v1/rooms/2/artworks/my-personal`
* **Quyền hạn**: Authenticated
* **Response 200 OK**:
  ```json
  {
    "success": true,
    "data": {
      "has_lantern": true,
      "lantern": {
        "id": "lt_mine_01",
        "title": "Gửi mình của năm 2030",
        "target_date": "2030-10-24T09:00:00Z",
        "remaining_seconds": 126144000,
        "days": 1460,
        "hours": 4,
        "minutes": 12,
        "seconds": 9,
        "is_opened": false,
        "symbol": "heart"
      }
    }
  }
  ```

#### API 3.3.2: Rút ngẫu nhiên một lồng đèn đã mở (`random-opened`)
* **Mục đích**: Phục vụ nhãn tương tác *"✦ nhấn hoặc kéo lồng đèn xuống để đọc ↓"* giữa bầu trời.
* **Method**: `GET`
* **Path**: `/api/v1/rooms/2/artworks/random-opened`
* **Response 200 OK**: Trả về ngẫu nhiên 1 lồng đèn có `is_opened = true` và `visibility = 'PUBLIC'`.

---

### 3.4 Nhóm API Thống kê Cảm xúc Nhật ký

#### Vấn đề thực tế
* Trên trang Nhật ký cá nhân, người dùng cần xem thống kê cảm xúc của mình (Ví dụ: 12 bài Hy vọng, 8 bài Bình yên, 5 bài Biết ơn, 3 bài Mệt mỏi).
* **Đề xuất endpoint**:
  * **Method**: `GET`
  * **Path**: `/api/v1/diaries/stats/moods`
  * **Headers**: `Authorization: Bearer <token>`
  * **Response 200 OK**:
    ```json
    {
      "success": true,
      "data": {
        "total_diaries": 28,
        "mood_counts": {
          "Hy vọng": 12,
          "Bình yên": 8,
          "Biết ơn": 5,
          "Trầm lắng": 2,
          "Mệt mỏi": 1
        }
      }
    }
    ```

---

## 4. Bảng DB cần cập nhật hoặc tạo mới (Database Migration Suggestions)

### 1. Bảng `user_saved_artworks` (Nếu dùng phương án bảng trung gian)
```sql
CREATE TABLE user_saved_artworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_user_artwork_saved UNIQUE(user_id, artwork_id)
);

CREATE INDEX idx_user_saved_artworks_user ON user_saved_artworks(user_id);
```

### 2. Bổ sung cột `theme_preference` vào bảng `users`
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'museum';
```

---

## 5. Kết luận & Hướng giải quyết tạm thời của Frontend
Trong thời gian chờ Backend triển khai các endpoint trên:
1. **Sổ tay (Notebook)**: Frontend đã triển khai cơ chế **Client-side Storage với `localStorage` (`museum_notebook`)**, tự động gộp các thông điệp rút từ Hòm thư và các bức thư từ Lồng đèn Phòng 2. Khi Backend ra mắt `/api/v1/notebook` hoặc `/api/v1/rooms/2/artworks/{id}/save`, Frontend chỉ cần đổi cờ gọi API trong service mà không làm thay đổi UI.
2. **Theme**: Đang lưu tại `localStorage.getItem('app-theme')` và kích hoạt ngay tức thì.
3. **Widget đếm ngược**: Đang sử dụng dữ liệu từ danh sách lồng đèn của user và chạy đồng hồ đếm ngược nội tại bằng `setInterval`.

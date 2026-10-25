# PLAN 11 — Nhóm API 11: Quản lý kho thông điệp (`/api/v1/admin/capsules`)

> Đọc `plan_00_foundation.md` và `plan_03_capsules.md` trước. Nguồn: API spec trang 66–70.
> **Toàn bộ nhóm API yêu cầu quyền ADMIN hoặc OWNER** (`dependencies=[Depends(require_admin)]`).
> Đảm bảo ràng buộc toàn vẹn: `author_role IN ('ADMIN', 'OWNER')` và composite foreign key `(author_id, author_role) REFERENCES users(id, role)`.

## 1. Phạm vi

| # | Method | Path | Status OK |
|---|---|---|---|
| 11.1 | GET | `/api/v1/admin/capsules` | 200 |
| 11.2 | POST | `/api/v1/admin/capsules` | 201 |
| 11.3 | PUT | `/api/v1/admin/capsules/{capsule_id}` | 200 |
| 11.4 | PATCH | `/api/v1/admin/capsules/{capsule_id}/toggle-status` | 200 |
| 11.5 | DELETE | `/api/v1/admin/capsules/{capsule_id}` | 200 |
| 11.6 | GET | `/api/v1/admin/capsules/categories` | 200 |

Router: `APIRouter(prefix="/admin/capsules", tags=["Admin - Message Capsules Management"])`.
Tham số `capsule_id`: số nguyên `int` (BIGINT).

## 2. File cần tạo
- `app/schemas/admin_capsules.py`
- `app/services/admin_capsule_service.py`
- `app/api/v1/endpoints/admin_capsules.py`

---

## 3. Chi tiết endpoint

### 11.1 `GET /admin/capsules?category=&is_approved=&page=1&limit=20`
- `category`: `HEALING | COURAGE | PERSPECTIVE`.
- `is_approved`: `true | false`.
- Sắp xếp: `id DESC`.

**Response 200**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 104,
        "message": "Dù hôm nay có u ám thế nào, mặt trời vẫn sẽ mọc vào sáng mai. Bạn đã làm rất tốt rồi.",
        "message_vi": "Dù hôm nay có u ám thế nào, mặt trời vẫn sẽ mọc vào sáng mai. Bạn đã làm rất tốt rồi.",
        "message_en": "No matter how gloomy today is, the sun will rise tomorrow. You did very well.",
        "category": "HEALING",
        "draw_count": 512,
        "is_approved": true,
        "author": {
          "id": "e0a11223-14bc-4183-a212-094182410a88",
          "nickname": "Người Gác Cổng",
          "role": "ADMIN"
        },
        "created_at": "2026-09-01T10:00:00Z",
        "updated_at": "2026-10-15T08:30:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total_items": 128, "total_pages": 7 }
  }
}
```

### 11.2 `POST /admin/capsules`
**Request Body**
```json
{
  "message_vi": "Bạn không cần phải hoàn hảo để bắt đầu, nhưng bạn phải bắt đầu để trở nên hoàn thiện hơn.",
  "message_en": "You don't have to be perfect to start, but you have to start to become better.",
  "category": "COURAGE",
  "is_approved": true
}
```
**Logic**:
1. Bắt buộc nhập đầy đủ cả 2 bản `message_vi` và `message_en`. Tự động đồng bộ `message = message_vi`.
2. Tự động gán: `author_id = admin.id`, `author_role = 'ADMIN'`, `draw_count = 0`.
3. `INSERT INTO message_capsules (...) RETURNING *`.

**Response 201**
```json
{
  "success": true,
  "message": "Thêm thông điệp mới vào máy nhả thành công",
  "data": {
    "id": 129,
    "message": "Bạn không cần phải hoàn hảo để bắt đầu, nhưng bạn phải bắt đầu để trở nên hoàn thiện hơn.",
    "message_vi": "Bạn không cần phải hoàn hảo để bắt đầu, nhưng bạn phải bắt đầu để trở nên hoàn thiện hơn.",
    "message_en": "You don't have to be perfect to start, but you have to start to become better.",
    "category": "COURAGE",
    "author_role": "ADMIN",
    "is_approved": true,
    "draw_count": 0,
    "created_at": "2026-10-24T23:46:00Z"
  }
}
```

### 11.3 `PUT /admin/capsules/{capsule_id}`
**Request Body**
```json
{
  "message_vi": "Bạn không cần phải hoàn hảo để bắt đầu, hãy dũng cảm bước đi từ ngày hôm nay.",
  "message_en": "You don't have to be perfect to start, be brave and take the first step today.",
  "category": "COURAGE"
}
```
**Logic**: Cập nhật thông điệp song ngữ và chủ đề theo `capsule_id`.

**Response 200**
```json
{
  "success": true,
  "message": "Cập nhật thông điệp thành công",
  "data": {
    "id": 129,
    "message": "Bạn không cần phải hoàn hảo để bắt đầu, hãy dũng cảm bước đi từ ngày hôm nay.",
    "message_vi": "Bạn không cần phải hoàn hảo để bắt đầu, hãy dũng cảm bước đi từ ngày hôm nay.",
    "message_en": "You don't have to be perfect to start, be brave and take the first step today.",
    "category": "COURAGE",
    "updated_at": "2026-10-24T23:47:00Z"
  }
}
```

### 11.4 `PATCH /admin/capsules/{capsule_id}/toggle-status`
**Request Body**
```json
{
  "is_approved": false // false: tạm dừng nhả, true: kích hoạt lại
}
```
**Logic**: Cập nhật cờ `is_approved`. Khi `is_approved = FALSE`, máy nhả thông điệp ở API 3.1 sẽ không bốc trúng câu này.

**Response 200**
```json
{
  "success": true,
  "message": "Đã cập nhật trạng thái hoạt động của thông điệp",
  "data": {
    "id": 129,
    "is_approved": false
  }
}
```

### 11.5 `DELETE /admin/capsules/{capsule_id}`
**Logic**:
1. Kiểm tra tồn tại. Không có → 404.
2. Kiểm tra `draw_count`:
   - Nếu `draw_count > 0`: Có thể chặn xóa hoặc xóa cascade bản ghi lịch sử rút thẻ (theo DB foreign key `ON DELETE CASCADE`, xóa capsule sẽ tự động xóa các lượt rút liên quan). Để bảo đảm dữ liệu người dùng, nếu cần chặn: trả 400 `"Thông điệp đã có người rút trúng, hãy sử dụng tính năng tắt trạng thái thay vì xóa"`.
   - Nếu `draw_count = 0`: Tiến hành xóa an toàn.

**Response 200**
```json
{
  "success": true,
  "message": "Đã xóa thông điệp khỏi kho dữ liệu"
}
```

### 11.6 `GET /admin/capsules/categories`
**Mô tả**: Lấy tất cả các loại thông điệp (chủ đề) trong kho và thống kê số lượng thông điệp của từng loại (tổng số lượng, số lượng đang hoạt động `is_approved=true`, số lượng đang tắt `is_approved=false`).
**Phân quyền**: Yêu cầu ADMIN hoặc OWNER.

**Response 200**
```json
{
  "success": true,
  "message": "Lấy danh sách các loại thông điệp và thống kê số lượng thành công",
  "data": {
    "total_capsules": 128,
    "categories": [
      {
        "category": "HEALING",
        "label": "Chữa lành",
        "description": "Thông điệp chữa lành, bình an tâm hồn",
        "total_count": 50,
        "active_count": 45,
        "inactive_count": 5
      },
      {
        "category": "COURAGE",
        "label": "Can đảm",
        "description": "Thông điệp can đảm, tiếp thêm sức mạnh",
        "total_count": 40,
        "active_count": 38,
        "inactive_count": 2
      },
      {
        "category": "PERSPECTIVE",
        "label": "Góc nhìn",
        "description": "Thông điệp gợi mở góc nhìn mới, chiêm nghiệm cuộc sống",
        "total_count": 38,
        "active_count": 35,
        "inactive_count": 3
      }
    ]
  }
}
```

---

## 4. Test bắt buộc
- [ ] User không phải ADMIN → 403 `FORBIDDEN`.
- [ ] Tạo capsule: `author_role` luôn được lưu là `'ADMIN'`.
- [ ] `toggle-status`: Đổi sang `false` thì gọi `POST /api/v1/capsules/draw` không bao giờ rút trúng thông điệp đó.
- [ ] Cập nhật message và category thành công; `updated_at` được làm mới.
- [ ] `GET /admin/capsules/categories`: Trả về đầy đủ các loại thông điệp kèm số lượng từng loại chính xác.

---

## 5. Postman Collection để Test API
- **File đích**: [`backend/postman_json/11_admin_capsules.postman_collection.json`](file:///e:/Hcmut%20material/Business_Communication/Project_exhibition_diary_platform/backend/postman_json/11_admin_capsules.postman_collection.json)
- **Chuẩn định dạng**: Postman Collection Schema v2.1.0
- **Biến môi trường sử dụng**:
  - `{{baseUrl}}`: Mặc định `http://localhost:8000`
  - `{{adminToken}}`: Bearer Token của tài khoản ADMIN (bắt buộc)
  - `{{adminCapsuleId}}`: Tự động lưu `data.id` khi tạo thông điệp mới
- **Danh sách requests cần có trong Collection**:
  1. `[11.1] Lấy danh sách thông điệp trong kho (GET /api/v1/admin/capsules)` - Header `Bearer {{adminToken}}`, query `category=HEALING`, phân trang page/limit.
  2. `[11.2] Thêm mới thông điệp vào kho (POST /api/v1/admin/capsules)` - Body `{ "message": "...", "category": "COURAGE", "is_approved": true }`, kiểm tra status 201, `author_role = 'ADMIN'`. Test script lưu `{{adminCapsuleId}}`.
  3. `[11.3] Chỉnh sửa nội dung thông điệp (PUT /api/v1/admin/capsules/{{adminCapsuleId}})` - Body gồm `message`, `category`.
  4. `[11.4] Bật / Tắt trạng thái thông điệp (PATCH /api/v1/admin/capsules/{{adminCapsuleId}}/toggle-status)` - Body `{ "is_approved": false }`, kiểm tra status 200.
  5. `[11.5] Xóa thông điệp khỏi kho (DELETE /api/v1/admin/capsules/{{adminCapsuleId}})` - Kiểm tra status 200.
  6. `[11.6] Lấy tất cả các loại thông điệp và số lượng (GET /api/v1/admin/capsules/categories)` - Header `Bearer {{adminToken}}`, kiểm tra status 200.
  7. `[Quyền hạn] Test chặn người dùng thường (GET /api/v1/admin/capsules)` - Header `Bearer {{accessToken}}`, kiểm tra status 403 `FORBIDDEN`.

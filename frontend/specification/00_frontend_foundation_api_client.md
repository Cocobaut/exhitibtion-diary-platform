# THỰC THI 00 — NỀN TẢNG HTTP CLIENT & QUẢN LÝ XÁC THỰC
## Tệp hướng dẫn tích hợp: Cấu hình API Client & Interceptors

---

## 1. Mục tiêu & Vị trí thực thi
- **Vị trí file mã nguồn frontend**: `src/services/apiClient.js` và `src/context/AuthContext.jsx`.
- **Thứ tự thực thi**: **00 (Bắt buộc chạy và hoàn thiện đầu tiên)** trước khi triển khai bất kỳ trang giao diện nào.
- **Nhiệm vụ**: Cấu hình Axios instance tập trung, tự động đính kèm `Bearer Token`, xử lý chuẩn hóa phản hồi (`body` vs `data`), và bắt lỗi toàn cục (`401 Unauthorized`, `403 Forbidden`, `500 Server Error`).

---

## 2. Thông số kỹ thuật kết nối

- **Base URL**: `http://localhost:8000/api/v1` (môi trường Dev, cấu hình qua biến môi trường `VITE_API_BASE_URL`).
- **Content-Type mặc định**: `application/json`.
- **Format phản hồi của Backend**:
  - Nhóm Auth (`/auth/login`, `/auth/register`): Dữ liệu nằm trong khoá **`body`**.
  - Các nhóm còn lại: Dữ liệu nằm trong khoá **`data`**.
  - Trường boolean: `success: true | false`.
  - Trường thông báo: `message: string`.

---

## 3. Kiến trúc Quản lý Token & Session

### 3.1 Lưu trữ Token
- **Khoá lưu**: `localStorage.setItem('access_token', token)` và `localStorage.setItem('user_info', JSON.stringify(user))`.
- **Header đính kèm tự động**:
  ```http
  Authorization: Bearer <token>
  ```

### 3.2 Bộ lọc Request (Request Interceptor)
```javascript
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));
```

### 3.3 Bộ lọc Response (Response Interceptor)
```javascript
apiClient.interceptors.response.use(
  (response) => {
    // Chuẩn hóa dữ liệu trả về cho frontend
    const resData = response.data;
    return resData.data !== undefined ? resData.data : (resData.body !== undefined ? resData.body : resData);
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      // 401: Token hết hạn hoặc không hợp lệ -> Xoá session và điều hướng về /login
      if (status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject({
        status,
        errorCode: data?.error_code || 'UNKNOWN_ERROR',
        message: data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.',
        details: data?.details || null
      });
    }
    return Promise.reject({
      status: 0,
      errorCode: 'NETWORK_ERROR',
      message: 'Không thể kết nối đến máy chủ bảo tàng.'
    });
  }
);
```

---

## 4. Bảng mã lỗi dùng chung (Common Error Codes)

| Mã lỗi HTTP | `error_code` | Ý nghĩa | Phản ứng giao diện |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Dữ liệu gửi lên sai định dạng | Đánh dấu viền đỏ trường nhập liệu và hiện thông báo lỗi |
| 401 | `UNAUTHORIZED` | Chưa đăng nhập hoặc token hết hạn | Mở modal đăng nhập hoặc điều hướng về trang A1 |
| 403 | `FORBIDDEN` | Không đủ quyền (cần ADMIN / OWNER) | Hiển thị thông báo "Bạn không có quyền truy cập khu vực này" |
| 404 | `NOT_FOUND` | Bản ghi không tồn tại | Chuyển hướng hoặc hiển thị Empty State |
| 409 | `CONFLICT` | Trùng lặp (tên đăng nhập, email...) | Thông báo lỗi cụ thể bên dưới trường bị trùng |
| 500 | `INTERNAL_SERVER_ERROR` | Lỗi máy chủ | Toast thông báo "Hệ thống đang bảo trì, vui lòng thử lại sau" |

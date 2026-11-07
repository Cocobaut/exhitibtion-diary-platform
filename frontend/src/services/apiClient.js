import axios from 'axios';

/**
 * Base URL cấu hình từ biến môi trường VITE_API_BASE_URL
 * Mặc định trỏ về máy chủ backend FastAPI cục bộ
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Bảng mã lỗi dùng chung (Common Error Codes) theo đặc tả hệ thống
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * Axios instance tập trung cho toàn bộ ứng dụng
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

/**
 * Request Interceptor: Tự động đính kèm Bearer Token nếu đã đăng nhập (ưu tiên sessionStorage theo phiên)
 */
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const lang = localStorage.getItem('museum_lang') || 'vi';
      config.headers['Accept-Language'] = lang;
    } catch (err) {
      console.warn('Lỗi khi truy cập bộ nhớ trong Request Interceptor:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor: Chuẩn hóa phản hồi và bắt lỗi toàn cục
 */
apiClient.interceptors.response.use(
  (response) => {
    // Chuẩn hóa dữ liệu trả về cho frontend:
    // Nhóm Auth: resData.body
    // Nhóm tính năng thông thường: resData.data
    const resData = response.data;
    if (resData && typeof resData === 'object') {
      if (resData.data !== undefined) {
        return resData.data;
      }
      if (resData.body !== undefined) {
        return resData.body;
      }
    }
    return resData;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // 401 Unauthorized: Token hết hạn hoặc không hợp lệ -> Xoá session
      if (status === 401) {
        let hadToken = false;
        try {
          hadToken = Boolean(
            sessionStorage.getItem('access_token') || localStorage.getItem('access_token')
          );
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('user_info');
          sessionStorage.removeItem('auth_login_time');
          sessionStorage.removeItem('is_guest');
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_info');
          localStorage.removeItem('is_guest');
        } catch (e) {
          console.warn('Không thể xoá dữ liệu xác thực:', e);
        }

        // Chỉ bắn event / điều hướng nếu người dùng trước đó đã đăng nhập (có token) nhưng bị hết hạn.
        // Khách vãng lai (không có token) không bị ép chuyển hướng về /login.
        if (
          hadToken &&
          typeof window !== 'undefined' &&
          window.location &&
          window.location.pathname !== '/login'
        ) {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          if (window.location.hash && !window.location.hash.includes('#/login')) {
            window.location.hash = '#/login';
          }
        }
      }

      return Promise.reject({
        status,
        errorCode: data?.error_code || 'UNKNOWN_ERROR',
        message: data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.',
        details: data?.details || null,
        // Dữ liệu kèm theo lỗi (ví dụ target_date khi lồng đèn còn khoá)
        data: data?.data ?? null,
      });
    }

    // Lỗi mạng hoặc server không phản hồi
    return Promise.reject({
      status: 0,
      errorCode: ERROR_CODES.NETWORK_ERROR,
      message: 'Không thể kết nối đến máy chủ bảo tàng.',
      details: null,
    });
  }
);

export default apiClient;

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userService } from '../services/userService';

const AuthContext = createContext(null);

export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 giờ tính bằng mili-giây

export const STORAGE_KEYS = {
  TOKEN: 'access_token',
  USER_INFO: 'user_info',
  LOGIN_TIME: 'auth_login_time',
  IS_GUEST: 'is_guest',
};

/**
 * Kiểm tra xem phiên đăng nhập hiện tại đã vượt quá thời hạn 24 giờ hay chưa
 */
export function isSessionExpired() {
  try {
    const loginTime = sessionStorage.getItem(STORAGE_KEYS.LOGIN_TIME);
    if (!loginTime) return false;
    const elapsed = Date.now() - Number(loginTime);
    return elapsed >= SESSION_MAX_AGE_MS || elapsed < 0;
  } catch {
    return false;
  }
}

/**
 * Xóa toàn bộ dữ liệu xác thực trong sessionStorage (và dọn dẹp localStorage cũ)
 */
export function clearAuthStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER_INFO);
    sessionStorage.removeItem(STORAGE_KEYS.LOGIN_TIME);
    sessionStorage.removeItem(STORAGE_KEYS.IS_GUEST);
    // Dọn dẹp cả token cũ trong localStorage (nếu có từ phiên bản trước)
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_INFO);
    localStorage.removeItem(STORAGE_KEYS.IS_GUEST);
  } catch (err) {
    console.warn('Lỗi khi xoá dữ liệu xác thực:', err);
  }
}

/**
 * Đọc thông tin user từ sessionStorage một cách an toàn (tự động out nếu quá 24h)
 */
function getInitialUser() {
  try {
    if (isSessionExpired()) {
      clearAuthStorage();
      return null;
    }
    const savedUser = sessionStorage.getItem(STORAGE_KEYS.USER_INFO);
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (err) {
    console.error('Không thể parse user_info từ sessionStorage:', err);
    return null;
  }
}

/**
 * Đọc token từ sessionStorage một cách an toàn (tự động out nếu quá 24h)
 */
function getInitialToken() {
  try {
    if (isSessionExpired()) {
      clearAuthStorage();
      return null;
    }
    return sessionStorage.getItem(STORAGE_KEYS.TOKEN) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getInitialUser);
  const [token, setToken] = useState(getInitialToken);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(() => {
    try {
      if (isSessionExpired()) {
        clearAuthStorage();
        return false;
      }
      return (
        sessionStorage.getItem(STORAGE_KEYS.IS_GUEST) === 'true' &&
        !sessionStorage.getItem(STORAGE_KEYS.TOKEN)
      );
    } catch {
      return false;
    }
  });

  // Chuyển sang chế độ Khách vãng lai
  const enterGuestMode = useCallback(() => {
    clearAuthStorage();
    try {
      sessionStorage.setItem(STORAGE_KEYS.IS_GUEST, 'true');
      sessionStorage.setItem(STORAGE_KEYS.LOGIN_TIME, String(Date.now()));
    } catch (err) {
      console.warn('Lỗi khi lưu guest mode vào sessionStorage:', err);
    }
    setToken(null);
    setUser(null);
    setIsGuest(true);
  }, []);

  // Đăng xuất và dọn dẹp bộ nhớ phiên
  const logout = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
    setIsGuest(false);
  }, []);

  // Đăng nhập thành công: lưu token & user vào state và sessionStorage (gắn mốc thời gian 24h)
  const login = useCallback((authPayload) => {
    if (!authPayload) return;

    try {
      sessionStorage.removeItem(STORAGE_KEYS.IS_GUEST);
      localStorage.removeItem(STORAGE_KEYS.IS_GUEST);
    } catch {}
    setIsGuest(false);

    // Hỗ trợ cả { access_token, user } hoặc { token, user } hoặc payload phẳng
    const accessToken = authPayload.access_token || authPayload.token;
    const userData = authPayload.user || authPayload;
    const nowStr = String(Date.now());

    if (accessToken) {
      sessionStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      sessionStorage.setItem(STORAGE_KEYS.LOGIN_TIME, nowStr);
      try {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      } catch {}
      setToken(accessToken);
    }

    if (userData && typeof userData === 'object') {
      sessionStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userData));
      try {
        localStorage.removeItem(STORAGE_KEYS.USER_INFO);
      } catch {}
      setUser(userData);
    }
  }, []);

  // Cập nhật thông tin hồ sơ người dùng (ví dụ: đổi biệt danh, avatar)
  const updateUser = useCallback((updater) => {
    setUser((prev) => {
      const nextUser = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      try {
        if (nextUser) {
          sessionStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(nextUser));
        } else {
          sessionStorage.removeItem(STORAGE_KEYS.USER_INFO);
        }
      } catch (err) {
        console.error('Lỗi khi cập nhật user_info vào sessionStorage:', err);
      }
      return nextUser;
    });
  }, []);

  // Đồng bộ thông tin hồ sơ mới nhất từ máy chủ (GET /users/me)
  const refreshProfile = useCallback(async () => {
    const currentToken = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!currentToken) return null;

    try {
      const profile = await userService.getProfile();
      if (profile && typeof profile === 'object') {
        setUser((prev) => {
          const merged = { ...prev, ...profile };
          try {
            sessionStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(merged));
          } catch {
            // ignore
          }
          return merged;
        });
        return profile;
      }
    } catch (err) {
      console.warn('Không thể đồng bộ hồ sơ user từ máy chủ:', err);
    }
    return null;
  }, []);

  // Dọn dẹp dữ liệu đăng nhập cũ còn sót lại trong localStorage của các phiên bản trước
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEYS.TOKEN)) {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
      if (localStorage.getItem(STORAGE_KEYS.USER_INFO)) {
        localStorage.removeItem(STORAGE_KEYS.USER_INFO);
      }
      if (localStorage.getItem(STORAGE_KEYS.IS_GUEST)) {
        localStorage.removeItem(STORAGE_KEYS.IS_GUEST);
      }
    } catch {}
  }, []);

  // Tự động kiểm tra thời hạn 24 giờ:
  // Nếu treo tab quá 24h hoặc mở lại máy/app sau 24h -> Tự động out
  useEffect(() => {
    const checkExpiration = () => {
      if ((token || isGuest) && isSessionExpired()) {
        console.warn('Phiên đăng nhập đã quá 24 giờ hoặc hết hạn. Tự động đăng xuất.');
        logout();
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    };

    // Kiểm tra định kỳ mỗi 30 giây khi tab đang mở
    const interval = setInterval(checkExpiration, 30000);

    // Kiểm tra ngay khi quay lại tab (mở máy lại, mở khóa điện thoại, chuyển tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkExpiration();
      }
    };

    window.addEventListener('focus', checkExpiration);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkExpiration);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [token, isGuest, logout]);

  // Tự động đồng bộ profile khi khởi động nếu đã có token
  useEffect(() => {
    if (token) {
      refreshProfile();
    }
  }, [token, refreshProfile]);

  // Lắng nghe sự kiện 401 Unauthorized toàn cục phát ra từ apiClient
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  // Đồng bộ trạng thái khi có thay đổi từ tab khác
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.TOKEN) {
        setToken(e.newValue);
      } else if (e.key === STORAGE_KEYS.USER_INFO) {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Tính toán quyền hạn
  const isAuthenticated = Boolean(token && user);
  const role = user?.role ? String(user.role).toUpperCase() : null;
  const isAdmin = role === 'ADMIN' || role === 'OWNER';
  const isOwner = role === 'OWNER';

  const value = {
    user,
    currentUser: user, // Alias để tương thích cả 2 phong cách đặt tên
    token,
    isLoading,
    setIsLoading,
    isAuthenticated,
    isGuest,
    isAdmin,
    isOwner,
    login,
    logout,
    enterGuestMode,
    updateUser,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

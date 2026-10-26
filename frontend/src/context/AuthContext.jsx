import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userService } from '../services/userService';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  TOKEN: 'access_token',
  USER_INFO: 'user_info',
};

/**
 * Đọc thông tin user từ localStorage một cách an toàn
 */
function getInitialUser() {
  try {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER_INFO);
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (err) {
    console.error('Không thể parse user_info từ localStorage:', err);
    return null;
  }
}

/**
 * Đọc token từ localStorage một cách an toàn
 */
function getInitialToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN) || null;
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
      return localStorage.getItem('is_guest') === 'true' && !localStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch {
      return false;
    }
  });

  // Chuyển sang chế độ Khách vãng lai
  const enterGuestMode = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_INFO);
      localStorage.setItem('is_guest', 'true');
    } catch (err) {
      console.warn('Lỗi khi lưu guest mode vào localStorage:', err);
    }
    setToken(null);
    setUser(null);
    setIsGuest(true);
  }, []);

  // Đăng xuất và dọn dẹp bộ nhớ cục bộ
  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_INFO);
      localStorage.removeItem('is_guest');
    } catch (err) {
      console.warn('Lỗi khi xoá dữ liệu xác thực từ localStorage:', err);
    }
    setToken(null);
    setUser(null);
    setIsGuest(false);
  }, []);

  // Đăng nhập thành công: lưu token & user vào state và localStorage
  const login = useCallback((authPayload) => {
    if (!authPayload) return;

    try {
      localStorage.removeItem('is_guest');
    } catch {}
    setIsGuest(false);

    // Hỗ trợ cả { access_token, user } hoặc { token, user } hoặc payload phẳng
    const accessToken = authPayload.access_token || authPayload.token;
    const userData = authPayload.user || authPayload;

    if (accessToken) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      setToken(accessToken);
    }

    if (userData && typeof userData === 'object') {
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userData));
      setUser(userData);
    }
  }, []);

  // Cập nhật thông tin hồ sơ người dùng (ví dụ: đổi biệt danh, avatar)
  const updateUser = useCallback((updater) => {
    setUser((prev) => {
      const nextUser = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      try {
        if (nextUser) {
          localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(nextUser));
        } else {
          localStorage.removeItem(STORAGE_KEYS.USER_INFO);
        }
      } catch (err) {
        console.error('Lỗi khi cập nhật user_info vào localStorage:', err);
      }
      return nextUser;
    });
  }, []);

  // Đồng bộ thông tin hồ sơ mới nhất từ máy chủ (GET /users/me)
  const refreshProfile = useCallback(async () => {
    const currentToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!currentToken) return null;

    try {
      const profile = await userService.getProfile();
      if (profile && typeof profile === 'object') {
        setUser((prev) => {
          const merged = { ...prev, ...profile };
          try {
            localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(merged));
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

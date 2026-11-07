import React, { useState, useEffect, useCallback } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GuestGuardProvider } from './context/GuestGuardContext';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ThemeDropdown } from './components/overlays/ThemeDropdown';
import { NotificationDropdown } from './components/overlays/NotificationDropdown';
import { MailboxModal } from './components/overlays/MailboxModal';

// Pages
import { LobbyPage } from './pages/Lobby/LobbyPage';
import { Room1Page } from './pages/Room1_Broken/Room1Page';
import { Room2Page } from './pages/Room2_Hope/Room2Page';
import { Room3Page } from './pages/Room3_Tree/Room3Page';
import { DiaryPage } from './pages/Diary/DiaryPage';
import { NotebookPage } from './pages/Notebook/NotebookPage';
import { AdminPage } from './pages/Admin/AdminPage';
import { OwnerDashboardPage } from './pages/Owner/OwnerDashboardPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const ROUTE_PATH_MAP = {
  home: '/',
  r1: '/rooms/1',
  r2: '/rooms/2',
  r3: '/rooms/3',
  diary: '/diary',
  notebook: '/notebook',
  admin: '/admin',
  owner: '/owner',
  profile: '/profile',
  login: '/login',
};

export const pathToRoute = (pathname) => {
  if (!pathname || pathname === '' || pathname === '/') return 'home';
  const clean = pathname.toLowerCase().replace(/\/+$/, '');
  if (!clean || clean === '') return 'home';
  if (clean === '/login') return 'login';
  if (clean.startsWith('/rooms/1') || clean === '/r1' || clean === '/room1') return 'r1';
  if (clean.startsWith('/rooms/2') || clean === '/r2' || clean === '/room2') return 'r2';
  if (clean.startsWith('/rooms/3') || clean === '/r3' || clean === '/room3') return 'r3';
  if (clean.startsWith('/diaries') || clean.startsWith('/diary')) return 'diary';
  if (clean.startsWith('/notebook')) return 'notebook';
  if (clean.startsWith('/admin')) return 'admin';
  if (clean.startsWith('/owner')) return 'owner';
  if (clean.startsWith('/profile')) return 'profile';
  if (clean.startsWith('/lobby') || clean === '/home') return 'home';
  return 'home';
};

function MainApp() {
  const { theme, setTheme } = useTheme();
  const { user, isAdmin, isGuest, login } = useAuth();
  // Tải lại trang thì giữ phiên đăng nhập và trang đang xem; chưa đăng nhập thì vào trang đăng nhập
  const [currentRoute, setCurrentRoute] = useState(() => {
    try {
      const hasSession = localStorage.getItem('access_token') || localStorage.getItem('is_guest') === 'true';
      if (!hasSession || window.location.search.includes('reset_token=')) return 'login';
      const pathRoute = pathToRoute(window.location.pathname);
      if (pathRoute && pathRoute !== 'home') return pathRoute;
      return sessionStorage.getItem('museum_route') || pathRoute || 'home';
    } catch {
      return 'login';
    }
  });

  const [notificationTarget, setNotificationTarget] = useState(null);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Điều hướng nội bộ và đồng bộ với HTML5 History API
  const navigate = useCallback((targetRoute, options = {}) => {
    if (!targetRoute) return;
    const { replace = false } = options;

    // Đóng toàn bộ modals/dropdowns khi chuyển trang
    setIsMailboxOpen(false);
    setIsNotificationsOpen(false);
    setIsThemeModalOpen(false);

    setCurrentRoute((prevRoute) => {
      if (prevRoute === targetRoute && !replace) {
        return prevRoute;
      }

      const targetPath = ROUTE_PATH_MAP[targetRoute] || '/';
      try {
        if (replace) {
          window.history.replaceState({ route: targetRoute }, '', targetPath);
        } else {
          window.history.pushState({ route: targetRoute }, '', targetPath);
        }
      } catch (err) {
        console.warn('Lỗi cập nhật window.history:', err);
      }

      try {
        if (targetRoute !== 'login') {
          sessionStorage.setItem('museum_route', targetRoute);
        }
      } catch {
        // bỏ qua
      }

      return targetRoute;
    });
  }, []);

  // Khởi tạo trạng thái ban đầu cho entry đầu tiên trong lịch sử trình duyệt
  useEffect(() => {
    try {
      const currentPath = ROUTE_PATH_MAP[currentRoute] || '/';
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const fullUrl = currentPath + search + hash;

      if (!window.history.state || window.history.state.route !== currentRoute) {
        window.history.replaceState({ route: currentRoute }, '', fullUrl);
      }
    } catch (err) {
      console.warn('Lỗi khởi tạo history state:', err);
    }
  }, []);

  // Lắng nghe sự kiện popstate (nút Back/Forward của trình duyệt, chuột Back, cử chỉ touchpad, Alt+Left)
  useEffect(() => {
    const handlePopState = (event) => {
      // Đóng toàn bộ popup/dropdowns khi quay lại
      setIsMailboxOpen(false);
      setIsNotificationsOpen(false);
      setIsThemeModalOpen(false);
      setNotificationTarget(null);

      let targetRoute = event.state?.route;
      if (!targetRoute) {
        targetRoute = pathToRoute(window.location.pathname);
      }

      const hasSession = localStorage.getItem('access_token') || localStorage.getItem('is_guest') === 'true';
      if (!hasSession && targetRoute !== 'login') {
        targetRoute = 'login';
      } else if (isGuest && (targetRoute === 'diary' || targetRoute === 'notebook' || targetRoute === 'admin' || targetRoute === 'owner' || targetRoute === 'profile')) {
        targetRoute = 'home';
      }

      setCurrentRoute(targetRoute);

      try {
        if (targetRoute !== 'login') {
          sessionStorage.setItem('museum_route', targetRoute);
        }
      } catch {
        // bỏ qua
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isGuest]);

  useEffect(() => {
    try {
      if (currentRoute !== 'login') sessionStorage.setItem('museum_route', currentRoute);
    } catch {
      // bỏ qua khi trình duyệt chặn bộ nhớ
    }
  }, [currentRoute]);

  // Bảo vệ route: Khách vãng lai không được truy cập các trang đòi hỏi tài khoản
  useEffect(() => {
    if (isGuest && (currentRoute === 'diary' || currentRoute === 'notebook' || currentRoute === 'admin' || currentRoute === 'owner' || currentRoute === 'profile')) {
      navigate('home', { replace: true });
    }
  }, [isGuest, currentRoute, navigate]);

  // Sổ tay lưu cục bộ theo từng tài khoản; tài khoản mới bắt đầu với sổ tay trống
  const notebookKey = user?.id ? `museum_notebook_${user.id}` : 'museum_notebook_guest';
  const [notebookItems, setNotebookItems] = useState([]);

  React.useEffect(() => {
    if (!notebookKey) {
      setNotebookItems([]);
      return;
    }
    try {
      const saved = localStorage.getItem(notebookKey);
      setNotebookItems(saved ? JSON.parse(saved) : []);
    } catch {
      setNotebookItems([]);
    }
  }, [notebookKey]);

  const persistNotebook = (items) => {
    if (!notebookKey) return;
    try {
      localStorage.setItem(notebookKey, JSON.stringify(items));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveToNotebook = (newItem) => {
    if (!newItem) return;
    setNotebookItems((prev) => {
      // Tránh trùng lặp theo id hoặc theo nội dung
      if (
        prev.some((item) =>
          (item.id && newItem.id && item.id === newItem.id) ||
          (item.content && newItem.content && (item.content || '').trim() === (newItem.content || '').trim())
        )
      ) {
        return prev;
      }
      const updated = [newItem, ...prev];
      persistNotebook(updated);
      return updated;
    });
  };

  const handleRemoveFromNotebook = (target) => {
    if (!target) return;
    const targetId = typeof target === 'object' ? target.id : target;
    const sourceId = typeof target === 'object' ? (target.source_id || target.artwork_id) : null;
    const content = typeof target === 'object' ? (target.content || '').trim() : null;

    setNotebookItems((prev) => {
      const updated = prev.filter((item) => {
        if (targetId && item.id === targetId) return false;
        if (sourceId && (item.artwork_id === sourceId || item.source_id === sourceId || item.id === sourceId)) return false;
        if (content && (item.content || '').trim() === content) return false;
        return true;
      });
      persistNotebook(updated);
      return updated;
    });
  };

  return (
    <GuestGuardProvider onNavigateToLogin={() => navigate('login')}>
      <div className="app-wrapper">
        {/* Main Museum Screen Viewport */}
        <div className="screen-container">
          <div className="screen" data-theme={theme}>
          {/* Sidebar Navigation */}
          {currentRoute !== 'login' && (
            <Sidebar
              currentRoute={currentRoute}
              onNavigate={navigate}
              isAdmin={isAdmin}
              user={user}
            />
          )}

          {/* Mobile Bottom Navigation Bar (< 768px) */}
          {currentRoute !== 'login' && (
            <MobileBottomNav
              currentRoute={currentRoute}
              onNavigate={navigate}
              isAdmin={isAdmin}
              user={user}
              onOpenMailbox={() => setIsMailboxOpen(true)}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenThemeModal={() => setIsThemeModalOpen(true)}
            />
          )}

          {/* Page Routing */}
          <ErrorBoundary routeKey={currentRoute} onReset={() => navigate('home')}>
            {currentRoute === 'home' && (
              <LobbyPage
                onNavigate={navigate}
                onOpenMailbox={() => setIsMailboxOpen(true)}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenThemeModal={() => setIsThemeModalOpen(true)}
              />
            )}

            {currentRoute === 'r1' && (
              <Room1Page
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenThemeModal={() => setIsThemeModalOpen(true)}
                onSaveToNotebook={handleSaveToNotebook}
                notebookItems={notebookItems}
                initialArtworkId={notificationTarget?.room === 'r1' ? notificationTarget.id : null}
                onClearInitialArtwork={() => setNotificationTarget(null)}
              />
            )}

            {currentRoute === 'r2' && (
              <Room2Page
                onNavigate={navigate}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenThemeModal={() => setIsThemeModalOpen(true)}
                onSaveToNotebook={handleSaveToNotebook}
                initialLanternId={notificationTarget?.room === 'r2' ? notificationTarget.id : null}
                onClearInitialLantern={() => setNotificationTarget(null)}
              />
            )}

            {currentRoute === 'r3' && (
              <Room3Page
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenThemeModal={() => setIsThemeModalOpen(true)}
                onSaveToNotebook={handleSaveToNotebook}
                notebookItems={notebookItems}
                initialLeafId={notificationTarget?.room === 'r3' ? notificationTarget.id : null}
                onClearInitialLeaf={() => setNotificationTarget(null)}
              />
            )}

            {currentRoute === 'diary' && (
              <DiaryPage
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenThemeModal={() => setIsThemeModalOpen(true)}
                initialDiaryTarget={notificationTarget?.room === 'diary' ? notificationTarget : null}
                onClearInitialDiary={() => setNotificationTarget(null)}
              />
            )}

            {currentRoute === 'notebook' && (
              <NotebookPage
                notebookItems={notebookItems}
                onRemoveItem={handleRemoveFromNotebook}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenThemeModal={() => setIsThemeModalOpen(true)}
              />
            )}

            {currentRoute === 'admin' && (
              <AdminPage
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenThemeModal={() => setIsThemeModalOpen(true)}
              />
            )}

            {currentRoute === 'owner' && (
              <OwnerDashboardPage
                onNavigate={navigate}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenThemeModal={() => setIsThemeModalOpen(true)}
              />
            )}

            {currentRoute === 'login' && (
              <LoginPage
                onLoginSuccess={(authData) => {
                  if (authData) login(authData);
                  navigate('home', { replace: true });
                }}
                onExploreGuest={() => navigate('home', { replace: true })}
              />
            )}

            {currentRoute === 'profile' && (
              <ProfilePage
                onNavigate={navigate}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenThemeModal={() => setIsThemeModalOpen(true)}
              />
            )}
          </ErrorBoundary>

          {/* Global Overlays & Modals */}
          <MailboxModal
            isOpen={isMailboxOpen}
            onClose={() => setIsMailboxOpen(false)}
            onSaveToNotebook={handleSaveToNotebook}
            notebookItems={notebookItems}
          />

          <NotificationDropdown
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
            onActionClick={(cta, item) => {
              const url = (item?.target_url || '').trim();

              // 1. Parse target_url from backend if available
              if (url) {
                const r1Match = url.match(/^\/rooms\/1(?:\/artworks\/([^/?#]+))?/i);
                if (r1Match) {
                  setNotificationTarget(r1Match[1] ? { room: 'r1', id: r1Match[1] } : null);
                  navigate('r1');
                  return;
                }

                const r2Match = url.match(/^\/rooms\/2(?:\/artworks\/([^/?#]+))?/i);
                if (r2Match) {
                  setNotificationTarget(r2Match[1] ? { room: 'r2', id: r2Match[1] } : null);
                  navigate('r2');
                  return;
                }

                const r3Match = url.match(/^\/rooms\/3(?:\/artworks\/([^/?#]+))?/i);
                if (r3Match) {
                  setNotificationTarget(r3Match[1] ? { room: 'r3', id: r3Match[1] } : null);
                  navigate('r3');
                  return;
                }

                const diaryCommMatch = url.match(/^\/diaries\/community\/([^/?#]+)/i);
                if (diaryCommMatch) {
                  setNotificationTarget({ room: 'diary', tab: 'community', id: diaryCommMatch[1] });
                  navigate('diary');
                  return;
                }

                const diaryMeMatch = url.match(/^\/diaries(?:\/me\/([^/?#]+))?/i);
                if (diaryMeMatch) {
                  setNotificationTarget({ room: 'diary', tab: 'personal', id: diaryMeMatch[1] || null });
                  navigate('diary');
                  return;
                }

                if (url.startsWith('/owner')) {
                  navigate('owner');
                  return;
                }

                if (url.startsWith('/admin')) {
                  navigate('admin');
                  return;
                }
              }

              // 2. Fallback to CTA text matching
              const text = (cta || '').toLowerCase();
              if (text.includes('phòng 1') || text.includes('room 1') || text.includes('tác phẩm')) {
                navigate('r1');
              } else if (text.includes('thư') || text.includes('lồng đèn') || text.includes('lantern')) {
                navigate('r2');
              } else if (text.includes('cây') || text.includes('tree')) {
                navigate('r3');
              } else if (text.includes('nhật ký') || text.includes('diary')) {
                navigate('diary');
              } else if (text.includes('quản lý') || text.includes('manage')) {
                navigate('owner');
              }
            }}
          />

            <ThemeDropdown
              isOpen={isThemeModalOpen}
              onClose={() => setIsThemeModalOpen(false)}
            />
          </div>
        </div>
      </div>
    </GuestGuardProvider>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;

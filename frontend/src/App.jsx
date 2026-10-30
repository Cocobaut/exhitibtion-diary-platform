import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GuestGuardProvider } from './context/GuestGuardContext';
import { Sidebar } from './components/layout/Sidebar';
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

function MainApp() {
  const { theme, setTheme } = useTheme();
  const { user, isAdmin, isGuest, login } = useAuth();
  // Tải lại trang thì giữ phiên đăng nhập và trang đang xem; chưa đăng nhập thì vào trang đăng nhập
  const [currentRoute, setCurrentRoute] = useState(() => {
    try {
      const hasSession = localStorage.getItem('access_token') || localStorage.getItem('is_guest') === 'true';
      if (!hasSession || window.location.search.includes('reset_token=')) return 'login';
      return sessionStorage.getItem('museum_route') || 'home';
    } catch {
      return 'login';
    }
  });

  React.useEffect(() => {
    try {
      if (currentRoute !== 'login') sessionStorage.setItem('museum_route', currentRoute);
    } catch {
      // bỏ qua khi trình duyệt chặn bộ nhớ
    }
  }, [currentRoute]);
  const [notificationTarget, setNotificationTarget] = useState(null);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Bảo vệ route: Khách vãng lai không được truy cập các trang đòi hỏi tài khoản
  React.useEffect(() => {
    if (isGuest && (currentRoute === 'diary' || currentRoute === 'notebook' || currentRoute === 'admin' || currentRoute === 'owner' || currentRoute === 'profile')) {
      setCurrentRoute('home');
    }
  }, [isGuest, currentRoute]);

  // Sổ tay lưu cục bộ theo từng tài khoản; tài khoản mới bắt đầu với sổ tay trống
  const notebookKey = user?.id ? `museum_notebook_${user.id}` : null;
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
    setNotebookItems((prev) => {
      // If already present by content, avoid duplicating
      if (prev.some((item) => item.content === newItem.content)) {
        return prev;
      }
      const updated = [newItem, ...prev];
      persistNotebook(updated);
      return updated;
    });
  };

  const handleRemoveFromNotebook = (id) => {
    setNotebookItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      persistNotebook(updated);
      return updated;
    });
  };

  return (
    <GuestGuardProvider onNavigateToLogin={() => setCurrentRoute('login')}>
      <div className="app-wrapper">
        {/* Main Museum Screen Viewport */}
        <div className="screen-container">
          <div className="screen" data-theme={theme}>
          {/* Sidebar Navigation */}
          {currentRoute !== 'login' && (
            <Sidebar
              currentRoute={currentRoute}
              onNavigate={(route) => {
                setCurrentRoute(route);
                setIsMailboxOpen(false);
                setIsNotificationsOpen(false);
                setIsThemeModalOpen(false);
              }}
              isAdmin={isAdmin}
              user={user}
            />
          )}

          {/* Page Routing */}
          {currentRoute === 'home' && (
            <LobbyPage
              onNavigate={setCurrentRoute}
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
              onNavigate={setCurrentRoute}
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
            />
          )}

          {currentRoute === 'owner' && (
            <OwnerDashboardPage
              onNavigate={setCurrentRoute}
            />
          )}

          {currentRoute === 'login' && (
            <LoginPage
              onLoginSuccess={(authData) => {
                if (authData) login(authData);
                setCurrentRoute('home');
              }}
              onExploreGuest={() => setCurrentRoute('home')}
            />
          )}

          {currentRoute === 'profile' && (
            <ProfilePage
              onNavigate={setCurrentRoute}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenThemeModal={() => setIsThemeModalOpen(true)}
            />
          )}

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
                  setCurrentRoute('r1');
                  return;
                }

                const r2Match = url.match(/^\/rooms\/2(?:\/artworks\/([^/?#]+))?/i);
                if (r2Match) {
                  setNotificationTarget(r2Match[1] ? { room: 'r2', id: r2Match[1] } : null);
                  setCurrentRoute('r2');
                  return;
                }

                const r3Match = url.match(/^\/rooms\/3(?:\/artworks\/([^/?#]+))?/i);
                if (r3Match) {
                  setNotificationTarget(r3Match[1] ? { room: 'r3', id: r3Match[1] } : null);
                  setCurrentRoute('r3');
                  return;
                }

                const diaryCommMatch = url.match(/^\/diaries\/community\/([^/?#]+)/i);
                if (diaryCommMatch) {
                  setNotificationTarget({ room: 'diary', tab: 'community', id: diaryCommMatch[1] });
                  setCurrentRoute('diary');
                  return;
                }

                const diaryMeMatch = url.match(/^\/diaries(?:\/me\/([^/?#]+))?/i);
                if (diaryMeMatch) {
                  setNotificationTarget({ room: 'diary', tab: 'personal', id: diaryMeMatch[1] || null });
                  setCurrentRoute('diary');
                  return;
                }

                if (url.startsWith('/owner')) {
                  setCurrentRoute('owner');
                  return;
                }

                if (url.startsWith('/admin')) {
                  setCurrentRoute('admin');
                  return;
                }
              }

              // 2. Fallback to CTA text matching
              const text = (cta || '').toLowerCase();
              if (text.includes('phòng 1') || text.includes('room 1') || text.includes('tác phẩm')) {
                setCurrentRoute('r1');
              } else if (text.includes('thư') || text.includes('lồng đèn') || text.includes('lantern')) {
                setCurrentRoute('r2');
              } else if (text.includes('cây') || text.includes('tree')) {
                setCurrentRoute('r3');
              } else if (text.includes('nhật ký') || text.includes('diary')) {
                setCurrentRoute('diary');
              } else if (text.includes('quản lý') || text.includes('manage')) {
                setCurrentRoute('owner');
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

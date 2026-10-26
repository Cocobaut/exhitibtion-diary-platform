import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { INITIAL_NOTEBOOK_ITEMS } from './data/mockData';

function MainApp() {
  const { theme, setTheme } = useTheme();
  const { user, isAdmin, login } = useAuth();
  const [currentRoute, setCurrentRoute] = useState('login'); // Ban đầu bắt buộc vào trang đăng nhập thay vì trang chính
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Notebook items state with localStorage sync
  const [notebookItems, setNotebookItems] = useState(() => {
    try {
      const saved = localStorage.getItem('museum_notebook');
      return saved ? JSON.parse(saved) : INITIAL_NOTEBOOK_ITEMS;
    } catch {
      return INITIAL_NOTEBOOK_ITEMS;
    }
  });

  const handleSaveToNotebook = (newItem) => {
    setNotebookItems((prev) => {
      // If already present by content, avoid duplicating
      if (prev.some((item) => item.content === newItem.content)) {
        return prev;
      }
      const updated = [newItem, ...prev];
      try {
        localStorage.setItem('museum_notebook', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const handleRemoveFromNotebook = (id) => {
    setNotebookItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('museum_notebook', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  return (
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
            />
          )}

          {currentRoute === 'r2' && (
            <Room2Page
              onNavigate={setCurrentRoute}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenThemeModal={() => setIsThemeModalOpen(true)}
              onSaveToNotebook={handleSaveToNotebook}
            />
          )}

          {currentRoute === 'r3' && (
            <Room3Page
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenThemeModal={() => setIsThemeModalOpen(true)}
            />
          )}

          {currentRoute === 'diary' && (
            <DiaryPage
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenThemeModal={() => setIsThemeModalOpen(true)}
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
            onActionClick={(cta) => {
              if (cta.includes('Phòng 1') || cta.includes('tác phẩm')) setCurrentRoute('r1');
              else if (cta.includes('thư') || cta.includes('Lồng đèn')) setCurrentRoute('r2');
              else if (cta.includes('cây')) setCurrentRoute('r3');
              else if (cta.includes('nhật ký') || cta.includes('Nhật ký')) setCurrentRoute('diary');
            }}
          />

          <ThemeDropdown
            isOpen={isThemeModalOpen}
            onClose={() => setIsThemeModalOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

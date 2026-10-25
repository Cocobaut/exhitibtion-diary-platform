import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
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
import { LoginPage } from './pages/Auth/LoginPage';
import { INITIAL_NOTEBOOK_ITEMS } from './data/mockData';

function MainApp() {
  const { theme, setTheme } = useTheme();
  const [currentRoute, setCurrentRoute] = useState('home'); // home, r1, r2, r3, diary, notebook, admin, login
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

  // Quick navigation handler from dev toolbar or buttons
  const handleQuickJump = (target) => {
    switch (target) {
      case 's-lobby':
        setCurrentRoute('home');
        setIsMailboxOpen(false);
        break;
      case 's-mailbox':
        setCurrentRoute('home');
        setIsMailboxOpen(true);
        break;
      case 's-notify':
        setCurrentRoute('home');
        setIsNotificationsOpen(true);
        break;
      case 's-theme':
        setCurrentRoute('home');
        setIsThemeModalOpen(true);
        break;
      case 's-r1':
        setCurrentRoute('r1');
        break;
      case 's-r2':
        setCurrentRoute('r2');
        break;
      case 's-r3':
        setCurrentRoute('r3');
        break;
      case 's-diary':
        setCurrentRoute('diary');
        break;
      case 's-notebook':
        setCurrentRoute('notebook');
        break;
      case 's-admin':
        setCurrentRoute('admin');
        break;
      case 's-login':
        setCurrentRoute('login');
        break;
      default:
        setCurrentRoute(target);
    }
  };

  return (
    <div className="app-wrapper">
      {/* Dev / Tester Quick Switcher Bar */}
      <div className="dev-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <b style={{ color: 'var(--d-gold)' }}>✦ The Name of Feeling Museum</b>
          <span style={{ opacity: 0.6 }}>|</span>
          <span>Chọn nhanh màn hình mock:</span>
          <select
            value={currentRoute}
            onChange={(e) => handleQuickJump(e.target.value)}
          >
            <option value="s-lobby">B1 · Sảnh chính</option>
            <option value="s-mailbox">B2 · Hòm thư · rút thông điệp</option>
            <option value="s-notify">B3 · Hộp thông báo</option>
            <option value="s-theme">B4 · Đổi bảng màu</option>
            <option value="s-r1">C1 · Phòng 1 (Triển lãm Đổ vỡ)</option>
            <option value="s-r2">D1 · Phòng 2 (Bầu trời Lồng đèn)</option>
            <option value="s-r3">E1 · Phòng 3 (Cây Thông điệp)</option>
            <option value="s-diary">G1 · Nhật ký</option>
            <option value="s-notebook">G2 · Sổ tay (Đã lưu)</option>
            <option value="s-admin">H1 · Bảng Quản trị</option>
            <option value="s-login">A1 · Đăng nhập</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Theme:</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="museum">Bảo tàng chiều (Mặc định)</option>
            <option value="moss">Rêu cổ</option>
            <option value="plum">Mận chín</option>
            <option value="paper">Giấy cũ</option>
          </select>
        </div>
      </div>

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
              isAdmin={true}
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

          {currentRoute === 'login' && (
            <LoginPage
              onLoginSuccess={() => setCurrentRoute('home')}
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
      <MainApp />
    </ThemeProvider>
  );
}

export default App;

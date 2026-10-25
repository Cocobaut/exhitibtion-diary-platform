import React from 'react';
import { Icon } from '../common/Icons';

export function Sidebar({ currentRoute, onNavigate, isAdmin = true }) {
  const navItems = [
    { key: 'home', icon: 'home', label: 'Sảnh' },
    { key: 'r1', icon: 'r1', label: 'Phòng 1' },
    { key: 'r2', icon: 'r2', label: 'Phòng 2' },
    { key: 'r3', icon: 'r3', label: 'Phòng 3' },
    { key: 'diary', icon: 'diary', label: 'Nhật ký' },
    { key: 'notebook', icon: 'bookmark', label: 'Sổ tay' },
  ];

  return (
    <nav className="side">
      <div className="mark" onClick={() => onNavigate('home')} title="Về Sảnh chính">
        ✦
      </div>

      {navItems.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`side-btn ${currentRoute === item.key ? 'on' : ''}`}
          onClick={() => onNavigate(item.key)}
        >
          <Icon name={item.icon} size={22} />
          <span>{item.label}</span>
        </button>
      ))}

      <div className="grow" />

      {isAdmin && (
        <button
          type="button"
          className={`side-btn ${currentRoute === 'admin' ? 'on' : ''}`}
          onClick={() => onNavigate('admin')}
        >
          <Icon name="shield" size={22} />
          <span>Quản trị</span>
        </button>
      )}

      <div className="av" onClick={() => onNavigate('login')} title="Tài khoản (Linh)">
        L
      </div>
    </nav>
  );
}

export default Sidebar;

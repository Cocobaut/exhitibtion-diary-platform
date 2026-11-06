import React, { useState, useEffect, useRef, useCallback } from 'react';
import { adminStudioService } from '../../services/adminStudioService';
import { useLanguage } from '../../context/LanguageContext';

export function AdminPresenceIndicator() {
  const { language, t } = useLanguage();
  const [presenceData, setPresenceData] = useState({ total_online: 0, total_offline: 0, admins: [] });
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const fetchPresence = useCallback(async () => {
    try {
      const res = await adminStudioService.getAdminPresence();
      const data = res?.data || res;
      if (data && Array.isArray(data.admins)) {
        setPresenceData(data);
      }
    } catch (err) {
      // ignore transient network errors
    }
  }, []);

  useEffect(() => {
    fetchPresence();
    // Heartbeat & status refresh every 30s
    const interval = setInterval(fetchPresence, 30000);
    return () => clearInterval(interval);
  }, [fetchPresence]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const onlineAdmins = (presenceData.admins || []).filter((a) => a.is_online);
  const totalOnline = presenceData.total_online || onlineAdmins.length || 0;

  const formatLastSeen = (dateStr) => {
    if (!dateStr) return language === 'en' ? 'Never' : 'Chưa có';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Presence Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="glass"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 12px',
          borderRadius: '999px',
          border: '1px solid var(--glass-line, rgba(255,255,255,0.15))',
          background: 'var(--glass, rgba(255,255,255,0.08))',
          color: 'var(--onw, #fff)',
          cursor: 'pointer',
          fontSize: '12.5px',
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
        }}
        title={language === 'en' ? 'Admin Team Presence' : 'Ban Quản trị online'}
      >
        {/* Pulsing emerald live indicator */}
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: totalOnline > 0 ? '#10b981' : '#6b7280',
            boxShadow: totalOnline > 0 ? '0 0 8px #10b981' : 'none',
            display: 'inline-block',
          }}
        />

        <span>
          {totalOnline} {language === 'en' ? 'Online' : 'Trực tuyến'}
        </span>

        {/* Stacked mini avatars of online admins */}
        {onlineAdmins.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '2px' }}>
            {onlineAdmins.slice(0, 3).map((adm, idx) => {
              const letter = (adm.nickname || adm.username || 'A').charAt(0).toUpperCase();
              return (
                <div
                  key={adm.id || idx}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'var(--acc, #92400e)',
                    border: '1.5px solid var(--paper, #1e1b24)',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'grid',
                    placeItems: 'center',
                    marginLeft: idx > 0 ? '-6px' : '0',
                    overflow: 'hidden',
                  }}
                  title={adm.nickname || adm.username}
                >
                  {adm.avatar_url ? (
                    <img src={adm.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    letter
                  )}
                </div>
              );
            })}
          </div>
        )}
      </button>

      {/* Popover Detail Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '290px',
            background: 'var(--paper, #1e1b24)',
            color: 'var(--ink, #fff)',
            borderRadius: '16px',
            padding: '14px',
            boxShadow: '0 16px 44px rgba(0, 0, 0, 0.45)',
            border: '1px solid var(--line, rgba(255, 255, 255, 0.15))',
            zIndex: 100,
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--line, rgba(255, 255, 255, 0.12))',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.04em' }}>
              ✦ {t('admin_online_team') || (language === 'en' ? 'Admin Team' : 'Ban Quản trị online')}
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                fontWeight: 600,
              }}
            >
              {totalOnline}/{presenceData.admins.length} online
            </span>
          </div>

          {/* List of Admins */}
          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {presenceData.admins.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '12.5px' }}>
                {language === 'en' ? 'No administrators found.' : 'Chưa có thông tin ban quản trị.'}
              </div>
            ) : (
              presenceData.admins.map((adm) => {
                const isOnline = adm.is_online;
                const letter = (adm.nickname || adm.username || 'A').charAt(0).toUpperCase();
                const isOwner = adm.role === 'OWNER';

                return (
                  <div
                    key={adm.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: isOnline ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                      opacity: isOnline ? 1 : 0.65,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Avatar with indicator */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: isOwner ? '#7c3aed' : 'var(--acc, #92400e)',
                          color: '#fff',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                          overflow: 'hidden',
                        }}
                      >
                        {adm.avatar_url ? (
                          <img src={adm.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          letter
                        )}
                      </div>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: isOnline ? '#10b981' : '#9ca3af',
                          border: '1.5px solid var(--paper, #1e1b24)',
                        }}
                      />
                    </div>

                    {/* Admin details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {adm.nickname || adm.username}
                        </span>
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: isOwner ? 'rgba(124, 58, 237, 0.18)' : 'rgba(217, 119, 6, 0.18)',
                            color: isOwner ? '#a78bfa' : '#fbbf24',
                          }}
                        >
                          {adm.role}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted, #a1a1aa)', marginTop: '2px' }}>
                        {isOnline ? (
                          <span style={{ color: '#10b981', fontWeight: 500 }}>
                            ● {language === 'en' ? 'Active now' : 'Đang hoạt động'}
                          </span>
                        ) : (
                          <span>
                            {language === 'en' ? 'Last seen: ' : 'Lần cuối: '}
                            {formatLastSeen(adm.last_seen_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPresenceIndicator;


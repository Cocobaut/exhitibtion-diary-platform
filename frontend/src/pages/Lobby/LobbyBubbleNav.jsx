import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';

/* =====================================================================
   Outlined Vector Icons (Fill: none, stroke only, rỗng - không fill)
   ===================================================================== */
const Star4OutlineIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z" />
  </svg>
);

const MuseumOutlineIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 9L12 3L21 9" />
    <path d="M2 9H22" />
    <path d="M6 9V18" />
    <path d="M10 9V18" />
    <path d="M14 9V18" />
    <path d="M18 9V18" />
    <path d="M2 18H22" />
    <path d="M1 21H23" />
  </svg>
);

const MailboxOutlineIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 16V9a6 6 0 0 1 12 0v7Z" />
    <path d="M9 11h6" />
    <path d="M18 8h3v4h-3" />
    <path d="M12 16v5" />
    <path d="M8 21h8" />
  </svg>
);

const LanternOutlineIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 2v3" />
    <path d="M8 5h8" />
    <path d="M8 5c-3 3-3 8 0 11h8c3-3 3-8 0-11H8z" />
    <path d="M12 5v11" />
    <path d="M9 16h6" />
    <path d="M12 16v4" />
    <path d="M10 20h4" />
    <path d="M11 20v2" />
    <path d="M13 20v2" />
  </svg>
);

const DiaryOutlineIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 6s3-2 10-2 10 2 10 2v13s-3-2-10-2-10 2-10 2V6z" />
    <path d="M12 4v13" />
  </svg>
);

const TreeOutlineIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 22v-7" />
    <path d="M7 22h10" />
    <path d="M12 15a5.5 5.5 0 0 0 5.5-5.5c0-2.3-1.4-4.2-3.4-5A5.5 5.5 0 0 0 6.5 9.5 5.5 5.5 0 0 0 12 15z" />
    <path d="M12 15v-4" />
    <path d="M10 13l2-2 2 2" />
  </svg>
);

/**
 * LobbyBubbleNav Component
 * Draggable Floating 4-Pointed Star Button for Tablet Portrait, Mobile Landscape, and Mobile Portrait.
 * Default position is on the right side of the screen; user can press and drag anywhere.
 * Clicking it opens a standard museum modal form with hollow stroke-only logos.
 */
export function LobbyBubbleNav({
  rooms,
  onNavigate,
  onOpenMailbox,
  onOpenDiary,
  scrollToItem,
  isGuest,
  guardAction,
  t,
  language,
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Position defaults to the right side of the screen
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(16, window.innerWidth - 64),
        y: Math.max(76, Math.min(110, window.innerHeight * 0.12)),
      };
    }
    return { x: 320, y: 88 };
  });

  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const startRef = useRef({ startX: 0, startY: 0, origX: 0, origY: 0 });

  // Update bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = Math.max(12, window.innerWidth - 60);
        const maxY = Math.max(12, window.innerHeight - 70);
        return {
          x: Math.max(12, Math.min(maxX, prev.x > maxX - 20 ? maxX : prev.x)),
          y: Math.max(12, Math.min(maxY, prev.y)),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pointer drag events (Unified mouse, touch & pen)
  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startRef.current.startX;
    const dy = e.clientY - startRef.current.startY;
    if (Math.hypot(dx, dy) > 5) {
      hasMovedRef.current = true;
      const nextX = Math.max(12, Math.min(window.innerWidth - 60, startRef.current.origX + dx));
      const nextY = Math.max(12, Math.min(window.innerHeight - 70, startRef.current.origY + dy));
      setPosition({ x: nextX, y: nextY });
    }
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    // If not dragged (simple tap/click) -> Toggle modal form!
    if (!hasMovedRef.current) {
      setIsOpen((prev) => !prev);
    }
  };

  const handlePointerCancel = (e) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const spaces = [
    {
      id: 'r1',
      idx: 0,
      iconSvg: <MuseumOutlineIcon />,
      badge: rooms[0]?.badge || (language === 'en' ? 'ROOM 01' : 'PHÒNG 01'),
      title: rooms[0]?.name || (language === 'en' ? 'Journey Exhibition' : 'Triển lãm Hành trình'),
      actionText: language === 'en' ? 'Go to Room 1 →' : 'Đến phòng 1 →',
      onClick: () => {
        if (scrollToItem) scrollToItem(0);
        if (onNavigate) onNavigate('r1');
        setIsOpen(false);
      },
    },
    {
      id: 'mailbox',
      idx: 1,
      iconSvg: <MailboxOutlineIcon />,
      badge: language === 'en' ? 'MAILBOX' : 'HÒM THƯ',
      title: t('lobby_mailbox_title') || (language === 'en' ? 'Emotional Mailbox' : 'Hòm thư cảm xúc'),
      actionText: language === 'en' ? 'Open mailbox →' : 'Mở hòm thư →',
      onClick: () => {
        if (scrollToItem) scrollToItem(1);
        if (onOpenMailbox) onOpenMailbox();
        setIsOpen(false);
      },
    },
    {
      id: 'r2',
      idx: 2,
      iconSvg: <LanternOutlineIcon />,
      badge: rooms[1]?.badge || (language === 'en' ? 'ROOM 02' : 'PHÒNG 02'),
      title: rooms[1]?.name || (language === 'en' ? 'Lantern Sky' : 'Bầu trời Lồng đèn'),
      actionText: language === 'en' ? 'Go to Room 2 →' : 'Đến phòng 2 →',
      onClick: () => {
        if (scrollToItem) scrollToItem(2);
        if (onNavigate) onNavigate('r2');
        setIsOpen(false);
      },
    },
    {
      id: 'diary',
      idx: 3,
      iconSvg: <DiaryOutlineIcon />,
      badge: language === 'en' ? 'DIARY' : 'NHẬT KÝ',
      title: t('nav_diary') || (language === 'en' ? 'Personal Diary' : 'Nhật ký cá nhân'),
      actionText: language === 'en' ? 'Open diary →' : 'Mở nhật ký →',
      isLocked: isGuest,
      onClick: () => {
        if (isGuest) {
          guardAction(null, t('nav_diary') || (language === 'en' ? 'Personal Diary' : 'Nhật ký cá nhân'));
        } else {
          if (scrollToItem) scrollToItem(3);
          if (onOpenDiary) onOpenDiary();
        }
        setIsOpen(false);
      },
    },
    {
      id: 'r3',
      idx: 4,
      iconSvg: <TreeOutlineIcon />,
      badge: rooms[2]?.badge || (language === 'en' ? 'ROOM 03' : 'PHÒNG 03'),
      title: rooms[2]?.name || (language === 'en' ? 'Message Tree' : 'Cây Thông điệp'),
      actionText: language === 'en' ? 'Go to Room 3 →' : 'Đến phòng 3 →',
      onClick: () => {
        if (scrollToItem) scrollToItem(4);
        if (onNavigate) onNavigate('r3');
        setIsOpen(false);
      },
    },
  ];

  return (
    <div className="lobby-bubble-nav-wrapper">
      {/* Floating Draggable 4-Pointed Star Button */}
      <button
        type="button"
        className={`lobby-bubble-trigger-star ${isOpen ? 'active' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label={t('lobby_bubble_spaces') || (language === 'en' ? 'Explore Rooms' : 'Khám phá các phòng')}
        title={language === 'en' ? 'Explore Spaces (Drag to reposition)' : 'Khám phá các phòng (Nhấn giữ để kéo di chuyển)'}
      >
        <Star4OutlineIcon />
      </button>

      {/* Synchronized Museum Modal Form (Compact Redirection List) */}
      {isOpen && (
        <>
          <div
            className="scrim"
            style={{ position: 'fixed', inset: 0, zIndex: 125, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
            onClick={() => setIsOpen(false)}
          />
          <div
            className="lobby-spaces-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="lobby-spaces-header">
              <div className="lobby-spaces-header-title">
                <Star4OutlineIcon />
                <h3 className="serif">
                  {t('lobby_bubble_spaces') || (language === 'en' ? 'Explore Spaces' : 'Chuyển hướng không gian')}
                </h3>
              </div>
              <button
                type="button"
                className="lobby-spaces-close-btn"
                onClick={() => setIsOpen(false)}
                title={language === 'en' ? 'Close' : 'Đóng'}
                aria-label={language === 'en' ? 'Close' : 'Đóng'}
              >
                <Icon name="x" size={17} />
              </button>
            </div>

            <div className="lobby-spaces-subtitle">
              {language === 'en' ? 'Select a destination to navigate' : 'Chọn không gian bảo tàng bạn muốn chuyển hướng đến'}
            </div>

            <div className="lobby-spaces-modal-list custom-scrollbar">
              {spaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  className={`lobby-redirect-btn ${space.isLocked ? 'locked' : ''}`}
                  onClick={space.onClick}
                >
                  <div className="space-icon-outline-box">
                    {space.iconSvg}
                  </div>

                  <div className="space-redirect-info">
                    <span className="space-redirect-badge">
                      {space.badge}
                      {space.isLocked && <span style={{ marginLeft: '4px', fontSize: '10px' }}>🔒</span>}
                    </span>
                    <span className="space-redirect-title">
                      {space.title}
                    </span>
                  </div>

                  <span className="space-redirect-action">
                    <span>{space.actionText}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LobbyBubbleNav;

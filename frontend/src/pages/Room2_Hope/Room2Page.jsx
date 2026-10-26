import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { Icon } from '../../components/common/Icons';
import { MOCK_LANTERN_LETTERS } from '../../data/mockData';
import { LanternSky } from './LanternSky';
import { ReleaseLanternModal } from './ReleaseLanternModal';
import { LanternLandedModal } from './LanternLandedModal';
import { room2Service } from '../../services/room2Service';
import { useAuth } from '../../context/AuthContext';

const FILTER_MAPPING = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Của tôi', value: 'mine' },
  { label: 'Lồng đèn đã mở', value: 'opened' },
  { label: 'Đang chờ ngày hạ xuống', value: 'locked' },
];

export function Room2Page({
  onOpenNotifications,
  onOpenThemeModal,
  onNavigate,
  onSaveToNotebook,
}) {
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [lanterns, setLanterns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ total_lanterns: 3402, total_opened: 128 });

  const [personalLantern, setPersonalLantern] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [readyLanterns, setReadyLanterns] = useState([]);
  const [showReadyBanner, setShowReadyBanner] = useState(false);

  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showLandedModal, setShowLandedModal] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState(MOCK_LANTERN_LETTERS[0]);
  const [toastMessage, setToastMessage] = useState('');

  const searchTimerRef = useRef(null);

  // Debounce search input
  const handleSearchChange = (val) => {
    setSearchValue(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val.trim());
    }, 300);
  };

  // Show transient toast notification
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  // Load lanterns based on filter and search
  const loadLanterns = useCallback(async () => {
    setIsLoading(true);
    try {
      if (debouncedSearch) {
        const res = await room2Service.searchLanterns({
          q: debouncedSearch,
          filter: activeFilter,
          limit: 50,
        });
        const data = res?.data || res;
        const items = data?.items || [];
        setLanterns(items);
        if (data?.total !== undefined) {
          setStats((prev) => ({ ...prev, total_lanterns: data.total }));
        }
      } else {
        const res = await room2Service.getLanterns({
          filter: activeFilter,
          limit: 60,
        });
        const data = res?.data || res;
        const items = data?.items || [];
        setLanterns(items);
        if (data?.total_lanterns !== undefined) {
          setStats({
            total_lanterns: data.total_lanterns,
            total_opened: data.total_opened ?? 128,
          });
        }
      }
    } catch (err) {
      console.warn('Error loading lanterns from API, using fallback:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, debouncedSearch]);

  // Load personal lantern & countdown widget
  const loadPersonalLantern = useCallback(async () => {
    try {
      const res = await room2Service.getMyPersonalLantern();
      const data = res?.data || res;
      if (data && data.title) {
        setPersonalLantern(data);
        if (typeof data.remaining_seconds === 'number') {
          setRemainingSeconds(Math.max(0, data.remaining_seconds));
        }
      } else {
        setPersonalLantern(null);
        setRemainingSeconds(null);
      }
    } catch (err) {
      // Unauthenticated or no personal lantern
      setPersonalLantern(null);
      setRemainingSeconds(null);
    }
  }, []);

  // Check ready-to-fall lanterns for user
  const checkReadyToFall = useCallback(async () => {
    try {
      const res = await room2Service.getReadyToFallLanterns();
      const data = res?.data || res;
      const items = data?.items || [];
      if (items.length > 0) {
        setReadyLanterns(items);
        setShowReadyBanner(true);
      }
    } catch {
      // Ignore if not logged in
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadLanterns();
  }, [loadLanterns]);

  useEffect(() => {
    loadPersonalLantern();
    checkReadyToFall();
  }, [loadPersonalLantern, checkReadyToFall]);

  // Dynamic 1-second countdown ticker
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          checkReadyToFall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, checkReadyToFall]);

  // Format countdown segments
  const formatCountdown = (secs) => {
    if (secs === null || secs === undefined) {
      return [
        ['00', 'ngày'],
        ['00', 'giờ'],
        ['00', 'phút'],
        ['00', 'giây'],
      ];
    }
    const days = Math.floor(secs / (24 * 3600));
    const hours = Math.floor((secs % (24 * 3600)) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;

    const pad = (n) => String(n).padStart(2, '0');
    return [
      [String(days), 'ngày'],
      [pad(hours), 'giờ'],
      [pad(minutes), 'phút'],
      [pad(seconds), 'giây'],
    ];
  };

  const handleOpenLantern = (letter) => {
    setSelectedLetter(letter || MOCK_LANTERN_LETTERS[0]);
    setShowLandedModal(true);
  };

  const handlePullDownRandom = async () => {
    try {
      const res = await room2Service.getRandomOpenedLantern();
      const data = res?.data || res;
      if (data && data.title) {
        handleOpenLantern(data);
        return;
      }
    } catch {
      // Fallback to random lantern from current loaded list or mock
    }

    if (lanterns.length > 0) {
      const randomItem = lanterns[Math.floor(Math.random() * lanterns.length)];
      handleOpenLantern(randomItem);
    } else {
      const randomMock =
        MOCK_LANTERN_LETTERS[Math.floor(Math.random() * MOCK_LANTERN_LETTERS.length)];
      handleOpenLantern(randomMock);
    }
  };

  const handleLanternReleased = (newLantern) => {
    triggerToast(
      newLantern?.visibility === 'PUBLIC'
        ? '✦ Lồng đèn đã gửi tới hàng chờ duyệt. Admin sẽ sớm thả lên bầu trời đêm!'
        : '✦ Lồng đèn riêng tư của bạn đã vút bay lên bầu trời đêm!'
    );
    loadLanterns();
    loadPersonalLantern();
  };

  return (
    <div className="stage night">
      <LanternSky
        isLanded={showLandedModal}
        lanterns={lanterns}
        personalLantern={personalLantern}
        onOpenLandedModal={handleOpenLantern}
      />

      {/* Top Header */}
      <TopNav
        roomNo="02"
        roomName="Bầu trời Lồng đèn"
        searchPlaceholder="Tìm lồng đèn theo từ khoá hoặc bút danh…"
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onOpenNotifications={onOpenNotifications}
        onOpenThemeModal={onOpenThemeModal}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="abs"
          style={{
            top: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            background: 'rgba(28, 12, 18, 0.92)',
            border: '1px solid var(--gold)',
            color: '#FFE7C2',
            padding: '10px 24px',
            borderRadius: '999px',
            fontSize: '14px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Ready-to-fall banner alert */}
      {showReadyBanner && readyLanterns.length > 0 && !showLandedModal && (
        <div
          className="abs"
          style={{
            top: '115px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 25,
            background: 'linear-gradient(135deg, rgba(127,25,22,0.92), rgba(80,15,20,0.95))',
            border: '1px solid rgba(255,220,130,0.6)',
            borderRadius: '16px',
            padding: '12px 24px',
            color: '#FFF5E0',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onClick={() => {
            handleOpenLantern(readyLanterns[0]);
            setShowReadyBanner(false);
          }}
        >
          <span style={{ fontSize: '20px', color: 'var(--gold)' }}>✦</span>
          <div>
            <b>Lồng đèn của bạn đã tới hẹn hạ xuống!</b>
            <div style={{ fontSize: '12.5px', color: '#EAD2BE' }}>
              &ldquo;{readyLanterns[0].title}&rdquo; đang đợi bạn mở đọc. Nhấn vào đây để xem thư.
            </div>
          </div>
          <button
            type="button"
            className="btn main sm"
            style={{ marginLeft: '10px' }}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenLantern(readyLanterns[0]);
              setShowReadyBanner(false);
            }}
          >
            Mở thư
          </button>
        </div>
      )}

      {/* Filter Chips & Action */}
      <div className="chips-row">
        <div className="chips">
          {FILTER_MAPPING.map(({ label, value }) => (
            <span
              key={value}
              className={`chip glass ${activeFilter === value ? 'on' : ''}`}
              onClick={() => setActiveFilter(value)}
              style={{ cursor: 'pointer' }}
            >
              {label}
            </span>
          ))}
          {isLoading && (
            <span className="muted" style={{ fontSize: '13px', marginLeft: '6px' }}>
              Đang tải...
            </span>
          )}
        </div>

        <button
          type="button"
          className="btn main"
          onClick={() => setShowReleaseModal(true)}
        >
          ✦ Thả lồng đèn
        </button>
      </div>

      {/* Personal Flying Lantern Countdown Widget */}
      {!showLandedModal && (
        <div
          className="abs"
          onClick={() => handleOpenLantern(personalLantern || MOCK_LANTERN_LETTERS[0])}
          title="Nhấn để kéo lồng đèn của bạn xuống"
          style={{
            left: '1060px',
            top: '168px',
            width: '260px',
            zIndex: 7,
            background: 'rgba(30,12,18,.78)',
            border: '1px solid rgba(255,235,220,.24)',
            borderRadius: '14px',
            padding: '12px 14px',
            color: '#F6E9DD',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="row" style={{ gap: '6px', fontSize: '13px', color: '#F2C9A8' }}>
            <Icon name="lock" size={14} /> Lồng đèn riêng của bạn
          </div>
          <div
            className="serif"
            style={{
              fontSize: '18px',
              fontWeight: 700,
              margin: '3px 0 8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {personalLantern?.title || 'Gửi mình của năm 2030'}
          </div>

          {remainingSeconds === 0 ? (
            <div
              style={{
                background: 'rgba(127,25,22,0.6)',
                borderRadius: '8px',
                padding: '8px 10px',
                textAlign: 'center',
                color: '#FFF0D2',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              ✦ Đã tới giờ hẹn · Nhấn để mở thư
            </div>
          ) : (
            <div className="row" style={{ gap: '6px' }}>
              {formatCountdown(remainingSeconds ?? 126144000).map(([n, u]) => (
                <div
                  key={u}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    background: 'rgba(255,240,225,.08)',
                    borderRadius: '8px',
                    padding: '4px 0',
                  }}
                >
                  <b style={{ fontSize: '16px' }}>{n}</b>
                  <div style={{ fontSize: '10.5px', color: '#D9BBA8' }}>{u}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: '12px', color: '#D9BBA8', marginTop: '8px' }}>
            {remainingSeconds === 0
              ? 'Lồng đèn đã hạ cánh an toàn'
              : 'Đang đếm ngược tới ngày hạ xuống (nhấn để mở)'}
          </div>
        </div>
      )}

      {/* Interactive "Kéo xuống để đọc" Tag */}
      {!showLandedModal && (
        <div
          className="abs"
          style={{ left: '300px', top: '470px', zIndex: 7 }}
          onClick={handlePullDownRandom}
        >
          <span
            className="glass"
            style={{
              padding: '6px 16px',
              borderRadius: '999px',
              fontFamily: 'var(--hand)',
              fontSize: '18px',
              cursor: 'pointer',
              userSelect: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ color: 'var(--gold)' }}>✦</span> nhấn hoặc kéo lồng đèn xuống để đọc ↓
          </span>
        </div>
      )}

      {/* Footer Counter */}
      <div className="counter">
        {stats.total_lanterns.toLocaleString('vi-VN')} lồng đèn đang bay ·{' '}
        {stats.total_opened.toLocaleString('vi-VN')} lồng đèn đã hạ xuống năm nay
      </div>

      {/* Modals */}
      <ReleaseLanternModal
        isOpen={showReleaseModal}
        onClose={() => setShowReleaseModal(false)}
        onRelease={handleLanternReleased}
      />

      <LanternLandedModal
        isOpen={showLandedModal}
        letterData={selectedLetter}
        onClose={() => setShowLandedModal(false)}
        onSaveToNotebook={onSaveToNotebook}
        onReplyFuture={() => {
          setShowLandedModal(false);
          setShowReleaseModal(true);
        }}
      />
    </div>
  );
}

export default Room2Page;

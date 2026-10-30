import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { Icon } from '../../components/common/Icons';
import { MOCK_LANTERN_LETTERS } from '../../data/mockData';
import { LanternSky } from './LanternSky';
import { ReleaseLanternModal } from './ReleaseLanternModal';
import { LanternLandedModal } from './LanternLandedModal';
import { room2Service } from '../../services/room2Service';
import { useAuth } from '../../context/AuthContext';
import { useGuestGuard } from '../../context/GuestGuardContext';
import { useLanguage } from '../../context/LanguageContext';

export function Room2Page({
  onOpenNotifications,
  onOpenThemeModal,
  onNavigate,
  onSaveToNotebook,
  initialLanternId = null,
  onClearInitialLantern,
}) {
  const { user, isGuest } = useAuth();
  const { guardAction } = useGuestGuard();
  const { t, language } = useLanguage();

  const filterMapping = [
    { label: t('r2_filter_all'), value: 'all' },
    { label: t('r2_filter_mine'), value: 'mine' },
  ];

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [lanterns, setLanterns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ total_lanterns: 0, total_opened: 0 });

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
            total_opened: data.total_opened ?? 0,
          });
        }

        // Silent auto-landing check result
        if (data?.freshly_landed && data.freshly_landed.length > 0) {
          triggerToast(
            language === 'en'
              ? '✦ A future lantern of yours has reached its time and landed gently on the dunes! ✦'
              : '✦ Một lồng đèn của bạn vừa hạ xuống! ✦'
          );
          checkReadyToFall();
        }
      }
    } catch (err) {
      console.warn('Error loading lanterns from API, using fallback:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, debouncedSearch, language]);

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

  // Mở chi tiết bức thư lồng đèn khi chuyển hướng từ thông báo
  useEffect(() => {
    if (!initialLanternId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await room2Service.getLanternDetail(initialLanternId);
        const detail = res?.data || res;
        if (!cancelled && detail) {
          handleOpenLantern(detail);
        }
      } catch (err) {
        if (!cancelled) {
          handleOpenLantern({ id: initialLanternId });
        }
      } finally {
        if (!cancelled && onClearInitialLantern) {
          onClearInitialLantern();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialLanternId, onClearInitialLantern]);

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
        ? '✦ Đã gửi! Lồng đèn sẽ bay lên sau khi được duyệt.'
        : '✦ Lồng đèn của bạn đã bay lên!'
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
        activeFilter={activeFilter}
        onOpenLandedModal={handleOpenLantern}
      />

      {/* Top Header */}
      <TopNav
        roomNo="02"
        roomName={t('r2_name')}
        searchPlaceholder={t('r2_search_placeholder')}
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
            <b>{language === 'en' ? 'Your lantern has landed!' : 'Lồng đèn của bạn đã hạ xuống!'}</b>
            <div style={{ fontSize: '12.5px', color: '#EAD2BE' }}>
              &ldquo;{readyLanterns[0].title}&rdquo; {language === 'en' ? 'is waiting for you.' : 'đang chờ bạn mở.'}
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
            {language === 'en' ? 'Open' : 'Mở thư'}
          </button>
        </div>
      )}

      {/* Filter Chips & Action */}
      <div className="chips-row">
        <div className="chips">
          {filterMapping.map(({ label, value }) => (
            <span
              key={value}
              className={`chip glass ${activeFilter === value ? 'on' : ''}`}
              onClick={() => {
                if (value === 'mine') {
                  guardAction(() => setActiveFilter('mine'), 'xem lồng đèn của tôi');
                } else {
                  setActiveFilter(value);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {label}
            </span>
          ))}
          {isLoading && (
            <span className="muted" style={{ fontSize: '13px', marginLeft: '6px' }}>
              {language === 'en' ? 'Loading...' : 'Đang tải...'}
            </span>
          )}
        </div>

        <button
          type="button"
          className="btn main"
          onClick={() => {
            guardAction(() => setShowReleaseModal(true), 'thả lồng đèn lên bầu trời');
          }}
        >
          {t('r2_btn_release')}
        </button>
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

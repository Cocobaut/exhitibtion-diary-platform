import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { capsuleService } from '../../services/capsuleService';

// Outline SVG Icons (rỗng ruột, chỉ còn viền)
function FlameOutlineIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function LeafOutlineIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function MoonOutlineIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

const CATEGORY_THEMES = {
  COURAGE: {
    badge: 'b-wait',
    iconRenderer: (size) => <FlameOutlineIcon size={size} />,
    nameVi: 'Thông điệp Can đảm',
    nameEn: 'Courage Message',
    subVi: 'Tiếp thêm dũng khí & kiên cường',
    subEn: 'Igniting inner strength & perseverance',
    bg: 'linear-gradient(145deg, #FFFDF8 0%, #FEF9EB 50%, #FDF4D9 100%)',
    border: '2px solid rgba(212, 160, 23, 0.65)',
    accentColor: '#D97706',
    glow: '0 0 40px rgba(217, 119, 6, 0.4), 0 20px 60px rgba(0, 0, 0, 0.45)',
    badgeBg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    badgeColor: '#FFF',
    shockwaveColor: 'rgba(217, 119, 6, 0.75)',
  },
  HEALING: {
    badge: 'b-ok',
    iconRenderer: (size) => <LeafOutlineIcon size={size} />,
    nameVi: 'Thông điệp Chữa lành',
    nameEn: 'Healing Message',
    subVi: 'Vỗ về tâm hồn & tìm lại an yên',
    subEn: 'Gentle solace & inner tranquility',
    bg: 'linear-gradient(145deg, #F9FDFB 0%, #F0FDF4 50%, #DCFCE7 100%)',
    border: '2px solid rgba(16, 185, 129, 0.65)',
    accentColor: '#059669',
    glow: '0 0 40px rgba(16, 185, 129, 0.4), 0 20px 60px rgba(0, 0, 0, 0.45)',
    badgeBg: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
    badgeColor: '#FFF',
    shockwaveColor: 'rgba(16, 185, 129, 0.75)',
  },
  PERSPECTIVE: {
    badge: 'b-priv',
    iconRenderer: (size) => <MoonOutlineIcon size={size} />,
    nameVi: 'Thông điệp Sợ hãi',
    nameEn: 'Facing Fear Message',
    subVi: 'Thấu cảm & vượt qua nỗi sợ',
    subEn: 'Embracing fear & discovering new perspectives',
    bg: 'linear-gradient(145deg, #FAF8FF 0%, #F5F3FF 50%, #EDE9FE 100%)',
    border: '2px solid rgba(139, 92, 246, 0.65)',
    accentColor: '#7C3AED',
    glow: '0 0 40px rgba(139, 92, 246, 0.4), 0 20px 60px rgba(0, 0, 0, 0.45)',
    badgeBg: 'linear-gradient(135deg, #8B5CF6 0%, #4F46E5 100%)',
    badgeColor: '#FFF',
    shockwaveColor: 'rgba(139, 92, 246, 0.75)',
  },
};

const MOCK_MESSAGES = [
  {
    category: 'COURAGE',
    message: 'Can đảm không phải là không sợ. Can đảm là vẫn nộp đơn lần nữa, dù tay còn run.',
    message_en: 'Courage is not the absence of fear. Courage is applying one more time even when your hands shake.',
  },
  {
    category: 'HEALING',
    message: 'Hôm nay nghỉ ngơi cũng là một cách cố gắng. Cái cây cũng đâu ra lá quanh năm.',
    message_en: 'Resting today is also a form of trying. Even trees do not blossom leaves all year round.',
  },
  {
    category: 'PERSPECTIVE',
    message: 'Mười năm nữa, chuyện hôm nay chỉ là một dòng trong câu chuyện dài của bạn. Hãy ôm lấy nỗi sợ này.',
    message_en: 'Ten years from now, today will merely be one line in your long story. Embrace this fear.',
  },
  {
    category: 'COURAGE',
    message: 'Bạn có thể bắt đầu lại bao nhiêu lần cũng được. Bước tiếp một bước nữa thôi nhé.',
    message_en: 'You are allowed to start over as many times as you need. Just one more step.',
  },
  {
    category: 'HEALING',
    message: 'Bạn đã làm rất tốt cho đến ngày hôm nay rồi. Hãy thở sâu và cho phép bản thân được thả lỏng.',
    message_en: 'You have done wonderfully well to get to this day. Take a deep breath and let go.',
  },
  {
    category: 'PERSPECTIVE',
    message: 'Nỗi sợ hãi chứng tỏ bạn đang đứng trước một điều thực sự có ý nghĩa đối với cuộc đời mình.',
    message_en: 'Fear simply proves you are standing before something that deeply matters to your life.',
  },
];

export function MailboxModal({ isOpen, onClose, onSaveToNotebook, notebookItems = [] }) {
  const { isAuthenticated } = useAuth();
  const { language, localize } = useLanguage();
  const [drawnData, setDrawnData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Gacha Animation Phase: 'idle' | 'charging' | 'revealed'
  const [gachaPhase, setGachaPhase] = useState('idle');
  // orbStep: 0: cả 3 bong bóng lơ lửng, 1: bong bóng 1 nổ, 2: bong bóng 2 nổ, 3: bong bóng 3 nổ và reveal
  const [orbStep, setOrbStep] = useState(0);
  const [burstParticles, setBurstParticles] = useState([]);

  const timersRef = useRef([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  // Tạo mảng hạt nổ sao lấp lánh ngẫu nhiên
  const spawnGachaParticles = useCallback(() => {
    const starIcons = ['✦', '✧', '★', '✸', '✷'];
    const list = [];
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const distance = 130 + Math.random() * 160;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      list.push({
        id: i,
        dx: `${dx.toFixed(1)}px`,
        dy: `${dy.toFixed(1)}px`,
        scale: (0.7 + Math.random() * 0.7).toFixed(2),
        icon: starIcons[Math.floor(Math.random() * starIcons.length)],
        color: ['#E6C587', '#C59B63', '#98FB98', '#B794F4', '#FFF5DC'][Math.floor(Math.random() * 5)],
        delay: `${(Math.random() * 0.12).toFixed(2)}s`,
      });
    }
    setBurstParticles(list);
  }, []);

  // Rút thông điệp với hoạt cảnh Gacha lâu hơn & nổ từng bong bóng một
  const handleDraw = useCallback(async () => {
    if (gachaPhase === 'charging') return;
    clearAllTimers();
    setErrorMsg('');
    setGachaPhase('charging');
    setOrbStep(0);
    spawnGachaParticles();

    // 1. Gọi API hoặc chuẩn bị dữ liệu ngẫu nhiên
    let nextDataPromise;
    if (!isAuthenticated) {
      const lucky = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
      nextDataPromise = Promise.resolve({
        draw_id: `guest_${Date.now()}`,
        capsule_id: Math.floor(Math.random() * 900) + 100,
        message: lucky.message,
        message_en: lucky.message_en,
        category: lucky.category,
        author_name: language === 'en' ? 'Museum wanderer' : 'Người lữ khách bảo tàng',
        is_saved: false,
      });
    } else {
      nextDataPromise = capsuleService.drawCapsule(null);
    }

    // 2. Chuỗi thời gian nổ tuần tự 3 bong bóng (Sequential Pop)
    // t = 0ms: Cả 3 bong bóng xuất hiện và lơ lửng
    // t = 620ms: Bong bóng 1 nổ
    const t1 = setTimeout(() => {
      setOrbStep(1);
    }, 620);
    timersRef.current.push(t1);

    // t = 1240ms: Bong bóng 2 nổ
    const t2 = setTimeout(() => {
      setOrbStep(2);
    }, 1240);
    timersRef.current.push(t2);

    // t = 1860ms: Bong bóng 3 nổ & chuẩn bị reveal
    const t3 = setTimeout(() => {
      setOrbStep(3);
    }, 1860);
    timersRef.current.push(t3);

    // t = 2050ms: Lật mở thẻ bài thông điệp
    try {
      const nextData = await nextDataPromise;
      const tFinal = setTimeout(() => {
        setDrawnData(nextData);
        setGachaPhase('revealed');
      }, 2050);
      timersRef.current.push(tFinal);
    } catch (err) {
      const tErr = setTimeout(() => {
        if (err.errorCode === 'CAPSULE_POOL_EMPTY' || err.status === 404) {
          setErrorMsg(language === 'en' ? 'No messages in mailbox yet.' : 'Hòm thư hiện chưa có lời nhắn nào.');
        } else {
          setErrorMsg(err.message || (language === 'en' ? 'Unable to draw a message right now.' : 'Không thể rút thông điệp lúc này.'));
        }
        setGachaPhase('revealed');
      }, 1600);
      timersRef.current.push(tErr);
    }
  }, [gachaPhase, isAuthenticated, language, spawnGachaParticles]);

  // Tự động rút 1 thông điệp với hiệu ứng Gacha khi mở modal
  useEffect(() => {
    if (isOpen) {
      handleDraw();
    } else {
      clearAllTimers();
      setGachaPhase('idle');
      setOrbStep(0);
      setDrawnData(null);
    }
    return () => clearAllTimers();
  }, [isOpen]);

  // Theme của thông điệp hiện tại (Can đảm / Chữa lành / Sợ hãi)
  const currentTheme = useMemo(() => {
    const cat = drawnData?.category;
    if (cat && CATEGORY_THEMES[cat]) return CATEGORY_THEMES[cat];
    return CATEGORY_THEMES.HEALING;
  }, [drawnData]);

  // Lưu hoặc bỏ lưu vào sổ tay
  const handleSaveToggle = async () => {
    if (!drawnData || gachaPhase === 'charging') return;

    if (!isAuthenticated) {
      if (onSaveToNotebook) {
        onSaveToNotebook({
          id: drawnData.draw_id,
          source: 'mailbox',
          sourceLabel: language === 'en' ? `Mailbox · ${currentTheme.nameEn}` : `Hòm thư · ${currentTheme.nameVi}`,
          badgeClass: currentTheme.badge,
          icon: 'sparkle',
          content: localize(drawnData, 'message'),
          author: drawnData.author_name || (language === 'en' ? 'Anonymous' : 'Ẩn danh'),
          category: drawnData.category,
          savedAt: language === 'en' ? 'Just now' : 'Vừa xong',
        });
      }
      setDrawnData((prev) => ({ ...prev, is_saved: true }));
      return;
    }

    setIsSaving(true);
    const targetState = !drawnData.is_saved;

    try {
      await capsuleService.saveDraw(drawnData.draw_id, targetState);
      setDrawnData((prev) => ({ ...prev, is_saved: targetState }));

      if (targetState && onSaveToNotebook) {
        onSaveToNotebook({
          id: drawnData.draw_id,
          source: 'mailbox',
          sourceLabel: language === 'en' ? `Mailbox · ${currentTheme.nameEn}` : `Hòm thư · ${currentTheme.nameVi}`,
          badgeClass: currentTheme.badge,
          icon: 'sparkle',
          content: drawnData.message,
          author: drawnData.author_name || (language === 'en' ? 'Anonymous' : 'Người gửi ẩn danh'),
          category: drawnData.category,
          savedAt: language === 'en' ? 'Today' : 'Hôm nay',
        });
      }
    } catch (err) {
      console.warn('Lỗi khi lưu thông điệp:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        /* 3 Bong bóng năng lượng đồng bộ màu nền bảo tàng (Warm Amber & Antique Bronze) */
        @keyframes orbFloatGentle {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.03);
          }
        }

        @keyframes orbChargingJitter {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            filter: drop-shadow(0 0 16px rgba(226, 188, 85, 0.7));
          }
          25% {
            transform: translate(-2px, 2px) scale(1.08);
            filter: drop-shadow(0 0 26px rgba(235, 195, 115, 0.95));
          }
          50% {
            transform: translate(2px, -2px) scale(1.14);
            filter: drop-shadow(0 0 35px rgba(245, 210, 140, 1));
          }
          75% {
            transform: translate(-1px, -2px) scale(1.18);
            filter: drop-shadow(0 0 45px rgba(255, 230, 170, 1));
          }
        }

        @keyframes orbPopBurst {
          0% {
            transform: scale(1.1);
            opacity: 1;
            filter: brightness(1.5);
          }
          40% {
            transform: scale(1.4);
            opacity: 0.9;
            filter: brightness(2.2);
          }
          100% {
            transform: scale(1.9);
            opacity: 0;
            filter: blur(5px) brightness(2.8);
          }
        }

        @keyframes gachaCardFlipIn {
          0% {
            transform: translate(-50%, -50%) perspective(1200px) rotateY(180deg) scale(0.35);
            opacity: 0;
            filter: brightness(2.2) contrast(1.3);
          }
          55% {
            transform: translate(-50%, -50%) perspective(1200px) rotateY(-14deg) scale(1.06);
            opacity: 1;
            filter: brightness(1.2);
          }
          75% {
            transform: translate(-50%, -50%) perspective(1200px) rotateY(6deg) scale(0.98);
            filter: brightness(1.06);
          }
          100% {
            transform: translate(-50%, -50%) perspective(1200px) rotateY(0deg) scale(1);
            opacity: 1;
            filter: brightness(1);
          }
        }

        @keyframes gachaRayRotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.45; }
          50% { opacity: 0.85; }
          100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.45; }
        }

        @keyframes gachaShockwaveExpand {
          0% {
            transform: translate(-50%, -50%) scale(0.2);
            opacity: 1;
            border-width: 6px;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.6);
            opacity: 0;
            border-width: 1px;
          }
        }

        @keyframes gachaParticleBurst {
          0% {
            transform: translate(-50%, -50%) scale(0.2);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--p-dx)), calc(-50% + var(--p-dy))) scale(var(--p-scale));
            opacity: 0;
          }
        }

        .gacha-card-container {
          animation: gachaCardFlipIn 0.85s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
          transform-style: preserve-3d;
        }

        .gacha-btn-shine {
          position: relative;
          overflow: hidden;
          transition: all 0.25s ease;
        }
        .gacha-btn-shine:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(212, 176, 106, 0.45);
        }

        /* -----------------------------------------------------------------
           RESPONSIVE STYLING FOR MAILBOX MODAL
           (Tablet Portrait, Mobile Landscape, Mobile Portrait)
           ----------------------------------------------------------------- */
        .mailbox-modal-header {
          position: absolute;
          left: 0;
          right: 0;
          top: 46px;
          text-align: center;
          z-index: 85;
          color: #F6E9DD;
          pointer-events: none;
          padding: 0 16px;
          box-sizing: border-box;
          transition: all 0.3s ease;
        }
        .mailbox-modal-title {
          font-size: 30px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-shadow: 0 2px 14px rgba(0,0,0,0.7);
        }
        .mailbox-modal-subtitle {
          font-size: 13.5px;
          margin-top: 6px;
          color: rgba(246, 233, 221, 0.85);
        }
        .mailbox-card {
          position: fixed !important;
          left: 50% !important;
          top: 52% !important;
          transform: translate(-50%, -50%) !important;
          bottom: auto !important;
          right: auto !important;
          z-index: 90 !important;
          width: 560px;
          max-width: 92vw;
          padding: 28px 36px 22px;
          border-radius: 24px;
          box-sizing: border-box;
        }
        .mailbox-message-text {
          font-size: 22px;
          line-height: 1.7;
          min-height: 80px;
          padding: 6px 2px;
        }
        .mailbox-author-text {
          text-align: right;
          font-size: 19px;
          color: var(--ink2);
          margin-top: 10px;
        }
        .mailbox-footer {
          margin-top: 20px;
          border-top: 1px solid var(--line);
          padding-top: 16px;
          align-items: center;
        }
        .mailbox-charging-wrap {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 95;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.25s ease;
        }
        .mailbox-bg-svg {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 480px;
          z-index: 82;
          pointer-events: none;
          transition: all 0.3s ease;
        }

        /* 1. TABLET PORTRAIT (768px - 1024px) */
        @media (max-width: 1024px) {
          .mailbox-modal-header {
            top: 36px;
          }
          .mailbox-modal-title {
            font-size: 25px;
          }
          .mailbox-modal-subtitle {
            font-size: 13px;
          }
          .mailbox-card {
            width: min(520px, 88vw) !important;
            padding: 24px 28px 20px !important;
            border-radius: 22px !important;
          }
          .mailbox-message-text {
            font-size: 19.5px !important;
            line-height: 1.65 !important;
            min-height: 75px !important;
          }
          .mailbox-bg-svg {
            transform: translateX(-50%) scale(0.85);
            top: 440px;
          }
        }

        /* 2. MOBILE LANDSCAPE (e.g. 481px - 767px horizontal, height <= 520px) */
        @media (max-height: 520px) and (orientation: landscape), (max-width: 900px) and (max-height: 500px) {
          .mailbox-modal-header {
            top: 8px !important;
          }
          .mailbox-modal-title {
            font-size: 17px !important;
            line-height: 1.2 !important;
          }
          .mailbox-modal-subtitle {
            font-size: 11px !important;
            margin-top: 2px !important;
          }
          .mailbox-card {
            top: 55% !important;
            width: min(500px, 92vw) !important;
            max-height: 82dvh !important;
            overflow-y: auto !important;
            padding: 14px 22px 14px !important;
            border-radius: 18px !important;
          }
          .mailbox-card-header {
            margin-bottom: 8px !important;
          }
          .mailbox-message-text {
            font-size: 15.5px !important;
            line-height: 1.5 !important;
            min-height: 42px !important;
            padding: 2px 0 !important;
          }
          .mailbox-author-text {
            font-size: 14px !important;
            margin-top: 4px !important;
          }
          .mailbox-footer {
            margin-top: 10px !important;
            padding-top: 8px !important;
          }
          .mailbox-charging-wrap {
            transform: translate(-50%, -50%) scale(0.72) !important;
          }
          .mailbox-bg-svg {
            display: none !important;
          }
        }

        /* 3. MOBILE PORTRAIT (<= 480px) */
        @media (max-width: 480px) {
          .mailbox-modal-header {
            top: clamp(18px, 3.5vh, 28px) !important;
            padding: 0 12px !important;
          }
          .mailbox-modal-title {
            font-size: 19px !important;
            line-height: 1.25 !important;
          }
          .mailbox-modal-subtitle {
            font-size: 11.5px !important;
            margin-top: 4px !important;
          }
          .mailbox-card {
            top: 52% !important;
            width: calc(100vw - 32px) !important;
            max-width: 390px !important;
            max-height: 80dvh !important;
            overflow-y: auto !important;
            padding: 20px 18px 16px !important;
            border-radius: 20px !important;
          }
          .mailbox-card .x {
            right: 14px !important;
            top: 14px !important;
          }
          .mailbox-card-header {
            margin-bottom: 12px !important;
            gap: 6px !important;
          }
          .mailbox-message-text {
            font-size: 17px !important;
            line-height: 1.6 !important;
            min-height: 60px !important;
          }
          .mailbox-author-text {
            font-size: 15px !important;
            margin-top: 8px !important;
          }
          .mailbox-footer {
            margin-top: 14px !important;
            padding-top: 12px !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .mailbox-footer button {
            padding: 7px 12px !important;
            font-size: 12px !important;
          }
          .mailbox-charging-wrap {
            transform: translate(-50%, -50%) scale(0.82) !important;
          }
          .mailbox-bg-svg {
            transform: translateX(-50%) scale(0.65) !important;
            top: 410px !important;
          }
        }
      `}</style>

      {/* Scrim Overlay */}
      <div
        className="scrim"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          background: 'rgba(20, 12, 9, 0.76)',
          backdropFilter: 'blur(7px)',
        }}
        onClick={onClose}
      />

      {/* Header Title */}
      <div className="mailbox-modal-header">
        <div className="serif mailbox-modal-title">
          {language === 'en' ? 'What do you need to hear today?' : 'Hôm nay bạn cần nghe điều gì?'}
        </div>
        <div className="muted mailbox-modal-subtitle">
          {language === 'en'
            ? '✦ Drawing from 3 mysterious orbs (Courage · Healing · Facing Fear) ✦'
            : '✦ Đang triệu hồi 3 thông điệp bí ẩn (Can đảm · Chữa lành · Sợ hãi) ✦'}
        </div>
      </div>

      {/* Background Mailbox Glow & Silhouette */}
      <svg
        className="mailbox-bg-svg"
        width="500"
        height="380"
        viewBox="0 0 500 380"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="mbglow">
            <stop offset="0" stopColor="#E6C280" stopOpacity="0.75" />
            <stop offset="1" stopColor="#E6C280" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="pulse" cx="250" cy="120" r="240" fill="url(#mbglow)" />
        <path d="M120 380 V170 Q120 90 250 90 Q380 90 380 170 V380 Z" style={{ fill: 'var(--acc)' }} />
        <path d="M120 170 Q120 90 250 90" fill="none" stroke="#fff" strokeOpacity="0.15" strokeWidth="5" />
        <rect x="160" y="150" width="180" height="20" rx="9" fill="#2A1A14" />
        <text x="250" y="270" textAnchor="middle" fontSize="40" style={{ fill: 'var(--gold)' }}>
          ✦
        </text>
      </svg>

      {/* ================= GACHA PHASE 1: 3 BONG BÓNG NỔ TUẦN TỰ ================= */}
      {gachaPhase === 'charging' && (
        <div className="mailbox-charging-wrap">
          {/* Hào quang nền xoay nhẹ nhàng đồng điệu màu bảo tàng */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '420px',
              height: '420px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(230, 194, 128, 0.35) 0%, rgba(184, 115, 51, 0.15) 50%, transparent 72%)',
              animation: 'gachaRayRotate 4s linear infinite',
            }}
          />

          {/* Vùng chứa 3 bong bóng */}
          <div
            style={{
              position: 'relative',
              width: '380px',
              maxWidth: '92vw',
              height: '160px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* --- BONG BÓNG 1: BÊN TRÁI (Can đảm - Nổ tại t = 620ms) --- */}
            <div
              style={{
                position: 'absolute',
                left: '20px',
                top: '30px',
                width: '78px',
                height: '78px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #FFF8EA 0%, #E6C587 35%, #C29352 70%, #5C3A1E 100%)',
                border: '1.8px solid rgba(255, 238, 205, 0.75)',
                boxShadow: '0 0 25px rgba(226, 188, 85, 0.45), 0 8px 24px rgba(0, 0, 0, 0.5)',
                display: 'grid',
                placeItems: 'center',
                color: '#FFF8EA',
                animation:
                  orbStep === 0
                    ? 'orbChargingJitter 0.6s ease-in-out infinite'
                    : orbStep === 1
                    ? 'orbPopBurst 0.35s ease-out forwards'
                    : 'none',
                opacity: orbStep >= 2 ? 0 : 1,
                visibility: orbStep >= 2 ? 'hidden' : 'visible',
              }}
            >
              <FlameOutlineIcon size={22} />
            </div>

            {/* --- BONG BÓNG 2: BÊN PHẢI (Chữa lành - Nổ tại t = 1240ms) --- */}
            <div
              style={{
                position: 'absolute',
                right: '20px',
                top: '30px',
                width: '78px',
                height: '78px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #F5FBF6 0%, #B8D8BA 35%, #82A984 70%, #364F37 100%)',
                border: '1.8px solid rgba(230, 250, 235, 0.75)',
                boxShadow: '0 0 25px rgba(130, 169, 132, 0.45), 0 8px 24px rgba(0, 0, 0, 0.5)',
                display: 'grid',
                placeItems: 'center',
                color: '#F5FBF6',
                animation:
                  orbStep === 0
                    ? 'orbFloatGentle 1.8s ease-in-out infinite'
                    : orbStep === 1
                    ? 'orbChargingJitter 0.6s ease-in-out infinite'
                    : orbStep === 2
                    ? 'orbPopBurst 0.35s ease-out forwards'
                    : 'none',
                opacity: orbStep >= 3 ? 0 : 1,
                visibility: orbStep >= 3 ? 'hidden' : 'visible',
              }}
            >
              <LeafOutlineIcon size={22} />
            </div>

            {/* --- BONG BÓNG 3: Ở GIỮA (Lớn nhất - Thông điệp định mệnh được chọn - Nổ tại t = 1860ms) --- */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '15px',
                transform: 'translateX(-50%)',
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #FFFDF8 0%, #E8C88B 35%, #B88543 68%, #4A2B14 100%)',
                border: '2.4px solid rgba(255, 245, 220, 0.85)',
                boxShadow: '0 0 38px rgba(232, 200, 139, 0.6), 0 10px 30px rgba(0, 0, 0, 0.6)',
                display: 'grid',
                placeItems: 'center',
                color: '#FFF8EA',
                animation:
                  orbStep < 2
                    ? 'orbFloatGentle 2s ease-in-out infinite'
                    : orbStep === 2
                    ? 'orbChargingJitter 0.55s ease-in-out infinite'
                    : orbStep === 3
                    ? 'orbPopBurst 0.38s ease-out forwards'
                    : 'none',
              }}
            >
              <MoonOutlineIcon size={26} />
            </div>
          </div>

          {/* Dòng chữ mô tả giai đoạn gacha hồi hộp */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '24px',
              color: '#FCE7C8',
              fontFamily: 'var(--serif)',
              fontSize: '17px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textShadow: '0 2px 12px rgba(0,0,0,0.85)',
              transition: 'opacity 0.2s ease',
            }}
          >
            {orbStep === 0
              ? (language === 'en' ? 'Summoning 3 mystery capsules...' : 'Đang triệu hồi 3 thông điệp...')
              : orbStep === 1
              ? (language === 'en' ? 'Selecting resonance...' : 'Đang tìm kiếm tần số đồng cảm...')
              : orbStep === 2
              ? (language === 'en' ? 'Revealing destiny message...' : 'Mở thông điệp định mệnh dành riêng cho bạn...')
              : (language === 'en' ? 'Opening...' : 'Đang mở...')}
          </div>
        </div>
      )}

      {/* ================= GACHA PHASE 2: BURST PARTICLES ================= */}
      {gachaPhase === 'revealed' && (
        <>
          {/* Shockwave expanding ring */}
          <div
            style={{
              position: 'fixed',
              left: '50%',
              top: '52%',
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              border: `4px solid ${currentTheme.shockwaveColor}`,
              zIndex: 88,
              pointerEvents: 'none',
              animation: 'gachaShockwaveExpand 0.75s ease-out forwards',
            }}
          />

          {/* 360-Degree Radial Star Burst */}
          <div
            style={{
              position: 'fixed',
              left: '50%',
              top: '52%',
              zIndex: 92,
              pointerEvents: 'none',
            }}
          >
            {burstParticles.map((p) => (
              <span
                key={p.id}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  '--p-dx': p.dx,
                  '--p-dy': p.dy,
                  '--p-scale': p.scale,
                  color: p.color,
                  fontSize: '20px',
                  animation: 'gachaParticleBurst 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  animationDelay: p.delay,
                  textShadow: `0 0 12px ${p.color}`,
                }}
              >
                {p.icon}
              </span>
            ))}
          </div>
        </>
      )}

      {/* ================= GACHA PHASE 3: REVEALED CARD ================= */}
      {gachaPhase === 'revealed' && (
        <div
          className="mailbox-card gacha-card-container"
          style={{
            background: currentTheme.bg,
            border: currentTheme.border,
            boxShadow: currentTheme.glow,
            transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
          }}
        >
          {/* Close X Button */}
          <span
            className="x"
            onClick={onClose}
            role="button"
            tabIndex={0}
            style={{
              position: 'absolute',
              right: '22px',
              top: '20px',
              cursor: 'pointer',
              color: 'var(--ink2)',
              fontSize: '22px',
              zIndex: 2,
            }}
          >
            <Icon name="x" size={22} />
          </span>

          {/* Gacha Category Header Banner with Outline Icon */}
          <div
            className="row between mailbox-card-header"
            style={{
              marginBottom: '16px',
              alignItems: 'center',
            }}
          >
            <div className="row" style={{ gap: '10px', alignItems: 'center' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '5px 14px',
                  borderRadius: '999px',
                  background: currentTheme.badgeBg,
                  color: currentTheme.badgeColor,
                  fontWeight: 700,
                  fontSize: '13px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                  letterSpacing: '0.02em',
                }}
              >
                {/* Icon rỗng ruột viền xung quanh */}
                <span>{currentTheme.iconRenderer(15)}</span>
                <span>{language === 'en' ? currentTheme.nameEn : currentTheme.nameVi}</span>
              </span>

              <span
                style={{
                  fontSize: '12.5px',
                  color: currentTheme.accentColor,
                  fontStyle: 'italic',
                  fontWeight: 500,
                }}
              >
                {language === 'en' ? currentTheme.subEn : currentTheme.subVi}
              </span>
            </div>

            {drawnData?.capsule_id && (
              <span className="muted" style={{ fontSize: '12px' }}>
                #{drawnData.capsule_id}
              </span>
            )}
          </div>

          {/* Message Content */}
          {errorMsg ? (
            <div
              style={{
                minHeight: '130px',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--acc)',
                textAlign: 'center',
                padding: '0 20px',
                fontSize: '15px',
              }}
            >
              {errorMsg}
            </div>
          ) : (
            <>
              <div
                className="book mailbox-message-text"
                style={{
                  color: 'var(--ink)',
                }}
              >
                “{localize(drawnData, 'message')}”
              </div>

              <div
                className="hand mailbox-author-text"
              >
                — {drawnData?.author_name || (language === 'en' ? 'Anonymous' : 'Người gửi ẩn danh')}
              </div>
            </>
          )}

          {/* Action Footer */}
          <div
            className="row between mailbox-footer"
          >
            {/* Gacha Pull Action Button */}
            <button
              type="button"
              className="btn line sm gacha-btn-shine"
              onClick={handleDraw}
              disabled={gachaPhase === 'charging'}
              style={{
                borderColor: currentTheme.accentColor,
                color: currentTheme.accentColor,
                fontWeight: 600,
                padding: '7px 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                cursor: 'pointer',
              }}
              title={language === 'en' ? 'Draw another message (Gacha)' : 'Rút ngẫu nhiên lời nhắn khác'}
            >
              <Icon name="refresh" size={16} />
              <span>{language === 'en' ? 'Another message' : 'Lời nhắn khác'}</span>
            </button>

            <span className="row" style={{ gap: '12px', alignItems: 'center' }}>
              <span className="muted" style={{ fontSize: '13px' }}>
                {language === 'en' ? `Notebook (${notebookItems.length})` : `Sổ tay (${notebookItems.length})`}
              </span>
              <button
                type="button"
                className={`btn ${drawnData?.is_saved ? 'main' : 'line'} sm`}
                onClick={handleSaveToggle}
                disabled={gachaPhase === 'charging' || isSaving || !drawnData}
                style={{
                  padding: '7px 16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Icon name={drawnData?.is_saved ? 'check' : 'bookmark'} size={15} />
                <span>
                  {drawnData?.is_saved
                    ? (language === 'en' ? 'Saved' : 'Đã lưu')
                    : (language === 'en' ? 'Save to notebook' : 'Lưu vào sổ tay')}
                </span>
              </button>
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default MailboxModal;

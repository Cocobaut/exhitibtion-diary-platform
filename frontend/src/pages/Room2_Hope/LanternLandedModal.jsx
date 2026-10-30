import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';
import { ReactionButton } from '../../components/common/Reactions';
import { SingleLantern } from './LanternSky';
import { room2Service } from '../../services/room2Service';
import { useGuestGuard } from '../../context/GuestGuardContext';
import { useLanguage, useTranslationToggle } from '../../context/LanguageContext';
import { TranslationToggle } from '../../components/common/TranslationToggle';

export function LanternLandedModal({
  isOpen,
  onClose,
  onSaveToNotebook,
  onReplyFuture,
  letterData,
}) {
  const { guardAction } = useGuestGuard();
  const { original, language } = useLanguage();
  const [letter, setLetter] = useState(letterData || null);
  const tr = useTranslationToggle(letter, ['title', 'content']);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [currentReaction, setCurrentReaction] = useState(null);
  const [reactionsMap, setReactionsMap] = useState({
    HEART: 0,
    HUG: 0,
    SYMPATHY: 0,
    total: 0,
  });

  useEffect(() => {
    if (!isOpen || !letterData) return;

    let isMounted = true;
    setLetter(letterData);
    setIsSaved(Boolean(letterData.is_saved));
    setCurrentReaction(letterData.my_reaction || letterData.user_reaction || null);

    if (letterData.reactions) {
      setReactionsMap({
        HEART: letterData.reactions.HEART || 0,
        HUG: letterData.reactions.HUG || 0,
        SYMPATHY: letterData.reactions.SYMPATHY || 0,
        total: letterData.reactions.total || 0,
      });
    }

    // If letter has an id, call openLantern API to mark opened on server & fetch full content
    if (letterData.id) {
      setIsLoading(true);
      room2Service
        .openLantern(letterData.id)
        .then((res) => {
          if (!isMounted) return;
          const data = res?.data || res;
          if (data && data.title) {
            setLetter((prev) => ({
              ...prev,
              ...data,
              author: data.author_display_name || prev?.author || (language === 'en' ? 'Anonymous sender' : 'Người gửi ẩn danh'),
              content: data.content || prev?.content,
            }));
            if (data.is_saved !== undefined) {
              setIsSaved(Boolean(data.is_saved));
            }
            if (data.my_reaction !== undefined) {
              setCurrentReaction(data.my_reaction);
            }
            if (data.reactions) {
              setReactionsMap({
                HEART: data.reactions.HEART || 0,
                HUG: data.reactions.HUG || 0,
                SYMPATHY: data.reactions.SYMPATHY || 0,
                total: data.reactions.total || 0,
              });
            }
          }
        })
        .catch((err) => {
          console.warn('Could not mark lantern opened on backend:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, letterData]);

  if (!isOpen) return null;

  const currentLetter = letter || {
    title: language === 'en' ? 'To myself in 2026,' : 'Gửi mình của năm 2026,',
    title_vi: 'Gửi mình của năm 2026,',
    title_en: 'To myself in 2026,',
    content:
      language === 'en'
        ? 'Writing this while sitting in the library after failing my IELTS exam for the second time. If you are reading this, I hope you have stopped comparing yourself with others. Whatever the outcome, I am still proud that we never gave up.'
        : 'Lúc viết thư này mình đang ngồi ở thư viện, vừa trượt kỳ thi IELTS lần hai. Nếu cậu đọc được những dòng này, mong là cậu đã thôi so mình với người khác. Dù kết quả ra sao, mình vẫn tự hào vì tụi mình đã không bỏ cuộc.',
    content_vi:
      'Lúc viết thư này mình đang ngồi ở thư viện, vừa trượt kỳ thi IELTS lần hai. Nếu cậu đọc được những dòng này, mong là cậu đã thôi so mình với người khác. Dù kết quả ra sao, mình vẫn tự hào vì tụi mình đã không bỏ cuộc.',
    content_en:
      'Writing this while sitting in the library after failing my IELTS exam for the second time. If you are reading this, I hope you have stopped comparing yourself with others. Whatever the outcome, I am still proud that we never gave up.',
    author: language === 'en' ? 'Linh, Oct 24, 2023' : 'Linh, 24.10.2023',
    statusNote: language === 'en' ? 'Arrival time reached · 09:00, Oct 25, 2026' : 'Đã tới giờ hẹn · 09:00, 25.10.2026',
    symbol: 'heart',
  };

  const formatTargetDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${mins}, ${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  const handleSaveToggle = async () => {
    if (saveLoading) return;
    setSaveLoading(true);

    const willSave = !isSaved;
    try {
      if (currentLetter.id) {
        if (willSave) {
          await room2Service.saveLanternToNotebook(currentLetter.id);
        } else {
          await room2Service.unsaveLanternFromNotebook(currentLetter.id);
        }
      }
      setIsSaved(willSave);

      if (willSave && onSaveToNotebook) {
        onSaveToNotebook({
          id: currentLetter.id ? `nb_lt_${currentLetter.id}` : `nb_lt_${Date.now()}`,
          artwork_id: currentLetter.id,
          source: 'lantern',
          sourceLabel: language === 'en' ? 'Landed lantern · Room 2' : 'Lồng đèn hạ xuống · Phòng 2',
          badgeClass: 'b-wait',
          icon: 'r2',
          title: currentLetter.title || (language === 'en' ? 'Lantern letter to future' : 'Lồng đèn gửi tương lai'),
          content: currentLetter.content,
          author: currentLetter.author_display_name || currentLetter.author || (language === 'en' ? 'Anonymous sender' : 'Người gửi ẩn danh'),
          symbol: currentLetter.symbol || 'heart',
          savedAt: language === 'en' ? 'Today' : 'Hôm nay',
        });
      }
    } catch (err) {
      console.error('Error toggling notebook save:', err);
      // Fallback local save even if backend save fails
      setIsSaved(willSave);
      if (willSave && onSaveToNotebook) {
        onSaveToNotebook({
          id: currentLetter.id ? `nb_lt_${currentLetter.id}` : `nb_lt_${Date.now()}`,
          artwork_id: currentLetter.id,
          source: 'lantern',
          sourceLabel: language === 'en' ? 'Landed lantern · Room 2' : 'Lồng đèn hạ xuống · Phòng 2',
          badgeClass: 'b-wait',
          icon: 'r2',
          title: currentLetter.title || (language === 'en' ? 'Lantern letter to future' : 'Lồng đèn gửi tương lai'),
          content: currentLetter.content,
          author: currentLetter.author_display_name || currentLetter.author || (language === 'en' ? 'Anonymous sender' : 'Người gửi ẩn danh'),
          symbol: currentLetter.symbol || 'heart',
          savedAt: language === 'en' ? 'Today' : 'Hôm nay',
        });
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleReaction = async (type) => {
    guardAction(async () => {
      try {
        if (currentLetter?.id) {
          const res = await room2Service.toggleReaction(currentLetter.id, type);
          const data = res?.data || res;
          if (data) {
            setCurrentReaction(data.current_reaction);
            if (data.reactions_summary) {
              setReactionsMap(data.reactions_summary);
            }
          }
        } else {
          const next = currentReaction === type ? null : type;
          setCurrentReaction(next);
          setReactionsMap((prev) => ({
            ...prev,
            [type]: (prev[type] || 0) + (next ? 1 : -1),
            total: (prev.total || 0) + (next ? 1 : -1),
          }));
        }
      } catch (err) {
        console.warn('Lỗi khi cập nhật cảm xúc lồng đèn:', err);
      }
    }, language === 'en' ? 'express empathy with this lantern letter' : 'bày tỏ sự đồng cảm với bức thư lồng đèn');
  };

  const formattedTarget = currentLetter.target_date
    ? `${language === 'en' ? 'Landed' : 'Hạ xuống'}: ${formatTargetDate(currentLetter.target_date)}`
    : language === 'en'
    ? currentLetter.statusNote_en || currentLetter.statusNote || 'Arrival time reached'
    : currentLetter.statusNote_vi || currentLetter.statusNote || 'Đã tới giờ hẹn';

  return (
    <>
      <div className="scrim" style={{ background: 'rgba(20,8,12,.4)' }} onClick={onClose} />

      {/* Large Landed Lantern SVG in center */}
      <svg
        className="abs"
        style={{ left: '532px', top: '430px', zIndex: 31, pointerEvents: 'none' }}
        width="300"
        height="300"
        viewBox="-150 -150 300 300"
      >
        <SingleLantern
          x={0}
          y={0}
          sc={2.1}
          seed={4321}
          kind={currentLetter.symbol || 'heart'}
          color="#FFF0D2"
        />
      </svg>

      {/* Opened Letter Panel */}
      <div
        className="panel"
        style={{
          left: 'auto',
          right: '70px',
          top: '150px',
          transform: 'none',
          width: '520px',
          maxHeight: '80vh',
          overflowY: 'auto',
          background: '#FBF4E6',
          boxShadow: '0 24px 60px rgba(10,5,12,0.4)',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        <div className="row" style={{ gap: '6px', color: '#8A5A1E', fontSize: '13.5px' }}>
          <Icon name="clock" size={15} /> {formattedTarget}
        </div>

        <div
          className="book"
          style={{
            fontStyle: 'italic',
            color: 'var(--acc)',
            fontSize: '22px',
            margin: '10px 0 6px',
            fontWeight: 700,
          }}
        >
          {letter ? tr.text('title') : original(currentLetter, 'title')}
        </div>

        {isLoading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)' }}>
            {language === 'en' ? 'Opening...' : 'Đang mở thư...'}
          </div>
        ) : (
          <div
            className="book"
            style={{
              fontSize: '16px',
              lineHeight: 1.85,
              whiteSpace: 'pre-wrap',
              color: '#3A2016',
            }}
          >
            {letter ? tr.text('content') : original(currentLetter, 'content')}
          </div>
        )}
        <TranslationToggle
          hasTranslation={tr.hasTranslation}
          showTranslation={tr.showTranslation}
          onToggle={tr.toggleTranslation}
          style={{ marginTop: '8px' }}
        />

        <div
          className="hand"
          style={{
            textAlign: 'right',
            fontSize: '22px',
            marginTop: '12px',
            color: '#5C341F',
          }}
        >
          {currentLetter.author_display_name || currentLetter.author || (language === 'en' ? 'Anonymous sender' : 'Người gửi ẩn danh')}
        </div>

        {/* Reactions bar for Room 2 */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '20px' }}>
          <div className="rxbar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['HEART', 'HUG', 'SYMPATHY'].map((type) => (
              <ReactionButton
                key={type}
                type={type}
                count={reactionsMap[type] || 0}
                active={currentReaction === type}
                onClick={() => handleToggleReaction(type)}
              />
            ))}
          </div>
          <div className="muted" style={{ marginTop: '10px', fontSize: '13px' }}>
            {reactionsMap.total > 0
              ? (language === 'en'
                  ? `${reactionsMap.total} people shared empathy with this letter.`
                  : `${reactionsMap.total} người đã gửi cảm xúc.`)
              : (language === 'en'
                  ? 'Be the first to share comforting words with the author.'
                  : 'Hãy là người đầu tiên gửi lời an ủi.')}
          </div>
        </div>

        <div
          className="row between"
          style={{
            marginTop: '18px',
            borderTop: '1px solid var(--line)',
            paddingTop: '14px',
          }}
        >
          <button
            type="button"
            className={`btn ${isSaved ? 'main' : 'line'} sm`}
            onClick={() => {
              guardAction(handleSaveToggle, language === 'en' ? 'save lantern letter to notebook' : 'lưu lồng đèn vào sổ tay');
            }}
            disabled={saveLoading}
          >
            <Icon name={isSaved ? 'check' : 'bookmark'} size={16} />
            {saveLoading
              ? (language === 'en' ? 'Saving...' : 'Đang lưu...')
              : isSaved
              ? (language === 'en' ? 'Saved to notebook' : 'Đã lưu vào sổ tay')
              : (language === 'en' ? 'Save to notebook' : 'Lưu vào sổ tay')}
          </button>
          <button
            type="button"
            className="btn main sm"
            onClick={() => {
              guardAction(() => {
                onClose();
                if (onReplyFuture) onReplyFuture();
              }, language === 'en' ? 'reply to future' : 'viết thư trả lời tương lai');
            }}
          >
            <Icon name="r2" size={16} /> {language === 'en' ? 'Write to the future' : 'Viết thư cho tương lai'}
          </button>
        </div>
      </div>
    </>
  );
}

export default LanternLandedModal;

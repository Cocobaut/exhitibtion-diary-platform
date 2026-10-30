import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';
import { ReactionButton } from '../../components/common/Reactions';
import { leafPath } from './WishTree';
import { useAuth } from '../../context/AuthContext';
import { useGuestGuard } from '../../context/GuestGuardContext';
import { useLanguage, useTranslationToggle } from '../../context/LanguageContext';
import { TranslationToggle } from '../../components/common/TranslationToggle';
import { room3Service, toFrontendCategory, CATEGORY_MAP } from '../../services/room3Service';

export function ReadLeafModal({
  isOpen,
  leafData,
  onClose,
  onReactionUpdated,
  onSaveToNotebook,
  notebookItems = [],
}) {
  const { user } = useAuth();
  const { guardAction } = useGuestGuard();
  const { original, language } = useLanguage();

  const [leaf, setLeaf] = useState(leafData || null);
  const tr = useTranslationToggle(leaf, ['title', 'content', 'short_content']);
  const [energyCount, setEnergyCount] = useState(86);
  const [heartCount, setHeartCount] = useState(214);
  const [hasEnergized, setHasEnergized] = useState(false);
  const [hasHearted, setHasHearted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTogglingEnergy, setIsTogglingEnergy] = useState(false);
  const [isTogglingHeart, setIsTogglingHeart] = useState(false);

  useEffect(() => {
    if (!isOpen || !leafData) return;

    let isMounted = true;
    setLeaf(leafData);

    const initialSaved = Boolean(
      leafData?.is_saved ||
      (notebookItems && notebookItems.some((i) => i.artwork_id === leafData.id || i.id === leafData.id || i.id === `nb_r3_${leafData.id}`))
    );
    setIsSaved(initialSaved);

    const initialEnergy =
      leafData?.reactions?.ENERGY ?? leafData?.energy_count ?? 86;
    const initialHeart =
      leafData?.reactions?.HEART ?? leafData?.heart_count ?? 214;
    setEnergyCount(initialEnergy);
    setHeartCount(initialHeart);
    setHasEnergized(Boolean(leafData?.has_received_energy || leafData?.user_has_energized));
    setHasHearted(Boolean(leafData?.user_has_hearted));

    // If leaf has an id, fetch fresh details
    if (leafData.id) {
      setIsLoading(true);
      room3Service
        .getLeafDetail(leafData.id)
        .then((res) => {
          if (!isMounted) return;
          const data = res?.data || res;
          if (data && data.title) {
            setLeaf((prev) => ({ ...prev, ...data }));
            const eCount = data?.reactions?.ENERGY ?? data?.energy_count ?? initialEnergy;
            const hCount = data?.reactions?.HEART ?? data?.heart_count ?? initialHeart;
            setEnergyCount(eCount);
            setHeartCount(hCount);
            if (data?.has_received_energy !== undefined) {
              setHasEnergized(Boolean(data.has_received_energy));
            }
            if (data?.is_saved !== undefined) {
              setIsSaved(Boolean(data.is_saved));
            }
          }
        })
        .catch((err) => {
          console.warn('Could not load leaf detail from API:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, leafData]);

  if (!isOpen) return null;

  const currentLeaf = leaf || {
    title: language === 'en' ? 'To You Who Feel Weary' : 'Gửi bạn đang mệt mỏi',
    title_vi: 'Gửi bạn đang mệt mỏi',
    title_en: 'To You Who Feel Weary',
    content:
      language === 'en'
        ? 'Resting today is also a way of persevering. Even trees do not grow leaves all year round.'
        : 'Hôm nay nghỉ ngơi cũng là một cách cố gắng. Cái cây cũng đâu ra lá quanh năm.',
    content_vi: 'Hôm nay nghỉ ngơi cũng là một cách cố gắng. Cái cây cũng đâu ra lá quanh năm.',
    content_en: 'Resting today is also a way of persevering. Even trees do not grow leaves all year round.',
    author_display_name: language === 'en' ? 'Cloud' : 'Mây',
    tag_category: 'CL',
    color_code: '#94C590',
    created_at: '2026-10-18T08:00:00Z',
  };

  const frontCatKey = toFrontendCategory(currentLeaf.tag_category);
  const catConfig = CATEGORY_MAP[frontCatKey] || CATEGORY_MAP.CL;
  const leafColor = currentLeaf.color_code || catConfig.color;

  const formatDate = (dateStr) => {
    if (!dateStr) return language === 'en' ? 'Recently' : 'Gần đây';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  const handleToggleAction = async (actionType) => {
    guardAction(
      async () => {
        if (!currentLeaf?.id) {
          // Mock toggle fallback
          if (actionType === 'ENERGY') {
            const next = !hasEnergized;
            setHasEnergized(next);
            setEnergyCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));
          } else {
            const next = !hasHearted;
            setHasHearted(next);
            setHeartCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));
          }
          return;
        }

        const isHeart = actionType === 'HEART';
        if (isHeart) {
          if (isTogglingHeart) return;
          setIsTogglingHeart(true);
        } else {
          if (isTogglingEnergy) return;
          setIsTogglingEnergy(true);
        }

        try {
          const res = await room3Service.toggleEnergy(currentLeaf.id, actionType);
          const data = res?.data || res;

          if (data?.reactions) {
            setEnergyCount(data.reactions.ENERGY);
            setHeartCount(data.reactions.HEART);
            if (isHeart) {
              setHasHearted(data.current_action === 'HEART');
            } else {
              setHasEnergized(data.current_action === 'INSPIRED');
            }
          } else {
            // Fallback toggle
            if (isHeart) {
              const next = !hasHearted;
              setHasHearted(next);
              setHeartCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));
            } else {
              const next = !hasEnergized;
              setHasEnergized(next);
              setEnergyCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));
            }
          }

          if (onReactionUpdated) {
            onReactionUpdated(currentLeaf.id, data?.reactions);
          }
        } catch (err) {
          console.error('Error toggling reaction:', err);
          // Fallback optimistic
          if (isHeart) {
            const next = !hasHearted;
            setHasHearted(next);
            setHeartCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));
          } else {
            const next = !hasEnergized;
            setHasEnergized(next);
            setEnergyCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));
          }
        } finally {
          if (isHeart) setIsTogglingHeart(false);
          else setIsTogglingEnergy(false);
        }
      },
      actionType === 'HEART'
        ? (language === 'en' ? 'send a heart to this message' : 'thả tim thông điệp')
        : (language === 'en' ? 'send energy to this message' : 'truyền năng lượng')
    );
  };

  const handleSaveToggle = async () => {
    if (saveLoading) return;
    setSaveLoading(true);

    const willSave = !isSaved;
    const leafId = currentLeaf?.id;

    try {
      if (leafId) {
        if (willSave) {
          await room3Service.saveLeafToNotebook(leafId);
        } else {
          await room3Service.unsaveLeafFromNotebook(leafId);
        }
      }
      setIsSaved(willSave);

      if (willSave && onSaveToNotebook) {
        onSaveToNotebook({
          id: leafId ? `nb_r3_${leafId}` : `nb_r3_${Date.now()}`,
          artwork_id: leafId,
          source: 'room3',
          sourceLabel: language === 'en' ? 'Wish Leaf · Room 3' : 'Chiếc lá nguyện ước · Phòng 3',
          badgeClass: 'b-wait',
          icon: 'r3',
          title: original(currentLeaf, 'title') || (language === 'en' ? 'Encouraging message' : 'Thông điệp động viên'),
          content: original(currentLeaf, 'content') || original(currentLeaf, 'short_content') || '',
          author: currentLeaf.author_display_name || (language === 'en' ? 'Stranger' : 'Người lạ'),
          symbol: leafColor,
          savedAt: language === 'en' ? 'Today' : 'Hôm nay',
        });
      }
    } catch (err) {
      console.error('Error toggling notebook save for leaf:', err);
      setIsSaved(willSave);
      if (willSave && onSaveToNotebook) {
        onSaveToNotebook({
          id: leafId ? `nb_r3_${leafId}` : `nb_r3_${Date.now()}`,
          artwork_id: leafId,
          source: 'room3',
          sourceLabel: language === 'en' ? 'Wish Leaf · Room 3' : 'Chiếc lá nguyện ước · Phòng 3',
          badgeClass: 'b-wait',
          icon: 'r3',
          title: original(currentLeaf, 'title') || (language === 'en' ? 'Encouraging message' : 'Thông điệp động viên'),
          content: original(currentLeaf, 'content') || original(currentLeaf, 'short_content') || '',
          author: currentLeaf.author_display_name || (language === 'en' ? 'Stranger' : 'Người lạ'),
          symbol: leafColor,
          savedAt: language === 'en' ? 'Today' : 'Hôm nay',
        });
      }
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        className="panel"
        style={{
          width: '560px',
          textAlign: 'center',
          background: '#F7F5EC',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        }}
      >
        <span className="x" onClick={onClose} role="button" tabIndex={0}>
          <Icon name="x" size={22} />
        </span>

        {/* Leaf illustration with category color */}
        <svg
          width="170"
          height="95"
          viewBox="0 0 170 95"
          style={{ display: 'block', margin: '0 auto', filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.1))' }}
        >
          <g transform="translate(18 52) rotate(-10)">
            <path d={leafPath(136, 42)} fill={leafColor} />
            <path d="M6 0 H124" stroke="rgba(0,0,0,0.18)" strokeWidth="1.6" />
          </g>
        </svg>

        <div
          className="row"
          style={{
            justifyContent: 'center',
            gap: '6px',
            fontSize: '13.5px',
            color: '#4E7A4A',
            marginTop: '6px',
          }}
        >
          <i className="dot" style={{ background: leafColor }} />
          <span>
            {(language === 'en' ? catConfig.name_en : catConfig.name) || catConfig.name} · {(language === 'en' ? catConfig.desc_en : catConfig.desc) || catConfig.desc}
          </span>
        </div>

        <h2 style={{ marginTop: '6px', fontSize: '24px' }}>
          {(leaf ? tr.text('title') : original(currentLeaf, 'title')) || (language === 'en' ? 'Encouraging message' : 'Thông điệp động viên')}
        </h2>

        {isLoading ? (
          <div style={{ padding: '24px 0', color: 'var(--muted)' }}>
            {language === 'en' ? 'Loading message...' : 'Đang tải nội dung...'}
          </div>
        ) : (
          <div
            className="hand"
            style={{
              fontSize: '26px',
              lineHeight: 1.5,
              margin: '14px 0 10px',
              color: '#3A2016',
              whiteSpace: 'pre-wrap',
            }}
          >
            {leaf
              ? tr.text('content') || tr.text('short_content')
              : original(currentLeaf, 'content') || original(currentLeaf, 'short_content')}
          </div>
        )}
        <TranslationToggle
          hasTranslation={tr.hasTranslation}
          showTranslation={tr.showTranslation}
          onToggle={tr.toggleTranslation}
          style={{ marginBottom: '8px' }}
        />

        <div className="muted" style={{ fontSize: '13px' }}>
          {currentLeaf.author_display_name || (language === 'en' ? 'Stranger' : 'Người lạ')} ·{' '}
          {language === 'en'
            ? `hung on tree on ${formatDate(currentLeaf.created_at)}`
            : `treo lên cây ngày ${formatDate(currentLeaf.created_at)}`}
        </div>

        {/* Interactive Reaction Buttons & Save to notebook */}
        <div
          className="row"
          style={{ justifyContent: 'center', alignItems: 'center', marginTop: '22px', gap: '10px', flexWrap: 'wrap' }}
        >
          <ReactionButton
            type="ENERGY"
            count={energyCount}
            active={hasEnergized}
            disabled={isTogglingEnergy}
            onClick={() => handleToggleAction('ENERGY')}
          />

          <ReactionButton
            type="HEART"
            count={heartCount}
            active={hasHearted}
            disabled={isTogglingHeart}
            onClick={() => handleToggleAction('HEART')}
          />

          <button
            type="button"
            className={`btn ${isSaved ? 'main' : 'line'} sm`}
            onClick={() => {
              guardAction(
                handleSaveToggle,
                language === 'en' ? 'save message to notebook' : 'lưu thông điệp vào sổ tay'
              );
            }}
            disabled={saveLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '999px',
              padding: '7px 16px',
              fontSize: '13px',
            }}
          >
            <Icon name={isSaved ? 'check' : 'bookmark'} size={15} />
            {saveLoading
              ? (language === 'en' ? 'Saving...' : 'Đang lưu...')
              : isSaved
              ? (language === 'en' ? 'Saved to notebook' : 'Đã lưu vào sổ tay')
              : (language === 'en' ? 'Save to notebook' : 'Lưu vào sổ tay')}
          </button>
        </div>

        <div className="muted" style={{ fontSize: '13px', marginTop: '16px' }}>
          {language === 'en'
            ? 'This message is also preserved in the lobby mailbox.'
            : 'Lời nhắn này cũng có trong hòm thư ở Sảnh.'}
        </div>
      </div>
    </>
  );
}

export default ReadLeafModal;

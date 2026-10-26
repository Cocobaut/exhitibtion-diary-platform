import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/common/Icons';
import { ReactionButton } from '../../components/common/Reactions';
import { leafPath } from './WishTree';
import { room3Service, CATEGORY_MAP, toFrontendCategory } from '../../services/room3Service';
import { useAuth } from '../../context/AuthContext';

export function ReadLeafModal({ isOpen, leafData, onClose, onReactionUpdated }) {
  const { user } = useAuth();

  const [leaf, setLeaf] = useState(leafData || null);
  const [energyCount, setEnergyCount] = useState(86);
  const [heartCount, setHeartCount] = useState(214);
  const [hasEnergized, setHasEnergized] = useState(false);
  const [hasHearted, setHasHearted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTogglingEnergy, setIsTogglingEnergy] = useState(false);
  const [isTogglingHeart, setIsTogglingHeart] = useState(false);

  useEffect(() => {
    if (!isOpen || !leafData) return;

    let isMounted = true;
    setLeaf(leafData);

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
    title: 'Gửi bạn đang mệt mỏi',
    content: 'Hôm nay nghỉ ngơi cũng là một cách cố gắng. Cái cây cũng đâu ra lá quanh năm.',
    author_display_name: 'Mây',
    tag_category: 'CL',
    color_code: '#94C590',
    created_at: '2026-10-18T08:00:00Z',
  };

  const frontCatKey = toFrontendCategory(currentLeaf.tag_category);
  const catConfig = CATEGORY_MAP[frontCatKey] || CATEGORY_MAP.CL;
  const leafColor = currentLeaf.color_code || catConfig.color;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Gần đây';
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
            {catConfig.name} · {catConfig.desc}
          </span>
        </div>

        <h2 style={{ marginTop: '6px', fontSize: '24px' }}>
          {currentLeaf.title || 'Thông điệp động viên'}
        </h2>

        {isLoading ? (
          <div style={{ padding: '24px 0', color: 'var(--muted)' }}>Đang tải nội dung...</div>
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
            {currentLeaf.content || currentLeaf.short_content}
          </div>
        )}

        <div className="muted" style={{ fontSize: '13px' }}>
          {currentLeaf.author_display_name || 'Người lạ'} · treo lên cây ngày{' '}
          {formatDate(currentLeaf.created_at)}
        </div>

        {/* Interactive Reaction Buttons */}
        <div
          className="row"
          style={{ justifyContent: 'center', marginTop: '22px', gap: '12px' }}
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
        </div>

        <div className="muted" style={{ fontSize: '13px', marginTop: '16px' }}>
          Lời nhắn này cũng có trong hòm thư ở sảnh chính.
        </div>
      </div>
    </>
  );
}

export default ReadLeafModal;

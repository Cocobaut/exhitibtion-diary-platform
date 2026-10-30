import React, { useState, useEffect } from 'react';
import { Painting } from '../../components/common/Painting';
import { ReactionButton } from '../../components/common/Reactions';
import { Icon } from '../../components/common/Icons';
import { useAuth } from '../../context/AuthContext';
import { useGuestGuard } from '../../context/GuestGuardContext';
import { useLanguage, useTranslationToggle } from '../../context/LanguageContext';
import { TranslationToggle } from '../../components/common/TranslationToggle';
import { room1Service } from '../../services/room1Service';

export function ArtworkDetailModal({
  isOpen,
  onClose,
  artwork,
  onReactionUpdated,
  onSaveToNotebook,
  notebookItems = [],
}) {
  const { isAuthenticated } = useAuth();
  const { guardAction } = useGuestGuard();
  const { original, language, t } = useLanguage();
  const [detail, setDetail] = useState(artwork);
  const tr = useTranslationToggle(detail || artwork, ['title', 'short_content', 'content']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [currentReaction, setCurrentReaction] = useState(null);
  const [reactionsMap, setReactionsMap] = useState({
    HEART: 0,
    HUG: 0,
    SYMPATHY: 0,
    total: 0,
  });

  // Tải chi tiết đầy đủ của tác phẩm từ API (kèm tự động tăng view_count nguyên tử)
  useEffect(() => {
    if (!isOpen || !artwork?.id) return;

    setDetail(artwork);
    setCurrentReaction(artwork.my_reaction || artwork.user_reaction || null);

    const initialSaved = Boolean(
      artwork.is_saved ||
      (notebookItems && notebookItems.some((i) => i.artwork_id === artwork.id || i.id === artwork.id || i.id === `nb_r1_${artwork.id}`))
    );
    setIsSaved(initialSaved);

    if (artwork.reactions) {
      setReactionsMap({
        HEART: artwork.reactions.HEART || 0,
        HUG: artwork.reactions.HUG || 0,
        SYMPATHY: artwork.reactions.SYMPATHY || 0,
        total: artwork.reactions.total || 0,
      });
    }

    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await room1Service.getArtworkDetail(artwork.id);
        if (res) {
          setDetail(res);
          setCurrentReaction(res.my_reaction || null);
          if (res.is_saved !== undefined) {
            setIsSaved(Boolean(res.is_saved));
          }
          if (res.reactions) {
            setReactionsMap({
              HEART: res.reactions.HEART || 0,
              HUG: res.reactions.HUG || 0,
              SYMPATHY: res.reactions.SYMPATHY || 0,
              total: res.reactions.total || 0,
            });
          }
        }
      } catch (err) {
        console.warn('Lỗi khi tải chi tiết tác phẩm:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, artwork?.id]);

  if (!isOpen || !artwork) return null;

  // Toggle thả cảm xúc
  const handleToggleReaction = async (type) => {
    guardAction(async () => {
      try {
        const res = await room1Service.toggleReaction(artwork.id, type);
        if (res) {
          setCurrentReaction(res.current_reaction);
          if (res.reactions_summary) {
            setReactionsMap(res.reactions_summary);
          }
          if (onReactionUpdated) {
            onReactionUpdated(artwork.id, {
              my_reaction: res.current_reaction,
              reactions: res.reactions_summary,
            });
          }
        }
      } catch (err) {
        console.warn('Lỗi khi cập nhật cảm xúc:', err);
      }
    }, language === 'en' ? 'express empathy with this artwork' : 'bày tỏ sự đồng cảm với tác phẩm');
  };

  // Toggle lưu vào sổ tay
  const handleSaveToggle = async () => {
    if (saveLoading) return;
    setSaveLoading(true);

    const willSave = !isSaved;
    const artId = detail?.id || artwork?.id;

    try {
      if (artId) {
        if (willSave) {
          await room1Service.saveArtworkToNotebook(artId);
        } else {
          await room1Service.unsaveArtworkFromNotebook(artId);
        }
      }
      setIsSaved(willSave);

      if (willSave && onSaveToNotebook) {
        onSaveToNotebook({
          id: artId ? `nb_r1_${artId}` : `nb_r1_${Date.now()}`,
          artwork_id: artId,
          source: 'room1',
          sourceLabel: language === 'en' ? 'Artwork · Room 1' : 'Tác phẩm · Phòng 1',
          badgeClass: 'b-ok',
          icon: 'r1',
          title: title || 'Tác phẩm Phòng 1',
          content: story || '',
          author: author || 'Tác giả',
          media_url: detail?.media_url || artwork.media_url || artwork.image_url,
          savedAt: language === 'en' ? 'Today' : 'Hôm nay',
        });
      }
    } catch (err) {
      console.error('Error toggling notebook save for Room 1 artwork:', err);
      // Fallback local state
      setIsSaved(willSave);
      if (willSave && onSaveToNotebook) {
        onSaveToNotebook({
          id: artId ? `nb_r1_${artId}` : `nb_r1_${Date.now()}`,
          artwork_id: artId,
          source: 'room1',
          sourceLabel: language === 'en' ? 'Artwork · Room 1' : 'Tác phẩm · Phòng 1',
          badgeClass: 'b-ok',
          icon: 'r1',
          title: title || 'Tác phẩm Phòng 1',
          content: story || '',
          author: author || 'Tác giả',
          media_url: detail?.media_url || artwork.media_url || artwork.image_url,
          savedAt: language === 'en' ? 'Today' : 'Hôm nay',
        });
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const title = tr.text('title') || original(artwork, 'title') || artwork.t || (language === 'en' ? 'Artwork' : 'Tác phẩm');
  const author = detail?.author_display_name || artwork.author_display_name || artwork.a || (artwork.is_anonymous ? (language === 'en' ? 'Anonymous' : 'Ẩn danh') : (language === 'en' ? 'Author' : 'Tác giả'));
  const story = tr.text('content') || tr.text('short_content') || original(artwork, 'content') || original(artwork, 'short_content') || artwork.story || artwork.s || '';
  const viewCount = detail?.view_count !== undefined ? detail.view_count : (artwork.view_count || artwork.v || 0);

  const reactionTypes = ['HEART', 'HUG', 'SYMPATHY'];

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        className="panel"
        style={{
          width: '1060px',
          maxWidth: '94vw',
          maxHeight: '92vh',
          padding: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '480px 1fr',
        }}
      >
        {/* Left: Large Framed Painting */}
        <div
          style={{
            background: '#2B211D',
            padding: '24px',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '420px',
              maxWidth: '100%',
              height: '520px',
              border: '10px solid #F3EADD',
              boxShadow: '0 20px 40px rgba(0,0,0,.45)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1A1210',
            }}
          >
            {detail?.media_url || artwork.media_url || artwork.image_url ? (
              <img
                src={detail?.media_url || artwork.media_url || artwork.image_url}
                alt={title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Painting seed={100 + (artwork.id ? Number(String(artwork.id).replace(/\D/g, '').slice(0, 4)) || 1 : 1) * 7} kind={artwork.k || 'window'} />
            )}
          </div>
        </div>

        {/* Right: Story & Details */}
        <div
          style={{
            padding: '30px 36px 26px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          <span className="x" onClick={onClose} role="button" tabIndex={0}>
            <Icon name="x" size={22} />
          </span>

          <div
            style={{
              fontFamily: 'var(--serif)',
              letterSpacing: '.24em',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--acc)',
            }}
          >
            {language === 'en' ? 'ROOM 01 · BROKEN EXHIBITION' : 'PHÒNG 01 · TRIỂN LÃM ĐỔ VỠ'}
          </div>

          <h2 style={{ fontSize: '34px', marginTop: '6px', color: 'var(--ink)' }}>
            {title}
          </h2>

          <div className="row muted" style={{ gap: '14px', margin: '4px 0 16px' }}>
            <span className="hand" style={{ fontSize: '20px', color: 'var(--ink)' }}>
              {author}
            </span>
            <span>
              {detail?.created_at ? new Date(detail.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN') : '21.10.2026'}
            </span>
            <span className="row" style={{ gap: '4px' }}>
              <Icon name="eye" size={15} /> {viewCount} {language === 'en' ? 'views' : 'lượt xem'}
            </span>
          </div>

          <div
            className="book"
            style={{
              fontSize: '16.5px',
              lineHeight: 1.8,
              whiteSpace: 'pre-line',
              flex: 1,
              color: 'var(--ink)',
            }}
          >
            {isLoading ? (language === 'en' ? 'Loading...' : 'Đang tải...') : story}
          </div>
          <TranslationToggle
            hasTranslation={tr.hasTranslation}
            showTranslation={tr.showTranslation}
            onToggle={tr.toggleTranslation}
            style={{ marginTop: '10px' }}
          />

          {original(detail, 'quote') && (
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
                fontSize: '22px',
                color: 'var(--acc)',
                margin: '16px 0 20px',
              }}
            >
              {original(detail, 'quote')}
            </div>
          )}

          {/* Reactions bar & Save to notebook */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '20px' }}>
            <div className="row between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div className="rxbar" style={{ display: 'flex', gap: '8px' }}>
                {reactionTypes.map((type) => (
                  <ReactionButton
                    key={type}
                    type={type}
                    count={reactionsMap[type] || 0}
                    active={currentReaction === type}
                    onClick={() => handleToggleReaction(type)}
                  />
                ))}
              </div>

              <button
                type="button"
                className={`btn ${isSaved ? 'main' : 'line'} sm`}
                onClick={() => {
                  guardAction(handleSaveToggle, language === 'en' ? 'save artwork to notebook' : 'lưu tác phẩm vào sổ tay');
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
            <div className="muted" style={{ marginTop: '10px', fontSize: '13px' }}>
              {reactionsMap.total > 0
                ? (language === 'en'
                    ? `${reactionsMap.total} people shared empathy with this artwork.`
                    : `${reactionsMap.total} người đã gửi cảm xúc.`)
                : (language === 'en'
                    ? 'Be the first to share comforting words with the author.'
                    : 'Hãy là người đầu tiên gửi lời an ủi.')}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ArtworkDetailModal;

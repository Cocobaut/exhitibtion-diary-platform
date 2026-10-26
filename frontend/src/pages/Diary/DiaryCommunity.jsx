import React, { useState, useEffect, useCallback } from 'react';
import { MOODS, COMMUNITY_DIARY_ENTRIES } from '../../data/mockData';
import { ReactionStack } from '../../components/common/Reactions';
import { Icon } from '../../components/common/Icons';
import { diaryService } from '../../services/diaryService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const MOOD_TRANSLATIONS = {
  'Bình yên': 'Peaceful',
  'Trầm lắng': 'Contemplative',
  'Biết ơn': 'Grateful',
  'Hy vọng': 'Hopeful',
  'Mệt mỏi': 'Weary',
};

export function DiaryCommunity({ searchQuery = '' }) {
  const { user } = useAuth();
  const { language, localize } = useLanguage();
  const rotations = [-0.6, 0.5, -0.3, 0.4, -0.5, 0.3];

  const [communityNotes, setCommunityNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const getMoodLabel = (m) => (language === 'en' ? (MOOD_TRANSLATIONS[m] || m) : m);

  const loadCommunityDiaries = useCallback(async () => {
    setIsLoading(true);
    try {
      if (searchQuery.trim()) {
        const res = await diaryService.searchDiaries({
          q: searchQuery.trim(),
          scope: 'community',
          limit: 30,
        });
        const data = res?.data || res;
        const items = data?.items || [];
        setCommunityNotes(items.length > 0 ? items : COMMUNITY_DIARY_ENTRIES);
      } else {
        const res = await diaryService.getCommunityDiaries({ limit: 30 });
        const data = res?.data || res;
        const items = data?.items || [];
        setCommunityNotes(items.length > 0 ? items : COMMUNITY_DIARY_ENTRIES);
      }
    } catch (err) {
      console.warn('Error loading community diaries from API, using fallback:', err);
      setCommunityNotes(COMMUNITY_DIARY_ENTRIES);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadCommunityDiaries();
  }, [loadCommunityDiaries]);

  const handleToggleReaction = async (e, noteId, reactionType = 'HEART') => {
    e.stopPropagation();
    if (togglingId === noteId) return;
    setTogglingId(noteId);

    try {
      const res = await diaryService.toggleCommunityReaction(noteId, reactionType);
      const data = res?.data || res;

      setCommunityNotes((prev) =>
        prev.map((it) => {
          if (it.id === noteId) {
            const newTotal = data?.reactions?.total ?? (it.reactions?.total || 0);
            return {
              ...it,
              my_reaction: data?.current_reaction,
              reactions: data?.reactions || it.reactions,
              reaction_count: newTotal,
            };
          }
          return it;
        })
      );
    } catch (err) {
      console.error('Error toggling reaction on community diary:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div className="abs" style={{ left: '30px', right: '30px', top: '96px' }}>
        <div className="muted" style={{ color: 'var(--onw2)', fontSize: '14px' }}>
          {language === 'en'
            ? 'Curated diary pages shared by community members.'
            : 'Những trang nhật ký các thành viên chọn chia sẻ và đã qua kiểm duyệt.'}
          {isLoading && (
            <span style={{ marginLeft: '10px' }}>
              {language === 'en' ? 'Loading...' : 'Đang tải...'}
            </span>
          )}
        </div>
      </div>

      <div
        className="abs custom-scrollbar diary-scroll"
        style={{
          left: 0,
          right: 0,
          top: '134px',
          bottom: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          overflowY: 'auto',
          padding: '0 clamp(20px, 3.5vw, 44px) 44px',
        }}
      >
        {communityNotes.length === 0 && !isLoading && (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '40px 0',
              color: 'var(--onw2)',
            }}
          >
            {language === 'en'
              ? 'No matching community diary entries found.'
              : 'Chưa có bài nhật ký cộng đồng nào phù hợp.'}
          </div>
        )}

        {communityNotes.map((note, i) => {
          const authorName =
            note.author?.nickname || note.author_name || (language === 'en' ? 'Anonymous friend' : 'Người bạn ẩn danh');
          const totalReactions =
            note.reactions?.total ?? note.reaction_count ?? 0;
          const userReacted = Boolean(note.my_reaction || note.user_reaction);

          return (
            <div
              key={note.id || i}
              onClick={() => setSelectedNote(note)}
              style={{
                background: 'var(--paper)',
                color: 'var(--ink)',
                borderRadius: '4px 14px 14px 4px',
                padding: '20px 22px 16px',
                boxShadow: '0 14px 30px rgba(0,0,0,.28)',
                transform: `rotate(${rotations[i % rotations.length]}deg)`,
                borderLeft: `8px solid ${MOODS[note.mood] || '#E2BC55'}`,
                cursor: 'pointer',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(0deg) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 18px 40px rgba(0,0,0,.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `rotate(${rotations[i % rotations.length]}deg)`;
                e.currentTarget.style.boxShadow = '0 14px 30px rgba(0,0,0,.28)';
              }}
            >
              <div
                className="row muted"
                style={{ gap: '6px', fontSize: '12.5px' }}
              >
                <i className="dot" style={{ background: MOODS[note.mood] || '#E2BC55' }} />
                <span>{getMoodLabel(note.mood) || (language === 'en' ? 'Peaceful' : 'Bình yên')}</span> ·{' '}
                <span>{formatDate(note.entry_date || note.created_at)}</span>
              </div>

              <b
                className="serif"
                style={{
                  display: 'block',
                  fontSize: '22px',
                  margin: '4px 0 6px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {localize(note, 'title') || (language === 'en' ? 'Community diary page' : 'Trang nhật ký')}
              </b>

              <div
                className="book"
                style={{
                  fontSize: '15px',
                  lineHeight: 1.7,
                  height: '76px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {localize(note, 'snippet') || localize(note, 'content')}
              </div>

              <div
                className="row between"
                style={{
                  marginTop: '12px',
                  borderTop: '1px solid var(--line)',
                  paddingTop: '8px',
                }}
              >
                <span className="hand" style={{ fontSize: '18px', color: '#5C341F' }}>
                  {authorName}
                </span>

                <span
                  className="rxs"
                  onClick={(e) => handleToggleReaction(e, note.id, 'HUG')}
                  title="Nhấn để ôm an ủi hoặc thương"
                  style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '8px' }}
                >
                  <ReactionStack
                    types={userReacted ? ['HEART', 'HUG'] : ['HUG', 'SYMPATHY']}
                    size={20}
                  />
                  <span
                    className="muted"
                    style={{
                      fontWeight: userReacted ? 700 : 'normal',
                      color: userReacted ? 'var(--acc)' : 'inherit',
                      marginLeft: '4px',
                    }}
                  >
                    {totalReactions}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal for Community Diary */}
      {selectedNote && (
        <>
          <div className="scrim" onClick={() => setSelectedNote(null)} />
          <div
            className="panel"
            style={{
              width: '640px',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#FBF5EB',
              padding: '32px 40px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
            }}
          >
            <span
              className="x"
              onClick={() => setSelectedNote(null)}
              role="button"
              tabIndex={0}
            >
              <Icon name="x" size={22} />
            </span>

            <div className="row muted" style={{ gap: '8px', fontSize: '13px' }}>
              <i
                className="dot"
                style={{ background: MOODS[selectedNote.mood] || '#E2BC55' }}
              />
              <span>{getMoodLabel(selectedNote.mood) || (language === 'en' ? 'Peaceful' : 'Bình yên')}</span> ·{' '}
              <span>{formatDate(selectedNote.entry_date || selectedNote.created_at)}</span>
            </div>

            <h2 style={{ fontSize: '28px', margin: '10px 0 14px' }}>
              {localize(selectedNote, 'title') || (language === 'en' ? 'Community diary entry' : 'Trang nhật ký cộng đồng')}
            </h2>

            <div
              className="book"
              style={{
                fontSize: '17px',
                lineHeight: 1.85,
                color: '#3A2016',
                whiteSpace: 'pre-wrap',
                margin: '14px 0 20px',
              }}
            >
              {localize(selectedNote, 'content') || localize(selectedNote, 'snippet')}
            </div>

            {selectedNote.media_urls && selectedNote.media_urls.length > 0 && (
              <div
                style={{
                  marginBottom: '20px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  maxHeight: '260px',
                  border: '6px solid #fff',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                }}
              >
                <img
                  src={selectedNote.media_urls[0]}
                  alt="Ảnh đính kèm"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            <div
              className="row between"
              style={{
                borderTop: '1px solid var(--line)',
                paddingTop: '14px',
                marginTop: '10px',
              }}
            >
              <span className="hand" style={{ fontSize: '22px', color: '#5C341F' }}>
                — {selectedNote.author?.nickname || selectedNote.author_name || (language === 'en' ? 'Anonymous friend' : 'Người bạn ẩn danh')}
              </span>

              <button
                type="button"
                className={`btn ${selectedNote.my_reaction ? 'main' : 'line'} sm`}
                onClick={(e) => handleToggleReaction(e, selectedNote.id, 'HEART')}
              >
                <Icon name="heart" size={16} />
                {selectedNote.my_reaction ? 'Đã thả cảm xúc' : 'Thả cảm xúc đồng cảm'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default DiaryCommunity;

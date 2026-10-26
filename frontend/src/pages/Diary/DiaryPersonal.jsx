import React, { useState, useEffect, useCallback } from 'react';
import { MOODS } from '../../data/mockData';
import { Painting } from '../../components/common/Painting';
import { Icon } from '../../components/common/Icons';
import { diaryService } from '../../services/diaryService';
import { useAuth } from '../../context/AuthContext';

export function DiaryPersonal({ onOpenWriteModal, searchQuery = '', refreshTrigger = 0 }) {
  const { user } = useAuth();

  const [entries, setEntries] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeDetail, setActiveDetail] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load personal diaries or search results
  const loadEntries = useCallback(async () => {
    setIsLoadingList(true);
    try {
      if (searchQuery.trim()) {
        const res = await diaryService.searchDiaries({
          q: searchQuery.trim(),
          scope: 'mine',
        });
        const data = res?.data || res;
        const items = data?.items || [];
        setEntries(items);
        setSelectedIdx(0);
      } else {
        const res = await diaryService.getMyDiaries({ view_mode: 'timeline', limit: 30 });
        const data = res?.data || res;
        const items = data?.items || [];
        setEntries(items);
        setSelectedIdx(0);
      }
    } catch (err) {
      console.warn('Error loading personal diaries from API:', err);
    } finally {
      setIsLoadingList(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, refreshTrigger]);

  const activeEntry = entries[selectedIdx] || entries[0] || null;

  // Load detail of active entry
  useEffect(() => {
    if (!activeEntry?.id) {
      setActiveDetail(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDetail(true);
    diaryService
      .getMyDiaryDetail(activeEntry.id)
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || res;
        setActiveDetail(data);
      })
      .catch((err) => {
        console.warn('Could not load diary detail, using list item:', err);
        if (isMounted) setActiveDetail(activeEntry);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeEntry?.id]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    try {
      await diaryService.deleteDiary(confirmDeleteId);
      setConfirmDeleteId(null);
      loadEntries();
    } catch (err) {
      console.error('Error deleting diary:', err);
      alert('Không thể xoá trang nhật ký này. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  const parseDateParts = (dateStr) => {
    if (!dateStr) return { day: '25', weekday: 'Hôm nay', monthYear: 'Tháng 10 · 2026' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { day: '25', weekday: 'Hôm nay', monthYear: 'Tháng 10 · 2026' };

      const daysOfWeek = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
      const day = String(d.getDate()).padStart(2, '0');
      const weekday = daysOfWeek[d.getDay()];
      const monthYear = `Tháng ${d.getMonth() + 1} · ${d.getFullYear()}`;
      return { day, weekday, monthYear };
    } catch {
      return { day: '25', weekday: 'Hôm nay', monthYear: 'Tháng 10 · 2026' };
    }
  };

  const currentDisplay = activeDetail || activeEntry;
  const activeDateInfo = parseDateParts(currentDisplay?.entry_date || currentDisplay?.created_at);

  return (
    <>
      {/* Left Timeline */}
      <div
        className="abs"
        style={{
          left: '30px',
          top: '90px',
          width: '420px',
          bottom: '30px',
          overflowY: 'auto',
          paddingRight: '6px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--onw)',
            margin: '6px 0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Dòng thời gian</span>
          {isLoadingList && (
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 'normal' }}>
              Đang tải...
            </span>
          )}
        </div>

        {entries.length === 0 && !isLoadingList && (
          <div
            style={{
              padding: '28px 16px',
              textAlign: 'center',
              background: 'var(--glass)',
              borderRadius: '14px',
              color: 'var(--onw2)',
              fontSize: '14px',
            }}
          >
            Chưa có trang nhật ký nào. Hãy bấm <b>"Viết nhật ký mới"</b> để lưu lại khoảnh khắc hôm nay.
          </div>
        )}

        {entries.map((entry, idx) => {
          const isSelected = selectedIdx === idx;
          const { day, weekday } = parseDateParts(entry.entry_date || entry.created_at);
          const moodColor = MOODS[entry.mood] || '#E2BC55';

          return (
            <div
              key={entry.id || idx}
              className="row"
              onClick={() => setSelectedIdx(idx)}
              style={{
                alignItems: 'flex-start',
                gap: '14px',
                padding: '14px',
                borderRadius: '14px',
                marginBottom: '8px',
                cursor: 'pointer',
                background: isSelected ? 'var(--paper)' : 'var(--glass)',
                color: isSelected ? 'var(--ink)' : 'inherit',
                border: isSelected ? 'none' : '1px solid var(--glass-line)',
                boxShadow: isSelected ? '0 8px 24px rgba(0,0,0,.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ textAlign: 'center', width: '44px', flex: 'none' }}>
                <div
                  className="serif"
                  style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1 }}
                >
                  {day}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '2px' }}>
                  {weekday}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="row"
                  style={{ gap: '6px', fontSize: '12.5px', opacity: 0.85 }}
                >
                  <i className="dot" style={{ background: moodColor }} />
                  <span>{entry.mood || 'Bình yên'}</span>
                  <span style={{ marginLeft: 'auto' }} className="row">
                    {!entry.is_public ? (
                      <span className="row" style={{ gap: '4px' }}>
                        <Icon name="lock" size={13} /> Chỉ mình tôi
                      </span>
                    ) : !entry.is_approved ? (
                      <span className="badge b-wait" style={{ fontSize: '11px' }}>
                        Chờ duyệt công khai
                      </span>
                    ) : (
                      <span className="row" style={{ gap: '4px', color: '#4E7A4A' }}>
                        <Icon name="globe" size={13} /> Công khai
                      </span>
                    )}
                  </span>
                </div>
                <b
                  style={{
                    display: 'block',
                    fontSize: '16px',
                    marginTop: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {entry.title || 'Không tiêu đề'}
                </b>
                <div
                  style={{
                    fontSize: '13px',
                    opacity: 0.75,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '2px',
                  }}
                >
                  {entry.snippet || entry.content || 'Trang nhật ký riêng tư...'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right Reading Notebook */}
      {currentDisplay ? (
        <div
          className="abs"
          style={{
            left: '480px',
            right: '30px',
            top: '90px',
            bottom: '30px',
            background: 'var(--paper)',
            color: 'var(--ink)',
            borderRadius: '6px 18px 18px 6px',
            boxShadow: '0 24px 50px rgba(0,0,0,.35)',
            padding: '36px 48px',
            overflowY: 'auto',
          }}
        >
          {/* Red Book Spine Left Margin */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '14px',
              background: 'var(--acc)',
              borderRadius: '6px 0 0 6px',
            }}
          />

          <div className="row between">
            <div className="row muted" style={{ gap: '10px' }}>
              <span>
                {activeDateInfo.weekday}, ngày {activeDateInfo.day} · {activeDateInfo.monthYear}
              </span>
              <span className="row" style={{ gap: '6px' }}>
                <i
                  className="dot"
                  style={{ background: MOODS[currentDisplay.mood] || '#E2BC55' }}
                />{' '}
                {currentDisplay.mood || 'Bình yên'}
              </span>
            </div>

            <span className="row muted" style={{ gap: '14px' }}>
              <button
                type="button"
                className="iconbtn"
                title="Chỉnh sửa trang này"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                onClick={() => onOpenWriteModal && onOpenWriteModal(currentDisplay)}
              >
                <Icon name="edit" size={17} />
              </button>
              <button
                type="button"
                className="iconbtn"
                title="Xóa trang này"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#A1342C' }}
                onClick={() => setConfirmDeleteId(currentDisplay.id)}
              >
                <Icon name="x" size={18} />
              </button>
              <span className="row" style={{ gap: '4px' }}>
                {!currentDisplay.is_public ? (
                  <>
                    <Icon name="lock" size={17} /> Chỉ mình tôi
                  </>
                ) : !currentDisplay.is_approved ? (
                  <span className="badge b-wait">Chờ duyệt</span>
                ) : (
                  <>
                    <Icon name="globe" size={17} /> Công khai
                  </>
                )}
              </span>
            </span>
          </div>

          <h2 style={{ fontSize: '34px', margin: '12px 0 14px' }}>
            {currentDisplay.title || 'Không tiêu đề'}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: currentDisplay.media_urls?.length > 0 ? '1fr 260px' : '1fr',
              gap: '30px',
            }}
          >
            <div
              className="book"
              style={{
                fontSize: '17px',
                lineHeight: '34px',
                whiteSpace: 'pre-wrap',
                color: '#3A2016',
              }}
            >
              {isLoadingDetail ? 'Đang mở trang nhật ký...' : currentDisplay.content || currentDisplay.snippet}
            </div>

            {currentDisplay.media_urls && currentDisplay.media_urls.length > 0 && (
              <div>
                <div
                  style={{
                    border: '8px solid #fff',
                    boxShadow: '0 8px 20px rgba(0,0,0,.18)',
                    transform: 'rotate(2deg)',
                    overflow: 'hidden',
                    borderRadius: '4px',
                    maxHeight: '220px',
                  }}
                >
                  <img
                    src={currentDisplay.media_urls[0]}
                    alt="Lưu niệm nhật ký"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div
                  className="hand muted"
                  style={{ textAlign: 'center', marginTop: '10px', fontSize: '18px' }}
                >
                  ảnh chụp lưu niệm
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="abs"
          style={{
            left: '480px',
            right: '30px',
            top: '90px',
            bottom: '30px',
            background: 'var(--paper)',
            borderRadius: '6px 18px 18px 6px',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)',
            boxShadow: '0 24px 50px rgba(0,0,0,.35)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Icon name="book" size={48} />
            <div style={{ fontSize: '18px', marginTop: '12px' }}>
              Hãy chọn một trang nhật ký để đọc
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Delete */}
      {confirmDeleteId && (
        <>
          <div className="scrim" onClick={() => setConfirmDeleteId(null)} />
          <div
            className="panel"
            style={{ width: '420px', textAlign: 'center', padding: '24px' }}
          >
            <Icon name="trash" size={32} />
            <h3 style={{ margin: '12px 0 6px' }}>Xoá trang nhật ký này?</h3>
            <div className="muted" style={{ fontSize: '14px', marginBottom: '20px' }}>
              Hành động này không thể hoàn tác. Trang nhật ký sẽ bị xoá vĩnh viễn khỏi cuốn sổ của bạn.
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirmDeleteId(null)}
                disabled={isDeleting}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="btn main"
                style={{ background: '#A1342C' }}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xoá...' : 'Xác nhận xoá'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default DiaryPersonal;

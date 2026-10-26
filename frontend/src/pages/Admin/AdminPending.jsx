import React, { useState, useEffect, useRef } from 'react';
import { Painting } from '../../components/common/Painting';
import { Icon } from '../../components/common/Icons';
import { adminRoomService } from '../../services/adminRoomService';
import { useAuth } from '../../context/AuthContext';

export function AdminPending({
  roomId = 1,
  onOpenRejectModal,
  onApproveSuccess,
  refreshTrigger = 0,
}) {
  const { user } = useAuth();

  const [pendingItems, setPendingItems] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [sortOrder, setSortOrder] = useState('oldest');

  // Form edit fields
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [quote, setQuote] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);

  // Load pending list for this room
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage('');

    adminRoomService
      .getPendingArtworks(roomId, { sort: sortOrder, limit: 50 })
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || res;
        const items = data?.items || [];
        setPendingItems(items);
        setSelectedIdx(0);
      })
      .catch((err) => {
        console.warn('Could not load pending artworks from API:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [roomId, sortOrder, refreshTrigger]);

  const currentItem = pendingItems[selectedIdx] || null;

  // Sync form inputs when current item changes
  useEffect(() => {
    if (currentItem) {
      setTitle(currentItem.title || '');
      setSummary(currentItem.short_content || currentItem.summary || '');
      setContent(currentItem.content || '');
      setMediaUrl(currentItem.media_url || '');
      setQuote(
        currentItem.quote ||
          (roomId === 1 ? '“Thất bại là một khúc quanh, không phải điểm dừng chân.”' : '')
      );
      setErrorMessage('');
    } else {
      setTitle('');
      setSummary('');
      setContent('');
      setMediaUrl('');
      setQuote('');
    }
  }, [currentItem, roomId]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setErrorMessage('');
    try {
      const res = await adminRoomService.uploadArtworkImage(roomId, file);
      const url = res?.media_url || res?.data?.media_url;
      if (url) {
        setMediaUrl(url);
      }
    } catch (err) {
      console.error('Error uploading artwork image:', err);
      setErrorMessage('Không thể tải ảnh minh họa lên. Vui lòng kiểm tra lại kích thước file.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleApprove = async () => {
    if (!currentItem) return;
    setErrorMessage('');

    // Room 1 strictly requires media_url
    if (roomId === 1 && !mediaUrl) {
      setErrorMessage('Tranh minh họa là bắt buộc ở Phòng 1 trước khi phê duyệt.');
      return;
    }

    setIsApproving(true);
    try {
      const payload = {
        title: title.trim() || currentItem.title,
        short_content: summary.trim() || currentItem.short_content || currentItem.summary,
        content: content.trim() || currentItem.content,
        media_url: mediaUrl || undefined,
        quote: quote?.trim() || undefined,
        tag_category: currentItem.tag_category,
        color_code: currentItem.color_code,
      };

      const res = await adminRoomService.approveArtwork(roomId, currentItem.id, payload);
      const approvedData = res?.data || res;

      // Optimistically remove from list
      setPendingItems((prev) => prev.filter((it) => it.id !== currentItem.id));
      if (onApproveSuccess) {
        onApproveSuccess(approvedData);
      }
    } catch (err) {
      console.error('Error approving artwork:', err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể phê duyệt tác phẩm lúc này.';
      setErrorMessage(apiMsg);
    } finally {
      setIsApproving(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Left Queue Box */}
      <div
        className="abs box"
        style={{
          left: '32px',
          top: '192px',
          width: '400px',
          bottom: '26px',
          overflowY: 'auto',
        }}
      >
        <div
          className="row between"
          style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}
        >
          <span
            className="muted"
            style={{ cursor: 'pointer', fontSize: '13px' }}
            onClick={() => setSortOrder((prev) => (prev === 'oldest' ? 'latest' : 'oldest'))}
          >
            {sortOrder === 'oldest' ? 'Cũ nhất trước ↓' : 'Mới nhất trước ↑'}
          </span>
          <span className="muted" style={{ fontSize: '13px' }}>
            {isLoading ? 'Đang tải...' : `${pendingItems.length} bài chờ`}
          </span>
        </div>

        {pendingItems.length === 0 && !isLoading && (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)' }}>
            Hàng đợi hiện đang trống. Không có tác phẩm nào chờ duyệt trong phòng này.
          </div>
        )}

        {pendingItems.map((item, idx) => {
          const isSelected = selectedIdx === idx;
          const authorDisplay =
            item.author_display_name || item.author?.username || 'Ẩn danh';
          const authorUser = item.author?.username ? `@${item.author.username}` : '';

          return (
            <div
              key={item.id || idx}
              className={`qrow ${isSelected ? 'sel' : ''}`}
              onClick={() => setSelectedIdx(idx)}
              style={{ cursor: 'pointer' }}
            >
              <div className="row between">
                <span className="muted" style={{ fontSize: '12px' }}>
                  {formatTime(item.created_at)}
                </span>
                {item.locked_by ? (
                  <span className="badge b-priv">
                    <Icon name="eye" size={12} /> {item.locked_by}
                  </span>
                ) : (
                  <span className="badge b-wait">Chờ duyệt</span>
                )}
              </div>
              <b style={{ fontSize: '15px', margin: '3px 0 2px', display: 'block' }}>
                {item.title}
              </b>
              <div className="muted" style={{ fontSize: '12.5px' }}>
                {authorDisplay} {authorUser && `· ${authorUser}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right Review & Moderation Box */}
      {currentItem ? (
        <div
          className="abs box"
          style={{
            left: '452px',
            right: '32px',
            top: '142px',
            bottom: '26px',
            padding: '22px 26px',
            overflowY: 'auto',
          }}
        >
          {errorMessage && (
            <div
              style={{
                marginBottom: '14px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(196, 43, 28, 0.1)',
                border: '1px solid #C42B1C',
                color: '#8A180E',
                fontSize: '13.5px',
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          <div className="row between">
            <div>
              <div className="muted" style={{ fontSize: '13px' }}>
                Gửi lúc {formatTime(currentItem.created_at)} ·{' '}
                {currentItem.author?.username && `@${currentItem.author.username} · `}
                bút danh &ldquo;{currentItem.author_display_name || 'Tác giả'}&rdquo;
              </div>
              <div className="row" style={{ gap: '8px', marginTop: '4px' }}>
                <span className="badge b-wait">PENDING</span>
                <span className="muted" style={{ fontSize: '13px' }}>
                  <Icon name="eye" size={13} /> {user?.nickname || 'Bạn'} đang biên tập bài này
                </span>
              </div>
            </div>

            <div className="row" style={{ gap: '8px' }}>
              <button
                type="button"
                className="btn danger"
                onClick={() => onOpenRejectModal && onOpenRejectModal(currentItem)}
                disabled={isApproving}
              >
                <Icon name="x" size={16} /> Từ chối
              </button>
              <button
                type="button"
                className="btn main"
                onClick={handleApprove}
                disabled={isApproving}
              >
                <Icon name="check" size={16} />{' '}
                {isApproving ? 'Đang duyệt...' : 'Phê duyệt & trưng bày'}
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 340px',
              gap: '26px',
              marginTop: '16px',
            }}
          >
            {/* Editor fields */}
            <div>
              <div className="fieldl">Tiêu đề</div>
              <input
                className="inp"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
              />

              <div className="fieldl">
                Tóm tắt trên thẻ <span>{summary.length} / 120</span>
              </div>
              <input
                className="inp"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                maxLength={120}
              />

              <div className="fieldl">
                Nội dung đầy đủ <span>Admin được sửa câu chữ</span>
              </div>
              <textarea
                className="inp area"
                style={{
                  minHeight: '230px',
                  fontSize: '15px',
                  lineHeight: 1.7,
                  fontFamily: 'var(--sans)',
                }}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />

              {roomId === 1 && (
                <>
                  <div className="fieldl">Trích dẫn nghệ thuật (Quote)</div>
                  <input
                    className="inp"
                    value={quote}
                    onChange={(e) => setQuote(e.target.value)}
                    placeholder="“Một lời trích dẫn lắng đọng...”"
                  />
                </>
              )}
            </div>

            {/* Painting & Wall preview */}
            <div>
              <div className="fieldl">
                Tranh minh họa{' '}
                {roomId === 1 && (
                  <span style={{ color: 'var(--acc)' }}>Bắt buộc ở Phòng 1</span>
                )}
              </div>

              <div
                style={{
                  height: '210px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid var(--line)',
                  background: '#F0EBE0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt="Tranh minh họa"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Painting seed={77} kind="door" />
                )}
              </div>

              <div className="row" style={{ gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn line sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  <Icon name="upload" size={15} />{' '}
                  {isUploadingImage ? 'Đang tải...' : 'Tải ảnh khác'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                />
              </div>

              <div className="fieldl" style={{ marginTop: '18px' }}>
                Xem trước trên tường
              </div>
              <div
                style={{
                  background: 'var(--wall)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                }}
              >
                <article
                  className="work"
                  style={{
                    transform: 'scale(.94)',
                    transformOrigin: 'top center',
                    margin: '0 auto',
                  }}
                >
                  <div className="art" style={{ height: '120px', overflow: 'hidden' }}>
                    {mediaUrl ? (
                      <img
                        src={mediaUrl}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Painting seed={77} kind="door" />
                    )}
                  </div>
                  <div className="cap">
                    <h4>{title || 'Tiêu đề tác phẩm'}</h4>
                    <p style={{ height: 'auto' }}>{summary || 'Tóm tắt câu chuyện...'}</p>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="abs box"
          style={{
            left: '452px',
            right: '32px',
            top: '142px',
            bottom: '26px',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)',
          }}
        >
          <div>Chọn một tác phẩm từ hàng đợi bên trái để bắt đầu kiểm duyệt</div>
        </div>
      )}
    </>
  );
}

export default AdminPending;

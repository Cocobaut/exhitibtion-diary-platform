import React, { useState, useEffect, useCallback } from 'react';
import { Painting } from '../../components/common/Painting';
import { ReactionStack } from '../../components/common/Reactions';
import { Icon } from '../../components/common/Icons';
import { adminRoomService } from '../../services/adminRoomService';

export function AdminLive({ roomId = 1, onRefreshCounts }) {
  const [approvedItems, setApprovedItems] = useState([]);
  const [summary, setSummary] = useState({
    total_approved_artworks: 0,
    total_views: 0,
    total_reactions: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [archivingItem, setArchivingItem] = useState(null);
  const [archiveNote, setArchiveNote] = useState('Gỡ theo quy định kiểm duyệt');
  const [isArchiving, setIsArchiving] = useState(false);

  const loadApproved = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminRoomService.getApprovedArtworks(roomId, {
        q: search.trim() || undefined,
        limit: 30,
      });
      const data = res?.data || res;
      if (data) {
        setApprovedItems(data.items || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.warn('Could not load approved artworks from API:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, search]);

  useEffect(() => {
    loadApproved();
  }, [loadApproved]);

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditTitle(item.title || '');
    setEditContent(item.content || item.short_content || '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);
    try {
      await adminRoomService.editArtwork(roomId, editingItem.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setEditingItem(null);
      loadApproved();
    } catch (err) {
      console.error('Error editing artwork:', err);
      alert('Không thể lưu cập nhật tác phẩm. Vui lòng thử lại.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archivingItem) return;
    setIsArchiving(true);
    try {
      await adminRoomService.archiveArtwork(roomId, archivingItem.id, {
        admin_note: archiveNote.trim(),
      });
      setArchivingItem(null);
      loadApproved();
      if (onRefreshCounts) onRefreshCounts();
    } catch (err) {
      console.error('Error archiving artwork:', err);
      alert('Không thể lưu trữ tác phẩm này. Vui lòng thử lại.');
    } finally {
      setIsArchiving(false);
    }
  };

  const stats = [
    {
      label: 'Tác phẩm đang trưng bày',
      val: summary.total_approved_artworks.toLocaleString('vi-VN'),
      sub: `Phòng ${roomId}`,
    },
    {
      label: 'Lượt xem tích lũy',
      val: summary.total_views.toLocaleString('vi-VN'),
      sub: 'Lượt khách tham quan',
    },
    {
      label: 'Lượt thả cảm xúc',
      val: summary.total_reactions.toLocaleString('vi-VN'),
      sub: 'Tương tác cộng đồng',
    },
    {
      label: 'Thời gian duyệt trung bình',
      val: '5,2 giờ',
      sub: 'Mục tiêu dưới 24 giờ',
    },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Stats Cards Grid */}
      <div
        className="abs"
        style={{
          left: '32px',
          right: '32px',
          top: '194px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }}
      >
        {stats.map((s, idx) => (
          <div key={idx} className="box stat">
            <small>{s.label}</small>
            <b>{s.val}</b>
            <small>{s.sub}</small>
          </div>
        ))}
      </div>

      {/* Artworks Management Table */}
      <div
        className="abs box"
        style={{
          left: '32px',
          right: '32px',
          top: '330px',
          bottom: '26px',
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        <div className="row between" style={{ marginBottom: '14px', padding: '0 4px' }}>
          <div className="search" style={{ maxWidth: '320px', background: 'var(--paper)' }}>
            <Icon name="search" size={17} />
            <input
              type="text"
              placeholder="Tìm kiếm tác phẩm đang trưng bày…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isLoading && <span className="muted" style={{ fontSize: '13px' }}>Đang tải...</span>}
        </div>

        <table className="at">
          <thead>
            <tr>
              <th style={{ width: '90px' }} />
              <th>Tác phẩm</th>
              <th>Bút danh</th>
              <th>Lượt xem</th>
              <th>Cảm xúc</th>
              <th>Ngày duyệt</th>
              <th style={{ width: '210px' }} />
            </tr>
          </thead>
          <tbody>
            {approvedItems.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                  Chưa có tác phẩm nào đang trưng bày trong phòng này.
                </td>
              </tr>
            )}

            {approvedItems.map((w, i) => (
              <tr key={w.id || i}>
                <td>
                  <div
                    style={{
                      width: '70px',
                      height: '46px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: '#F0EBE0',
                    }}
                  >
                    {w.media_url ? (
                      <img
                        src={w.media_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Painting seed={100 + i * 7} kind="boat" />
                    )}
                  </div>
                </td>
                <td>
                  <b>{w.title}</b>
                  <div className="muted" style={{ fontSize: '12.5px' }}>
                    trưng bày {formatDate(w.reviewed_at || w.created_at)}
                  </div>
                </td>
                <td>{w.author_display_name || w.author?.username || 'Ẩn danh'}</td>
                <td>{(w.view_count || 0).toLocaleString('vi-VN')}</td>
                <td>
                  <span className="rxs">
                    <ReactionStack types={['HEART', 'HUG']} size={18} />
                    <span>{(w.reactions_count || 0).toLocaleString('vi-VN')}</span>
                  </span>
                </td>
                <td>{formatDate(w.reviewed_at) || 'Đã duyệt'}</td>
                <td>
                  <span className="row" style={{ gap: '8px' }}>
                    <button
                      type="button"
                      className="btn line sm"
                      onClick={() => handleStartEdit(w)}
                    >
                      <Icon name="edit" size={14} /> Sửa
                    </button>
                    <button
                      type="button"
                      className="btn line sm"
                      style={{ color: '#A1342C' }}
                      onClick={() => setArchivingItem(w)}
                    >
                      <Icon name="archive" size={14} /> Lưu trữ
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <>
          <div className="scrim" onClick={() => setEditingItem(null)} />
          <div className="panel" style={{ width: '640px' }}>
            <span className="x" onClick={() => setEditingItem(null)} role="button" tabIndex={0}>
              <Icon name="x" size={22} />
            </span>
            <h2>Hiệu đính tác phẩm</h2>
            <div className="sub">
              Cập nhật câu từ nếu có phản hồi từ cộng đồng. Bút danh tác giả được bảo vệ cố định.
            </div>

            <div className="fieldl">Tiêu đề tác phẩm</div>
            <input
              className="inp"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={150}
            />

            <div className="fieldl">Nội dung câu chuyện</div>
            <textarea
              className="inp area"
              style={{ minHeight: '180px' }}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setEditingItem(null)}
                disabled={isSavingEdit}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="btn main"
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editTitle.trim()}
              >
                {isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Archive Modal */}
      {archivingItem && (
        <>
          <div className="scrim" onClick={() => setArchivingItem(null)} />
          <div className="panel" style={{ width: '520px', textAlign: 'center' }}>
            <Icon name="archive" size={32} />
            <h3 style={{ margin: '12px 0 6px' }}>Lưu trữ tác phẩm?</h3>
            <div className="muted" style={{ fontSize: '13.5px', marginBottom: '16px' }}>
              Tác phẩm &ldquo;{archivingItem.title}&rdquo; sẽ được gỡ khỏi tường triển lãm và chuyển
              vào kho lưu trữ (ARCHIVED), dữ liệu tương tác vẫn được bảo toàn.
            </div>

            <div style={{ textAlign: 'left', marginBottom: '18px' }}>
              <div className="fieldl">Lý do gỡ và lưu trữ</div>
              <input
                className="inp"
                value={archiveNote}
                onChange={(e) => setArchiveNote(e.target.value)}
                placeholder="Ví dụ: Gỡ theo phản ánh cộng đồng hoặc hết kỳ triển lãm"
              />
            </div>

            <div className="row" style={{ justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setArchivingItem(null)}
                disabled={isArchiving}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="btn main"
                style={{ background: '#A1342C' }}
                onClick={handleConfirmArchive}
                disabled={isArchiving || !archiveNote.trim()}
              >
                {isArchiving ? 'Đang lưu trữ...' : 'Xác nhận gỡ & lưu trữ'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AdminLive;

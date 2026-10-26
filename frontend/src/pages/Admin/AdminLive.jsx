import React, { useState, useEffect, useCallback } from 'react';
import { Painting } from '../../components/common/Painting';
import { ReactionStack } from '../../components/common/Reactions';
import { Icon } from '../../components/common/Icons';
import { adminRoomService } from '../../services/adminRoomService';
import { useLanguage } from '../../context/LanguageContext';

export function AdminLive({ roomId = 1, statusSegment = 1, onRefreshCounts, triggerToast }) {
  const { t, language, localize } = useLanguage();
  const isArchive = statusSegment === 2;

  const [artworks, setArtworks] = useState([]);
  const [summary, setSummary] = useState({
    total_approved_artworks: 0,
    total_views: 0,
    total_reactions: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  // -------------------------------------------------------------
  // Bilingual Edit Modal State
  // -------------------------------------------------------------
  const [editingItem, setEditingItem] = useState(null);
  const [editTitleVi, setEditTitleVi] = useState('');
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editShortContentVi, setEditShortContentVi] = useState('');
  const [editShortContentEn, setEditShortContentEn] = useState('');
  const [editContentVi, setEditContentVi] = useState('');
  const [editContentEn, setEditContentEn] = useState('');
  const [editMediaUrl, setEditMediaUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // -------------------------------------------------------------
  // Archive Modal State (for Currently Exhibited items)
  // -------------------------------------------------------------
  const [archivingItem, setArchivingItem] = useState(null);
  const [archiveNote, setArchiveNote] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

  // -------------------------------------------------------------
  // Restore Modal State (for Archived items)
  // -------------------------------------------------------------
  const [restoringItem, setRestoringItem] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Default archive reason depending on language
  useEffect(() => {
    if (!archiveNote) {
      setArchiveNote(
        language === 'en'
          ? 'Archived per moderation review or rotation period'
          : 'Gỡ theo quy định kiểm duyệt hoặc hết kỳ trưng bày'
      );
    }
  }, [language]);

  const loadArtworks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminRoomService.getApprovedArtworks(roomId, {
        status: isArchive ? 'ARCHIVED' : 'APPROVED',
        q: search.trim() || undefined,
        limit: 30,
      });
      const data = res?.data || res;
      if (data) {
        setArtworks(data.items || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.warn('Could not load artworks from API:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, isArchive, search]);

  useEffect(() => {
    loadArtworks();
  }, [loadArtworks]);

  // -------------------------------------------------------------
  // Handle Start Edit
  // -------------------------------------------------------------
  const handleStartEdit = (item) => {
    setEditingItem(item);
    const isOrigEn = item.original_language === 'en';
    const rawTitle = item.title || '';
    setEditTitleVi(item.title_vi || (!isOrigEn ? rawTitle : ''));
    setEditTitleEn(item.title_en || (isOrigEn ? rawTitle : ''));

    const rawShort = item.short_content || item.summary || '';
    setEditShortContentVi(item.short_content_vi || (!isOrigEn ? rawShort : ''));
    setEditShortContentEn(item.short_content_en || (isOrigEn ? rawShort : ''));

    const rawContent = item.content || '';
    setEditContentVi(item.content_vi || (!isOrigEn ? rawContent : ''));
    setEditContentEn(item.content_en || (isOrigEn ? rawContent : ''));

    setEditMediaUrl(item.media_url || '');
    setUploadError('');
  };

  // -------------------------------------------------------------
  // Handle Upload Image in Edit Modal
  // -------------------------------------------------------------
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setUploadError('');
    try {
      const res = await adminRoomService.uploadArtworkImage(roomId, file);
      const url = res?.media_url || res?.data?.media_url;
      if (url) {
        setEditMediaUrl(url);
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setUploadError(
        language === 'en'
          ? 'Failed to upload image. Please check format (JPG, PNG, WebP) and size (max 10MB).'
          : 'Không thể tải ảnh lên. Vui lòng kiểm tra định dạng và dung lượng file (tối đa 10MB).'
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  // -------------------------------------------------------------
  // Handle Save Edit
  // -------------------------------------------------------------
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);
    try {
      const payload = {
        title: editTitleVi.trim() || editTitleEn.trim() || editingItem.title,
        title_vi: editTitleVi.trim() || null,
        title_en: editTitleEn.trim() || null,
        short_content: editShortContentVi.trim() || editShortContentEn.trim() || editingItem.short_content || '',
        short_content_vi: editShortContentVi.trim() || null,
        short_content_en: editShortContentEn.trim() || null,
        content: editContentVi.trim() || editContentEn.trim() || editingItem.content || '',
        content_vi: editContentVi.trim() || null,
        content_en: editContentEn.trim() || null,
        media_url: editMediaUrl.trim() || null,
      };

      await adminRoomService.editArtwork(roomId, editingItem.id, payload);
      if (triggerToast) {
        triggerToast(
          language === 'en'
            ? 'Artwork content updated successfully!'
            : 'Đã cập nhật nội dung tác phẩm thành công!'
        );
      }
      setEditingItem(null);
      loadArtworks();
    } catch (err) {
      console.error('Error editing artwork:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể lưu cập nhật tác phẩm.';
      alert(`Lỗi: ${msg}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // -------------------------------------------------------------
  // Handle Confirm Archive
  // -------------------------------------------------------------
  const handleConfirmArchive = async () => {
    if (!archivingItem) return;
    setIsArchiving(true);
    try {
      await adminRoomService.archiveArtwork(roomId, archivingItem.id, {
        admin_note: archiveNote.trim(),
      });
      if (triggerToast) {
        triggerToast(
          language === 'en'
            ? 'Artwork moved to archive storage.'
            : 'Đã chuyển tác phẩm vào kho lưu trữ.'
        );
      }
      setArchivingItem(null);
      loadArtworks();
      if (onRefreshCounts) onRefreshCounts();
    } catch (err) {
      console.error('Error archiving artwork:', err);
      alert('Không thể lưu trữ tác phẩm này. Vui lòng thử lại.');
    } finally {
      setIsArchiving(false);
    }
  };

  // -------------------------------------------------------------
  // Handle Confirm Restore
  // -------------------------------------------------------------
  const handleConfirmRestore = async () => {
    if (!restoringItem) return;
    setIsRestoring(true);
    try {
      await adminRoomService.restoreArtwork(roomId, restoringItem.id);
      if (triggerToast) {
        triggerToast(
          language === 'en'
            ? 'Artwork restored to exhibition gallery!'
            : 'Đã khôi phục tác phẩm trở lại phòng triển lãm!'
        );
      }
      setRestoringItem(null);
      loadArtworks();
      if (onRefreshCounts) onRefreshCounts();
    } catch (err) {
      console.error('Error restoring artwork:', err);
      alert('Không thể khôi phục tác phẩm lúc này. Vui lòng thử lại.');
    } finally {
      setIsRestoring(false);
    }
  };

  const stats = [
    {
      label: isArchive
        ? (language === 'en' ? 'Archived Artworks' : 'Tác phẩm trong kho lưu trữ')
        : (language === 'en' ? 'Artworks on Exhibition' : 'Tác phẩm đang trưng bày'),
      val: isArchive
        ? artworks.length.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')
        : summary.total_approved_artworks.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN'),
      sub: language === 'en' ? `Room ${roomId}` : `Phòng ${roomId}`,
    },
    {
      label: language === 'en' ? 'Cumulative Views' : 'Lượt xem tích lũy',
      val: summary.total_views.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN'),
      sub: language === 'en' ? 'Visitors reached' : 'Lượt khách tham quan',
    },
    {
      label: language === 'en' ? 'Total Reactions' : 'Lượt thả cảm xúc',
      val: summary.total_reactions.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN'),
      sub: language === 'en' ? 'Community engagement' : 'Tương tác cộng đồng',
    },
    {
      label: language === 'en' ? 'Curator Status' : 'Trạng thái phân hệ',
      val: isArchive ? (language === 'en' ? 'Archived' : 'Lưu trữ') : (language === 'en' ? 'Active' : 'Đang mở'),
      sub: isArchive
        ? (language === 'en' ? 'Protected records' : 'Hồ sơ được bảo toàn')
        : (language === 'en' ? 'Public gallery' : 'Phòng trưng bày mở'),
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
              placeholder={
                isArchive
                  ? (language === 'en' ? 'Search archived artworks…' : 'Tìm kiếm tác phẩm lưu trữ…')
                  : (language === 'en' ? 'Search exhibited artworks…' : 'Tìm kiếm tác phẩm đang trưng bày…')
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isLoading && (
            <span className="muted" style={{ fontSize: '13px' }}>
              {language === 'en' ? 'Loading artworks...' : 'Đang tải tác phẩm...'}
            </span>
          )}
        </div>

        <table className="at">
          <thead>
            <tr>
              <th style={{ width: '90px' }} />
              <th>{t('admin_col_artwork')}</th>
              <th>{t('admin_col_author')}</th>
              <th>{language === 'en' ? 'Views' : 'Lượt xem'}</th>
              <th>{language === 'en' ? 'Reactions' : 'Cảm xúc'}</th>
              <th>
                {isArchive
                  ? (language === 'en' ? 'Archive Date' : 'Ngày lưu trữ')
                  : (language === 'en' ? 'Approved Date' : 'Ngày duyệt')}
              </th>
              <th style={{ width: '220px' }} />
            </tr>
          </thead>
          <tbody>
            {artworks.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                  {isArchive
                    ? (language === 'en' ? 'No archived artworks in this room.' : 'Chưa có tác phẩm nào trong kho lưu trữ của phòng này.')
                    : t('admin_empty_live')}
                </td>
              </tr>
            )}

            {artworks.map((w, i) => (
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
                  <b>{localize(w, 'title') || w.title}</b>
                  <div className="muted" style={{ fontSize: '12.5px' }}>
                    {isArchive
                      ? (language === 'en' ? 'archived' : 'lưu trữ')
                      : (language === 'en' ? 'exhibited' : 'trưng bày')}{' '}
                    {formatDate(w.reviewed_at || w.created_at)}
                  </div>
                </td>
                <td>{w.author_display_name || w.author?.username || (language === 'en' ? 'Anonymous' : 'Ẩn danh')}</td>
                <td>{(w.view_count || 0).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}</td>
                <td>
                  <span className="rxs">
                    <ReactionStack types={['HEART', 'HUG']} size={18} />
                    <span>{(w.reactions_count || 0).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}</span>
                  </span>
                </td>
                <td>
                  {formatDate(w.reviewed_at) ||
                    (isArchive
                      ? (language === 'en' ? 'Archived' : 'Đã lưu trữ')
                      : (language === 'en' ? 'Approved' : 'Đã duyệt'))}
                </td>
                <td>
                  <span className="row" style={{ gap: '8px' }}>
                    <button
                      type="button"
                      className="btn line sm"
                      onClick={() => handleStartEdit(w)}
                    >
                      <Icon name="edit" size={14} /> {t('admin_btn_edit')}
                    </button>

                    {isArchive ? (
                      <button
                        type="button"
                        className="btn line sm"
                        style={{ color: '#2D7D46', borderColor: '#2D7D46' }}
                        onClick={() => setRestoringItem(w)}
                      >
                        {language === 'en' ? 'Restore' : 'Khôi phục'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn line sm"
                        style={{ color: '#A1342C' }}
                        onClick={() => setArchivingItem(w)}
                      >
                        <Icon name="archive" size={14} /> {t('admin_btn_archive')}
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ========================================================= */}
      {/* FULL BILINGUAL & IMAGE EDIT MODAL */}
      {/* ========================================================= */}
      {editingItem && (
        <>
          <div className="scrim" onClick={() => setEditingItem(null)} />
          <div
            className="panel"
            style={{
              width: '840px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 70px rgba(0,0,0,0.5)',
            }}
          >
            <span
              className="x"
              onClick={() => setEditingItem(null)}
              role="button"
              tabIndex={0}
              style={{ fontSize: '26px', cursor: 'pointer', lineHeight: '1' }}
            >
              &times;
            </span>

            <h2 className="serif" style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 6px' }}>
              {language === 'en' ? 'Edit Artwork' : 'Hiệu đính & Cập nhật tác phẩm'}
            </h2>
            <div className="sub" style={{ marginBottom: '20px' }}>
              {language === 'en'
                ? `Update bilingual titles, summaries, detailed narrative, and artwork imagery for Room ${roomId}. Author pseudonym is permanently protected.`
                : `Cập nhật tiêu đề song ngữ, tóm tắt ngắn, nội dung chi tiết và ảnh minh họa cho Phòng ${roomId}. Bút danh tác giả được bảo vệ cố định.`}
            </div>

            {/* Bilingual Titles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
              <div>
                <div className="fieldl">
                  {language === 'en' ? 'Title (Vietnamese)' : 'Tiêu đề (Tiếng Việt)'}
                </div>
                <input
                  className="inp"
                  value={editTitleVi}
                  onChange={(e) => setEditTitleVi(e.target.value)}
                  placeholder={language === 'en' ? 'Enter Vietnamese title...' : 'Nhập tiêu đề tiếng Việt...'}
                  maxLength={150}
                />
              </div>
              <div>
                <div className="fieldl">
                  {language === 'en' ? 'Title (English)' : 'Tiêu đề (Tiếng Anh)'}
                </div>
                <input
                  className="inp"
                  value={editTitleEn}
                  onChange={(e) => setEditTitleEn(e.target.value)}
                  placeholder={language === 'en' ? 'Enter English title...' : 'Nhập tiêu đề tiếng Anh...'}
                  maxLength={150}
                />
              </div>
            </div>

            {/* Bilingual Short Content / Summaries */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
              <div>
                <div className="fieldl">
                  {language === 'en' ? 'Short Content / Summary (Vietnamese)' : 'Tóm tắt ngắn (Tiếng Việt)'}
                </div>
                <textarea
                  className="inp area"
                  style={{ minHeight: '80px', fontSize: '13.5px', resize: 'vertical' }}
                  value={editShortContentVi}
                  onChange={(e) => setEditShortContentVi(e.target.value)}
                  placeholder={language === 'en' ? 'Short Vietnamese summary...' : 'Tóm tắt ngắn tiếng Việt...'}
                />
              </div>
              <div>
                <div className="fieldl">
                  {language === 'en' ? 'Short Content / Summary (English)' : 'Tóm tắt ngắn (Tiếng Anh)'}
                </div>
                <textarea
                  className="inp area"
                  style={{ minHeight: '80px', fontSize: '13.5px', resize: 'vertical' }}
                  value={editShortContentEn}
                  onChange={(e) => setEditShortContentEn(e.target.value)}
                  placeholder={language === 'en' ? 'Short English summary...' : 'Tóm tắt ngắn tiếng Anh...'}
                />
              </div>
            </div>

            {/* Bilingual Full Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div className="fieldl">
                  {language === 'en' ? 'Detailed Content (Vietnamese)' : 'Nội dung câu chuyện (Tiếng Việt)'}
                </div>
                <textarea
                  className="inp area"
                  style={{ minHeight: '140px', fontSize: '13.5px', resize: 'vertical' }}
                  value={editContentVi}
                  onChange={(e) => setEditContentVi(e.target.value)}
                  placeholder={language === 'en' ? 'Full Vietnamese narrative...' : 'Nội dung chi tiết tiếng Việt...'}
                />
              </div>
              <div>
                <div className="fieldl">
                  {language === 'en' ? 'Detailed Content (English)' : 'Nội dung câu chuyện (Tiếng Anh)'}
                </div>
                <textarea
                  className="inp area"
                  style={{ minHeight: '140px', fontSize: '13.5px', resize: 'vertical' }}
                  value={editContentEn}
                  onChange={(e) => setEditContentEn(e.target.value)}
                  placeholder={language === 'en' ? 'Full English narrative...' : 'Nội dung chi tiết tiếng Anh...'}
                />
              </div>
            </div>

            {/* Artwork Image & Media Section */}
            <div
              style={{
                border: '1px solid var(--line)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                background: 'var(--paper)',
              }}
            >
              <div className="fieldl" style={{ margin: '0 0 10px', fontWeight: 600 }}>
                {language === 'en' ? 'Artwork Imagery & Media' : 'Ảnh minh họa & Tệp phương tiện'}
              </div>

              <div className="row" style={{ gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {editMediaUrl ? (
                  <div
                    style={{
                      width: '120px',
                      height: '80px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid var(--line)',
                      flexShrink: 0,
                      position: 'relative',
                      background: '#F0EBE0',
                    }}
                  >
                    <img
                      src={editMediaUrl}
                      alt="Artwork Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '120px',
                      height: '80px',
                      borderRadius: '6px',
                      border: '1px dashed var(--line)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--muted)',
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    {language === 'en' ? 'No image' : 'Chưa có ảnh'}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div className="row" style={{ gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <label
                      className="btn line sm"
                      style={{ cursor: isUploadingImage ? 'wait' : 'pointer', margin: 0 }}
                    >
                      {isUploadingImage
                        ? (language === 'en' ? 'Uploading...' : 'Đang tải lên...')
                        : (language === 'en' ? 'Upload New Image' : 'Tải ảnh mới từ máy')}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={isUploadingImage}
                        onChange={handleImageUpload}
                      />
                    </label>

                    {editMediaUrl && (
                      <button
                        type="button"
                        className="btn ghost sm"
                        style={{ color: '#C44B2B' }}
                        onClick={() => setEditMediaUrl('')}
                      >
                        {language === 'en' ? 'Remove Image' : 'Xóa ảnh'}
                      </button>
                    )}
                  </div>

                  <input
                    className="inp"
                    style={{ fontSize: '12.5px', padding: '6px 10px' }}
                    value={editMediaUrl}
                    onChange={(e) => setEditMediaUrl(e.target.value)}
                    placeholder={
                      language === 'en'
                        ? 'Or paste direct image URL (https://...)'
                        : 'Hoặc dán trực tiếp đường dẫn ảnh (https://...)'
                    }
                  />

                  {uploadError && (
                    <div style={{ color: '#C44B2B', fontSize: '12.5px', marginTop: '6px' }}>
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setEditingItem(null)}
                disabled={isSavingEdit}
              >
                {language === 'en' ? 'Cancel' : 'Hủy'}
              </button>
              <button
                type="button"
                className="btn main"
                onClick={handleSaveEdit}
                disabled={isSavingEdit || (!editTitleVi.trim() && !editTitleEn.trim())}
              >
                {isSavingEdit
                  ? (language === 'en' ? 'Saving...' : 'Đang lưu...')
                  : (language === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* ARCHIVE MODAL (From Currently Exhibited) */}
      {/* ========================================================= */}
      {archivingItem && (
        <>
          <div className="scrim" onClick={() => setArchivingItem(null)} />
          <div className="panel" style={{ width: '520px', textAlign: 'center', boxShadow: '0 25px 70px rgba(0,0,0,0.5)' }}>
            <span
              className="x"
              onClick={() => setArchivingItem(null)}
              role="button"
              tabIndex={0}
              style={{ fontSize: '26px', cursor: 'pointer', lineHeight: '1' }}
            >
              &times;
            </span>

            <h3 className="serif" style={{ fontSize: '22px', margin: '12px 0 6px', fontWeight: 600 }}>
              {language === 'en' ? 'Archive Artwork?' : 'Lưu trữ tác phẩm?'}
            </h3>
            <div className="muted" style={{ fontSize: '13.5px', marginBottom: '16px', lineHeight: 1.5 }}>
              {language === 'en'
                ? `Artwork "${archivingItem.title}" will be removed from the public gallery and moved to the archive (ARCHIVED). Engagement metrics will be preserved.`
                : `Tác phẩm "${archivingItem.title}" sẽ được gỡ khỏi tường triển lãm và chuyển vào kho lưu trữ (ARCHIVED), dữ liệu tương tác vẫn được bảo toàn.`}
            </div>

            <div style={{ textAlign: 'left', marginBottom: '18px' }}>
              <div className="fieldl">{language === 'en' ? 'Reason for Archiving' : 'Lý do gỡ và lưu trữ'}</div>
              <input
                className="inp"
                value={archiveNote}
                onChange={(e) => setArchiveNote(e.target.value)}
                placeholder={
                  language === 'en'
                    ? 'E.g. Community feedback or exhibition rotation period end'
                    : 'Ví dụ: Gỡ theo phản ánh cộng đồng hoặc hết kỳ triển lãm'
                }
              />
            </div>

            <div className="row" style={{ justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setArchivingItem(null)}
                disabled={isArchiving}
              >
                {t('admin_reject_cancel')}
              </button>
              <button
                type="button"
                className="btn main"
                style={{ background: '#A1342C' }}
                onClick={handleConfirmArchive}
                disabled={isArchiving || !archiveNote.trim()}
              >
                {isArchiving
                  ? (language === 'en' ? 'Archiving...' : 'Đang lưu trữ...')
                  : (language === 'en' ? 'Confirm Archive' : 'Xác nhận gỡ & lưu trữ')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* RESTORE MODAL (From Archive Storage) */}
      {/* ========================================================= */}
      {restoringItem && (
        <>
          <div className="scrim" onClick={() => setRestoringItem(null)} />
          <div className="panel" style={{ width: '520px', textAlign: 'center', boxShadow: '0 25px 70px rgba(0,0,0,0.5)' }}>
            <span
              className="x"
              onClick={() => setRestoringItem(null)}
              role="button"
              tabIndex={0}
              style={{ fontSize: '26px', cursor: 'pointer', lineHeight: '1' }}
            >
              &times;
            </span>

            <h3 className="serif" style={{ fontSize: '22px', margin: '12px 0 6px', fontWeight: 600 }}>
              {language === 'en' ? 'Restore Artwork to Exhibition?' : 'Khôi phục tác phẩm lên triển lãm?'}
            </h3>
            <div className="muted" style={{ fontSize: '13.5px', marginBottom: '20px', lineHeight: 1.5 }}>
              {language === 'en'
                ? `Artwork "${restoringItem.title}" will be restored from the archive and publicly exhibited again in Room ${roomId}.`
                : `Tác phẩm "${restoringItem.title}" sẽ được khôi phục khỏi kho lưu trữ và hiển thị công khai trở lại tại Phòng ${roomId}.`}
            </div>

            <div className="row" style={{ justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setRestoringItem(null)}
                disabled={isRestoring}
              >
                {language === 'en' ? 'Cancel' : 'Hủy'}
              </button>
              <button
                type="button"
                className="btn main"
                style={{ background: '#2D7D46' }}
                onClick={handleConfirmRestore}
                disabled={isRestoring}
              >
                {isRestoring
                  ? (language === 'en' ? 'Restoring...' : 'Đang khôi phục...')
                  : (language === 'en' ? 'Confirm Restore' : 'Xác nhận khôi phục')}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AdminLive;

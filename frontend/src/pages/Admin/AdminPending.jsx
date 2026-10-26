import React, { useState, useEffect, useRef } from 'react';
import { Painting } from '../../components/common/Painting';
import { Icon } from '../../components/common/Icons';
import { adminRoomService } from '../../services/adminRoomService';
import { aiCopilotService } from '../../services/aiCopilotService';
import { AiModerationModal } from '../../components/Admin/AiModerationModal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function AdminPending({
  roomId = 1,
  onOpenRejectModal,
  onApproveSuccess,
  refreshTrigger = 0,
  triggerToast,
}) {
  const { user } = useAuth();
  const { t, language, localize } = useLanguage();

  const [pendingItems, setPendingItems] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [sortOrder, setSortOrder] = useState('oldest');

  // Form edit fields - Bilingual support
  const [titleVi, setTitleVi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [shortContentVi, setShortContentVi] = useState('');
  const [shortContentEn, setShortContentEn] = useState('');
  const [contentVi, setContentVi] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [quote, setQuote] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // AI Copilot states
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModerationData, setAiModerationData] = useState(null);

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
      const isOrigEn = currentItem.original_language === 'en';

      // Title
      const rawTitle = currentItem.title || '';
      const tVi = currentItem.title_vi || (!isOrigEn ? rawTitle : '') || '';
      const tEn = currentItem.title_en || (isOrigEn ? rawTitle : '') || '';
      setTitleVi(tVi);
      setTitleEn(tEn);

      // Short Content / Summary
      const rawShort = currentItem.short_content || currentItem.summary || '';
      const scVi = currentItem.short_content_vi || (!isOrigEn ? rawShort : '') || '';
      const scEn = currentItem.short_content_en || (isOrigEn ? rawShort : '') || '';
      setShortContentVi(scVi);
      setShortContentEn(scEn);

      // Full Content
      const rawContent = currentItem.content || '';
      const cVi = currentItem.content_vi || (!isOrigEn ? rawContent : '') || '';
      const cEn = currentItem.content_en || (isOrigEn ? rawContent : '') || '';
      setContentVi(cVi);
      setContentEn(cEn);

      setMediaUrl(currentItem.media_url || '');
      setQuote(
        currentItem.quote ||
          (roomId === 1 ? (language === 'en' ? '“Failure is a bend, not the end of the road.”' : '“Thất bại là một khúc quanh, không phải điểm dừng chân.”') : '')
      );
      setErrorMessage('');
    } else {
      setTitleVi('');
      setTitleEn('');
      setShortContentVi('');
      setShortContentEn('');
      setContentVi('');
      setContentEn('');
      setMediaUrl('');
      setQuote('');
    }
  }, [currentItem, roomId, language]);

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
        if (triggerToast) {
          triggerToast(
            language === 'en'
              ? 'Artwork image uploaded successfully.'
              : 'Đã tải ảnh nghệ thuật minh họa lên thành công.'
          );
        }
      }
    } catch (err) {
      console.error('Error uploading artwork image:', err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        (language === 'en'
          ? 'Failed to upload artwork image. Please check file size.'
          : 'Không thể tải ảnh minh họa lên. Vui lòng kiểm tra lại kích thước file.');
      if (triggerToast) {
        triggerToast(msg);
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAnalyzeWithAi = async () => {
    if (!currentItem) return;
    setIsAnalyzingAi(true);
    setErrorMessage('');
    try {
      const fullContent = [
        titleVi ? `Tiêu đề (VI): ${titleVi}` : '',
        titleEn ? `Title (EN): ${titleEn}` : '',
        shortContentVi ? `Tóm tắt (VI): ${shortContentVi}` : '',
        shortContentEn ? `Short Content (EN): ${shortContentEn}` : '',
        contentVi ? `Nội dung (VI): ${contentVi}` : '',
        contentEn ? `Content (EN): ${contentEn}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await aiCopilotService.moderateArtwork({
        art_id: currentItem.id,
        target_room: `room${roomId}`,
        content: fullContent || contentVi || contentEn || 'Nội dung tác phẩm',
      });

      const data = res?.data || res;
      setAiModerationData(data);
      setAiModalOpen(true);
    } catch (err) {
      console.error('Lỗi khi phân tích bằng AI Copilot:', err);
      const errMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        (language === 'en'
          ? 'Unable to call AI Copilot service. Please check Owner AI configuration.'
          : 'Không thể gọi dịch vụ AI Copilot. Vui lòng kiểm tra lại cấu hình Owner AI.');
      if (triggerToast) {
        triggerToast(`[AI Copilot] ${errMsg}`);
      } else {
        setErrorMessage(`[AI Copilot] ${errMsg}`);
      }
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleAcceptAiRewrite = (suggestedCleanContent) => {
    if (suggestedCleanContent) {
      if (currentItem?.original_language === 'en') {
        setContentEn(suggestedCleanContent);
      } else {
        setContentVi(suggestedCleanContent);
      }
    }
    setAiModalOpen(false);
  };

  const handleGenerateAiImage = async () => {
    if (!currentItem) return;
    setIsGeneratingAiImage(true);
    setErrorMessage('');
    try {
      const activeTitle = titleVi || titleEn;
      const activeShort = shortContentVi || shortContentEn;
      const activeContent = contentVi || contentEn;
      const sourceContent = `${activeTitle}. ${activeShort}. ${activeContent}`;
      const res = await aiCopilotService.generateArtImage({
        art_id: currentItem.id,
        source_content: sourceContent,
        custom_prompt_addon:
          roomId === 1
            ? 'oil painting, expressive brushwork, reflective museum fine art'
            : roomId === 2
            ? 'hopeful vibrant art, digital illustration, museum quality'
            : 'artistic conceptual digital painting, museum display',
      });
      const data = res?.data || res;
      if (data?.image_url) {
        setMediaUrl(data.image_url);
        if (triggerToast) {
          triggerToast(
            language === 'en'
              ? 'AI generated artwork image successfully.'
              : 'Đã sinh tranh vẽ nghệ thuật bằng AI thành công.'
          );
        }
      }
    } catch (err) {
      console.error('Lỗi khi sinh tranh vẽ AI:', err);
      const errMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        (language === 'en'
          ? 'Failed to generate image via AI. Please check Image Generation settings.'
          : 'Không thể sinh tranh vẽ bằng AI. Vui lòng kiểm tra cấu hình Image Generation.');
      if (triggerToast) {
        triggerToast(`[AI Image] ${errMsg}`);
      } else {
        setErrorMessage(`[AI Image] ${errMsg}`);
      }
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  const handleApprove = async () => {
    if (!currentItem) return;
    setErrorMessage('');

    // Room 1 strictly requires media_url
    if (roomId === 1 && !mediaUrl) {
      const reqMsg =
        language === 'en'
          ? 'Artwork image is required in Room 1 before approval.'
          : 'Tranh minh họa là bắt buộc ở Phòng 1 trước khi phê duyệt.';
      if (triggerToast) {
        triggerToast(reqMsg);
      } else {
        setErrorMessage(reqMsg);
      }
      return;
    }

    setIsApproving(true);
    try {
      const activeTitle = titleVi.trim() || titleEn.trim() || currentItem.title;
      const activeShort = shortContentVi.trim() || shortContentEn.trim() || currentItem.short_content;
      const activeContent = contentVi.trim() || contentEn.trim() || currentItem.content;

      const payload = {
        title: activeTitle,
        title_vi: titleVi.trim() || undefined,
        title_en: titleEn.trim() || undefined,
        short_content: activeShort,
        short_content_vi: shortContentVi.trim() || undefined,
        short_content_en: shortContentEn.trim() || undefined,
        content: activeContent,
        content_vi: contentVi.trim() || undefined,
        content_en: contentEn.trim() || undefined,
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
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        (language === 'en'
          ? 'Could not approve artwork at this time.'
          : 'Không thể phê duyệt tác phẩm lúc này.');
      if (triggerToast) {
        triggerToast(`Lỗi: ${apiMsg}`);
      } else {
        setErrorMessage(apiMsg);
      }
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
          width: '270px',
          bottom: '26px',
          overflowY: 'auto',
        }}
      >
        <div
          className="row between"
          style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}
        >
          <span
            className="muted"
            style={{ cursor: 'pointer', fontSize: '12.5px' }}
            onClick={() => setSortOrder((prev) => (prev === 'oldest' ? 'latest' : 'oldest'))}
          >
            {sortOrder === 'oldest'
              ? (language === 'en' ? 'Oldest first ↓' : 'Cũ nhất trước ↓')
              : (language === 'en' ? 'Newest first ↑' : 'Mới nhất trước ↑')}
          </span>
          <span className="muted" style={{ fontSize: '12.5px' }}>
            {isLoading
              ? (language === 'en' ? 'Loading...' : 'Đang tải...')
              : `${pendingItems.length} ${language === 'en' ? 'pending' : 'bài chờ'}`}
          </span>
        </div>

        {pendingItems.length === 0 && !isLoading && (
          <div style={{ padding: '40px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
            {t('admin_empty_pending')}
          </div>
        )}

        {pendingItems.map((item, idx) => {
          const isSelected = selectedIdx === idx;
          const authorDisplay =
            item.author_display_name || item.author?.username || (language === 'en' ? 'Anonymous' : 'Ẩn danh');
          const authorUser = item.author?.username ? `@${item.author.username}` : '';

          return (
            <div
              key={item.id || idx}
              className={`qrow ${isSelected ? 'sel' : ''}`}
              onClick={() => setSelectedIdx(idx)}
              style={{ cursor: 'pointer', padding: '12px 14px' }}
            >
              <div className="row between" style={{ alignItems: 'center', marginBottom: '4px' }}>
                <span className="muted" style={{ fontSize: '11.5px' }}>
                  {formatTime(item.created_at)}
                </span>
                {item.locked_by ? (
                  <span className="badge b-priv" style={{ fontSize: '10.5px' }}>
                    <Icon name="eye" size={11} /> {item.locked_by}
                  </span>
                ) : (
                  <span className="badge b-wait" style={{ fontSize: '10.5px' }}>{t('admin_seg_pending')}</span>
                )}
              </div>
              <b
                style={{
                  fontSize: '14px',
                  margin: '2px 0 3px',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={localize(item, 'title') || item.title}
              >
                {localize(item, 'title') || item.title}
              </b>
              <div
                className="muted"
                style={{
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
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
            left: '318px',
            right: '32px',
            top: '142px',
            bottom: '26px',
            padding: '22px 26px',
            overflowY: 'auto',
          }}
        >
          <div className="row between" style={{ alignItems: 'center' }}>
            <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
              <span className="badge b-wait">PENDING</span>
              <span className="muted" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Icon name="eye" size={13} />
                {language === 'en'
                  ? `${user?.nickname || 'You'} are editing this submission`
                  : `${user?.nickname || 'Bạn'} đang biên tập bài này`}
              </span>
            </div>

            <div className="row" style={{ gap: '8px' }}>
              <button
                type="button"
                className="btn line"
                onClick={handleAnalyzeWithAi}
                disabled={isAnalyzingAi || isApproving}
                style={{
                  borderColor: '#d97706',
                  color: '#b45309',
                  fontWeight: 600,
                  background: isAnalyzingAi ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                }}
                title="Phân tích kiểm duyệt và gợi ý tinh chỉnh văn phong bằng AI Copilot"
              >
                {isAnalyzingAi
                  ? (language === 'en' ? 'AI Analyzing...' : 'AI đang phân tích...')
                  : (language === 'en' ? 'AI Copilot' : 'Phân tích bằng AI')}
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => onOpenRejectModal && onOpenRejectModal(currentItem)}
                disabled={isApproving}
              >
                <Icon name="x" size={16} /> {t('admin_btn_reject')}
              </button>
              <button
                type="button"
                className="btn main"
                onClick={handleApprove}
                disabled={isApproving}
              >
                <Icon name="check" size={16} />{' '}
                {isApproving
                  ? (language === 'en' ? 'Approving...' : 'Đang duyệt...')
                  : (language === 'en' ? 'Approve & Exhibit' : 'Phê duyệt & trưng bày')}
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
              {/* Bilingual Title Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <div className="fieldl">
                    {language === 'en' ? 'Title (Vietnamese)' : 'Tiêu đề Tiếng Việt (VN)'}
                  </div>
                  <input
                    className="inp"
                    placeholder={language === 'en' ? 'Vietnamese title...' : 'Tiêu đề tiếng Việt...'}
                    value={titleVi}
                    onChange={(e) => setTitleVi(e.target.value)}
                    maxLength={150}
                  />
                </div>
                <div>
                  <div className="fieldl">
                    {language === 'en' ? 'Title (English)' : 'Tiêu đề Tiếng Anh (EN)'}
                  </div>
                  <input
                    className="inp"
                    placeholder={language === 'en' ? 'English title...' : 'Tiêu đề tiếng Anh...'}
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    maxLength={150}
                  />
                </div>
              </div>

              {/* Bilingual Short Content / Card Summary Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <div className="fieldl">
                    {language === 'en' ? 'Short Content (Vietnamese)' : 'Tóm tắt Tiếng Việt (VN)'}{' '}
                    <span>{shortContentVi.length} / 140</span>
                  </div>
                  <input
                    className="inp"
                    placeholder={language === 'en' ? 'Short summary in Vietnamese...' : 'Tóm tắt ngắn tiếng Việt...'}
                    value={shortContentVi}
                    onChange={(e) => setShortContentVi(e.target.value)}
                    maxLength={140}
                  />
                </div>
                <div>
                  <div className="fieldl">
                    {language === 'en' ? 'Short Content (English)' : 'Tóm tắt Tiếng Anh (EN)'}{' '}
                    <span>{shortContentEn.length} / 140</span>
                  </div>
                  <input
                    className="inp"
                    placeholder={language === 'en' ? 'Short summary in English...' : 'Tóm tắt ngắn tiếng Anh...'}
                    value={shortContentEn}
                    onChange={(e) => setShortContentEn(e.target.value)}
                    maxLength={140}
                  />
                </div>
              </div>

              {/* Bilingual Full Content Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <div className="fieldl">
                    {language === 'en' ? 'Content (Vietnamese)' : 'Nội dung Tiếng Việt (VN)'}{' '}
                    <span>{language === 'en' ? 'Editable' : 'Admin sửa được'}</span>
                  </div>
                  <textarea
                    className="inp area"
                    style={{
                      minHeight: '220px',
                      fontSize: '14.5px',
                      lineHeight: 1.6,
                      fontFamily: 'var(--sans)',
                    }}
                    placeholder={language === 'en' ? 'Full story in Vietnamese...' : 'Nội dung câu chuyện tiếng Việt...'}
                    value={contentVi}
                    onChange={(e) => setContentVi(e.target.value)}
                  />
                </div>
                <div>
                  <div className="fieldl">
                    {language === 'en' ? 'Content (English)' : 'Nội dung Tiếng Anh (EN)'}{' '}
                    <span>{language === 'en' ? 'Editable' : 'Admin sửa được'}</span>
                  </div>
                  <textarea
                    className="inp area"
                    style={{
                      minHeight: '220px',
                      fontSize: '14.5px',
                      lineHeight: 1.6,
                      fontFamily: 'var(--sans)',
                    }}
                    placeholder={language === 'en' ? 'Full story in English...' : 'Nội dung câu chuyện tiếng Anh...'}
                    value={contentEn}
                    onChange={(e) => setContentEn(e.target.value)}
                  />
                </div>
              </div>

              {roomId === 1 && (
                <div style={{ marginBottom: '14px' }}>
                  <div className="fieldl">{language === 'en' ? 'Artistic Quote (Phòng 1)' : 'Trích dẫn nghệ thuật (Phòng 1)'}</div>
                  <input
                    className="inp"
                    value={quote}
                    onChange={(e) => setQuote(e.target.value)}
                    placeholder="“Một lời trích dẫn lắng đọng...”"
                  />
                </div>
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

              <div className="row" style={{ gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn line sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage || isGeneratingAiImage}
                >
                  <Icon name="upload" size={15} />{' '}
                  {isUploadingImage
                    ? (language === 'en' ? 'Uploading...' : 'Đang tải...')
                    : (language === 'en' ? 'Upload different image' : 'Tải ảnh khác')}
                </button>
                <button
                  type="button"
                  className="btn line sm"
                  onClick={handleGenerateAiImage}
                  disabled={isGeneratingAiImage || isUploadingImage}
                  style={{
                    borderColor: '#8b5cf6',
                    color: '#6d28d9',
                    fontWeight: 500,
                  }}
                  title="Dùng AI tự động chuyển hóa câu chuyện thành tranh minh họa mỹ thuật"
                >
                  {isGeneratingAiImage
                    ? (language === 'en' ? 'Generating Art...' : 'Đang vẽ tranh AI...')
                    : (language === 'en' ? 'AI Generate Image' : 'Sinh ảnh bằng AI')}
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
                {language === 'en' ? 'Wall preview' : 'Xem trước trên tường'}
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
                    <h4>{(language === 'en' ? (titleEn || titleVi) : (titleVi || titleEn)) || (language === 'en' ? 'Artwork Title' : 'Tiêu đề tác phẩm')}</h4>
                    <p style={{ height: 'auto' }}>{(language === 'en' ? (shortContentEn || shortContentVi) : (shortContentVi || shortContentEn)) || (language === 'en' ? 'Story summary...' : 'Tóm tắt câu chuyện...')}</p>
                  </div>
                </article>
              </div>
            </div>
          </div>

          {/* Submission Metadata Footer */}
          <div
            style={{
              marginTop: '22px',
              paddingTop: '14px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '13px',
            }}
            className="muted"
          >
            <div>
              {language === 'en' ? (
                <>
                  Submitted at <b>{formatTime(currentItem.created_at)}</b>
                  {currentItem.author?.username && (
                    <> · <b>@{currentItem.author.username}</b></>
                  )}{' '}
                  · pen name &ldquo;<b>{currentItem.author_display_name || 'Author'}</b>&rdquo;
                </>
              ) : (
                <>
                  Gửi lúc <b>{formatTime(currentItem.created_at)}</b>
                  {currentItem.author?.username && (
                    <> · <b>@{currentItem.author.username}</b></>
                  )}{' '}
                  · bút danh &ldquo;<b>{currentItem.author_display_name || 'Tác giả'}</b>&rdquo;
                </>
              )}
            </div>
            {currentItem.id && (
              <div style={{ fontSize: '12px' }}>
                ID: <span style={{ fontFamily: 'monospace' }}>#{currentItem.id}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="abs box"
          style={{
            left: '318px',
            right: '32px',
            top: '142px',
            bottom: '26px',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)',
          }}
        >
          <div>
            {language === 'en'
              ? 'Select an artwork from the left queue to begin moderation'
              : 'Chọn một tác phẩm từ hàng đợi bên trái để bắt đầu kiểm duyệt'}
          </div>
        </div>
      )}

      {/* AI Moderation Analysis & Rewrite Modal */}
      <AiModerationModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        data={aiModerationData}
        onAccept={handleAcceptAiRewrite}
        originalContent={contentVi || contentEn || currentItem?.content || ''}
      />
    </>
  );
}

export default AdminPending;

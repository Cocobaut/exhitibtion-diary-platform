import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/common/Icons';
import { adminDiaryService } from '../../services/adminDiaryService';
import { aiCopilotService } from '../../services/aiCopilotService';
import { AiModerationModal } from '../../components/Admin/AiModerationModal';
import { useLanguage } from '../../context/LanguageContext';

export function AdminDiaries({ onCountChange, triggerToast }) {
  const { t, language, localize } = useLanguage();
  const [segment, setSegment] = useState(0); // 0: Chờ phê duyệt, 1: Đang công khai

  // -------------------------------------------------------------
  // Pending State
  // -------------------------------------------------------------
  const [pendingItems, setPendingItems] = useState([]);
  const [selectedPendingIdx, setSelectedPendingIdx] = useState(0);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [totalPending, setTotalPending] = useState(0);

  // Form fields for editing/bilingual translation
  const [titleVi, setTitleVi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [contentVi, setContentVi] = useState('');
  const [contentEn, setContentEn] = useState('');

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('Chứa thông tin liên lạc cá nhân');
  const [customRejectNote, setCustomRejectNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // AI Copilot State
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModerationData, setAiModerationData] = useState(null);

  // -------------------------------------------------------------
  // Approved State
  // -------------------------------------------------------------
  const [approvedItems, setApprovedItems] = useState([]);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [approvedSearch, setApprovedSearch] = useState('');
  const [isLoadingApproved, setIsLoadingApproved] = useState(false);

  // Revoke Modal State
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokingItem, setRevokingItem] = useState(null);
  const [revokeReason, setRevokeReason] = useState('Nhận được nhiều báo cáo phản cảm từ người đọc');
  const [isRevoking, setIsRevoking] = useState(false);

  const quickRejectReasons = [
    'Chứa thông tin liên lạc cá nhân',
    'Ngôn từ chưa phù hợp',
    'Nội dung quá ngắn',
    'Không phù hợp không gian cộng đồng',
  ];

  const quickRevokeReasons = [
    'Nhận được nhiều báo cáo phản cảm từ người đọc',
    'Chứa nội dung vi phạm tiêu chuẩn cộng đồng',
    'Tác giả yêu cầu thu hồi về riêng tư',
    'Có thông tin cá nhân cần bảo mật',
  ];

  // -------------------------------------------------------------
  // Fetch Pending Diaries
  // -------------------------------------------------------------
  const loadPendingDiaries = useCallback(async () => {
    setIsLoadingPending(true);
    try {
      const res = await adminDiaryService.getPendingDiaries({ limit: 50 });
      const data = res?.data || res;
      const items = data?.items || [];
      const total = data?.pagination?.total_pending ?? items.length;

      setPendingItems(items);
      setTotalPending(total);
      if (onCountChange) {
        onCountChange(total);
      }
    } catch (err) {
      console.warn('Could not load pending diaries:', err);
    } finally {
      setIsLoadingPending(false);
    }
  }, [onCountChange]);

  // -------------------------------------------------------------
  // Fetch Approved Diaries
  // -------------------------------------------------------------
  const loadApprovedDiaries = useCallback(async () => {
    setIsLoadingApproved(true);
    try {
      const res = await adminDiaryService.getApprovedDiaries({
        q: approvedSearch.trim() || undefined,
        limit: 50,
      });
      const data = res?.data || res;
      const items = data?.items || [];
      setApprovedItems(items);
      setApprovedTotal(data?.pagination?.total_items ?? items.length);
    } catch (err) {
      console.warn('Could not load approved diaries:', err);
    } finally {
      setIsLoadingApproved(false);
    }
  }, [approvedSearch]);

  useEffect(() => {
    if (segment === 0) {
      loadPendingDiaries();
    } else {
      loadApprovedDiaries();
    }
  }, [segment, loadPendingDiaries, loadApprovedDiaries]);

  // Selected item sync
  const currentItem = pendingItems[selectedPendingIdx] || null;

  useEffect(() => {
    if (currentItem) {
      const isOrigEn = currentItem.original_language === 'en';
      const rawTitle = currentItem.title || '';
      const tVi = currentItem.title_vi || (!isOrigEn ? rawTitle : '') || '';
      const tEn = currentItem.title_en || (isOrigEn ? rawTitle : '') || '';
      setTitleVi(tVi);
      setTitleEn(tEn);

      const rawContent = currentItem.content || '';
      const cVi = currentItem.content_vi || (!isOrigEn ? rawContent : '') || '';
      const cEn = currentItem.content_en || (isOrigEn ? rawContent : '') || '';
      setContentVi(cVi);
      setContentEn(cEn);
    } else {
      setTitleVi('');
      setTitleEn('');
      setContentVi('');
      setContentEn('');
    }
  }, [currentItem]);

  // -------------------------------------------------------------
  // AI Moderation Handler
  // -------------------------------------------------------------
  const handleAnalyzeWithAi = async () => {
    if (!currentItem) return;
    setIsAnalyzingAi(true);
    try {
      const fullText = [
        titleVi ? `Tiêu đề (VI): ${titleVi}` : '',
        titleEn ? `Title (EN): ${titleEn}` : '',
        contentVi ? `Nội dung (VI): ${contentVi}` : '',
        contentEn ? `Content (EN): ${contentEn}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await aiCopilotService.moderateArtwork({
        art_id: currentItem.id,
        target_room: 'diaries',
        content: fullText || contentVi || contentEn || currentItem.content || 'Nội dung nhật ký',
      });

      const data = res?.data || res;
      setAiModerationData(data);
      setAiModalOpen(true);
    } catch (err) {
      console.error('Lỗi khi phân tích AI cho nhật ký:', err);
      const errMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Không thể gọi dịch vụ AI Copilot. Vui lòng kiểm tra cấu hình Owner AI.';
      if (triggerToast) {
        triggerToast(`[AI Copilot] ${errMsg}`);
      } else {
        alert(`[AI Copilot] ${errMsg}`);
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
      if (triggerToast) {
        triggerToast(
          language === 'en'
            ? 'Applied AI Copilot suggested rewrite to editor!'
            : 'Đã cập nhật nội dung đề xuất từ AI Copilot vào khung biên tập!'
        );
      }
    }
    setAiModalOpen(false);
  };

  // -------------------------------------------------------------
  // Approve Action
  // -------------------------------------------------------------
  const handleApprove = async () => {
    if (!currentItem) return;
    setIsApproving(true);
    try {
      let payload = null;
      if (titleVi.trim() || titleEn.trim() || contentVi.trim() || contentEn.trim()) {
        payload = {
          title_vi: titleVi.trim() || currentItem.title || undefined,
          title_en: titleEn.trim() || undefined,
          content_vi: contentVi.trim() || currentItem.content || undefined,
          content_en: contentEn.trim() || undefined,
        };
      }

      await adminDiaryService.approveDiary(currentItem.id, payload);

      if (triggerToast) {
        triggerToast('✦ Trang nhật ký đã được phê duyệt công khai lên Tab Cộng đồng!');
      }

      // Optimistic update
      setPendingItems((prev) => prev.filter((it) => it.id !== currentItem.id));
      setSelectedPendingIdx(0);
      setTotalPending((prev) => Math.max(0, prev - 1));
      if (onCountChange) {
        onCountChange(Math.max(0, totalPending - 1));
      }
    } catch (err) {
      console.error('Error approving diary:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể phê duyệt trang nhật ký lúc này.';
      alert(`Lỗi phê duyệt: ${msg}`);
    } finally {
      setIsApproving(false);
    }
  };

  // -------------------------------------------------------------
  // Reject Action
  // -------------------------------------------------------------
  const handleConfirmReject = async () => {
    if (!currentItem) return;
    setIsRejecting(true);
    try {
      const finalReason = customRejectNote.trim()
        ? `[${rejectReason}] ${customRejectNote.trim()}`
        : rejectReason;

      await adminDiaryService.rejectDiary(currentItem.id, { reason: finalReason });

      if (triggerToast) {
        triggerToast('Đã từ chối chia sẻ công khai. Bài viết chuyển về trạng thái riêng tư của người dùng.');
      }

      setRejectModalOpen(false);
      setCustomRejectNote('');
      setPendingItems((prev) => prev.filter((it) => it.id !== currentItem.id));
      setSelectedPendingIdx(0);
      setTotalPending((prev) => Math.max(0, prev - 1));
      if (onCountChange) {
        onCountChange(Math.max(0, totalPending - 1));
      }
    } catch (err) {
      console.error('Error rejecting diary:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể từ chối duyệt nhật ký.';
      alert(`Lỗi: ${msg}`);
    } finally {
      setIsRejecting(false);
    }
  };

  // -------------------------------------------------------------
  // Revoke Action
  // -------------------------------------------------------------
  const handleConfirmRevoke = async () => {
    if (!revokingItem) return;
    setIsRevoking(true);
    try {
      await adminDiaryService.revokeDiary(revokingItem.id, {
        admin_reason: revokeReason,
      });

      if (triggerToast) {
        triggerToast('✦ Đã thu hồi bài viết khỏi Tab Cộng đồng và chuyển về riêng tư thành công.');
      }

      setRevokeModalOpen(false);
      setRevokingItem(null);
      loadApprovedDiaries();
    } catch (err) {
      console.error('Error revoking diary:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể thu hồi bài viết lúc này.';
      alert(`Lỗi thu hồi: ${msg}`);
    } finally {
      setIsRevoking(false);
    }
  };

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
      {/* Subtab Segment Switcher */}
      <div className="abs" style={{ left: '32px', top: '142px' }}>
        <div className="seg">
          <span
            className={segment === 0 ? 'on' : ''}
            onClick={() => setSegment(0)}
          >
            {language === 'en' ? 'Pending Community' : 'Chờ duyệt cộng đồng'} · {totalPending}
          </span>
          <span
            className={segment === 1 ? 'on' : ''}
            onClick={() => setSegment(1)}
          >
            {language === 'en' ? 'Public Diaries' : 'Đang công khai'} · {approvedTotal}
          </span>
        </div>
      </div>

      {/* SEGMENT 0: PENDING MODERATION */}
      {segment === 0 && (
        <>
          {/* Left Column: Pending List */}
          <div
            className="abs box"
            style={{
              left: '32px',
              width: '270px',
              top: '194px',
              bottom: '26px',
              overflowY: 'auto',
              padding: '14px',
            }}
          >
            <div className="row between" style={{ marginBottom: '14px', padding: '0 4px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '.05em' }}>
                {language === 'en' ? `PENDING QUEUE (${pendingItems.length})` : `HÀNG ĐỢI DUYỆT (${pendingItems.length})`}
              </span>
              {isLoadingPending && <span className="muted" style={{ fontSize: '12px' }}>{language === 'en' ? 'Loading...' : 'Đang tải...'}</span>}
            </div>

            {pendingItems.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'var(--muted)',
                  fontSize: '14px',
                }}
              >
                <Icon name="check" size={32} />
                <div style={{ marginTop: '12px', fontWeight: 500 }}>
                  {language === 'en' ? 'No pending diaries' : 'Không còn trang nhật ký nào đang chờ duyệt'}
                </div>
                <small className="muted">{language === 'en' ? 'All submitted diaries have been reviewed' : 'Toàn bộ đã được kiểm duyệt'}</small>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingItems.map((item, idx) => {
                  const isSelected = idx === selectedPendingIdx;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedPendingIdx(idx)}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(196, 75, 43, 0.08)' : 'var(--paper)',
                        border: isSelected ? '1px solid var(--acc)' : '1px solid var(--line)',
                        cursor: 'pointer',
                        transition: 'all .15s ease',
                      }}
                    >
                      <div className="row between" style={{ marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>
                          {item.title || 'Không có tiêu đề'}
                        </span>
                        {item.mood && (
                          <span className="badge" style={{ fontSize: '11px' }}>
                            {item.mood}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: '13px',
                          color: 'var(--ink)',
                          opacity: 0.85,
                          lineHeight: 1.5,
                          marginBottom: '8px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.content}
                      </div>

                      <div className="row between" style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        <span>
                          {item.author?.nickname || 'Tác giả'} (@{item.author?.username})
                        </span>
                        <span>{formatDate(item.entry_date || item.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Review Details & Bilingual Editor */}
          {currentItem ? (
            <div
              className="abs box"
              style={{
                left: '318px',
                right: '32px',
                top: '194px',
                bottom: '26px',
                overflowY: 'auto',
                padding: '24px 28px',
              }}
            >
              {/* Header Action Bar */}
              <div className="row between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '20px', alignItems: 'center' }}>
                <div className="row" style={{ gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <h2 className="serif" style={{ fontSize: '22px', margin: 0, fontWeight: 600 }}>
                    {currentItem.title || (language === 'en' ? 'Untitled' : 'Không có tiêu đề')}
                  </h2>
                  {currentItem.mood && (
                    <span className="badge b-wait" style={{ fontSize: '12px' }}>
                      {language === 'en' ? 'Mood:' : 'Tâm trạng:'} {currentItem.mood}
                    </span>
                  )}
                </div>

                <div className="row" style={{ gap: '10px' }}>
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
                    title="Phân tích kiểm duyệt và đề xuất văn phong bằng AI Copilot"
                  >
                    {isAnalyzingAi
                      ? (language === 'en' ? 'AI Analyzing...' : 'AI đang phân tích...')
                      : (language === 'en' ? 'AI Copilot' : 'Phân tích bằng AI')}
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => setRejectModalOpen(true)}
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
                    {isApproving ? 'Đang duyệt...' : 'Duyệt công khai'}
                  </button>
                </div>
              </div>

              {/* Photos Gallery if attached */}
              {currentItem.media_urls && currentItem.media_urls.length > 0 && (
                <div style={{ marginBottom: '22px' }}>
                  <div className="fieldl">Hình ảnh đính kèm ({currentItem.media_urls.length})</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {currentItem.media_urls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="Ảnh đính kèm"
                        style={{
                          width: '140px',
                          height: '110px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid var(--line)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Bilingual Title & Content Editor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <div className="fieldl">
                    {language === 'en' ? 'Title (Vietnamese)' : 'Tiêu đề Tiếng Việt (VN)'}
                  </div>
                  <input
                    className="inp"
                    value={titleVi}
                    onChange={(e) => setTitleVi(e.target.value)}
                    placeholder={language === 'en' ? 'Vietnamese title...' : 'Tiêu đề tiếng Việt...'}
                  />
                  <div className="fieldl" style={{ marginTop: '14px' }}>
                    {language === 'en' ? 'Content (Vietnamese)' : 'Nội dung Tiếng Việt (VN)'}{' '}
                    <span>{language === 'en' ? 'Editable' : 'Admin sửa được'}</span>
                  </div>
                  <textarea
                    className="inp area"
                    style={{ minHeight: '230px', fontFamily: 'var(--sans)', fontSize: '14.5px', lineHeight: 1.6 }}
                    value={contentVi}
                    onChange={(e) => setContentVi(e.target.value)}
                    placeholder={language === 'en' ? 'Vietnamese diary content...' : 'Nội dung nhật ký tiếng Việt...'}
                  />
                </div>

                <div>
                  <div className="fieldl">
                    {language === 'en' ? 'Title (English)' : 'Tiêu đề Tiếng Anh (EN)'}
                  </div>
                  <input
                    className="inp"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder={language === 'en' ? 'English title...' : 'Tiêu đề tiếng Anh...'}
                  />
                  <div className="fieldl" style={{ marginTop: '14px' }}>
                    {language === 'en' ? 'Content (English)' : 'Nội dung Tiếng Anh (EN)'}{' '}
                    <span>{language === 'en' ? 'Editable' : 'Admin sửa được'}</span>
                  </div>
                  <textarea
                    className="inp area"
                    style={{ minHeight: '230px', fontFamily: 'var(--sans)', fontSize: '14.5px', lineHeight: 1.6 }}
                    value={contentEn}
                    onChange={(e) => setContentEn(e.target.value)}
                    placeholder={language === 'en' ? 'English translated content...' : 'Nội dung nhật ký tiếng Anh...'}
                  />
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
                      Author: <b>{currentItem.author?.nickname || currentItem.author?.username || 'Anonymous'}</b>
                      {currentItem.author?.username && <> (@{currentItem.author.username})</>}
                      {' '}· Entry date: <b>{formatDate(currentItem.entry_date)}</b>
                    </>
                  ) : (
                    <>
                      Tác giả: <b>{currentItem.author?.nickname || currentItem.author?.username || 'Ẩn danh'}</b>
                      {currentItem.author?.username && <> (@{currentItem.author.username})</>}
                      {' '}· Ngày ghi: <b>{formatDate(currentItem.entry_date)}</b>
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
                top: '194px',
                bottom: '26px',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--muted)',
                fontSize: '15px',
              }}
            >
              <div>Chọn một trang nhật ký từ hàng đợi để bắt đầu kiểm duyệt</div>
            </div>
          )}
        </>
      )}

      {/* SEGMENT 1: APPROVED PUBLIC DIARIES */}
      {segment === 1 && (
        <div
          className="abs box"
          style={{
            left: '32px',
            right: '32px',
            top: '194px',
            bottom: '26px',
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          {/* Search bar */}
          <div className="row between" style={{ marginBottom: '16px' }}>
            <div className="search" style={{ maxWidth: '360px', background: 'var(--paper)' }}>
              <Icon name="search" size={17} />
              <input
                type="text"
                placeholder="Tìm nhật ký công khai theo tiêu đề, tác giả..."
                value={approvedSearch}
                onChange={(e) => setApprovedSearch(e.target.value)}
              />
            </div>
            {isLoadingApproved && <span className="muted" style={{ fontSize: '13px' }}>Đang tải...</span>}
          </div>

          <table className="at">
            <thead>
              <tr>
                <th>Tiêu đề trang nhật ký</th>
                <th>Tác giả</th>
                <th>Ngày ghi</th>
                <th>Lượt tương tác</th>
                <th>Ngày công khai</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {approvedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    Không tìm thấy bài nhật ký nào đang hiển thị trên Tab Cộng đồng
                  </td>
                </tr>
              ) : (
                approvedItems.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <b style={{ fontSize: '14.5px' }}>{it.title || 'Không có tiêu đề'}</b>
                    </td>
                    <td>
                      <span>{it.author?.nickname || 'Tác giả'}</span>{' '}
                      <small className="muted">(@{it.author?.username})</small>
                    </td>
                    <td>{formatDate(it.entry_date)}</td>
                    <td>
                      <span className="badge b-blue">
                        <Icon name="heart" size={12} /> {it.reactions_total ?? 0}
                      </span>
                    </td>
                    <td>{formatDate(it.created_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn line danger sm"
                        onClick={() => {
                          setRevokingItem(it);
                          setRevokeModalOpen(true);
                        }}
                      >
                        Thu hồi về riêng tư
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalOpen && (
        <>
          <div className="scrim" onClick={() => setRejectModalOpen(false)} />
          <div className="panel" style={{ width: '560px', boxShadow: '0 25px 70px rgba(0,0,0,0.5)' }}>
            <span className="x" onClick={() => setRejectModalOpen(false)} role="button" tabIndex={0}>
              <Icon name="x" size={22} />
            </span>

            <h2 style={{ fontSize: '24px' }}>Từ chối duyệt công khai</h2>
            <div className="sub">
              Trang nhật ký &ldquo;{currentItem?.title || 'Không có tiêu đề'}&rdquo; sẽ được chuyển về chế độ
              <b> RIÊNG TƯ</b> trong sổ cá nhân của người dùng, không bị xoá.
            </div>

            <div className="fieldl">Lý do nhanh</div>
            <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {quickRejectReasons.map((r) => (
                <span
                  key={r}
                  className={`ichip ${rejectReason === r ? 'on' : ''}`}
                  onClick={() => setRejectReason(r)}
                  style={{ cursor: 'pointer' }}
                >
                  {r}
                </span>
              ))}
            </div>

            <div className="fieldl">Lời nhắn cụ thể gửi tác giả (tùy chọn)</div>
            <textarea
              className="inp area"
              style={{ minHeight: '100px', fontSize: '14px', fontFamily: 'var(--sans)' }}
              value={customRejectNote}
              onChange={(e) => setCustomRejectNote(e.target.value)}
              placeholder="Nhập lý do hướng dẫn để tác giả chỉnh sửa..."
            />

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setRejectModalOpen(false)}
                disabled={isRejecting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn main"
                style={{ background: '#8E2A22' }}
                onClick={handleConfirmReject}
                disabled={isRejecting}
              >
                {isRejecting ? 'Đang từ chối...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* REVOKE MODAL */}
      {revokeModalOpen && (
        <>
          <div className="scrim" onClick={() => setRevokeModalOpen(false)} />
          <div className="panel" style={{ width: '560px', boxShadow: '0 25px 70px rgba(0,0,0,0.5)' }}>
            <span className="x" onClick={() => setRevokeModalOpen(false)} role="button" tabIndex={0}>
              <Icon name="x" size={22} />
            </span>

            <h2 style={{ fontSize: '24px' }}>Thu hồi bài viết về riêng tư</h2>
            <div className="sub">
              Bài viết &ldquo;{revokingItem?.title}&rdquo; sẽ lập tức biến mất khỏi Tab Cộng đồng và chuyển về trạng thái cá nhân của tác giả.
            </div>

            <div className="fieldl">Lý do thu hồi nhanh</div>
            <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {quickRevokeReasons.map((r) => (
                <span
                  key={r}
                  className={`ichip ${revokeReason === r ? 'on' : ''}`}
                  onClick={() => setRevokeReason(r)}
                  style={{ cursor: 'pointer' }}
                >
                  {r}
                </span>
              ))}
            </div>

            <div className="fieldl">Chi tiết lý do gửi tác giả</div>
            <textarea
              className="inp area"
              style={{ minHeight: '90px', fontSize: '14px', fontFamily: 'var(--sans)' }}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setRevokeModalOpen(false)}
                disabled={isRevoking}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn main"
                style={{ background: '#8E2A22' }}
                onClick={handleConfirmRevoke}
                disabled={isRevoking || !revokeReason.trim()}
              >
                {isRevoking ? 'Đang thu hồi...' : 'Xác nhận thu hồi'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* AI Moderation Analysis & Rewrite Modal */}
      <AiModerationModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        data={aiModerationData}
        onAccept={handleAcceptAiRewrite}
        originalContent={contentVi || currentItem?.content || ''}
      />
    </>
  );
}

export default AdminDiaries;

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/common/Icons';
import { adminDiaryService } from '../../services/adminDiaryService';
import { aiCopilotService } from '../../services/aiCopilotService';
import { AiModerationModal } from '../../components/Admin/AiModerationModal';
import { extractModerationFields } from '../../utils/aiModerationParser';

import { useLanguage } from '../../context/LanguageContext';

export function AdminDiaries({ onCountChange, triggerToast }) {
  const { t, language, localize } = useLanguage();
  const L = (vi, en) => (language === 'en' ? en : vi);
  const [segment, setSegment] = useState(0); // 0: Chờ phê duyệt, 1: Đang công khai

  // -------------------------------------------------------------
  // Pending State
  // -------------------------------------------------------------
  const [pendingItems, setPendingItems] = useState([]);
  const [selectedPendingIdx, setSelectedPendingIdx] = useState(0);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [totalPending, setTotalPending] = useState(0);
  const [mobileView, setMobileView] = useState('queue'); // 'queue' | 'detail' for responsive screens

  // Form fields for editing/bilingual translation
  const [titleVi, setTitleVi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [contentVi, setContentVi] = useState('');
  const [contentEn, setContentEn] = useState('');
  // Validation state: Admin is final checkpoint before public release
  const [validationErrors, setValidationErrors] = useState({});

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('Chứa thông tin liên lạc cá nhân');
  const [customRejectNote, setCustomRejectNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // AI Copilot State
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [isTranslatingAi, setIsTranslatingAi] = useState(false);
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

  // Lý do gửi tới tác giả giữ tiếng Việt, chỉ đổi nhãn hiển thị khi giao diện là tiếng Anh
  const REASON_EN = {
    'Chứa thông tin liên lạc cá nhân': 'Contains personal contact details',
    'Ngôn từ chưa phù hợp': 'Inappropriate language',
    'Nội dung quá ngắn': 'Too short',
    'Không phù hợp không gian cộng đồng': 'Not suitable for the community space',
    'Nhận được nhiều báo cáo phản cảm từ người đọc': 'Reported as offensive by many readers',
    'Chứa nội dung vi phạm tiêu chuẩn cộng đồng': 'Breaks community guidelines',
    'Tác giả yêu cầu thu hồi về riêng tư': 'The author asked to make it private',
    'Có thông tin cá nhân cần bảo mật': 'Contains private information',
  };

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
      setValidationErrors({});
    } else {
      setTitleVi('');
      setTitleEn('');
      setContentVi('');
      setContentEn('');
      setValidationErrors({});
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
        L('Chưa gọi được trợ lý AI. Hãy nhờ Chủ sở hữu kiểm tra phần cấu hình AI.', 'AI is not available. Ask the owner to check the AI settings.');
      if (triggerToast) {
        triggerToast(`[AI Copilot] ${errMsg}`);
      } else {
        alert(`[AI Copilot] ${errMsg}`);
      }
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleTranslateWithAi = async () => {
    if (!currentItem) return;
    setIsTranslatingAi(true);
    const sourceLang = currentItem.original_language === 'en' ? 'en' : 'vi';
    const targetLang = sourceLang === 'en' ? 'vi' : 'en';

    const sourcePayload = sourceLang === 'en'
      ? { title: titleEn, content: contentEn }
      : { title: titleVi, content: contentVi };

    const hasSource = Object.values(sourcePayload).some((v) => v && v.trim());
    if (!hasSource) {
      const emptyMsg = language === 'en'
        ? 'Please enter content before translating.'
        : 'Vui lòng nhập nội dung trước khi bấm dịch AI.';
      if (triggerToast) triggerToast(emptyMsg);
      else alert(emptyMsg);
      setIsTranslatingAi(false);
      return;
    }

    try {
      const res = await aiCopilotService.translateContent({
        source_lang: sourceLang,
        target_lang: targetLang,
        ...sourcePayload,
      });
      const data = res?.data || res;

      if (targetLang === 'en') {
        if (data.title) setTitleEn(data.title);
        if (data.content) setContentEn(data.content);
        setValidationErrors((prev) => {
          const next = { ...prev };
          if (data.title) delete next.titleEn;
          if (data.content) delete next.contentEn;
          return next;
        });
      } else {
        if (data.title) setTitleVi(data.title);
        if (data.content) setContentVi(data.content);
        setValidationErrors((prev) => {
          const next = { ...prev };
          if (data.title) delete next.titleVi;
          if (data.content) delete next.contentVi;
          return next;
        });
      }

      const successMsg = language === 'en'
        ? '✦ Translated successfully, please review'
        : '✦ Dịch thành công, vui lòng xem lại';
      if (triggerToast) {
        triggerToast(successMsg);
      }
    } catch (err) {
      console.error('Lỗi khi dịch AI:', err);
      const errMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        (language === 'en' ? 'Translation failed.' : 'Dịch không thành công.');
      const fullError = language === 'en'
        ? `Translation failed: ${errMsg}`
        : `Dịch không thành công: ${errMsg}`;
      if (triggerToast) {
        triggerToast(fullError);
      } else {
        alert(fullError);
      }
    } finally {
      setIsTranslatingAi(false);
    }
  };

  const handleAcceptAiRewrite = (suggestedCleanContent, moderationData) => {
    const rawText = suggestedCleanContent || moderationData?.suggested_content || aiModerationData?.suggested_content || '';
    if (!rawText && !moderationData && !aiModerationData) {
      setAiModalOpen(false);
      return;
    }

    const isOrigEn = currentItem?.original_language === 'en';
    const fields = extractModerationFields(rawText, moderationData || aiModerationData, isOrigEn);

    // Apply title if parsed
    if (fields.titleVi) setTitleVi(fields.titleVi);
    if (fields.titleEn) setTitleEn(fields.titleEn);

    // Apply content
    if (fields.contentVi) setContentVi(fields.contentVi);
    if (fields.contentEn) setContentEn(fields.contentEn);

    // Clean up corresponding validation errors
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (fields.titleVi) delete next.titleVi;
      if (fields.titleEn) delete next.titleEn;
      if (fields.contentVi) delete next.contentVi;
      if (fields.contentEn) delete next.contentEn;
      return next;
    });

    if (triggerToast) {
      triggerToast(
        language === 'en'
          ? '✦ Applied AI suggestions into form fields!'
          : '✦ Đã cập nhật đề xuất AI vào từng ô nội dung!'
      );
    }
    setAiModalOpen(false);
  };

  // -------------------------------------------------------------
  // Approve Action
  // -------------------------------------------------------------
  const handleApprove = async () => {
    if (!currentItem) return;

    // Strict validation: Admin is the final quality checkpoint before public community release
    const errors = {};
    if (!titleVi.trim()) {
      errors.titleVi = language === 'en' ? 'Vietnamese title is required.' : 'Tiêu đề Tiếng Việt không được để trống.';
    }
    if (!titleEn.trim()) {
      errors.titleEn = language === 'en' ? 'English title is required.' : 'Tiêu đề Tiếng Anh không được để trống.';
    }
    if (!contentVi.trim()) {
      errors.contentVi = language === 'en' ? 'Vietnamese content is required.' : 'Nội dung Tiếng Việt không được để trống.';
    }
    if (!contentEn.trim()) {
      errors.contentEn = language === 'en' ? 'English content is required.' : 'Nội dung Tiếng Anh không được để trống.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const totalMissing = Object.keys(errors).length;
      const reqMsg = language === 'en'
        ? `⚠️ Missing ${totalMissing} required field(s). Admin is the final checkpoint before public publication. Please complete all fields marked with (*). You can click "AI Translate" to auto-fill English.`
        : `⚠️ Còn ${totalMissing} ô thông tin bắt buộc bị để trống. Ban quản trị là nơi kiểm duyệt cuối cùng trước khi public. Vui lòng điền đủ các ô có dấu (*). Bạn có thể bấm "Dịch AI" để tự động hoàn thiện tiếng Anh.`;
      if (triggerToast) {
        triggerToast(reqMsg);
      } else {
        alert(reqMsg);
      }
      return;
    }

    setValidationErrors({});
    setIsApproving(true);
    try {
      const payload = {
        title_vi: titleVi.trim(),
        title_en: titleEn.trim(),
        content_vi: contentVi.trim(),
        content_en: contentEn.trim(),
      };

      await adminDiaryService.approveDiary(currentItem.id, payload);

      if (triggerToast) {
        triggerToast(L('✦ Đã duyệt, trang nhật ký đang hiện ở mục Cộng đồng.', '✦ Approved. The entry is now in Community.'));
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
      const msg = err?.response?.data?.message || err?.message || L('Không thể duyệt trang nhật ký lúc này.', 'Could not approve this entry right now.');
      alert(msg);
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
        triggerToast(L('Đã từ chối. Bài viết trở về chế độ riêng tư của tác giả.', 'Declined. The entry is private to its author again.'));
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
      const msg = err?.response?.data?.message || err?.message || L('Không thể từ chối trang nhật ký này.', 'Could not decline this entry.');
      alert(msg);
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
        triggerToast(L('✦ Đã thu hồi, bài viết trở về chế độ riêng tư.', '✦ Withdrawn. The entry is private again.'));
      }

      setRevokeModalOpen(false);
      setRevokingItem(null);
      loadApprovedDiaries();
    } catch (err) {
      console.error('Error revoking diary:', err);
      const msg = err?.response?.data?.message || err?.message || L('Không thể thu hồi bài viết lúc này.', 'Could not withdraw this entry right now.');
      alert(msg);
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
            {language === 'en' ? 'Pending Community' : 'Chờ duyệt cộng đồng'}
          </span>
          <span
            className={segment === 1 ? 'on' : ''}
            onClick={() => setSegment(1)}
          >
            {language === 'en' ? 'Public Diaries' : 'Đang công khai'}
          </span>
        </div>
      </div>

      {/* SEGMENT 0: PENDING MODERATION */}
      {segment === 0 && (
        <>
          {/* Left Column: Pending List */}
          <div
            className={`abs box admin-queue-col ${mobileView === 'detail' ? 'mobile-hidden' : ''}`}
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
                      onClick={() => {
                        setSelectedPendingIdx(idx);
                        setMobileView('detail');
                      }}
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
                          {item.title || L('Không có tiêu đề', 'Untitled')}
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
                          {item.author?.nickname || L('Tác giả', 'Author')} (@{item.author?.username})
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
              className={`abs box admin-detail-col ${mobileView === 'queue' ? 'mobile-hidden' : ''}`}
              style={{
                left: '318px',
                right: '32px',
                top: '194px',
                bottom: '26px',
                overflowY: 'auto',
                padding: '24px 28px',
              }}
            >
              {/* Mobile Back to Queue Button */}
              <div className="mobile-only-header" style={{ marginBottom: '14px' }}>
                <button
                  type="button"
                  className="btn line sm"
                  onClick={() => setMobileView('queue')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  ← {language === 'en' ? 'Back to queue' : 'Quay lại danh sách chờ'}
                </button>
              </div>
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
                    title={L('Nhờ AI xem bài và gợi ý cách viết', 'Ask AI to review and suggest wording')}
                  >
                    {isAnalyzingAi
                      ? (language === 'en' ? 'AI Analyzing...' : 'AI đang phân tích...')
                      : (language === 'en' ? 'AI Copilot' : 'Phân tích bằng AI')}
                  </button>
                  <button
                    type="button"
                    className="btn line"
                    onClick={handleTranslateWithAi}
                    disabled={isAnalyzingAi || isTranslatingAi || isApproving}
                    style={{
                      borderColor: '#0284c7',
                      color: '#0369a1',
                      fontWeight: 600,
                      background: isTranslatingAi ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                    }}
                    title={language === 'en' ? 'Translate to English using AI' : 'Dịch sang tiếng Anh bằng AI'}
                  >
                    {isTranslatingAi
                      ? (language === 'en' ? 'AI Translating...' : 'AI đang dịch...')
                      : (language === 'en' ? '✦ Translate to EN with AI' : '✦ Dịch sang tiếng Anh bằng AI')}
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => setRejectModalOpen(true)}
                    disabled={isApproving}
                  >
                    <Icon name="x" size={16} /> {L('Từ chối', 'Decline')}
                  </button>
                  <button
                    type="button"
                    className="btn main"
                    onClick={handleApprove}
                    disabled={isApproving}
                  >
                    <Icon name="check" size={16} />{' '}
                    {isApproving ? L('Đang duyệt...', 'Approving...') : L('Duyệt công khai', 'Approve')}
                  </button>
                </div>
              </div>

              {/* Photos Gallery if attached */}
              {currentItem.media_urls && currentItem.media_urls.length > 0 && (
                <div style={{ marginBottom: '22px' }}>
                  <div className="fieldl">{L('Hình ảnh đính kèm', 'Attached images')}</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {currentItem.media_urls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={L('Ảnh đính kèm', 'Attached image')}
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

              {/* Validation Warning Banner if required fields are missing */}
              {Object.values(validationErrors).some(Boolean) && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid #ef4444',
                    color: '#b91c1c',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Icon name="x" size={18} />
                  <div>
                    <strong>
                      {language === 'en'
                        ? '⚠️ Missing required fields:'
                        : '⚠️ Ban quản trị phải điền đầy đủ các ô còn thiếu trước khi công khai:'}
                    </strong>
                    <span style={{ marginLeft: '6px' }}>
                      {language === 'en'
                        ? 'All fields marked with (*) are required. You can click "AI Translate" to quickly complete English.'
                        : 'Tất cả các ô có dấu (*) không được để trống. Hãy bấm "Dịch AI" để tự động hoàn thiện tiếng Anh.'}
                    </span>
                  </div>
                </div>
              )}
              {/* Bilingual Title & Content Editor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <div className="fieldl">
                    {language === 'en' ? 'Title (Vietnamese)' : 'Tiêu đề Tiếng Việt (VN)'}{' '}
                    <span style={{ color: '#ef4444' }}>*</span>
                  </div>
                  <input
                    className="inp"
                    style={{
                      borderColor: validationErrors.titleVi ? '#ef4444' : undefined,
                    }}
                    value={titleVi}
                    onChange={(e) => {
                      setTitleVi(e.target.value);
                      if (validationErrors.titleVi) {
                        setValidationErrors((prev) => {
                          const next = { ...prev };
                          delete next.titleVi;
                          return next;
                        });
                      }
                    }}
                    placeholder={language === 'en' ? 'Vietnamese title...' : 'Tiêu đề tiếng Việt...'}
                  />
                  {validationErrors.titleVi && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.titleVi}
                    </div>
                  )}

                  <div className="fieldl" style={{ marginTop: '14px' }}>
                    {language === 'en' ? 'Content (Vietnamese)' : 'Nội dung Tiếng Việt (VN)'}{' '}
                    <span style={{ color: '#ef4444' }}>*</span> <span>{language === 'en' ? 'Editable' : 'Quản trị viên sửa được'}</span>
                  </div>
                  <textarea
                    className="inp area"
                    style={{
                      minHeight: '230px',
                      fontFamily: 'var(--sans)',
                      fontSize: '14.5px',
                      lineHeight: 1.6,
                      borderColor: validationErrors.contentVi ? '#ef4444' : undefined,
                    }}
                    value={contentVi}
                    onChange={(e) => {
                      setContentVi(e.target.value);
                      if (validationErrors.contentVi) {
                        setValidationErrors((prev) => {
                          const next = { ...prev };
                          delete next.contentVi;
                          return next;
                        });
                      }
                    }}
                    placeholder={language === 'en' ? 'Vietnamese diary content...' : 'Nội dung nhật ký tiếng Việt...'}
                  />
                  {validationErrors.contentVi && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.contentVi}
                    </div>
                  )}
                </div>

                <div>
                  <div className="fieldl">
                    {language === 'en' ? 'Title (English)' : 'Tiêu đề Tiếng Anh (EN)'}{' '}
                    <span style={{ color: '#ef4444' }}>*</span>
                  </div>
                  <input
                    className="inp"
                    style={{
                      borderColor: validationErrors.titleEn ? '#ef4444' : undefined,
                    }}
                    value={titleEn}
                    onChange={(e) => {
                      setTitleEn(e.target.value);
                      if (validationErrors.titleEn) {
                        setValidationErrors((prev) => {
                          const next = { ...prev };
                          delete next.titleEn;
                          return next;
                        });
                      }
                    }}
                    placeholder={language === 'en' ? 'English title...' : 'Tiêu đề tiếng Anh...'}
                  />
                  {validationErrors.titleEn && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.titleEn}
                    </div>
                  )}

                  <div className="fieldl" style={{ marginTop: '14px' }}>
                    {language === 'en' ? 'Content (English)' : 'Nội dung Tiếng Anh (EN)'}{' '}
                    <span style={{ color: '#ef4444' }}>*</span> <span>{language === 'en' ? 'Editable' : 'Quản trị viên sửa được'}</span>
                  </div>
                  <textarea
                    className="inp area"
                    style={{
                      minHeight: '230px',
                      fontFamily: 'var(--sans)',
                      fontSize: '14.5px',
                      lineHeight: 1.6,
                      borderColor: validationErrors.contentEn ? '#ef4444' : undefined,
                    }}
                    value={contentEn}
                    onChange={(e) => {
                      setContentEn(e.target.value);
                      if (validationErrors.contentEn) {
                        setValidationErrors((prev) => {
                          const next = { ...prev };
                          delete next.contentEn;
                          return next;
                        });
                      }
                    }}
                    placeholder={language === 'en' ? 'English translated content...' : 'Nội dung nhật ký tiếng Anh...'}
                  />
                  {validationErrors.contentEn && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.contentEn}
                    </div>
                  )}
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
              <div>{L('Chọn một trang nhật ký trong danh sách để bắt đầu duyệt', 'Pick an entry from the list to start reviewing')}</div>
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
                placeholder={L('Tìm theo tiêu đề hoặc tác giả...', 'Search by title or author...')}
                value={approvedSearch}
                onChange={(e) => setApprovedSearch(e.target.value)}
              />
            </div>
            {isLoadingApproved && <span className="muted" style={{ fontSize: '13px' }}>{L('Đang tải...', 'Loading...')}</span>}
          </div>

          <table className="at">
            <thead>
              <tr>
                <th>{L('Tiêu đề', 'Title')}</th>
                <th>{L('Tác giả', 'Author')}</th>
                <th>{L('Ngày ghi', 'Entry date')}</th>
                <th>{L('Lượt tương tác', 'Reactions')}</th>
                <th>{L('Ngày công khai', 'Published')}</th>
                <th style={{ textAlign: 'right' }}>{L('Thao tác', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {approvedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    {L('Chưa có trang nhật ký nào đang công khai', 'No public entries yet')}
                  </td>
                </tr>
              ) : (
                approvedItems.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <b style={{ fontSize: '14.5px' }}>{it.title || L('Không có tiêu đề', 'Untitled')}</b>
                    </td>
                    <td>
                      <span>{it.author?.nickname || L('Tác giả', 'Author')}</span>{' '}
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
                        {L('Thu hồi về riêng tư', 'Make private')}
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

            <h2 style={{ fontSize: '24px' }}>{L('Từ chối duyệt công khai', 'Decline this entry')}</h2>
            <div className="sub">
              {L(
                `Trang nhật ký “${currentItem?.title || 'Không có tiêu đề'}” sẽ trở về chế độ riêng tư trong sổ của tác giả, không bị xoá.`,
                `“${currentItem?.title || 'Untitled'}” goes back to the author's private diary. Nothing is deleted.`
              )}
            </div>

            <div className="fieldl">{L('Lý do', 'Reason')}</div>
            <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {quickRejectReasons.map((r) => (
                <span
                  key={r}
                  className={`ichip ${rejectReason === r ? 'on' : ''}`}
                  onClick={() => setRejectReason(r)}
                  style={{ cursor: 'pointer' }}
                >
                  {L(r, REASON_EN[r] || r)}
                </span>
              ))}
            </div>

            <div className="fieldl">{L('Lời nhắn gửi tác giả (không bắt buộc)', 'Note to the author (optional)')}</div>
            <textarea
              className="inp area"
              style={{ minHeight: '100px', fontSize: '14px', fontFamily: 'var(--sans)' }}
              value={customRejectNote}
              onChange={(e) => setCustomRejectNote(e.target.value)}
              placeholder={L('Gợi ý để tác giả chỉnh sửa...', 'Tips for the author to revise...')}
            />

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setRejectModalOpen(false)}
                disabled={isRejecting}
              >
                {L('Hủy', 'Cancel')}
              </button>
              <button
                type="button"
                className="btn main"
                style={{ background: '#8E2A22' }}
                onClick={handleConfirmReject}
                disabled={isRejecting}
              >
                {isRejecting ? L('Đang từ chối...', 'Declining...') : L('Xác nhận từ chối', 'Decline')}
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

            <h2 style={{ fontSize: '24px' }}>{L('Thu hồi về riêng tư', 'Make this entry private')}</h2>
            <div className="sub">
              {L(`“${revokingItem?.title}” sẽ rời khỏi mục Cộng đồng và trở về chế độ riêng tư của tác giả.`, `“${revokingItem?.title}” leaves Community and becomes private to its author.`)}
            </div>

            <div className="fieldl">{L('Lý do', 'Reason')}</div>
            <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {quickRevokeReasons.map((r) => (
                <span
                  key={r}
                  className={`ichip ${revokeReason === r ? 'on' : ''}`}
                  onClick={() => setRevokeReason(r)}
                  style={{ cursor: 'pointer' }}
                >
                  {L(r, REASON_EN[r] || r)}
                </span>
              ))}
            </div>

            <div className="fieldl">{L('Lời nhắn gửi tác giả', 'Note to the author')}</div>
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
                {L('Hủy', 'Cancel')}
              </button>
              <button
                type="button"
                className="btn main"
                style={{ background: '#8E2A22' }}
                onClick={handleConfirmRevoke}
                disabled={isRevoking || !revokeReason.trim()}
              >
                {isRevoking ? L('Đang thu hồi...', 'Withdrawing...') : L('Xác nhận thu hồi', 'Make private')}
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

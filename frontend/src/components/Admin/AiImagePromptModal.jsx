import React, { useEffect, useState } from 'react';
import { aiCopilotService } from '../../services/aiCopilotService';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Luồng tạo ảnh bằng AI 2 bước (Human-in-the-loop):
 *  Bước 1 – "Nội dung chi tiết": tiêu đề / tóm tắt / nội dung (VI + EN) để Admin/Owner chỉnh sửa.
 *  Bước 2 – "Xác nhận nội dung ảnh": prompt hoàn chỉnh do AI soạn (chỉ thêm từ đệm, không bịa chi tiết),
 *           Admin/Owner có thể chỉnh sửa, sau đó:
 *             • Copy  → sao chép prompt hiện tại (đã sửa hoặc nguyên gốc) để tự tạo bằng Gemini cá nhân.
 *             • Tạo ảnh bằng AI → gọi API sinh ảnh do Owner cấu hình với đúng prompt đã xác nhận.
 */

const FIELD_DEFS = [
  { key: 'title', labelVi: 'Tiêu đề', labelEn: 'Title', multiline: false },
  { key: 'short_content', labelVi: 'Tóm tắt', labelEn: 'Summary', multiline: true, rows: 2 },
  { key: 'content', labelVi: 'Nội dung', labelEn: 'Content', multiline: true, rows: 5 },
];

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy copy
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

export function AiImagePromptModal({ isOpen, onClose, artId, roomId, initialFields, onImageGenerated, triggerToast }) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const notify = (msg) => (triggerToast ? triggerToast(msg) : window.alert(msg));

  const [step, setStep] = useState(1);
  const [fields, setFields] = useState({});
  const [isBuilding, setIsBuilding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptData, setPromptData] = useState(null);
  const [prompts, setPrompts] = useState({ vi: '', en: '' });
  const [activeLang, setActiveLang] = useState('vi');
  const [copied, setCopied] = useState(false);

  // Reset mỗi lần mở modal với nội dung gốc mới nhất từ form duyệt bài
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setFields({ ...initialFields });
    setPromptData(null);
    setPrompts({ vi: '', en: '' });
    setActiveLang(isEn ? 'en' : 'vi');
    setCopied(false);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const busy = isBuilding || isGenerating;
  const setField = (k, v) => setFields((prev) => ({ ...prev, [k]: v }));
  const hasAnyField = Object.values(fields).some((v) => v && String(v).trim());
  const currentPrompt = prompts[activeLang] || '';
  const isEdited = promptData && currentPrompt !== (activeLang === 'vi' ? promptData.prompt_vi : promptData.prompt_en);

  const errMsgOf = (err, fallback) =>
    err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback;

  const handleBuildPrompt = async () => {
    if (!hasAnyField) {
      notify(isEn ? 'Please fill in a title or content first.' : 'Vui lòng nhập tiêu đề hoặc nội dung trước.');
      return;
    }
    setIsBuilding(true);
    try {
      const res = await aiCopilotService.buildImagePrompt({
        art_id: String(artId || 'draft'),
        target_room: `room${roomId}`,
        ...fields,
      });
      const data = res?.data || res;
      setPromptData(data);
      setPrompts({ vi: data.prompt_vi || '', en: data.prompt_en || '' });
      setStep(2);
    } catch (err) {
      notify(`${isEn ? 'Could not build prompt' : 'Không soạn được prompt'}: ${errMsgOf(err, '')}`);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleCopy = async () => {
    if (!currentPrompt.trim()) return;
    const ok = await copyToClipboard(currentPrompt);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      notify(isEn ? '✦ Prompt copied – paste it into your Gemini.' : '✦ Đã sao chép prompt – dán vào Gemini cá nhân để tạo ảnh.');
    } else {
      notify(isEn ? 'Copy failed, please select and copy manually.' : 'Không sao chép được, vui lòng bôi đen và copy thủ công.');
    }
  };

  const handleGenerate = async () => {
    if (!currentPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await aiCopilotService.generateArtImage({
        art_id: String(artId || 'draft'),
        final_prompt: currentPrompt.trim(),
      });
      const data = res?.data || res;
      if (data?.image_url) {
        onImageGenerated && onImageGenerated(data.image_url);
        notify(
          data.is_fallback_art
            ? (isEn
              ? 'Image API failed – a placeholder illustration was used. You can copy the prompt and use Gemini instead.'
              : 'API sinh ảnh lỗi – đang dùng ảnh minh họa tạm. Bạn có thể Copy prompt và tự tạo bằng Gemini.')
            : (isEn ? '✦ AI image generated successfully.' : '✦ Đã tạo ảnh bằng AI thành công.')
        );
        onClose();
      }
    } catch (err) {
      notify(`[AI Image] ${errMsgOf(err, isEn ? 'Image generation failed.' : 'Tạo ảnh không thành công.')}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const sectionLabel = { fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' };
  const accentBtn = {
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
  };
  const tabBtn = (active) => ({
    padding: '5px 14px',
    fontSize: '13px',
    borderRadius: '999px',
    cursor: 'pointer',
    border: `1px solid ${active ? '#8b5cf6' : 'var(--line)'}`,
    background: active ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
    color: active ? '#6d28d9' : 'var(--ink)',
    fontWeight: active ? 700 : 500,
  });

  return (
    <>
      <div className="scrim" onClick={busy ? undefined : onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
      <div
        className="panel"
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '760px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
          zIndex: 1001,
          boxShadow: '0 25px 70px rgba(0,0,0,0.6)',
          borderRadius: '16px',
          padding: '24px 28px',
        }}
      >
        {!busy && (
          <span className="x" onClick={onClose} role="button" tabIndex={0}>&times;</span>
        )}

        {/* Header */}
        <div style={{ marginBottom: '14px', flexShrink: 0, paddingRight: '28px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '.2em', fontWeight: 600, color: 'var(--acc)', textTransform: 'uppercase', marginBottom: '4px' }}>
            {isEn ? `AI IMAGE · STEP ${step}/2` : `TẠO ẢNH BẰNG AI · BƯỚC ${step}/2`}
          </div>
          <h2 className="serif" style={{ fontSize: '24px', margin: 0, fontWeight: 600 }}>
            {step === 1
              ? (isEn ? 'Detailed content for the image' : 'Nội dung chi tiết cần tạo ảnh')
              : (isEn ? 'Confirm image content' : 'Xác nhận nội dung ảnh cần tạo')}
          </h2>
          <div className="muted" style={{ fontSize: '13px', marginTop: '6px', lineHeight: 1.5 }}>
            {step === 1
              ? (isEn
                ? 'Edit the content below. AI will only rearrange it and add connecting words into a complete prompt – no new details are invented.'
                : 'Chỉnh sửa nội dung bên dưới. AI chỉ sắp xếp lại và thêm từ đệm để thành một câu prompt hoàn chỉnh – không bịa thêm chi tiết.')
              : (isEn
                ? 'You can still edit the prompt. Copy it to use your own Gemini, or generate directly with the configured image API.'
                : 'Bạn vẫn có thể chỉnh sửa prompt. Bấm Copy để tự tạo bằng Gemini cá nhân, hoặc Tạo ảnh bằng AI để gọi API sinh ảnh.')}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
          {step === 1 && FIELD_DEFS.map((def) => (
            <div key={def.key} style={{ marginBottom: '14px' }}>
              <div style={sectionLabel}>{isEn ? def.labelEn : def.labelVi}</div>
              <div className="ai-modal-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {['vi', 'en'].map((lng) => {
                  const k = `${def.key}_${lng}`;
                  const common = {
                    className: 'inp',
                    value: fields[k] || '',
                    onChange: (e) => setField(k, e.target.value),
                    placeholder: lng === 'vi' ? 'Tiếng Việt' : 'English',
                    disabled: busy,
                    style: { width: '100%', boxSizing: 'border-box', resize: 'vertical' },
                  };
                  return (
                    <div key={k}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '3px' }}>{lng === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</div>
                      {def.multiline ? <textarea rows={def.rows} {...common} /> : <input type="text" {...common} />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {step === 2 && promptData && (
            <>
              <div
                style={{
                  fontSize: '13px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  lineHeight: 1.5,
                  background: promptData.is_template_fallback ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  border: `1px solid ${promptData.is_template_fallback ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                  color: 'var(--ink)',
                }}
              >
                {promptData.is_template_fallback
                  ? (isEn
                    ? 'ⓘ AI text service is unavailable – the prompt was assembled from a fixed template using only your content.'
                    : 'ⓘ Dịch vụ AI văn bản chưa sẵn sàng – prompt được ghép từ mẫu cố định, chỉ dùng đúng nội dung của bạn.')
                  : (isEn
                    ? `✓ Prompt drafted by ${promptData.model_used} (strict no-hallucination).`
                    : `✓ Prompt được soạn bởi ${promptData.model_used} (không bịa thêm chi tiết).`)}
              </div>

              <div className="row" style={{ gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ ...sectionLabel, marginBottom: 0 }}>{isEn ? 'Prompt language' : 'Ngôn ngữ prompt'}</span>
                <button type="button" style={tabBtn(activeLang === 'vi')} onClick={() => setActiveLang('vi')}>Tiếng Việt</button>
                <button type="button" style={tabBtn(activeLang === 'en')} onClick={() => setActiveLang('en')}>English</button>
                {isEdited && (
                  <button
                    type="button"
                    className="btn line sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setPrompts((p) => ({ ...p, [activeLang]: activeLang === 'vi' ? promptData.prompt_vi : promptData.prompt_en }))}
                  >
                    {isEn ? '↺ Restore original' : '↺ Khôi phục bản gốc'}
                  </button>
                )}
              </div>
              <textarea
                className="inp"
                rows={9}
                value={currentPrompt}
                disabled={isGenerating}
                onChange={(e) => setPrompts((p) => ({ ...p, [activeLang]: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6, fontSize: '14px' }}
              />
              <div className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>
                {currentPrompt.length} {isEn ? 'characters' : 'ký tự'}
                {isEdited ? (isEn ? ' · edited' : ' · đã chỉnh sửa') : ''}
                {activeLang === 'vi' && (isEn ? ' · Tip: image APIs (FLUX/DALL·E) work best with the English prompt.' : ' · Mẹo: API sinh ảnh (FLUX/DALL·E) cho kết quả tốt nhất với prompt tiếng Anh.')}
              </div>

              {!promptData.image_gen_available && (
                <div
                  style={{
                    fontSize: '13px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    marginTop: '12px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--ink)',
                    lineHeight: 1.5,
                  }}
                >
                  {isEn
                    ? 'Image generation API is not available. Use “Copy” and create the image with your personal Gemini.'
                    : 'API tạo ảnh chưa sẵn sàng. Hãy bấm “Copy” và tự tạo ảnh bằng Gemini cá nhân.'}
                  {promptData.image_gen_unavailable_reason && (
                    <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>{promptData.image_gen_unavailable_reason}</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: '10px',
            borderTop: '1px solid var(--line, #3b4259)',
            paddingTop: '16px',
            marginTop: '12px',
            flexShrink: 0,
          }}
        >
          {step === 1 ? (
            <>
              <button type="button" className="btn line" onClick={onClose} disabled={busy} style={{ padding: '8px 18px', fontSize: '14px' }}>
                {isEn ? 'Cancel' : 'Hủy'}
              </button>
              <button type="button" className="btn main" onClick={handleBuildPrompt} disabled={busy || !hasAnyField} style={accentBtn}>
                {isBuilding ? (isEn ? 'Building prompt...' : 'Đang soạn prompt...') : (isEn ? 'Continue → Build prompt' : 'Tiếp tục → Soạn prompt')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn line" onClick={() => setStep(1)} disabled={busy} style={{ padding: '8px 18px', fontSize: '14px', marginRight: 'auto' }}>
                {isEn ? '← Back' : '← Quay lại'}
              </button>
              <button type="button" className="btn line" onClick={handleCopy} disabled={busy || !currentPrompt.trim()} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 600 }}>
                {copied ? (isEn ? '✓ Copied' : '✓ Đã copy') : (isEn ? '⧉ Copy' : '⧉ Copy')}
              </button>
              <button
                type="button"
                className="btn main"
                onClick={handleGenerate}
                disabled={busy || !currentPrompt.trim() || !promptData?.image_gen_available}
                title={!promptData?.image_gen_available ? (promptData?.image_gen_unavailable_reason || '') : ''}
                style={{ ...accentBtn, opacity: promptData?.image_gen_available ? 1 : 0.5 }}
              >
                {isGenerating ? (isEn ? 'Generating...' : 'Đang tạo ảnh...') : (isEn ? 'Generate image with AI' : 'Tạo ảnh bằng AI')}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default AiImagePromptModal;


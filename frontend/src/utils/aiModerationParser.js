/**
 * Utility helper to parse structured sections from AI Moderation suggested content.
 * 
 * When AI Copilot moderates an artwork, the input sent often combines multiple labeled fields:
 * - Tiêu đề (VI) / Title (EN)
 * - Tóm tắt (VI) / Short Content (EN)
 * - Nội dung (VI) / Content (EN)
 * 
 * The LLM's suggested_content often preserves these section labels:
 * "Tiêu đề: ...\nTóm tắt: ...\nNội dung: ..."
 * 
 * This parser cleanly extracts each individual section so Admin form inputs
 * (Title, Short Content / Summary, Detailed Content) receive their respective
 * clean texts instead of dumping all labels into the content body.
 */

export function parseModerationSections(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {};
  }

  // Header patterns ordered from specific to generic
  const labelPatterns = [
    // 1. Explicit Vietnamese headers with language tag
    { key: 'title_vi', regex: /^\s*(?:#+\s*)?(?:\*\*)?(?:tiêu\s*đề|tên\s*tác\s*phẩm)\s*\(\s*(?:vi|tiếng\s*việt)\s*\)(?:\*\*)?\s*[:：]\s*(.*)$/i },
    { key: 'title_en', regex: /^\s*(?:#+\s*)?(?:\*\*)?(?:title|tiêu\s*đề)\s*\(\s*(?:en|english|tiếng\s*anh)\s*\)(?:\*\*)?\s*[:：]\s*(.*)$/i },
    { key: 'short_content_vi', regex: /^\s*(?:#+\s*)?(?:\*\*)?(?:tóm\s*tắt(?:\s*nội\s*dung)?|short\s*content|summary)\s*\(\s*(?:vi|tiếng\s*việt)\s*\)(?:\*\*)?\s*[:：]\s*(.*)$/i },
    { key: 'short_content_en', regex: /^\s*(?:#+\s*)?(?:\*\*)?(?:short\s*content|summary|tóm\s*tắt)\s*\(\s*(?:en|english|tiếng\s*anh)\s*\)(?:\*\*)?\s*[:：]\s*(.*)$/i },
    { key: 'content_vi', regex: /^\s*(?:#+\s*)?(?:\*\*)?(?:nội\s*dung(?:\s*chi\s*tiết|\s*bài\s*viết)?|content)\s*\(\s*(?:vi|tiếng\s*việt)\s*\)(?:\*\*)?\s*[:：]\s*(.*)$/i },
    { key: 'content_en', regex: /^\s*(?:#+\s*)?(?:\*\*)?(?:content|story|body|nội\s*dung)\s*\(\s*(?:en|english|tiếng\s*anh)\s*\)(?:\*\*)?\s*[:：]\s*(.*)$/i },

    // 2. Language-indicative headers without parentheses
    { key: 'title_gen_vi', regex: /^\s*(?:#+\s*)?(?:\*\*)?(?:tiêu\s*đề|tên\s*tác\s*phẩm)(?:\*\*)?\s*[:：]\s*(.*)$/i },
    { key: 'title_gen_en', regex: /^\s*(?:#+\s*)?(?:\*\*)?(?:title)(?:\*\*)?\s*[:：]\s*(.*)$/i },
    { key: 'short_gen_vi', regex: /^\s*(?:#+\s*)?(?:\*\*)?(?:tóm\s*tắt(?:\s*nội\s*dung)?)(?:\*\*)?\s*[:：]\s*(.*)$/i },
    { key: 'short_gen_en', regex: /^\s*(?:#+\s*)?(?:\*\*)?(?:short\s*content|summary)(?:\*\*)?\s*[:：]\s*(.*)$/i },
    { key: 'content_gen_vi', regex: /^\s*(?:#+\s*)?(?:\*\*)?(?:nội\s*dung(?:\s*chi\s*tiết|\s*bài\s*viết)?)(?:\*\*)?\s*[:：]\s*(.*)$/i },
    { key: 'content_gen_en', regex: /^\s*(?:#+\s*)?(?:\*\*)?(?:content|story|body)(?:\*\*)?\s*[:：]\s*(.*)$/i },
  ];

  const lines = rawText.split(/\r?\n/);
  let currentKey = null;
  const collected = {};

  for (const line of lines) {
    let matched = false;
    for (const { key, regex } of labelPatterns) {
      const match = line.match(regex);
      if (match) {
        currentKey = key;
        const val = match[1] ? match[1].trim() : '';
        if (!collected[currentKey]) collected[currentKey] = [];
        if (val) collected[currentKey].push(val);
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (currentKey) {
        if (!collected[currentKey]) collected[currentKey] = [];
        collected[currentKey].push(line);
      } else {
        if (!collected.unlabeled) collected.unlabeled = [];
        collected.unlabeled.push(line);
      }
    }
  }

  const result = {};
  for (const [k, v] of Object.entries(collected)) {
    result[k] = v.join('\n').trim();
  }
  return result;
}

/**
 * Resolves fields based on parsed sections, backend structured suggestions, and original language.
 */
export function extractModerationFields(rawText, moderationData = null, isOrigEn = false) {
  const text = rawText || moderationData?.suggested_content || '';
  const parsed = parseModerationSections(text);

  // 1. Title
  let titleVi = moderationData?.suggested_title_vi || parsed.title_vi || parsed.title_gen_vi || '';
  let titleEn = moderationData?.suggested_title_en || parsed.title_en || parsed.title_gen_en || '';
  if (!titleVi && !titleEn) {
    if (isOrigEn && parsed.title_gen_vi) titleEn = parsed.title_gen_vi;
    else if (!isOrigEn && parsed.title_gen_en) titleVi = parsed.title_gen_en;
  }

  // 2. Short content / Summary
  let shortContentVi = moderationData?.suggested_short_content_vi || parsed.short_content_vi || parsed.short_gen_vi || '';
  let shortContentEn = moderationData?.suggested_short_content_en || parsed.short_content_en || parsed.short_gen_en || '';
  if (!shortContentVi && !shortContentEn) {
    if (isOrigEn && parsed.short_gen_vi) shortContentEn = parsed.short_gen_vi;
    else if (!isOrigEn && parsed.short_gen_en) shortContentVi = parsed.short_gen_en;
  }

  // 3. Detailed Content
  let contentVi = moderationData?.suggested_content_vi || parsed.content_vi || parsed.content_gen_vi || '';
  let contentEn = moderationData?.suggested_content_en || parsed.content_en || parsed.content_gen_en || '';
  if (!contentVi && !contentEn) {
    if (isOrigEn && parsed.content_gen_vi) contentEn = parsed.content_gen_vi;
    else if (!isOrigEn && parsed.content_gen_en) contentVi = parsed.content_gen_en;
  }

  const hasAnySection = Boolean(titleVi || titleEn || shortContentVi || shortContentEn || contentVi || contentEn);

  // Fallback when no structured labels were matched at all:
  // Put clean text into the primary content field
  if (!hasAnySection && text.trim()) {
    if (isOrigEn) {
      contentEn = text.trim();
    } else {
      contentVi = text.trim();
    }
  }

  return {
    titleVi: titleVi.trim(),
    titleEn: titleEn.trim(),
    shortContentVi: shortContentVi.trim(),
    shortContentEn: shortContentEn.trim(),
    contentVi: contentVi.trim(),
    contentEn: contentEn.trim(),
    hasAnySection,
  };
}


import React from 'react';

/**
 * Hiển thị văn bản kèm hiệu ứng Highlight từ khóa tìm kiếm.
 * 1. Hỗ trợ text dạng chuỗi (string) hoặc mảng chuỗi (từ API search highlight của backend).
 * 2. Tự động chuyển các thẻ `<em>...</em>`, `<em>...<\em>`, `&lt;em&gt;...&lt;/em&gt;` thành `<mark className="search-keyword-highlight">`.
 * 3. Nếu có query tìm kiếm, tự động highlight thêm các từ khóa khớp với query trong toàn bộ văn bản.
 */
export function HighlightText({ text, query = '', className = '' }) {
  if (text === null || text === undefined) return null;

  // Xử lý trường hợp text là mảng string (ví dụ highlight.title: ['...<em>keyword</em>...'])
  let str = Array.isArray(text) ? text.join(' ') : (typeof text === 'string' ? text : String(text));

  // Chuẩn hóa các biến thể thẻ em (HTML escaped, dấu gạch chéo ngược <\em>) về chuẩn <em>...</em>
  str = str
    .replace(/&lt;em&gt;/gi, '<em>')
    .replace(/&lt;[\/\\]em&gt;/gi, '</em>')
    .replace(/<\\em>/gi, '</em>');

  const cleanQ = (query || '').trim();

  // Helper hàm highlight query cho các chuỗi con không nằm trong thẻ <em>
  const highlightQuerySubstrings = (rawText, keyPrefix) => {
    if (!cleanQ || cleanQ.length === 0) return rawText;
    try {
      const escaped = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      if (!regex.test(rawText)) return rawText;

      const subParts = rawText.split(regex);
      return subParts.map((sub, sIdx) => {
        if (sub.toLowerCase() === cleanQ.toLowerCase()) {
          return (
            <mark key={`${keyPrefix}_sub_${sIdx}`} className="search-keyword-highlight">
              {sub}
            </mark>
          );
        }
        return sub;
      });
    } catch {
      return rawText;
    }
  };

  // 1. Nếu văn bản chứa thẻ <em>...</em> từ backend search
  if (/<em>[\s\S]*?<\/em>/i.test(str)) {
    const parts = str.split(/(<em>[\s\S]*?<\/em>)/gi);
    return (
      <span className={className}>
        {parts.map((part, idx) => {
          const emMatch = part.match(/^<em>([\s\S]*?)<\/em>$/i);
          if (emMatch) {
            return (
              <mark key={idx} className="search-keyword-highlight">
                {emMatch[1]}
              </mark>
            );
          }
          return highlightQuerySubstrings(part, `part_${idx}`);
        })}
      </span>
    );
  }

  // 2. Nếu không có thẻ <em> nhưng có query tìm kiếm
  if (cleanQ.length > 0) {
    const highlighted = highlightQuerySubstrings(str, 'root');
    return <span className={className}>{highlighted}</span>;
  }

  return <span className={className}>{str}</span>;
}

export default HighlightText;

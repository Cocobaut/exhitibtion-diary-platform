import React from 'react';

/**
 * Hiển thị văn bản kèm hiệu ứng Highlight từ khóa tìm kiếm.
 * 1. Tự động chuyển các thẻ `<em>...</em>` do backend trả về thành `<mark className="search-keyword-highlight">`.
 * 2. Nếu có truyền thêm `query`, tự động highlight các từ khớp với query (kể cả khi không có thẻ em).
 */
export function HighlightText({ text, query = '', className = '' }) {
  if (text === null || text === undefined) return null;
  if (typeof text !== 'string') return text;

  // 1. Nếu văn bản chứa thẻ <em>...</em> từ backend search
  if (/<em>[\s\S]*?<\/em>/i.test(text)) {
    const parts = text.split(/(<em>[\s\S]*?<\/em>)/gi);
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
          return part;
        })}
      </span>
    );
  }

  // 2. Nếu có `query`, highlight các từ khóa khớp với query
  const cleanQ = (query || '').trim();
  if (cleanQ.length > 0) {
    try {
      const escaped = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      if (regex.test(text)) {
        const parts = text.split(regex);
        return (
          <span className={className}>
            {parts.map((part, idx) => {
              if (part.toLowerCase() === cleanQ.toLowerCase()) {
                return (
                  <mark key={idx} className="search-keyword-highlight">
                    {part}
                  </mark>
                );
              }
              return part;
            })}
          </span>
        );
      }
    } catch {
      // Fallback plain text nếu regex lỗi
    }
  }

  return <span className={className}>{text}</span>;
}

export default HighlightText;

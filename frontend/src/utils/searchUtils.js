/**
 * Search and text normalization utilities.
 */

export function normalizeSearchText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

export function matchesSearchQuery(text, query) {
  if (!text || !query) return false;
  const rawText = String(text);
  const cleanQ = String(query).trim();
  if (!cleanQ) return false;

  // 1. Literal lowercase match
  if (rawText.toLowerCase().includes(cleanQ.toLowerCase())) {
    return true;
  }

  // 2. Accent-free match (Vietnamese diacritics insensitive)
  const normText = normalizeSearchText(rawText);
  const normQuery = normalizeSearchText(cleanQ);
  return normText.includes(normQuery);
}

export function stripHtmlTags(str) {
  if (!str) return '';
  return String(str).replace(/<\/?[^>]+(>|$)/g, '');
}


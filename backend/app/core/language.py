"""Nhận diện ngôn ngữ gốc (vi/en) của nội dung người dùng tự viết.

Giao diện có thể đang ở tiếng Anh trong khi người dùng gõ tiếng Việt (và ngược lại),
nên ngôn ngữ gốc phải suy ra từ chính văn bản thay vì tin vào ngôn ngữ giao diện.
"""

import re
from typing import Optional

# Các ký tự chỉ xuất hiện trong tiếng Việt có dấu
_VI_DIACRITICS = re.compile(
    r"[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]",
    re.IGNORECASE,
)

# Từ tiếng Việt thường gặp khi người dùng gõ không dấu
_VI_NO_ACCENT_WORDS = {
    "toi", "minh", "ban", "khong", "nhung", "duoc", "cua", "va", "la", "nay",
    "voi", "cho", "nguoi", "lai", "roi", "cung", "thi", "nhieu", "mot", "hom",
    "nay", "buon", "vui", "yeu", "qua", "lam", "di", "den", "trong", "neu",
}

_EN_COMMON_WORDS = {
    "the", "and", "is", "are", "was", "were", "i", "you", "my", "me", "to",
    "of", "in", "it", "that", "this", "with", "for", "on", "be", "have", "not",
}

_WORD = re.compile(r"[a-zA-Z]+")


def detect_language(*texts: Optional[str], fallback: str = "vi") -> str:
    """Trả về 'vi' hoặc 'en' dựa trên nội dung; không chắc chắn thì dùng fallback."""
    text = " ".join(t for t in texts if t)
    if not text.strip():
        return fallback if fallback in ("vi", "en") else "vi"

    letters = [c for c in text if c.isalpha()]
    if letters:
        vi_marks = len(_VI_DIACRITICS.findall(text))
        # Chỉ cần vài phần trăm ký tự có dấu là đủ chắc chắn đây là tiếng Việt
        if vi_marks / len(letters) >= 0.03:
            return "vi"

    words = [w.lower() for w in _WORD.findall(text)]
    if not words:
        return fallback if fallback in ("vi", "en") else "vi"

    vi_hits = sum(1 for w in words if w in _VI_NO_ACCENT_WORDS)
    en_hits = sum(1 for w in words if w in _EN_COMMON_WORDS)
    if en_hits > vi_hits:
        return "en"
    if vi_hits > en_hits:
        return "vi"
    return fallback if fallback in ("vi", "en") else "vi"

"""Kiểm tra URL ảnh do người dùng gửi lên (avatar, ảnh nhật ký)."""

from typing import List, Optional

MAX_MEDIA_URL_LENGTH = 2048
MAX_MEDIA_URLS = 10


def validate_media_url(url: str, field: str = "media_url") -> str:
    """Chỉ nhận ảnh đã tải lên máy chủ (/static/...) hoặc link https.

    Chặn "../" và "\\" trong đường dẫn nội bộ, chặn http:// và các scheme khác (javascript:, data:, ...).
    """
    cleaned = url.strip()
    if len(cleaned) > MAX_MEDIA_URL_LENGTH:
        raise ValueError(f"{field} không được vượt quá {MAX_MEDIA_URL_LENGTH} ký tự")
    if cleaned.startswith("/static/"):
        if ".." in cleaned or "\\" in cleaned:
            raise ValueError(f"{field} chứa đường dẫn không hợp lệ")
        return cleaned
    if cleaned.lower().startswith("https://") and len(cleaned) > len("https://"):
        return cleaned
    raise ValueError(f"{field} phải là ảnh đã tải lên (/static/...) hoặc link https://")


def validate_media_urls(urls: Optional[List[str]]) -> Optional[List[str]]:
    if urls is None:
        return None
    if len(urls) > MAX_MEDIA_URLS:
        raise ValueError(f"Tối đa {MAX_MEDIA_URLS} ảnh cho một bài viết")
    return [validate_media_url(u, field="media_urls") for u in urls if u and u.strip()]

from datetime import datetime, timedelta, timezone
import uuid
from typing import Optional
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import ANONYMOUS_NAME
from app.core.exceptions import AppException
from app.models.artwork import Artwork


class ArtworkQueryService:
    @staticmethod
    def is_readable_by(artwork: Artwork, user_id: Optional[uuid.UUID]) -> bool:
        """Tác giả luôn đọc được bài của mình; người khác chỉ đọc bài công khai đã duyệt.
        Bài bị gỡ (REJECTED) sau khi duyệt cũng không còn đọc được, kể cả qua Sổ tay.
        """
        if user_id is not None and artwork.user_id == user_id:
            return True
        return artwork.visibility == "PUBLIC" and artwork.status == "APPROVED"

    @staticmethod
    async def enforce_post_rate_limit(db: AsyncSession, user_id: uuid.UUID) -> None:
        """Giới hạn số bài đăng mới của một người, tính chung cho cả 3 phòng."""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.ARTWORK_RATE_LIMIT_WINDOW_MINUTES)
        recent_count = await db.scalar(
            select(func.count(Artwork.id)).where(Artwork.user_id == user_id, Artwork.created_at >= cutoff)
        ) or 0
        if recent_count >= settings.ARTWORK_RATE_LIMIT_MAX_PER_WINDOW:
            raise AppException(
                status_code=429,
                error_code="RATE_LIMITED",
                message="Bạn gửi bài quá nhanh, vui lòng thử lại sau ít phút"
            )

    @staticmethod
    def get_author_display_name(artwork: Artwork, author_nickname: Optional[str] = None) -> str:
        """Resolve artwork author display name according to Plan 00 §6.6:
        - "Người Bạn Ẩn Danh" if artworks.is_anonymous = TRUE
        - artworks.author_display_name if non-empty
        - users.nickname if available
        - fallback: "Người Bạn Ẩn Danh"
        """
        if artwork.is_anonymous:
            return ANONYMOUS_NAME

        if artwork.author_display_name and artwork.author_display_name.strip():
            return artwork.author_display_name.strip()

        if author_nickname and author_nickname.strip():
            return author_nickname.strip()

        if hasattr(artwork, "author") and artwork.author and getattr(artwork.author, "nickname", None):
            return artwork.author.nickname

        return ANONYMOUS_NAME

    @staticmethod
    async def increment_view_count(db: AsyncSession, artwork_id: uuid.UUID) -> int:
        """Atomic increment view_count by 1 and return the updated count."""
        stmt = (
            update(Artwork)
            .where(Artwork.id == artwork_id)
            .values(view_count=Artwork.view_count + 1)
            .returning(Artwork.view_count)
        )
        res = await db.execute(stmt)
        updated_count = res.scalar_one_or_none()

        if updated_count is None:
            # Fallback if returning is not supported by driver
            art = await db.get(Artwork, artwork_id)
            if art:
                art.view_count += 1
                await db.flush()
                return art.view_count
            return 0

        await db.flush()
        return updated_count

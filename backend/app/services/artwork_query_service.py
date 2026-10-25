import uuid
from typing import Optional
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import ANONYMOUS_NAME
from app.models.artwork import Artwork


class ArtworkQueryService:
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

import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.core.constants import ROOM1_REACTIONS, ROOM_BROKEN
from app.core.exceptions import AppException
from app.models.artwork import Artwork
from app.models.artwork_interaction import ArtworkInteraction
from app.models.user import User
from app.schemas.room1 import (
    ReactionsSummary,
    Room1CreateArtworkRequest,
)
from app.services.artwork_query_service import ArtworkQueryService
from app.services.notification_service import NotificationService
from app.services.reaction_service import ReactionService
from app.services.search_service import SearchService


class Room1Service:
    @staticmethod
    async def get_artworks(
        db: AsyncSession,
        *,
        filter_type: str = "all",
        page: int = 1,
        limit: int = 12,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Get gallery artworks list for Room 1."""
        valid_filters = {"all", "latest", "most_sympathetic", "my_artworks"}
        if filter_type not in valid_filters:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Tham số filter không hợp lệ"
            )

        if filter_type == "my_artworks":
            if not current_user:
                raise AppException(
                    status_code=401,
                    error_code="UNAUTHORIZED",
                    message="Vui lòng đăng nhập để xem tác phẩm của bạn"
                )

        base_conditions = [
            Artwork.room_id == ROOM_BROKEN,
            Artwork.status == "APPROVED",
        ]

        if filter_type == "my_artworks":
            base_conditions.append(Artwork.user_id == current_user.id)

        # Ordering
        if filter_type == "most_sympathetic":
            rx_count_subq = (
                select(func.count(ArtworkInteraction.id))
                .where(ArtworkInteraction.artwork_id == Artwork.id)
                .scalar_subquery()
            )
            order_criteria = [rx_count_subq.desc(), Artwork.created_at.desc()]
        else:
            order_criteria = [Artwork.created_at.desc()]

        # Count total
        count_stmt = select(func.count(Artwork.id)).where(*base_conditions)
        total_items = (await db.scalar(count_stmt)) or 0
        total_pages = math.ceil(total_items / limit) if total_items > 0 else 0

        # Query items
        stmt = (
            select(Artwork)
            .options(joinedload(Artwork.author))
            .where(*base_conditions)
            .order_by(*order_criteria)
            .offset((page - 1) * limit)
            .limit(limit)
        )
        rows = (await db.execute(stmt)).scalars().all()

        ids = [art.id for art in rows]
        summaries = await ReactionService.summary(db, ids, ROOM1_REACTIONS)
        my_rx_map = await ReactionService.my_reactions(
            db, ids, current_user.id if current_user else None
        )

        items = []
        for art in rows:
            author_name = ArtworkQueryService.get_author_display_name(art)
            my_rx_list = my_rx_map.get(art.id, [])
            my_rx = my_rx_list[0] if my_rx_list else None

            rx_data = summaries.get(art.id, {"HEART": 0, "HUG": 0, "SYMPATHY": 0, "total": 0})
            items.append({
                "id": art.id,
                "title": art.title,
                "short_content": art.short_content,
                "media_url": art.media_url,
                "author_display_name": author_name,
                "is_anonymous": art.is_anonymous,
                "view_count": art.view_count,
                "reactions": rx_data,
                "my_reaction": my_rx,
                "created_at": art.created_at,
            })

        return {
            "items": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_items": total_items,
                "total_pages": total_pages,
            }
        }

    @staticmethod
    async def get_artwork_detail(
        db: AsyncSession,
        *,
        artwork_id: uuid.UUID,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Get artwork detail in Room 1 with atomic view_count increment."""
        stmt = (
            select(Artwork)
            .options(joinedload(Artwork.author))
            .where(
                Artwork.id == artwork_id,
                Artwork.room_id == ROOM_BROKEN,
                Artwork.status == "APPROVED",
            )
        )
        artwork = (await db.execute(stmt)).scalar_one_or_none()
        if not artwork:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy tác phẩm"
            )

        # Atomic view_count increment
        new_view_count = await ArtworkQueryService.increment_view_count(db, artwork_id)

        summaries = await ReactionService.summary(db, [artwork_id], ROOM1_REACTIONS)
        my_rx_map = await ReactionService.my_reactions(
            db, [artwork_id], current_user.id if current_user else None
        )
        my_rx_list = my_rx_map.get(artwork_id, [])
        my_rx = my_rx_list[0] if my_rx_list else None

        author_name = ArtworkQueryService.get_author_display_name(artwork)

        return {
            "id": artwork.id,
            "room_id": artwork.room_id,
            "title": artwork.title,
            "author_display_name": author_name,
            "is_anonymous": artwork.is_anonymous,
            "short_content": artwork.short_content,
            "content": artwork.content,
            "media_url": artwork.media_url,
            "view_count": new_view_count,
            "reactions": summaries.get(artwork_id, {"HEART": 0, "HUG": 0, "SYMPATHY": 0, "total": 0}),
            "my_reaction": my_rx,
            "created_at": artwork.created_at,
        }

    @staticmethod
    async def toggle_reaction(
        db: AsyncSession,
        *,
        artwork_id: uuid.UUID,
        reaction_type: str,
        current_user: User,
    ) -> Tuple[str, Dict[str, Any]]:
        """Toggle reaction for Room 1.
        Rule: Each user can have at most 1 reaction on an artwork in Room 1.
        - Same reaction clicked -> delete (toggle off), message "Đã gỡ bỏ cảm xúc".
        - Different reaction clicked -> update/replace, message "Cảm ơn bạn đã gửi sự đồng cảm đến tác phẩm".
        - First reaction -> create, send notification if not own artwork, message "Cảm ơn bạn đã gửi sự đồng cảm đến tác phẩm".
        """
        # 1. Check artwork exists in Room 1 and APPROVED
        stmt = select(Artwork).where(
            Artwork.id == artwork_id,
            Artwork.room_id == ROOM_BROKEN,
            Artwork.status == "APPROVED",
        )
        artwork = (await db.execute(stmt)).scalar_one_or_none()
        if not artwork:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy tác phẩm"
            )

        # 2. Check existing reactions
        rx_query = select(ArtworkInteraction).where(
            ArtworkInteraction.artwork_id == artwork_id,
            ArtworkInteraction.user_id == current_user.id,
        )
        bind = db.get_bind()
        if bind and bind.dialect.name == "postgresql":
            rx_query = rx_query.with_for_update()

        existing_reactions = (await db.execute(rx_query)).scalars().all()

        current_reaction: Optional[str] = None
        message: str = ""

        if any(r.reaction_type == reaction_type for r in existing_reactions):
            # Toggle off: delete existing reaction(s)
            del_stmt = delete(ArtworkInteraction).where(
                ArtworkInteraction.artwork_id == artwork_id,
                ArtworkInteraction.user_id == current_user.id,
            )
            await db.execute(del_stmt)
            current_reaction = None
            message = "Đã gỡ bỏ cảm xúc"
        elif existing_reactions:
            # Switch reaction type: delete old and insert new
            del_stmt = delete(ArtworkInteraction).where(
                ArtworkInteraction.artwork_id == artwork_id,
                ArtworkInteraction.user_id == current_user.id,
            )
            await db.execute(del_stmt)

            new_rx = ArtworkInteraction(
                artwork_id=artwork_id,
                user_id=current_user.id,
                reaction_type=reaction_type,
            )
            db.add(new_rx)
            current_reaction = reaction_type
            message = "Cảm ơn bạn đã gửi sự đồng cảm đến tác phẩm"
        else:
            # First time reaction
            new_rx = ArtworkInteraction(
                artwork_id=artwork_id,
                user_id=current_user.id,
                reaction_type=reaction_type,
            )
            db.add(new_rx)
            current_reaction = reaction_type
            message = "Cảm ơn bạn đã gửi sự đồng cảm đến tác phẩm"

            # Create notification if not own artwork
            if artwork.user_id != current_user.id:
                body_map = {
                    "HUG": "Một người bạn ẩn danh vừa gửi một cái Ôm ấm áp đến tác phẩm của bạn.",
                    "HEART": "Một người bạn ẩn danh vừa thả tim cho tác phẩm của bạn.",
                    "SYMPATHY": "Một người bạn ẩn danh vừa gửi sự đồng cảm đến tác phẩm của bạn.",
                }
                notif_body = body_map.get(
                    reaction_type,
                    "Một người bạn ẩn danh vừa gửi sự đồng cảm đến tác phẩm của bạn."
                )
                await NotificationService.create(
                    db,
                    recipient_id=artwork.user_id,
                    type="INTERACTION",
                    title="Có người vừa gửi đồng cảm đến bạn",
                    body=notif_body,
                    target_url=f"/rooms/1/artworks/{artwork_id}",
                    sender_id=None,
                )

        await db.flush()

        # Recompute summary
        summaries = await ReactionService.summary(db, [artwork_id], ROOM1_REACTIONS)
        rx_summary = summaries.get(artwork_id, {"HEART": 0, "HUG": 0, "SYMPATHY": 0, "total": 0})

        return message, {
            "artwork_id": artwork_id,
            "current_reaction": current_reaction,
            "reactions_summary": rx_summary,
        }

    @staticmethod
    async def search_artworks(
        db: AsyncSession,
        *,
        q: str,
        scope: str = "all",
        page: int = 1,
        limit: int = 12,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Search artworks in Room 1."""
        clean_q = q.strip() if q else ""
        if not clean_q:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Từ khóa tìm kiếm (q) không được để trống"
            )
        if len(clean_q) > 100:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Từ khóa tìm kiếm không được vượt quá 100 ký tự"
            )

        if scope not in ("all", "mine"):
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="scope không hợp lệ"
            )

        if scope == "mine" and not current_user:
            raise AppException(
                status_code=401,
                error_code="UNAUTHORIZED",
                message="Vui lòng đăng nhập để tìm kiếm bài viết của bạn"
            )

        filters: Dict[str, Any] = {"status": "APPROVED"}
        if scope == "mine" and current_user:
            filters["user_id"] = current_user.id

        items, total_hits = await SearchService.search_artworks(
            db,
            room_id=ROOM_BROKEN,
            q=clean_q,
            filters=filters,
            page=page,
            limit=limit,
        )

        # Batch summary for reactions_total
        art_ids = [item["id"] for item in items]
        summaries = await ReactionService.summary(db, art_ids, ROOM1_REACTIONS)

        formatted_items = []
        for item in items:
            aid = item["id"]
            rx_total = summaries.get(aid, {}).get("total", 0)
            formatted_items.append({
                "id": aid,
                "title": item["title"],
                "short_content": item["short_content"],
                "author_display_name": item["author_display_name"],
                "media_url": item["media_url"],
                "highlight": item.get("highlight", {}),
                "reactions_total": rx_total,
                "view_count": item["view_count"],
            })

        return {
            "items": formatted_items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_hits": total_hits,
            }
        }

    @staticmethod
    async def create_artwork(
        db: AsyncSession,
        *,
        request: Room1CreateArtworkRequest,
        current_user: User,
    ) -> Dict[str, Any]:
        """Create a new artwork in Room 1 with rate limiting."""
        # Rate limit check: user artworks created in window across all rooms
        window_minutes = settings.ARTWORK_RATE_LIMIT_WINDOW_MINUTES
        max_allowed = settings.ARTWORK_RATE_LIMIT_MAX_PER_WINDOW
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)

        cnt_stmt = select(func.count(Artwork.id)).where(
            Artwork.user_id == current_user.id,
            Artwork.created_at >= cutoff,
        )
        recent_count = (await db.scalar(cnt_stmt)) or 0
        if recent_count >= max_allowed:
            raise AppException(
                status_code=429,
                error_code="RATE_LIMITED",
                message="Bạn gửi bài quá nhanh, vui lòng thử lại sau ít phút"
            )

        new_artwork = Artwork(
            user_id=current_user.id,
            room_id=ROOM_BROKEN,
            title=request.title.strip(),
            short_content=request.short_content.strip(),
            content=request.content.strip(),
            author_display_name=request.author_display_name.strip() if request.author_display_name else None,
            is_anonymous=request.is_anonymous,
            status="PENDING",
            media_url=None,
            visibility="PUBLIC",
        )
        db.add(new_artwork)
        await db.flush()
        await db.refresh(new_artwork)

        author_name = ArtworkQueryService.get_author_display_name(
            new_artwork,
            author_nickname=current_user.nickname,
        )

        return {
            "id": new_artwork.id,
            "room_id": new_artwork.room_id,
            "title": new_artwork.title,
            "author_display_name": author_name,
            "status": new_artwork.status,
            "created_at": new_artwork.created_at,
        }

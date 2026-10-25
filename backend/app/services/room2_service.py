import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.core.constants import ROOM_HOPE
from app.core.exceptions import AppException
from app.models.artwork import Artwork
from app.models.user import User
from app.schemas.room2 import Room2CreateLanternRequest, serialize_utc_datetime
from app.services.artwork_query_service import ArtworkQueryService
from app.services.search_service import SearchService


class Room2Service:
    @staticmethod
    def get_visible_conditions(current_user: Optional[User] = None) -> List[Any]:
        """Generate visible set conditions for Room 2 (Hope Lanterns):
        room_id = 2 AND (
            (visibility = 'PUBLIC' AND status = 'APPROVED')
            OR (visibility = 'PRIVATE' AND user_id = :current_user_id)
        )
        """
        public_cond = and_(Artwork.visibility == "PUBLIC", Artwork.status == "APPROVED")
        if current_user:
            private_cond = and_(Artwork.visibility == "PRIVATE", Artwork.user_id == current_user.id)
            visible_clause = or_(public_cond, private_cond)
        else:
            visible_clause = public_cond

        return [Artwork.room_id == ROOM_HOPE, visible_clause]

    @staticmethod
    async def get_lanterns(
        db: AsyncSession,
        *,
        filter_type: str = "all",
        limit: int = 30,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Get list of lanterns in Room 2 based on visible set and filters."""
        valid_filters = {"all", "mine", "opened", "locked"}
        if filter_type not in valid_filters:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Tham số filter không hợp lệ"
            )

        if limit < 1 or limit > 100:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Số lượng limit phải từ 1 đến 100"
            )

        if filter_type == "mine" and not current_user:
            raise AppException(
                status_code=401,
                error_code="UNAUTHORIZED",
                message="Vui lòng đăng nhập để xem lồng đèn của bạn"
            )

        conditions = Room2Service.get_visible_conditions(current_user)
        now = datetime.now(timezone.utc)

        if filter_type == "mine" and current_user:
            conditions.append(Artwork.user_id == current_user.id)
        elif filter_type == "opened":
            conditions.append(Artwork.is_opened.is_(True))
        elif filter_type == "locked":
            conditions.append(Artwork.target_date > now)

        # Count total
        count_stmt = select(func.count(Artwork.id)).where(*conditions)
        total_lanterns = (await db.scalar(count_stmt)) or 0

        # Query items
        stmt = (
            select(Artwork)
            .options(joinedload(Artwork.author))
            .where(*conditions)
            .order_by(Artwork.created_at.desc())
            .limit(limit)
        )
        rows = (await db.execute(stmt)).scalars().all()

        items = []
        for art in rows:
            is_mine = bool(current_user and art.user_id == current_user.id)
            target = art.target_date
            if target and target.tzinfo is None:
                target = target.replace(tzinfo=timezone.utc)

            is_unlockable = (target is None or target <= now)
            rem_secs = 0 if is_unlockable else int((target - now).total_seconds())
            author_name = ArtworkQueryService.get_author_display_name(art)

            items.append({
                "id": art.id,
                "title": art.title,
                "author_display_name": author_name,
                "visibility": art.visibility,
                "is_mine": is_mine,
                "target_date": target,
                "is_unlockable": is_unlockable,
                "remaining_seconds": rem_secs,
                "is_opened": art.is_opened,
                "media_url": art.media_url,
                "created_at": art.created_at,
            })

        return {
            "items": items,
            "total_lanterns": total_lanterns,
        }

    @staticmethod
    async def open_lantern(
        db: AsyncSession,
        *,
        lantern_id: uuid.UUID,
        current_user: Optional[User] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        """Open a lantern in Room 2:
        1. Artwork must exist and room_id = 2.
        2. Permission check:
           - PUBLIC: must be APPROVED.
           - PRIVATE: must have token and user_id = current_user.id (otherwise 401 / 404).
        3. Time-lock check: if target_date > now -> 423 TIME_CAPSULE_LOCKED.
        4. Unlock: is_opened = True, view_count + 1.
        """
        stmt = (
            select(Artwork)
            .options(joinedload(Artwork.author))
            .where(Artwork.id == lantern_id, Artwork.room_id == ROOM_HOPE)
        )
        artwork = (await db.execute(stmt)).scalar_one_or_none()
        if not artwork:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy lồng đèn"
            )

        # Permission check
        if artwork.visibility == "PUBLIC":
            if artwork.status != "APPROVED":
                raise AppException(
                    status_code=404,
                    error_code="ARTWORK_NOT_FOUND",
                    message="Không tìm thấy lồng đèn"
                )
        elif artwork.visibility == "PRIVATE":
            if not current_user:
                raise AppException(
                    status_code=401,
                    error_code="UNAUTHORIZED",
                    message="Vui lòng đăng nhập để mở lồng đèn riêng tư"
                )
            if artwork.user_id != current_user.id:
                raise AppException(
                    status_code=404,
                    error_code="ARTWORK_NOT_FOUND",
                    message="Không tìm thấy lồng đèn"
                )

        # Time lock check
        now = datetime.now(timezone.utc)
        target = artwork.target_date
        if target and target.tzinfo is None:
            target = target.replace(tzinfo=timezone.utc)

        if target and target > now:
            rem_secs = int((target - now).total_seconds())
            target_str = serialize_utc_datetime(target)
            raise AppException(
                status_code=423,
                error_code="TIME_CAPSULE_LOCKED",
                message="Bức thư này đang lơ lửng trên tầng mây cao và chưa đến lúc hạ cánh.",
                data={
                    "target_date": target_str,
                    "remaining_seconds": rem_secs,
                }
            )

        # Atomic increment view_count and mark is_opened
        upd_stmt = (
            update(Artwork)
            .where(Artwork.id == lantern_id)
            .values(is_opened=True, view_count=Artwork.view_count + 1)
            .returning(Artwork.view_count)
        )
        res = await db.execute(upd_stmt)
        new_view_count = res.scalar_one_or_none()
        if new_view_count is None:
            artwork.is_opened = True
            artwork.view_count += 1
            await db.flush()
            new_view_count = artwork.view_count
        else:
            artwork.is_opened = True
            artwork.view_count = new_view_count
            await db.flush()

        author_name = ArtworkQueryService.get_author_display_name(artwork)

        message = "Lồng đèn đã hạ cánh. Chúc mừng bạn đã chạm tới bức thư tương lai!"
        data = {
            "id": artwork.id,
            "original_language": artwork.original_language or "vi",
            "title": artwork.title,
            "title_vi": artwork.title_vi,
            "title_en": artwork.title_en,
            "author_display_name": author_name,
            "content": artwork.content,
            "content_vi": artwork.content_vi,
            "content_en": artwork.content_en,
            "media_url": artwork.media_url,
            "visibility": artwork.visibility,
            "target_date": target,
            "is_opened": True,
            "view_count": new_view_count,
            "created_at": artwork.created_at,
        }
        return message, data

    @staticmethod
    async def create_lantern(
        db: AsyncSession,
        *,
        request: Room2CreateLanternRequest,
        current_user: User,
    ) -> Tuple[str, Dict[str, Any]]:
        """Create a new hope lantern in Room 2."""
        # Rate limit check across all rooms
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

        # Status and response message
        if request.visibility == "PUBLIC":
            status_val = "PENDING"
            msg = "Lồng đèn của bạn đang được chuẩn bị, chúng mình sẽ thông báo trong hộp tin nhắn cho bạn sau khi tác phẩm hoàn thành"
        else:
            status_val = "APPROVED"
            msg = "Lồng đèn hy vọng đã được thả bay lên bầu trời riêng của bạn!"

        lang = getattr(request, "original_language", "vi") or "vi"
        clean_title = request.title.strip()
        clean_short = request.short_content.strip()
        clean_content = request.content.strip()

        new_lantern = Artwork(
            user_id=current_user.id,
            room_id=ROOM_HOPE,
            original_language=lang,
            title=clean_title,
            title_vi=clean_title if lang == "vi" else None,
            title_en=clean_title if lang == "en" else None,
            short_content=clean_short,
            short_content_vi=clean_short if lang == "vi" else None,
            short_content_en=clean_short if lang == "en" else None,
            content=clean_content,
            content_vi=clean_content if lang == "vi" else None,
            content_en=clean_content if lang == "en" else None,
            author_display_name=request.author_display_name.strip() if request.author_display_name else None,
            is_anonymous=request.is_anonymous,
            target_date=request.target_date,
            visibility=request.visibility,
            status=status_val,
            is_opened=False,
            media_url=None,
        )
        db.add(new_lantern)
        await db.flush()
        await db.refresh(new_lantern)

        data = {
            "id": new_lantern.id,
            "room_id": new_lantern.room_id,
            "original_language": new_lantern.original_language,
            "title": new_lantern.title,
            "visibility": new_lantern.visibility,
            "status": new_lantern.status,
            "target_date": new_lantern.target_date,
            "created_at": new_lantern.created_at,
        }
        return msg, data

    @staticmethod
    async def search_lanterns(
        db: AsyncSession,
        *,
        q: str,
        filter_type: str = "all",
        page: int = 1,
        limit: int = 15,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Search lanterns in Room 2 respecting visible set and time locks."""
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

        valid_filters = {"all", "mine", "opened", "locked"}
        if filter_type not in valid_filters:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Tham số filter không hợp lệ"
            )

        if filter_type == "mine" and not current_user:
            raise AppException(
                status_code=401,
                error_code="UNAUTHORIZED",
                message="Vui lòng đăng nhập để tìm kiếm lồng đèn của bạn"
            )

        # Build visible set condition
        extra_conditions = []
        public_cond = and_(Artwork.visibility == "PUBLIC", Artwork.status == "APPROVED")
        if current_user:
            private_cond = and_(Artwork.visibility == "PRIVATE", Artwork.user_id == current_user.id)
            extra_conditions.append(or_(public_cond, private_cond))
        else:
            extra_conditions.append(public_cond)

        now = datetime.now(timezone.utc)
        if filter_type == "mine" and current_user:
            extra_conditions.append(Artwork.user_id == current_user.id)
        elif filter_type == "opened":
            extra_conditions.append(Artwork.is_opened.is_(True))
        elif filter_type == "locked":
            extra_conditions.append(Artwork.target_date > now)

        items, total_hits = await SearchService.search_artworks(
            db,
            room_id=ROOM_HOPE,
            q=clean_q,
            extra_conditions=extra_conditions,
            page=page,
            limit=limit,
        )

        formatted_items = []
        for item in items:
            target = item.get("target_date")
            if target and target.tzinfo is None:
                target = target.replace(tzinfo=timezone.utc)
            is_unlockable = (target is None or target <= now)

            hl = item.get("highlight", {})
            # Spec requirement: Do not include 'content' in highlight if lantern is locked!
            if not is_unlockable:
                hl = {k: v for k, v in hl.items() if k != "content"}

            formatted_items.append({
                "id": item["id"],
                "title": item["title"],
                "author_display_name": item["author_display_name"],
                "visibility": item.get("visibility", "PUBLIC"),
                "is_opened": item.get("is_opened", False),
                "is_unlockable": is_unlockable,
                "target_date": target,
                "highlight": hl,
            })

        return {
            "items": formatted_items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_hits": total_hits,
            }
        }

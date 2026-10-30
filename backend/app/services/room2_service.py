import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.language import detect_language
from app.core.config import settings
from app.core.constants import ROOM2_REACTIONS, ROOM_HOPE
from app.core.exceptions import AppException
from app.models.artwork import Artwork
from app.models.artwork_interaction import ArtworkInteraction
from app.models.user import User
from app.models.user_saved_artwork import UserSavedArtwork
from app.schemas.room2 import Room2CreateLanternRequest, serialize_utc_datetime
from app.services.artwork_query_service import ArtworkQueryService
from app.services.notification_service import NotificationService
from app.services.reaction_service import ReactionService
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
        title: Optional[str] = None,
        author_display_name: Optional[str] = None,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Get list of lanterns in Room 2 based on visible set and filters."""
        valid_filters = {"all", "mine"}
        if filter_type not in valid_filters and filter_type not in {"opened", "locked"}:
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

        # Silent Auto-landing check for user's personal lanterns that reached maturity
        freshly_landed = []
        if current_user:
            due_stmt = (
                select(Artwork)
                .where(
                    Artwork.room_id == ROOM_HOPE,
                    Artwork.user_id == current_user.id,
                    Artwork.target_date.isnot(None),
                    Artwork.target_date <= now,
                    Artwork.is_opened.is_(False),
                )
            )
            due_items = (await db.scalars(due_stmt)).all()
            if due_items:
                for due_art in due_items:
                    due_art.is_opened = True
                    freshly_landed.append({
                        "id": str(due_art.id),
                        "title": due_art.title,
                        "title_vi": due_art.title_vi or due_art.title,
                        "title_en": due_art.title_en or due_art.title,
                    })
                await db.commit()

        if filter_type == "mine" and current_user:
            conditions.append(Artwork.user_id == current_user.id)

        if title:
            term = f"%{title.strip()}%"
            conditions.append(
                or_(
                    Artwork.title.ilike(term),
                    Artwork.title_vi.ilike(term),
                    Artwork.title_en.ilike(term),
                )
            )

        if author_display_name:
            term = f"%{author_display_name.strip()}%"
            conditions.append(Artwork.author_display_name.ilike(term))

        # Count total
        count_stmt = select(func.count(Artwork.id)).where(*conditions)
        total_lanterns = (await db.scalar(count_stmt)) or 0
        opened_stmt = select(func.count(Artwork.id)).where(*conditions, Artwork.is_opened.is_(True))
        total_opened = (await db.scalar(opened_stmt)) or 0

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
            lang = art.original_language or "vi"
            title_vi = art.title_vi or (art.title if lang == "vi" else None)
            title_en = art.title_en or (art.title if lang == "en" else None)
            short_vi = art.short_content_vi or (art.short_content if lang == "vi" else None)
            short_en = art.short_content_en or (art.short_content if lang == "en" else None)
            content_vi = art.content_vi or (art.content if lang == "vi" else None)
            content_en = art.content_en or (art.content if lang == "en" else None)

            items.append({
                "id": art.id,
                "original_language": lang,
                "title": art.title,
                "title_vi": title_vi,
                "title_en": title_en,
                "author_display_name": author_name,
                "visibility": art.visibility,
                "is_mine": is_mine,
                "short_content": art.short_content,
                "short_content_vi": short_vi,
                "short_content_en": short_en,
                "content": art.content,
                "content_vi": content_vi,
                "content_en": content_en,
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
            "total_opened": total_opened,
            "freshly_landed": freshly_landed,
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
        3. No time lock restriction: Users can open/drop any lantern in visible set at will.
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

        target = artwork.target_date
        if target and target.tzinfo is None:
            target = target.replace(tzinfo=timezone.utc)

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
        lang = artwork.original_language or "vi"
        title_vi = artwork.title_vi or (artwork.title if lang == "vi" else None)
        title_en = artwork.title_en or (artwork.title if lang == "en" else None)
        short_vi = artwork.short_content_vi or (artwork.short_content if lang == "vi" else None)
        short_en = artwork.short_content_en or (artwork.short_content if lang == "en" else None)
        content_vi = artwork.content_vi or (artwork.content if lang == "vi" else None)
        content_en = artwork.content_en or (artwork.content if lang == "en" else None)

        message = "Lồng đèn đã hạ cánh. Chúc mừng bạn đã chạm tới bức thư tương lai!"
        data = {
            "id": artwork.id,
            "original_language": lang,
            "title": artwork.title,
            "title_vi": title_vi,
            "title_en": title_en,
            "author_display_name": author_name,
            "short_content": artwork.short_content,
            "short_content_vi": short_vi,
            "short_content_en": short_en,
            "content": artwork.content,
            "content_vi": content_vi,
            "content_en": content_en,
            "media_url": artwork.media_url,
            "visibility": artwork.visibility,
            "target_date": target,
            "is_opened": True,
            "view_count": new_view_count,
            "created_at": artwork.created_at,
        }
        return message, data

    @staticmethod
    async def get_ready_to_fall_lanterns(
        db: AsyncSession,
        *,
        current_user: User,
        include_opened: bool = False,
    ) -> Dict[str, Any]:
        """Get lanterns belonging to current_user whose target_date has arrived (target_date <= now)
        so that the front end can animate them falling down to be opened.
        Only returns APPROVED lanterns (both PUBLIC and PRIVATE).
        """
        now = datetime.now(timezone.utc)
        conditions = [
            Artwork.room_id == ROOM_HOPE,
            Artwork.user_id == current_user.id,
            Artwork.status == "APPROVED",
            Artwork.target_date.isnot(None),
            Artwork.target_date <= now,
        ]
        if not include_opened:
            conditions.append(Artwork.is_opened.is_(False))

        stmt = (
            select(Artwork)
            .options(joinedload(Artwork.author))
            .where(*conditions)
            .order_by(Artwork.target_date.desc(), Artwork.created_at.desc())
        )
        rows = (await db.execute(stmt)).scalars().all()

        items = []
        for art in rows:
            target = art.target_date
            if target and target.tzinfo is None:
                target = target.replace(tzinfo=timezone.utc)
            author_name = ArtworkQueryService.get_author_display_name(art)
            lang = art.original_language or "vi"
            title_vi = art.title_vi or (art.title if lang == "vi" else None)
            title_en = art.title_en or (art.title if lang == "en" else None)
            short_vi = art.short_content_vi or (art.short_content if lang == "vi" else None)
            short_en = art.short_content_en or (art.short_content if lang == "en" else None)
            content_vi = art.content_vi or (art.content if lang == "vi" else None)
            content_en = art.content_en or (art.content if lang == "en" else None)

            items.append({
                "id": art.id,
                "original_language": lang,
                "title": art.title,
                "title_vi": title_vi,
                "title_en": title_en,
                "author_display_name": author_name,
                "short_content": art.short_content,
                "short_content_vi": short_vi,
                "short_content_en": short_en,
                "content": art.content,
                "content_vi": content_vi,
                "content_en": content_en,
                "visibility": art.visibility,
                "status": art.status,
                "target_date": target,
                "is_opened": art.is_opened,
                "media_url": art.media_url,
                "created_at": art.created_at,
            })

        return {
            "items": items,
            "total": len(items),
        }

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

        clean_title = request.title.strip()
        clean_short = request.short_content.strip()
        clean_content = request.content.strip()
        lang = detect_language(clean_title, clean_content, fallback=getattr(request, "original_language", "vi") or "vi")

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
            author_display_name=current_user.nickname or "Người Dùng",
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
            "title_vi": new_lantern.title_vi,
            "title_en": new_lantern.title_en,
            "author_display_name": new_lantern.author_display_name,
            "short_content": new_lantern.short_content,
            "short_content_vi": new_lantern.short_content_vi,
            "short_content_en": new_lantern.short_content_en,
            "content": new_lantern.content,
            "content_vi": new_lantern.content_vi,
            "content_en": new_lantern.content_en,
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
                "title_vi": item.get("title_vi"),
                "title_en": item.get("title_en"),
                "author_display_name": item["author_display_name"],
                "short_content": item.get("short_content"),
                "short_content_vi": item.get("short_content_vi"),
                "short_content_en": item.get("short_content_en"),
                "content": item.get("content"),
                "content_vi": item.get("content_vi"),
                "content_en": item.get("content_en"),
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

    @staticmethod
    async def delete_lantern(
        db: AsyncSession,
        *,
        lantern_id: uuid.UUID,
        current_user: User,
    ) -> str:
        """Delete a lantern belonging to current_user if it has not been publicized
        (i.e. cannot delete if visibility is PUBLIC and status is APPROVED).
        """
        stmt = select(Artwork).where(Artwork.id == lantern_id, Artwork.room_id == ROOM_HOPE)
        artwork = (await db.execute(stmt)).scalar_one_or_none()
        if not artwork or artwork.user_id != current_user.id:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy lồng đèn"
            )

        if artwork.visibility == "PUBLIC" and artwork.status == "APPROVED":
            raise AppException(
                status_code=400,
                error_code="CANNOT_DELETE_PUBLIC_LANTERN",
                message="Không thể xóa lồng đèn đã được công khai trên bầu trời đêm"
            )

        await db.delete(artwork)
        await db.flush()
        return "Xóa lồng đèn thành công"

    @staticmethod
    async def save_lantern(
        db: AsyncSession,
        *,
        lantern_id: uuid.UUID,
        current_user: User,
    ) -> Dict[str, Any]:
        """Save a Room 2 lantern letter into the user's notebook."""
        stmt = select(Artwork).where(Artwork.id == lantern_id, Artwork.room_id == ROOM_HOPE)
        artwork = (await db.execute(stmt)).scalar_one_or_none()
        if not artwork:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy lồng đèn"
            )

        # Visibility check: if PRIVATE, must belong to current user
        if artwork.visibility == "PRIVATE" and artwork.user_id != current_user.id:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy lồng đèn"
            )

        # Check existing save
        check_stmt = select(UserSavedArtwork).where(
            UserSavedArtwork.user_id == current_user.id,
            UserSavedArtwork.artwork_id == lantern_id,
        )
        saved_rec = (await db.execute(check_stmt)).scalar_one_or_none()
        if not saved_rec:
            saved_rec = UserSavedArtwork(
                user_id=current_user.id,
                artwork_id=lantern_id,
            )
            db.add(saved_rec)
            await db.commit()
            await db.refresh(saved_rec)

        return {
            "artwork_id": str(artwork.id),
            "is_saved": True,
            "saved_at": serialize_utc_datetime(saved_rec.saved_at),
        }

    @staticmethod
    async def unsave_lantern(
        db: AsyncSession,
        *,
        lantern_id: uuid.UUID,
        current_user: User,
    ) -> None:
        """Remove a Room 2 lantern letter from the user's notebook."""
        stmt = select(UserSavedArtwork).where(
            UserSavedArtwork.user_id == current_user.id,
            UserSavedArtwork.artwork_id == lantern_id,
        )
        saved_rec = (await db.execute(stmt)).scalar_one_or_none()
        if saved_rec:
            await db.delete(saved_rec)
            await db.commit()

    @staticmethod
    async def get_my_personal_lantern(
        db: AsyncSession,
        current_user: User,
    ) -> Dict[str, Any]:
        """Get the latest personal lantern for countdown widget."""
        stmt = (
            select(Artwork)
            .where(
                Artwork.room_id == ROOM_HOPE,
                Artwork.user_id == current_user.id,
            )
            .order_by(Artwork.created_at.desc())
            .limit(1)
        )
        lantern = (await db.execute(stmt)).scalar_one_or_none()
        if not lantern:
            return {"has_lantern": False, "lantern": None}

        now = datetime.now(timezone.utc)
        target = lantern.target_date
        if target:
            if target.tzinfo is None:
                target = target.replace(tzinfo=timezone.utc)
            else:
                target = target.astimezone(timezone.utc)

        if target and target > now:
            diff = target - now
            rem_sec = int(diff.total_seconds())
            days = diff.days
            hours = (diff.seconds // 3600)
            minutes = (diff.seconds % 3600) // 60
            seconds = diff.seconds % 60
        else:
            rem_sec = 0
            days = 0
            hours = 0
            minutes = 0
            seconds = 0

        return {
            "has_lantern": True,
            "lantern": {
                "id": str(lantern.id),
                "title": lantern.title,
                "target_date": serialize_utc_datetime(lantern.target_date),
                "remaining_seconds": rem_sec,
                "days": days,
                "hours": hours,
                "minutes": minutes,
                "seconds": seconds,
                "is_opened": lantern.is_opened,
                "symbol": lantern.tag_category or "heart",
            }
        }

    @staticmethod
    async def get_random_opened_lantern(
        db: AsyncSession,
        current_user: Optional[User] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get a random opened public lantern in Room 2."""
        stmt = (
            select(Artwork)
            .options(joinedload(Artwork.author))
            .where(
                Artwork.room_id == ROOM_HOPE,
                Artwork.is_opened.is_(True),
                Artwork.visibility == "PUBLIC",
                Artwork.status == "APPROVED",
            )
            .order_by(func.random())
            .limit(1)
        )
        lantern = (await db.execute(stmt)).scalar_one_or_none()
        if not lantern:
            return None

        # Reactions summary & user reaction
        summaries = await ReactionService.summary(db, [lantern.id], ROOM2_REACTIONS)
        my_rx_map = await ReactionService.my_reactions(
            db, [lantern.id], current_user.id if current_user else None
        )
        my_rx_list = my_rx_map.get(lantern.id, [])
        my_rx = my_rx_list[0] if my_rx_list else None

        is_saved = False
        if current_user:
            check_saved = await db.scalar(
                select(UserSavedArtwork.id).where(
                    UserSavedArtwork.user_id == current_user.id,
                    UserSavedArtwork.artwork_id == lantern.id,
                )
            )
            is_saved = bool(check_saved)

        return {
            "id": str(lantern.id),
            "original_language": lantern.original_language,
            "title": lantern.title,
            "title_vi": lantern.title_vi,
            "title_en": lantern.title_en,
            "author_display_name": lantern.author_display_name or (lantern.author.nickname if lantern.author and not lantern.is_anonymous else "Người Lữ Khách"),
            "short_content": lantern.short_content,
            "short_content_vi": lantern.short_content_vi,
            "short_content_en": lantern.short_content_en,
            "content": lantern.content,
            "content_vi": lantern.content_vi,
            "content_en": lantern.content_en,
            "media_url": lantern.media_url,
            "visibility": lantern.visibility,
            "target_date": serialize_utc_datetime(lantern.target_date),
            "is_opened": lantern.is_opened,
            "view_count": lantern.view_count,
            "symbol": lantern.tag_category or "heart",
            "reactions": summaries.get(lantern.id, {"HEART": 0, "HUG": 0, "SYMPATHY": 0, "total": 0}),
            "my_reaction": my_rx,
            "is_saved": is_saved,
            "created_at": serialize_utc_datetime(lantern.created_at),
        }

    @staticmethod
    async def get_lantern_detail(
        db: AsyncSession,
        *,
        lantern_id: uuid.UUID,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Get lantern letter detail in Room 2."""
        stmt = (
            select(Artwork)
            .options(joinedload(Artwork.author))
            .where(
                Artwork.id == lantern_id,
                Artwork.room_id == ROOM_HOPE,
            )
        )
        lantern = (await db.execute(stmt)).scalar_one_or_none()
        if not lantern:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy lồng đèn"
            )

        if lantern.visibility == "PRIVATE" and (not current_user or lantern.user_id != current_user.id):
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy lồng đèn"
            )

        # Atomic view count increment
        await ArtworkQueryService.increment_view_count(db, lantern_id)

        summaries = await ReactionService.summary(db, [lantern.id], ROOM2_REACTIONS)
        my_rx_map = await ReactionService.my_reactions(
            db, [lantern.id], current_user.id if current_user else None
        )
        my_rx_list = my_rx_map.get(lantern.id, [])
        my_rx = my_rx_list[0] if my_rx_list else None

        is_saved = False
        if current_user:
            check_saved = await db.scalar(
                select(UserSavedArtwork.id).where(
                    UserSavedArtwork.user_id == current_user.id,
                    UserSavedArtwork.artwork_id == lantern.id,
                )
            )
            is_saved = bool(check_saved)

        return {
            "id": str(lantern.id),
            "original_language": lantern.original_language,
            "title": lantern.title,
            "title_vi": lantern.title_vi,
            "title_en": lantern.title_en,
            "author_display_name": lantern.author_display_name or (lantern.author.nickname if lantern.author and not lantern.is_anonymous else "Người Lữ Khách"),
            "short_content": lantern.short_content,
            "short_content_vi": lantern.short_content_vi,
            "short_content_en": lantern.short_content_en,
            "content": lantern.content,
            "content_vi": lantern.content_vi,
            "content_en": lantern.content_en,
            "media_url": lantern.media_url,
            "visibility": lantern.visibility,
            "target_date": serialize_utc_datetime(lantern.target_date),
            "is_opened": lantern.is_opened,
            "view_count": lantern.view_count,
            "symbol": lantern.tag_category or "heart",
            "reactions": summaries.get(lantern.id, {"HEART": 0, "HUG": 0, "SYMPATHY": 0, "total": 0}),
            "my_reaction": my_rx,
            "is_saved": is_saved,
            "created_at": serialize_utc_datetime(lantern.created_at),
        }

    @staticmethod
    async def toggle_reaction(
        db: AsyncSession,
        *,
        lantern_id: uuid.UUID,
        reaction_type: str,
        current_user: User,
    ) -> Tuple[str, Dict[str, Any]]:
        """Toggle reaction on Room 2 lantern letter (HEART, HUG, SYMPATHY)."""
        if reaction_type not in ROOM2_REACTIONS:
            raise AppException(
                status_code=400,
                error_code="INVALID_REACTION_TYPE",
                message=f"Loại cảm xúc không hợp lệ: {reaction_type}"
            )

        stmt = select(Artwork).where(Artwork.id == lantern_id, Artwork.room_id == ROOM_HOPE)
        lantern = (await db.execute(stmt)).scalar_one_or_none()
        if not lantern:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy lồng đèn"
            )

        rx_query = select(ArtworkInteraction).where(
            ArtworkInteraction.artwork_id == lantern_id,
            ArtworkInteraction.user_id == current_user.id,
        )
        existing_reactions = (await db.execute(rx_query)).scalars().all()

        current_reaction: Optional[str] = None
        if any(r.reaction_type == reaction_type for r in existing_reactions):
            # Toggle off
            for r in existing_reactions:
                await db.delete(r)
            message = "Đã gỡ bỏ cảm xúc"
            current_reaction = None
        elif existing_reactions:
            # Switch type
            for r in existing_reactions:
                await db.delete(r)
            new_rx = ArtworkInteraction(
                artwork_id=lantern_id,
                user_id=current_user.id,
                reaction_type=reaction_type,
            )
            db.add(new_rx)
            current_reaction = reaction_type
            message = "Cảm ơn bạn đã gửi sự đồng cảm đến bức thư"
        else:
            # Add reaction
            new_rx = ArtworkInteraction(
                artwork_id=lantern_id,
                user_id=current_user.id,
                reaction_type=reaction_type,
            )
            db.add(new_rx)
            current_reaction = reaction_type
            message = "Cảm ơn bạn đã gửi sự đồng cảm đến bức thư"

        await db.commit()

        summaries = await ReactionService.summary(db, [lantern_id], ROOM2_REACTIONS)
        return message, {
            "artwork_id": str(lantern_id),
            "current_reaction": current_reaction,
            "reactions_summary": summaries.get(lantern_id, {"HEART": 0, "HUG": 0, "SYMPATHY": 0, "total": 0}),
        }


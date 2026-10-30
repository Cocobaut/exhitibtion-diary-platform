import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.language import detect_language
from app.core.config import settings
from app.core.constants import ROOM3_COLOR_LEGEND, ROOM_COMMUNITY
from app.core.exceptions import AppException
from app.models.artwork import Artwork
from app.models.artwork_interaction import ArtworkInteraction
from app.models.user import User
from app.models.user_saved_artwork import UserSavedArtwork
from app.schemas.notebook import serialize_utc_datetime
from app.schemas.room3 import (
    ROOM3_CATEGORY_COLORS,
    PublicLeafCategoriesData,
    PublicLeafCategoryItem,
    Room3CreateRibbonRequest,
)
from app.services.artwork_query_service import ArtworkQueryService
from app.services.notification_service import NotificationService
from app.services.reaction_service import ReactionService
from app.services.search_service import SearchService


class Room3Service:
    @staticmethod
    async def get_ribbons(
        db: AsyncSession,
        *,
        category: Optional[str] = None,
        color_code: Optional[str] = None,
        filter_type: str = "all",
        limit: int = 50,
        title: Optional[str] = None,
        author_display_name: Optional[str] = None,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Get ribbons for Room 3 (Community Tree)."""
        if limit < 1 or limit > 150:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="limit phải từ 1 đến 150"
            )

        if filter_type not in ("all", "mine"):
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Tham số filter không hợp lệ"
            )

        if filter_type == "mine" and not current_user:
            raise AppException(
                status_code=401,
                error_code="UNAUTHORIZED",
                message="Vui lòng đăng nhập để xem thông điệp của bạn"
            )

        conditions = [
            Artwork.room_id == ROOM_COMMUNITY,
            Artwork.status == "APPROVED",
        ]

        if category:
            clean_cat = category.strip().upper()
            conditions.append(Artwork.tag_category == clean_cat)

        if color_code:
            clean_col = color_code.strip().upper()
            if not clean_col.startswith("#") and len(clean_col) == 6:
                clean_col = f"#{clean_col}"
            conditions.append(Artwork.color_code == clean_col)

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

        # Count total ribbons
        count_stmt = select(func.count(Artwork.id)).where(*conditions)
        total_ribbons = (await db.scalar(count_stmt)) or 0

        # Query items
        stmt = (
            select(Artwork)
            .options(joinedload(Artwork.author))
            .where(*conditions)
            .order_by(Artwork.created_at.desc())
            .limit(limit)
        )
        rows = (await db.execute(stmt)).scalars().all()

        ids = [art.id for art in rows]
        summaries = await ReactionService.summary(db, ids, ["INSPIRED", "HEART"])
        my_rx_map = await ReactionService.my_reactions(
            db, ids, current_user.id if current_user else None
        )

        items = []
        for art in rows:
            sm = summaries.get(art.id, {"INSPIRED": 0, "HEART": 0, "total": 0})
            energy_cnt = sm.get("INSPIRED", 0)
            heart_cnt = sm.get("HEART", 0)
            rx_obj = {
                "ENERGY": energy_cnt,
                "HEART": heart_cnt,
                "total": energy_cnt + heart_cnt,
            }

            my_rx_list = my_rx_map.get(art.id, [])
            has_energy = "INSPIRED" in my_rx_list

            author_name = ArtworkQueryService.get_author_display_name(art)

            items.append({
                "id": art.id,
                "title": art.title,
                "title_vi": art.title_vi,
                "title_en": art.title_en,
                "content": art.content,
                "content_vi": art.content_vi,
                "content_en": art.content_en,
                "short_content": art.short_content,
                "short_content_vi": art.short_content_vi,
                "short_content_en": art.short_content_en,
                "author_display_name": author_name,
                "tag_category": art.tag_category,
                "color_code": art.color_code,
                "reactions": rx_obj,
                "has_received_energy": has_energy,
                "created_at": art.created_at,
            })

        return {
            "color_legend": ROOM3_COLOR_LEGEND,
            "items": items,
            "total_ribbons": total_ribbons,
        }

    @staticmethod
    async def get_ribbon_detail(
        db: AsyncSession,
        *,
        ribbon_id: uuid.UUID,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Get ribbon detail modal for Room 3 with atomic view_count increment."""
        stmt = (
            select(Artwork)
            .options(joinedload(Artwork.author))
            .where(
                Artwork.id == ribbon_id,
                Artwork.room_id == ROOM_COMMUNITY,
                Artwork.status == "APPROVED",
            )
        )
        artwork = (await db.execute(stmt)).scalar_one_or_none()
        if not artwork:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy thông điệp"
            )

        # Atomic view_count increment
        new_view_count = await ArtworkQueryService.increment_view_count(db, ribbon_id)

        summaries = await ReactionService.summary(db, [ribbon_id], ["INSPIRED", "HEART"])
        my_rx_map = await ReactionService.my_reactions(
            db, [ribbon_id], current_user.id if current_user else None
        )

        sm = summaries.get(ribbon_id, {"INSPIRED": 0, "HEART": 0, "total": 0})
        energy_cnt = sm.get("INSPIRED", 0)
        heart_cnt = sm.get("HEART", 0)
        rx_obj = {
            "ENERGY": energy_cnt,
            "HEART": heart_cnt,
            "total": energy_cnt + heart_cnt,
        }

        has_energy = "INSPIRED" in my_rx_map.get(ribbon_id, [])
        author_name = ArtworkQueryService.get_author_display_name(artwork)

        is_saved = False
        if current_user:
            check_saved = await db.scalar(
                select(UserSavedArtwork.id).where(
                    UserSavedArtwork.user_id == current_user.id,
                    UserSavedArtwork.artwork_id == ribbon_id,
                )
            )
            is_saved = bool(check_saved)

        return {
            "id": artwork.id,
            "room_id": artwork.room_id,
            "original_language": artwork.original_language or "vi",
            "title": artwork.title,
            "title_vi": artwork.title_vi,
            "title_en": artwork.title_en,
            "author_display_name": author_name,
            "tag_category": artwork.tag_category,
            "color_code": artwork.color_code,
            "content": artwork.content,
            "content_vi": artwork.content_vi,
            "content_en": artwork.content_en,
            "reactions": rx_obj,
            "has_received_energy": has_energy,
            "view_count": new_view_count,
            "is_saved": is_saved,
            "created_at": artwork.created_at,
        }

    @staticmethod
    async def save_ribbon_to_notebook(
        db: AsyncSession,
        *,
        ribbon_id: uuid.UUID,
        current_user: User,
    ) -> Dict[str, Any]:
        """Save a Room 3 leaf ribbon into the user's notebook."""
        stmt = select(Artwork).where(Artwork.id == ribbon_id, Artwork.room_id == ROOM_COMMUNITY)
        artwork = (await db.execute(stmt)).scalar_one_or_none()
        if not artwork:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy thông điệp"
            )

        if artwork.visibility == "PRIVATE" and artwork.user_id != current_user.id:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy thông điệp"
            )

        check_stmt = select(UserSavedArtwork).where(
            UserSavedArtwork.user_id == current_user.id,
            UserSavedArtwork.artwork_id == ribbon_id,
        )
        saved_rec = (await db.execute(check_stmt)).scalar_one_or_none()
        if not saved_rec:
            saved_rec = UserSavedArtwork(
                user_id=current_user.id,
                artwork_id=ribbon_id,
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
    async def unsave_ribbon(
        db: AsyncSession,
        *,
        ribbon_id: uuid.UUID,
        current_user: User,
    ) -> None:
        """Remove a Room 3 leaf ribbon from the user's notebook."""
        stmt = select(UserSavedArtwork).where(
            UserSavedArtwork.user_id == current_user.id,
            UserSavedArtwork.artwork_id == ribbon_id,
        )
        saved_rec = (await db.execute(stmt)).scalar_one_or_none()
        if saved_rec:
            await db.delete(saved_rec)
            await db.commit()

    @staticmethod
    async def toggle_energy(
        db: AsyncSession,
        *,
        ribbon_id: uuid.UUID,
        action_type: str,
        current_user: User,
    ) -> Tuple[str, Dict[str, Any]]:
        """Toggle action for Room 3 (INSPIRED or HEART).
        Independent toggles for each type.
        """
        # 1. Check artwork exists in Room 3 and APPROVED
        stmt = select(Artwork).where(
            Artwork.id == ribbon_id,
            Artwork.room_id == ROOM_COMMUNITY,
            Artwork.status == "APPROVED",
        )
        artwork = (await db.execute(stmt)).scalar_one_or_none()
        if not artwork:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy thông điệp"
            )

        # 2. Check existing reaction of this specific type
        rx_stmt = select(ArtworkInteraction).where(
            ArtworkInteraction.artwork_id == ribbon_id,
            ArtworkInteraction.user_id == current_user.id,
            ArtworkInteraction.reaction_type == action_type,
        )
        existing = (await db.execute(rx_stmt)).scalar_one_or_none()

        current_action: Optional[str] = None
        message: str = ""

        if existing:
            # Untoggle: delete existing interaction
            await db.delete(existing)
            current_action = None
            message = "Đã hoàn tác tương tác năng lượng"
        else:
            # Toggle on: create new interaction
            new_rx = ArtworkInteraction(
                artwork_id=ribbon_id,
                user_id=current_user.id,
                reaction_type=action_type,
            )
            db.add(new_rx)
            current_action = action_type
            if action_type == "INSPIRED":
                message = "Bạn vừa tiếp nhận nguồn năng lượng tích cực từ dải thông điệp này!"
            else:
                message = "Cảm ơn bạn đã gửi lời khích lệ!"

            # Notification if not own artwork
            if artwork.user_id != current_user.id:
                notif_body = (
                    "Một người bạn ẩn danh vừa tiếp nhận năng lượng từ dải thông điệp của bạn."
                    if action_type == "INSPIRED"
                    else "Một người bạn ẩn danh vừa thả tim cho tác phẩm của bạn."
                )
                await NotificationService.create(
                    db,
                    recipient_id=artwork.user_id,
                    type="INTERACTION",
                    title="Có người vừa gửi đồng cảm đến bạn",
                    body=notif_body,
                    target_url=f"/rooms/3/artworks/{ribbon_id}",
                    sender_id=None,
                )

        await db.flush()

        # Recompute reactions summary
        summaries = await ReactionService.summary(db, [ribbon_id], ["INSPIRED", "HEART"])
        sm = summaries.get(ribbon_id, {"INSPIRED": 0, "HEART": 0, "total": 0})
        energy_cnt = sm.get("INSPIRED", 0)
        heart_cnt = sm.get("HEART", 0)
        rx_obj = {
            "ENERGY": energy_cnt,
            "HEART": heart_cnt,
            "total": energy_cnt + heart_cnt,
        }

        return message, {
            "artwork_id": ribbon_id,
            "current_action": current_action,
            "reactions": rx_obj,
        }

    @staticmethod
    async def create_ribbon(
        db: AsyncSession,
        *,
        request: Room3CreateRibbonRequest,
        current_user: User,
    ) -> Tuple[str, Dict[str, Any]]:
        """Create a new message ribbon in Room 3."""
        # Validate category and color pair
        expected_color = ROOM3_CATEGORY_COLORS.get(request.tag_category)
        if expected_color != request.color_code:
            raise AppException(
                status_code=400,
                error_code="INVALID_CATEGORY_COLOR",
                message="Danh mục và mã màu không khớp theo quy chuẩn phòng 3"
            )

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

        # Auto approve check
        if settings.ROOM3_AUTO_APPROVE:
            status_val = "APPROVED"
            msg = "Dải thông điệp đã được treo lên cây!"
        else:
            status_val = "PENDING"
            msg = "Dải thông điệp của bạn đang được chuẩn bị để treo lên cây, chúng mình sẽ thông báo qua hộp tin nhắn ngay khi hoàn tất!"

        clean_title = request.title.strip()
        clean_short = request.short_content.strip()
        clean_content = request.content.strip()
        lang = detect_language(clean_title, clean_content, fallback=getattr(request, "original_language", "vi") or "vi")

        new_ribbon = Artwork(
            user_id=current_user.id,
            room_id=ROOM_COMMUNITY,
            original_language=lang,
            title=clean_title,
            title_vi=clean_title if lang == "vi" else None,
            title_en=clean_title if lang == "en" else None,
            tag_category=request.tag_category,
            color_code=request.color_code,
            short_content=clean_short,
            short_content_vi=clean_short if lang == "vi" else None,
            short_content_en=clean_short if lang == "en" else None,
            content=clean_content,
            content_vi=clean_content if lang == "vi" else None,
            content_en=clean_content if lang == "en" else None,
            author_display_name=current_user.nickname or "Người Dùng",
            is_anonymous=request.is_anonymous,
            visibility="PUBLIC",
            status=status_val,
            media_url=None,
        )
        db.add(new_ribbon)
        await db.flush()
        await db.refresh(new_ribbon)

        author_name = ArtworkQueryService.get_author_display_name(
            new_ribbon,
            author_nickname=current_user.nickname,
        )

        data = {
            "id": new_ribbon.id,
            "room_id": new_ribbon.room_id,
            "original_language": new_ribbon.original_language,
            "title": new_ribbon.title,
            "tag_category": new_ribbon.tag_category,
            "color_code": new_ribbon.color_code,
            "author_display_name": author_name,
            "status": new_ribbon.status,
            "created_at": new_ribbon.created_at,
        }
        return msg, data

    @staticmethod
    async def search_ribbons(
        db: AsyncSession,
        *,
        q: str,
        category: Optional[str] = None,
        color_code: Optional[str] = None,
        scope: str = "all",
        page: int = 1,
        limit: int = 15,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Search ribbons in Room 3 with category and color filters."""
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
                message="Vui lòng đăng nhập để tìm kiếm thông điệp của bạn"
            )

        extra_conditions = [Artwork.status == "APPROVED"]

        if category:
            clean_cat = category.strip().upper()
            extra_conditions.append(Artwork.tag_category == clean_cat)

        if color_code:
            clean_col = color_code.strip().upper()
            if not clean_col.startswith("#") and len(clean_col) == 6:
                clean_col = f"#{clean_col}"
            extra_conditions.append(Artwork.color_code == clean_col)

        if scope == "mine" and current_user:
            extra_conditions.append(Artwork.user_id == current_user.id)

        items, total_hits = await SearchService.search_artworks(
            db,
            room_id=ROOM_COMMUNITY,
            q=clean_q,
            extra_conditions=extra_conditions,
            page=page,
            limit=limit,
        )

        ids = [item["id"] for item in items]
        summaries = await ReactionService.summary(db, ids, ["INSPIRED"])

        formatted_items = []
        for item in items:
            aid = item["id"]
            e_cnt = summaries.get(aid, {}).get("INSPIRED", 0)
            formatted_items.append({
                "id": aid,
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
                "tag_category": item.get("tag_category"),
                "color_code": item.get("color_code"),
                "highlight": item.get("highlight", {}),
                "energy_count": e_cnt,
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
    async def get_leaf_categories(db: AsyncSession) -> PublicLeafCategoriesData:
        """7.6 Lấy tổng số lượng lá (dải thông điệp đã duyệt), loại lá, màu sắc trên Cây thông điệp."""
        stmt = (
            select(
                Artwork.tag_category,
                func.count().label("total_count"),
            )
            .where(
                Artwork.room_id == ROOM_COMMUNITY,
                Artwork.status == "APPROVED",
            )
            .group_by(Artwork.tag_category)
        )
        rows = (await db.execute(stmt)).all()
        stat_map = {row.tag_category: int(row.total_count) for row in rows}

        total_leaves = 0
        categories = []
        for item in ROOM3_COLOR_LEGEND:
            cat = item["category"]
            cnt = stat_map.get(cat, 0)
            total_leaves += cnt
            categories.append(
                PublicLeafCategoryItem(
                    category=cat,
                    label=item["label"],
                    color_code=item["color_code"],
                    total_count=cnt,
                )
            )

        return PublicLeafCategoriesData(
            room_id=ROOM_COMMUNITY,
            room_code="COMMUNITY",
            total_leaves=total_leaves,
            categories=categories,
        )

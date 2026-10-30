import math
import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from fastapi import UploadFile
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.language import detect_language
from app.core.exceptions import AppException
from app.models.diary import Diary
from app.models.diary_interaction import DiaryInteraction
from app.models.user import User
from app.schemas.diary import (
    CreateDiaryRequest,
    UpdateDiaryRequest,
)
from app.services.notification_service import NotificationService
from app.services.reaction_service import ReactionService
from app.services.search_service import SearchService
from app.services.storage_service import StorageService


class DiaryService:
    @staticmethod
    async def get_my_diaries(
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        view_mode: str = "timeline",
        year: Optional[int] = None,
        month: Optional[int] = None,
        mood: Optional[str] = None,
        page: int = 1,
        limit: int = 15,
    ) -> Dict[str, Any]:
        """Get personal diary entries for current user with filters and pagination."""
        if limit < 1 or limit > 50:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="limit phải từ 1 đến 50"
            )

        conditions = [Diary.user_id == user_id]

        if mood:
            conditions.append(Diary.mood == mood.strip().lower())

        if year is not None:
            conditions.append(func.extract("year", Diary.entry_date) == year)

        if month is not None:
            conditions.append(func.extract("month", Diary.entry_date) == month)

        # Count total
        count_stmt = select(func.count(Diary.id)).where(*conditions)
        total_items = (await db.scalar(count_stmt)) or 0
        total_pages = math.ceil(total_items / limit) if total_items > 0 else 0

        # Query items
        stmt = (
            select(Diary)
            .where(*conditions)
            .order_by(Diary.entry_date.desc(), Diary.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        rows = (await db.execute(stmt)).scalars().all()

        items = []
        for d in rows:
            snippet = (d.content[:150] + "...") if len(d.content) > 150 else d.content
            items.append({
                "id": d.id,
                "entry_date": d.entry_date,
                "title": d.title,
                "mood": d.mood,
                "snippet": snippet,
                "media_urls": d.media_urls or [],
                "is_public": d.is_public,
                "is_encrypted": d.is_encrypted,
                "created_at": d.created_at,
                "updated_at": d.updated_at,
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
    async def get_my_diary_detail(
        db: AsyncSession,
        *,
        diary_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """Get personal diary detail by id."""
        stmt = select(Diary).where(Diary.id == diary_id, Diary.user_id == user_id)
        diary = (await db.execute(stmt)).scalar_one_or_none()
        if not diary:
            raise AppException(
                status_code=404,
                error_code="DIARY_NOT_FOUND",
                message="Không tìm thấy bài nhật ký"
            )

        return {
            "id": diary.id,
            "entry_date": diary.entry_date,
            "original_language": diary.original_language or "vi",
            "title": diary.title,
            "title_vi": diary.title_vi,
            "title_en": diary.title_en,
            "mood": diary.mood,
            "content": diary.content,
            "content_vi": diary.content_vi,
            "content_en": diary.content_en,
            "media_urls": diary.media_urls or [],
            "is_public": diary.is_public,
            "is_approved": diary.is_approved,
            "is_encrypted": diary.is_encrypted,
            "created_at": diary.created_at,
            "updated_at": diary.updated_at,
        }

    @staticmethod
    async def create_diary(
        db: AsyncSession,
        *,
        request: CreateDiaryRequest,
        current_user: User,
    ) -> Tuple[str, Dict[str, Any]]:
        """Create a new diary entry."""
        if request.is_public:
            is_approved = False
            msg = "Lưu nhật ký thành công! Bài viết đã được đưa vào hàng đợi kiểm duyệt để hiển thị trên Tab Cộng đồng."
        else:
            is_approved = True
            msg = "Lưu nhật ký riêng tư thành công"

        entry_d = request.entry_date or date.today()
        title_val = request.title.strip() if request.title else None
        content_val = request.content.strip()
        orig_lang = detect_language(title_val, content_val, fallback=(request.original_language or "vi").strip().lower())

        title_vi = title_val if orig_lang == "vi" else None
        title_en = title_val if orig_lang == "en" else None
        content_vi = content_val if orig_lang == "vi" else None
        content_en = content_val if orig_lang == "en" else None

        new_diary = Diary(
            user_id=current_user.id,
            entry_date=entry_d,
            original_language=orig_lang,
            title=title_val,
            title_vi=title_vi,
            title_en=title_en,
            mood=request.mood.strip().lower() if request.mood else None,
            content=content_val,
            content_vi=content_vi,
            content_en=content_en,
            media_urls=request.media_urls or [],
            is_public=request.is_public,
            is_approved=is_approved,
            is_encrypted=request.is_encrypted,
        )
        db.add(new_diary)
        await db.flush()
        await db.refresh(new_diary)

        data = {
            "id": new_diary.id,
            "entry_date": new_diary.entry_date,
            "original_language": new_diary.original_language,
            "title": new_diary.title,
            "mood": new_diary.mood,
            "is_public": new_diary.is_public,
            "is_approved": new_diary.is_approved,
            "created_at": new_diary.created_at,
        }
        return msg, data

    @staticmethod
    async def update_diary(
        db: AsyncSession,
        *,
        diary_id: uuid.UUID,
        request: UpdateDiaryRequest,
        user_id: uuid.UUID,
    ) -> Tuple[str, Dict[str, Any]]:
        """Update an existing personal diary entry."""
        stmt = select(Diary).where(Diary.id == diary_id, Diary.user_id == user_id)
        diary = (await db.execute(stmt)).scalar_one_or_none()
        if not diary:
            raise AppException(
                status_code=404,
                error_code="DIARY_NOT_FOUND",
                message="Không tìm thấy bài nhật ký"
            )

        if request.entry_date is not None:
            diary.entry_date = request.entry_date
        if request.title is not None:
            diary.title = request.title.strip() if request.title else None
        if request.mood is not None:
            diary.mood = request.mood.strip().lower() if request.mood else None
        if request.content is not None:
            diary.content = request.content.strip()
        if request.title is not None or request.content is not None:
            # Nội dung đã đổi: cột gốc theo bản mới, bản dịch cũ không còn đúng nên bỏ đi
            lang = detect_language(diary.title, diary.content, fallback=diary.original_language or "vi")
            diary.original_language = lang
            diary.title_vi = diary.title if lang == "vi" else None
            diary.title_en = diary.title if lang == "en" else None
            diary.content_vi = diary.content if lang == "vi" else None
            diary.content_en = diary.content if lang == "en" else None
        if request.media_urls is not None:
            diary.media_urls = request.media_urls
        if request.is_encrypted is not None:
            diary.is_encrypted = request.is_encrypted

        # Re-approval rule: If updated diary is public, reset is_approved to False
        if request.is_public is not None:
            diary.is_public = request.is_public
            if request.is_public:
                diary.is_approved = False
            else:
                diary.is_approved = True
        elif diary.is_public:
            # If still public and content/title changed, reset is_approved to False
            diary.is_approved = False

        diary.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(diary)

        data = {
            "id": diary.id,
            "title": diary.title,
            "updated_at": diary.updated_at,
        }
        return "Cập nhật bài nhật ký thành công", data

    @staticmethod
    async def delete_diary(
        db: AsyncSession,
        *,
        diary_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> str:
        """Permanently delete personal diary entry."""
        stmt = select(Diary).where(Diary.id == diary_id, Diary.user_id == user_id)
        diary = (await db.execute(stmt)).scalar_one_or_none()
        if not diary:
            raise AppException(
                status_code=404,
                error_code="DIARY_NOT_FOUND",
                message="Không tìm thấy bài nhật ký"
            )

        await db.delete(diary)
        await db.flush()
        return "Đã xóa bài nhật ký vĩnh viễn"

    @staticmethod
    async def upload_media(files: List[UploadFile]) -> List[str]:
        """Upload up to 5 images for diary attachments."""
        if not files:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Vui lòng chọn ít nhất một hình ảnh"
            )
        if len(files) > 5:
            raise AppException(
                status_code=400,
                error_code="FILE_TOO_LARGE",
                message="Chỉ được tải lên tối đa 5 hình ảnh"
            )

        urls = []
        for f in files:
            url = await StorageService.save(
                f,
                folder="diaries",
                allowed_mimes=["image/jpeg", "image/png", "image/webp"],
                max_bytes=5 * 1024 * 1024,
                file_too_large_msg="Ảnh vượt quá dung lượng 5MB",
                unsupported_type_msg="Chỉ chấp nhận ảnh PNG, JPEG hoặc WEBP",
            )
            urls.append(url)
        return urls

    @staticmethod
    async def get_community_diaries(
        db: AsyncSession,
        *,
        mood: Optional[str] = None,
        sort: str = "latest",
        page: int = 1,
        limit: int = 12,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Get community shared diaries."""
        if limit < 1 or limit > 50:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="limit phải từ 1 đến 50"
            )

        conditions = [
            Diary.is_public.is_(True),
            Diary.is_approved.is_(True),
            Diary.is_encrypted.is_(False),
        ]

        if mood:
            conditions.append(Diary.mood == mood.strip().lower())

        # Ordering
        if sort == "most_sympathetic":
            rx_subq = (
                select(func.count(DiaryInteraction.id))
                .where(DiaryInteraction.diary_id == Diary.id)
                .scalar_subquery()
            )
            order_criteria = [rx_subq.desc(), Diary.created_at.desc()]
        else:
            order_criteria = [Diary.created_at.desc()]

        # Count total
        count_stmt = select(func.count(Diary.id)).where(*conditions)
        total_items = (await db.scalar(count_stmt)) or 0
        total_pages = math.ceil(total_items / limit) if total_items > 0 else 0

        stmt = (
            select(Diary)
            .options(joinedload(Diary.user))
            .where(*conditions)
            .order_by(*order_criteria)
            .offset((page - 1) * limit)
            .limit(limit)
        )
        rows = (await db.execute(stmt)).scalars().all()

        ids = [d.id for d in rows]
        summaries = await ReactionService.diary_summary(db, ids, ["HEART", "HUG"])
        my_rx_map = await ReactionService.my_diary_reactions(
            db, ids, current_user.id if current_user else None
        )

        items = []
        for d in rows:
            snippet = (d.content[:150] + "...") if len(d.content) > 150 else d.content
            sm = summaries.get(d.id, {"HEART": 0, "HUG": 0, "total": 0})
            heart_cnt = sm.get("HEART", 0)
            hug_cnt = sm.get("HUG", 0)
            rx_obj = {
                "HEART": heart_cnt,
                "HUG": hug_cnt,
                "total": heart_cnt + hug_cnt,
            }

            my_rx = my_rx_map.get(d.id)
            author_info = {
                "nickname": d.user.nickname if d.user else "Người Dùng",
                "avatar_url": d.user.avatar_url if d.user else None,
            }

            snippet_en = (d.content_en[:150] + "...") if d.content_en and len(d.content_en) > 150 else d.content_en
            snippet_vi = (d.content_vi[:150] + "...") if d.content_vi and len(d.content_vi) > 150 else d.content_vi

            items.append({
                "id": d.id,
                "entry_date": d.entry_date,
                "title": d.title,
                "title_vi": d.title_vi,
                "title_en": d.title_en,
                "mood": d.mood,
                "content": d.content,
                "content_vi": d.content_vi,
                "content_en": d.content_en,
                "snippet": snippet,
                "snippet_vi": snippet_vi,
                "snippet_en": snippet_en,
                "media_urls": d.media_urls or [],
                "author": author_info,
                "reactions": rx_obj,
                "my_reaction": my_rx,
                "created_at": d.created_at,
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
    async def get_community_diary_detail(
        db: AsyncSession,
        *,
        diary_id: uuid.UUID,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Get detail of a community shared diary."""
        stmt = (
            select(Diary)
            .options(joinedload(Diary.user))
            .where(
                Diary.id == diary_id,
                Diary.is_public.is_(True),
                Diary.is_approved.is_(True),
                Diary.is_encrypted.is_(False),
            )
        )
        diary = (await db.execute(stmt)).scalar_one_or_none()
        if not diary:
            raise AppException(
                status_code=404,
                error_code="DIARY_NOT_FOUND",
                message="Không tìm thấy bài nhật ký"
            )

        summaries = await ReactionService.diary_summary(db, [diary_id], ["HEART", "HUG"])
        my_rx_map = await ReactionService.my_diary_reactions(
            db, [diary_id], current_user.id if current_user else None
        )

        sm = summaries.get(diary_id, {"HEART": 0, "HUG": 0, "total": 0})
        heart_cnt = sm.get("HEART", 0)
        hug_cnt = sm.get("HUG", 0)
        rx_obj = {
            "HEART": heart_cnt,
            "HUG": hug_cnt,
            "total": heart_cnt + hug_cnt,
        }

        author_info = {
            "nickname": diary.user.nickname if diary.user else "Người Dùng",
            "avatar_url": diary.user.avatar_url if diary.user else None,
        }

        return {
            "id": diary.id,
            "entry_date": diary.entry_date,
            "original_language": diary.original_language or "vi",
            "title": diary.title,
            "title_vi": diary.title_vi,
            "title_en": diary.title_en,
            "mood": diary.mood,
            "content": diary.content,
            "content_vi": diary.content_vi,
            "content_en": diary.content_en,
            "media_urls": diary.media_urls or [],
            "author": author_info,
            "reactions": rx_obj,
            "my_reaction": my_rx_map.get(diary_id),
            "created_at": diary.created_at,
        }

    @staticmethod
    async def toggle_reaction(
        db: AsyncSession,
        *,
        diary_id: uuid.UUID,
        reaction_type: str,
        current_user: User,
    ) -> Tuple[str, Dict[str, Any]]:
        """Toggle reaction on a community diary. Max 1 reaction per user."""
        stmt = select(Diary).where(
            Diary.id == diary_id,
            Diary.is_public.is_(True),
            Diary.is_approved.is_(True),
        )
        diary = (await db.execute(stmt)).scalar_one_or_none()
        if not diary:
            raise AppException(
                status_code=404,
                error_code="DIARY_NOT_FOUND",
                message="Không tìm thấy bài nhật ký"
            )

        rx_stmt = select(DiaryInteraction).where(
            DiaryInteraction.diary_id == diary_id,
            DiaryInteraction.user_id == current_user.id,
        )
        existing = (await db.execute(rx_stmt)).scalar_one_or_none()

        current_reaction: Optional[str] = None
        message: str = ""

        if existing:
            if existing.reaction_type == reaction_type:
                # Toggle off
                await db.delete(existing)
                current_reaction = None
                message = "Đã gỡ bỏ cảm xúc"
            else:
                # Switch reaction type
                existing.reaction_type = reaction_type
                current_reaction = reaction_type
                message = "Đã gửi sự đồng cảm đến tác giả"
        else:
            new_rx = DiaryInteraction(
                diary_id=diary_id,
                user_id=current_user.id,
                reaction_type=reaction_type,
            )
            db.add(new_rx)
            current_reaction = reaction_type
            message = "Đã gửi sự đồng cảm đến tác giả"

            # Create notification if not self
            if diary.user_id != current_user.id:
                await NotificationService.create(
                    db,
                    recipient_id=diary.user_id,
                    type="INTERACTION",
                    title="Có người vừa gửi đồng cảm đến bạn",
                    body="Một người bạn ẩn danh vừa gửi sự đồng cảm đến bài nhật ký của bạn.",
                    target_url=f"/diaries/community/{diary_id}",
                    sender_id=None,
                )

        await db.flush()

        summaries = await ReactionService.diary_summary(db, [diary_id], ["HEART", "HUG"])
        sm = summaries.get(diary_id, {"HEART": 0, "HUG": 0, "total": 0})
        heart_cnt = sm.get("HEART", 0)
        hug_cnt = sm.get("HUG", 0)
        rx_obj = {
            "HEART": heart_cnt,
            "HUG": hug_cnt,
            "total": heart_cnt + hug_cnt,
        }

        return message, {
            "diary_id": diary_id,
            "current_reaction": current_reaction,
            "reactions": rx_obj,
        }

    @staticmethod
    async def search_diaries(
        db: AsyncSession,
        *,
        q: str,
        scope: str = "mine",
        mood: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        page: int = 1,
        limit: int = 12,
        current_user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """Search diaries for personal or community."""
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

        if scope not in ("mine", "community"):
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="scope không hợp lệ"
            )

        if scope == "mine" and not current_user:
            raise AppException(
                status_code=401,
                error_code="UNAUTHORIZED",
                message="Vui lòng đăng nhập để tìm kiếm nhật ký cá nhân"
            )

        extra_conditions = []
        if mood:
            extra_conditions.append(Diary.mood == mood.strip().lower())
        if from_date:
            extra_conditions.append(Diary.entry_date >= from_date)
        if to_date:
            extra_conditions.append(Diary.entry_date <= to_date)

        is_community = (scope == "community")
        user_id = current_user.id if (scope == "mine" and current_user) else None

        items, total_hits = await SearchService.search_diaries(
            db,
            q=clean_q,
            user_id=user_id,
            is_community=is_community,
            extra_conditions=extra_conditions,
            page=page,
            limit=limit,
        )

        formatted_items = []
        for item in items:
            formatted_items.append({
                "id": item["id"],
                "entry_date": item["entry_date"],
                "title": item["title"],
                "mood": item["mood"],
                "scope": scope,
                "highlight": item.get("highlight", {}),
                "created_at": item["created_at"],
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
    async def get_mood_stats(
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """Get mood count statistics for user's personal diaries."""
        stmt = (
            select(Diary.mood, func.count(Diary.id))
            .where(Diary.user_id == user_id)
            .group_by(Diary.mood)
        )
        rows = (await db.execute(stmt)).all()
        total_diaries = 0
        mood_counts: Dict[str, int] = {}
        for mood_val, count in rows:
            total_diaries += count
            key = mood_val if mood_val else "Khác"
            mood_counts[key] = count

        return {
            "total_diaries": total_diaries,
            "mood_counts": mood_counts,
        }


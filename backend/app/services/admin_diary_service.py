from datetime import datetime, timezone
import math
from typing import Optional
import uuid
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.exceptions import AppException
from app.models.diary import Diary
from app.models.diary_interaction import DiaryInteraction
from app.models.user import User
from app.schemas.admin_diaries import (
    ApproveDiaryData,
    ApproveDiaryRequest,
    ApprovedDiariesData,
    ApprovedDiaryAuthor,
    ApprovedDiaryItem,
    ApprovedDiaryPagination,
    PendingDiariesData,
    PendingDiaryAuthor,
    PendingDiaryItem,
    PendingDiaryPagination,
    RejectDiaryData,
    RejectDiaryRequest,
    RevokeDiaryData,
    RevokeDiaryRequest,
)
from app.services.notification_service import NotificationService


class AdminDiaryService:

    @staticmethod
    def parse_diary_id(raw_id: str) -> uuid.UUID:
        try:
            return uuid.UUID(str(raw_id))
        except (ValueError, TypeError):
            raise AppException(
                status_code=404,
                error_code="DIARY_NOT_FOUND",
                message="Không tìm thấy bài nhật ký"
            )

    @staticmethod
    async def get_pending_diaries(
        db: AsyncSession,
        page: int = 1,
        limit: int = 15,
    ) -> PendingDiariesData:
        """10.1 Lấy danh sách nhật ký công khai chờ duyệt (is_public=True, is_approved=False)."""
        base_filter = [
            Diary.is_public == True,
            Diary.is_approved == False,
        ]

        count_stmt = select(func.count()).select_from(Diary).where(*base_filter)
        total_pending = (await db.scalar(count_stmt)) or 0
        total_pages = math.ceil(total_pending / limit) if limit > 0 and total_pending > 0 else 0

        query = (
            select(Diary)
            .options(joinedload(Diary.user))
            .where(*base_filter)
            .order_by(Diary.created_at.asc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        result = await db.execute(query)
        diaries = result.scalars().unique().all()

        items = []
        for d in diaries:
            author_info = PendingDiaryAuthor(
                id=d.user.id,
                username=d.user.username,
                nickname=d.user.nickname,
            )
            items.append(
                PendingDiaryItem(
                    id=d.id,
                    entry_date=d.entry_date,
                    original_language=d.original_language or "vi",
                    title=d.title,
                    title_vi=d.title_vi,
                    title_en=d.title_en,
                    mood=d.mood,
                    content=d.content,
                    content_vi=d.content_vi,
                    content_en=d.content_en,
                    media_urls=d.media_urls or [],
                    author=author_info,
                    created_at=d.created_at,
                )
            )

        return PendingDiariesData(
            items=items,
            pagination=PendingDiaryPagination(
                page=page,
                limit=limit,
                total_pending=total_pending,
                total_pages=total_pages,
            ),
        )

    @staticmethod
    async def approve_diary(
        db: AsyncSession,
        admin: User,
        diary_id_raw: str,
        payload: Optional[ApproveDiaryRequest] = None,
    ) -> ApproveDiaryData:
        """10.2 Phê duyệt bài nhật ký hiển thị lên Tab Cộng đồng."""
        diary_id = AdminDiaryService.parse_diary_id(diary_id_raw)
        diary = await db.get(Diary, diary_id)

        if not diary or not diary.is_public:
            raise AppException(
                status_code=404,
                error_code="DIARY_NOT_FOUND",
                message="Không tìm thấy bài nhật ký công khai"
            )

        now = datetime.now(timezone.utc)

        # Validation & update bilingual content if payload provided
        if payload:
            # Bản dịch là tuỳ chọn; cột gốc (title/content) luôn theo ngôn ngữ gốc của tác giả
            orig = diary.original_language or "vi"
            if payload.title_vi is not None:
                diary.title_vi = payload.title_vi
            if payload.title_en is not None:
                diary.title_en = payload.title_en
            if payload.content_vi is not None:
                diary.content_vi = payload.content_vi
            if payload.content_en is not None:
                diary.content_en = payload.content_en
            if getattr(payload, f"title_{orig}") is not None:
                diary.title = getattr(payload, f"title_{orig}")
            if getattr(payload, f"content_{orig}") is not None:
                diary.content = getattr(payload, f"content_{orig}")

        diary.is_approved = True
        diary.updated_at = now

        # Notification: Gửi thông báo SYSTEM cho tác giả
        diary_title = diary.title or "Không có tiêu đề"
        await NotificationService.create(
            db,
            recipient_id=diary.user_id,
            sender_id=admin.id,
            type="SYSTEM",
            title="Nhật ký của bạn đã được xuất bản ra cộng đồng!",
            body=f"Bài nhật ký '{diary_title}' đã được ban quản trị phê duyệt hiển thị trên Tab Cộng đồng.",
            target_url=f"/diaries/community/{diary.id}",
        )

        await db.commit()
        await db.refresh(diary)

        return ApproveDiaryData(
            diary_id=diary.id,
            is_public=diary.is_public,
            is_approved=diary.is_approved,
            title_vi=diary.title_vi,
            title_en=diary.title_en,
            updated_at=diary.updated_at,
        )

    @staticmethod
    async def reject_diary(
        db: AsyncSession,
        admin: User,
        diary_id_raw: str,
        payload: RejectDiaryRequest,
    ) -> RejectDiaryData:
        """10.3 Từ chối phê duyệt công khai bài nhật ký (đưa về private cho user)."""
        diary_id = AdminDiaryService.parse_diary_id(diary_id_raw)
        diary = await db.get(Diary, diary_id)

        if not diary or not diary.is_public:
            raise AppException(
                status_code=404,
                error_code="DIARY_NOT_FOUND",
                message="Không tìm thấy bài nhật ký công khai"
            )

        now = datetime.now(timezone.utc)
        diary.is_public = False
        diary.is_approved = False
        diary.updated_at = now

        # Notification: Gửi thông báo SYSTEM tới tác giả kèm lý do
        diary_title = diary.title or "Không có tiêu đề"
        await NotificationService.create(
            db,
            recipient_id=diary.user_id,
            sender_id=admin.id,
            type="SYSTEM",
            title="Chia sẻ nhật ký công khai chưa được phê duyệt",
            body=f"Bài nhật ký '{diary_title}' đã bị từ chối chia sẻ công khai với lý do: {payload.reason}",
            target_url="/diaries",
        )

        await db.commit()
        await db.refresh(diary)

        return RejectDiaryData(
            diary_id=diary.id,
            is_public=diary.is_public,
            is_approved=diary.is_approved,
        )

    @staticmethod
    async def get_approved_diaries(
        db: AsyncSession,
        q: Optional[str] = None,
        page: int = 1,
        limit: int = 15,
    ) -> ApprovedDiariesData:
        """10.4 Danh sách nhật ký cộng đồng đang hiển thị (is_public=True, is_approved=True)."""
        base_filter = [
            Diary.is_public == True,
            Diary.is_approved == True,
        ]

        if q:
            term = f"%{q.strip()}%"
            # Search title or author username
            base_filter.append(
                or_(
                    Diary.title.ilike(term),
                    Diary.user.has(User.username.ilike(term)),
                )
            )

        count_stmt = select(func.count()).select_from(Diary).where(*base_filter)
        total_items = (await db.scalar(count_stmt)) or 0
        total_pages = math.ceil(total_items / limit) if limit > 0 and total_items > 0 else 0

        # Subquery reactions count
        rx_subquery = (
            select(
                DiaryInteraction.diary_id,
                func.count(DiaryInteraction.id).label("rx_count")
            )
            .group_by(DiaryInteraction.diary_id)
            .subquery()
        )

        query = (
            select(
                Diary,
                func.coalesce(rx_subquery.c.rx_count, 0).label("reactions_total")
            )
            .outerjoin(rx_subquery, Diary.id == rx_subquery.c.diary_id)
            .options(joinedload(Diary.user))
            .where(*base_filter)
            .order_by(Diary.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        results = await db.execute(query)
        rows = results.all()

        items = []
        for diary, rx_count in rows:
            items.append(
                ApprovedDiaryItem(
                    id=diary.id,
                    entry_date=diary.entry_date,
                    title=diary.title,
                    author=ApprovedDiaryAuthor(
                        id=diary.user.id,
                        nickname=diary.user.nickname,
                        username=diary.user.username,
                    ),
                    reactions_total=rx_count,
                    created_at=diary.created_at,
                )
            )

        return ApprovedDiariesData(
            items=items,
            pagination=ApprovedDiaryPagination(
                page=page,
                limit=limit,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    @staticmethod
    async def revoke_diary(
        db: AsyncSession,
        admin: User,
        diary_id_raw: str,
        payload: RevokeDiaryRequest,
    ) -> RevokeDiaryData:
        """10.5 Thu hồi quyền công khai bài nhật ký đang hiển thị (gỡ khỏi cộng đồng)."""
        diary_id = AdminDiaryService.parse_diary_id(diary_id_raw)
        diary = await db.get(Diary, diary_id)

        if not diary:
            raise AppException(
                status_code=404,
                error_code="DIARY_NOT_FOUND",
                message="Không tìm thấy bài nhật ký"
            )

        now = datetime.now(timezone.utc)
        diary.is_public = False
        diary.is_approved = False
        diary.updated_at = now

        # Notification: Gửi thông báo giải thích lý do gỡ bài tới tác giả
        diary_title = diary.title or "Không có tiêu đề"
        await NotificationService.create(
            db,
            recipient_id=diary.user_id,
            sender_id=admin.id,
            type="SYSTEM",
            title="Bài nhật ký đã được gỡ khỏi Tab Cộng đồng",
            body=f"Bài viết '{diary_title}' đã được chuyển về sổ tay riêng tư do: {payload.admin_reason}",
            target_url="/diaries",
        )

        await db.commit()
        await db.refresh(diary)

        return RevokeDiaryData(
            diary_id=diary.id,
            is_public=diary.is_public,
            is_approved=diary.is_approved,
        )

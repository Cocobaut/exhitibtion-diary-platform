from datetime import datetime, timezone
import math
from typing import Optional
import uuid
from fastapi import UploadFile
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.exceptions import AppException
from app.models.artwork import Artwork
from app.models.artwork_interaction import ArtworkInteraction
from app.models.room import Room
from app.models.user import User
from app.schemas.admin_rooms import (
    ApproveArtworkData,
    ApproveArtworkRequest,
    ApprovedArtworkListItem,
    ApprovedArtworksData,
    ApprovedPagination,
    ArchiveArtworkData,
    ArchiveArtworkRequest,
    AuthorInfo,
    EditArtworkData,
    EditArtworkRequest,
    LeafCategoriesData,
    LeafCategoryStatItem,
    PendingArtworkAuthor,
    PendingArtworkDetail,
    PendingArtworksData,
    PendingPagination,
    RejectArtworkData,
    RejectArtworkRequest,
    RoomApprovedSummary,
    UploadArtworkImageResponse,
)
from app.core.constants import ROOM3_COLOR_LEGEND
from app.services.audit_log_service import AuditLogService
from app.services.notification_service import NotificationService
from app.services.storage_service import StorageService


ROOM_CODES = {
    1: "BROKEN",
    2: "HOPE",
    3: "COMMUNITY",
}


class AdminRoomService:

    @staticmethod
    async def validate_room(db: AsyncSession, room_id: int) -> Room:
        """Validate room exists and is in {1, 2, 3}. Raise 404 ROOM_NOT_FOUND otherwise."""
        if room_id not in (1, 2, 3):
            raise AppException(
                status_code=404,
                error_code="ROOM_NOT_FOUND",
                message=f"Phòng triển lãm số {room_id} không tồn tại"
            )
        room = await db.get(Room, room_id)
        if not room:
            # Fallback room lookup or representation
            # If room isn't seeded yet in DB, check if we can synthesize or raise
            raise AppException(
                status_code=404,
                error_code="ROOM_NOT_FOUND",
                message=f"Phòng triển lãm số {room_id} không tồn tại"
            )
        return room

    @staticmethod
    def parse_artwork_id(raw_id: str) -> uuid.UUID:
        try:
            return uuid.UUID(str(raw_id))
        except (ValueError, TypeError):
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy tác phẩm triển lãm"
            )

    @staticmethod
    async def get_pending_artworks(
        db: AsyncSession,
        room_id: int,
        title: Optional[str] = None,
        author_display_name: Optional[str] = None,
        page: int = 1,
        limit: int = 15,
        sort: str = "oldest",
    ) -> PendingArtworksData:
        """9.1.1 Get pending artworks for a room."""
        room = await AdminRoomService.validate_room(db, room_id)

        base_filter = [
            Artwork.room_id == room_id,
            Artwork.status == "PENDING",
        ]

        if title:
            term = f"%{title.strip()}%"
            base_filter.append(
                or_(
                    Artwork.title.ilike(term),
                    Artwork.title_vi.ilike(term),
                    Artwork.title_en.ilike(term),
                )
            )

        if author_display_name:
            term = f"%{author_display_name.strip()}%"
            base_filter.append(Artwork.author_display_name.ilike(term))

        count_stmt = select(func.count()).select_from(Artwork).where(*base_filter)
        total_pending = (await db.scalar(count_stmt)) or 0
        total_pages = math.ceil(total_pending / limit) if limit > 0 and total_pending > 0 else 0

        query = (
            select(Artwork)
            .options(joinedload(Artwork.author))
            .where(*base_filter)
        )

        if sort == "latest":
            query = query.order_by(Artwork.created_at.desc())
        else:  # oldest default
            query = query.order_by(Artwork.created_at.asc())

        query = query.offset((page - 1) * limit).limit(limit)
        result = await db.execute(query)
        artworks = result.scalars().unique().all()

        items = []
        for a in artworks:
            author_info = PendingArtworkAuthor(
                id=a.author.id,
                username=a.author.username,
                email=a.author.email,
            )
            items.append(
                PendingArtworkDetail(
                    id=a.id,
                    original_language=a.original_language or "vi",
                    title=a.title,
                    title_vi=a.title_vi,
                    title_en=a.title_en,
                    author_display_name=a.author_display_name,
                    short_content=a.short_content,
                    short_content_vi=a.short_content_vi,
                    short_content_en=a.short_content_en,
                    content=a.content,
                    content_vi=a.content_vi,
                    content_en=a.content_en,
                    media_url=a.media_url,
                    is_anonymous=a.is_anonymous,
                    target_date=a.target_date,
                    tag_category=a.tag_category,
                    color_code=a.color_code,
                    created_at=a.created_at,
                    author=author_info,
                )
            )

        return PendingArtworksData(
            room_id=room.id,
            room_code=room.room_code,
            items=items,
            pagination=PendingPagination(
                page=page,
                limit=limit,
                total_pending=total_pending,
                total_pages=total_pages,
            ),
        )

    @staticmethod
    async def upload_artwork_image(
        room_id: int,
        file: UploadFile,
    ) -> UploadArtworkImageResponse:
        """9.1.2 Upload artwork illustration image (WebP/PNG/JPG up to 10MB)."""
        if room_id not in (1, 2, 3):
            raise AppException(
                status_code=404,
                error_code="ROOM_NOT_FOUND",
                message=f"Phòng triển lãm số {room_id} không tồn tại"
            )

        media_url = await StorageService.save(
            file=file,
            folder=f"artworks/{room_id}",
            max_bytes=10 * 1024 * 1024,
            allowed_mimes=["image/jpeg", "image/png", "image/webp"],
            file_too_large_msg="Ảnh vượt quá dung lượng tối đa 10MB",
            unsupported_type_msg="Chỉ chấp nhận ảnh WebP, PNG hoặc JPG",
        )
        return UploadArtworkImageResponse(media_url=media_url)

    @staticmethod
    async def approve_artwork(
        db: AsyncSession,
        admin: User,
        room_id: int,
        artwork_id_raw: str,
        payload: ApproveArtworkRequest,
    ) -> ApproveArtworkData:
        """9.1.3 Approve a pending artwork."""
        await AdminRoomService.validate_room(db, room_id)
        artwork_id = AdminRoomService.parse_artwork_id(artwork_id_raw)

        artwork = await db.get(Artwork, artwork_id)
        if not artwork or artwork.room_id != room_id:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy tác phẩm triển lãm"
            )

        final_media_url = payload.media_url or artwork.media_url

        # Validation Rule: Room 1 requires media_url
        if room_id == 1 and not final_media_url:
            raise AppException(
                status_code=400,
                error_code="MISSING_MEDIA_URL",
                message="Tác phẩm phòng Đổ vỡ bắt buộc phải có ảnh nghệ thuật minh họa"
            )

        now = datetime.now(timezone.utc)


        # Update bilingual fields if provided
        if payload.title_vi is not None:
            artwork.title_vi = payload.title_vi
        if payload.title_en is not None:
            artwork.title_en = payload.title_en
        if payload.short_content_vi is not None:
            artwork.short_content_vi = payload.short_content_vi
        if payload.short_content_en is not None:
            artwork.short_content_en = payload.short_content_en
        if payload.content_vi is not None:
            artwork.content_vi = payload.content_vi
        if payload.content_en is not None:
            artwork.content_en = payload.content_en

        # Update default fields if provided
        if payload.title is not None:
            artwork.title = payload.title
        elif getattr(payload, f"title_{artwork.original_language or 'vi'}") is not None:
            artwork.title = getattr(payload, f"title_{artwork.original_language or 'vi'}")
        if payload.author_display_name is not None:
            artwork.author_display_name = payload.author_display_name
        if payload.short_content is not None:
            artwork.short_content = payload.short_content
        elif getattr(payload, f"short_content_{artwork.original_language or 'vi'}") is not None:
            artwork.short_content = getattr(payload, f"short_content_{artwork.original_language or 'vi'}")
        if payload.content is not None:
            artwork.content = payload.content
        elif getattr(payload, f"content_{artwork.original_language or 'vi'}") is not None:
            artwork.content = getattr(payload, f"content_{artwork.original_language or 'vi'}")
        if payload.media_url is not None:
            artwork.media_url = payload.media_url
        if payload.tag_category is not None:
            artwork.tag_category = payload.tag_category
        if payload.color_code is not None:
            artwork.color_code = payload.color_code

        artwork.status = "APPROVED"
        artwork.reviewed_by = admin.id
        artwork.reviewed_at = now

        # Send notification to author
        notif = await NotificationService.create(
            db,
            recipient_id=artwork.user_id,
            sender_id=admin.id,
            type="SYSTEM",
            title="Tác phẩm của bạn đã được trưng bày!",
            body=f"Tác phẩm \"{artwork.title}\" của bạn đã được phê duyệt và xuất bản tại triển lãm.",
            target_url=f"/rooms/{room_id}/artworks/{artwork.id}",
        )
        notification_sent = notif is not None or artwork.user_id == admin.id

        # Audit Log
        action_type = "APPROVE_AND_UPLOAD_MEDIA" if payload.media_url else "APPROVE"
        await AuditLogService.log(
            db,
            admin_id=admin.id,
            action_type=action_type,
            artwork=artwork,
            note="Phê duyệt tác phẩm",
        )

        await db.commit()
        await db.refresh(artwork)

        return ApproveArtworkData(
            id=artwork.id,
            room_id=artwork.room_id,
            status=artwork.status,
            reviewed_by=admin.id,
            reviewed_at=artwork.reviewed_at,
            media_url=artwork.media_url,
            notification_sent=notification_sent,
        )

    @staticmethod
    async def reject_artwork(
        db: AsyncSession,
        admin: User,
        room_id: int,
        artwork_id_raw: str,
        payload: RejectArtworkRequest,
    ) -> RejectArtworkData:
        """9.1.4 Reject a pending artwork."""
        await AdminRoomService.validate_room(db, room_id)
        artwork_id = AdminRoomService.parse_artwork_id(artwork_id_raw)

        artwork = await db.get(Artwork, artwork_id)
        if not artwork or artwork.room_id != room_id:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy tác phẩm triển lãm"
            )

        now = datetime.now(timezone.utc)
        artwork.status = "REJECTED"
        artwork.admin_note = payload.admin_note
        artwork.reviewed_by = admin.id
        artwork.reviewed_at = now

        # Send notification to author with admin_note
        await NotificationService.create(
            db,
            recipient_id=artwork.user_id,
            sender_id=admin.id,
            type="SYSTEM",
            title="Tác phẩm của bạn chưa được phê duyệt",
            body=f"Tác phẩm \"{artwork.title}\" đã bị từ chối với lý do: {payload.admin_note}",
            target_url=f"/rooms/{room_id}",
        )

        # Audit Log
        await AuditLogService.log(
            db,
            admin_id=admin.id,
            action_type="REJECT",
            artwork=artwork,
            note=payload.admin_note,
        )

        await db.commit()
        await db.refresh(artwork)

        return RejectArtworkData(
            id=artwork.id,
            status=artwork.status,
            admin_note=artwork.admin_note or payload.admin_note,
            reviewed_by=admin.id,
            reviewed_at=artwork.reviewed_at,
        )

    @staticmethod
    async def get_approved_artworks(
        db: AsyncSession,
        room_id: int,
        status_filter: str = "APPROVED",
        q: Optional[str] = None,
        title: Optional[str] = None,
        author_display_name: Optional[str] = None,
        page: int = 1,
        limit: int = 15,
        sort: str = "latest",
    ) -> ApprovedArtworksData:
        """9.2.1 Get approved or archived artworks with room summary statistics."""
        room = await AdminRoomService.validate_room(db, room_id)

        # 1. Calculate room-wide summary for APPROVED artworks
        summary_query = select(
            func.count(Artwork.id).label("total_approved"),
            func.coalesce(func.sum(Artwork.view_count), 0).label("total_views"),
        ).where(
            Artwork.room_id == room_id,
            Artwork.status == "APPROVED",
        )
        summary_res = await db.execute(summary_query)
        total_approved_artworks, total_views = summary_res.one()

        # Count total reactions across all approved artworks in this room
        reaction_stmt = (
            select(func.count(ArtworkInteraction.id))
            .select_from(ArtworkInteraction)
            .join(Artwork, Artwork.id == ArtworkInteraction.artwork_id)
            .where(
                Artwork.room_id == room_id,
                Artwork.status == "APPROVED",
            )
        )
        total_reactions = (await db.scalar(reaction_stmt)) or 0

        summary = RoomApprovedSummary(
            room_id=room.id,
            room_code=room.room_code,
            total_approved_artworks=total_approved_artworks,
            total_views=int(total_views),
            total_reactions=total_reactions,
        )

        # 2. Query items
        base_filter = [
            Artwork.room_id == room_id,
            Artwork.status == status_filter,
        ]
        if q:
            term = f"%{q.strip()}%"
            base_filter.append(
                or_(
                    Artwork.title.ilike(term),
                    Artwork.title_vi.ilike(term),
                    Artwork.title_en.ilike(term),
                    Artwork.content.ilike(term),
                )
            )
        if title:
            term = f"%{title.strip()}%"
            base_filter.append(
                or_(
                    Artwork.title.ilike(term),
                    Artwork.title_vi.ilike(term),
                    Artwork.title_en.ilike(term),
                )
            )
        if author_display_name:
            term = f"%{author_display_name.strip()}%"
            base_filter.append(Artwork.author_display_name.ilike(term))

        count_items_stmt = select(func.count()).select_from(Artwork).where(*base_filter)
        total_items = (await db.scalar(count_items_stmt)) or 0
        total_pages = math.ceil(total_items / limit) if limit > 0 and total_items > 0 else 0

        # Subquery for per-artwork reaction count
        rx_subquery = (
            select(
                ArtworkInteraction.artwork_id,
                func.count(ArtworkInteraction.id).label("rx_count")
            )
            .group_by(ArtworkInteraction.artwork_id)
            .subquery()
        )

        query = (
            select(
                Artwork,
                func.coalesce(rx_subquery.c.rx_count, 0).label("reactions_count")
            )
            .outerjoin(rx_subquery, Artwork.id == rx_subquery.c.artwork_id)
            .options(joinedload(Artwork.author))
            .where(*base_filter)
        )

        if sort == "most_viewed":
            query = query.order_by(Artwork.view_count.desc(), Artwork.created_at.desc())
        elif sort == "most_interacted":
            query = query.order_by(func.coalesce(rx_subquery.c.rx_count, 0).desc(), Artwork.created_at.desc())
        else:  # latest default
            query = query.order_by(Artwork.created_at.desc())

        query = query.offset((page - 1) * limit).limit(limit)
        results = await db.execute(query)
        rows = results.all()

        items = []
        for artwork, rx_count in rows:
            items.append(
                ApprovedArtworkListItem(
                    id=artwork.id,
                    title=artwork.title,
                    title_vi=artwork.title_vi,
                    title_en=artwork.title_en,
                    short_content=artwork.short_content,
                    short_content_vi=artwork.short_content_vi,
                    short_content_en=artwork.short_content_en,
                    content=artwork.content,
                    content_vi=artwork.content_vi,
                    content_en=artwork.content_en,
                    original_language=artwork.original_language,
                    author_display_name=artwork.author_display_name,
                    media_url=artwork.media_url,
                    view_count=artwork.view_count,
                    reactions_count=rx_count,
                    status=artwork.status,
                    reviewed_at=artwork.reviewed_at,
                    tag_category=artwork.tag_category,
                    color_code=artwork.color_code,
                    author=AuthorInfo(
                        id=artwork.author.id,
                        username=artwork.author.username,
                        email=artwork.author.email,
                    ),
                )
            )

        return ApprovedArtworksData(
            summary=summary,
            items=items,
            pagination=ApprovedPagination(
                page=page,
                limit=limit,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    @staticmethod
    async def edit_artwork(
        db: AsyncSession,
        admin: User,
        room_id: int,
        artwork_id_raw: str,
        payload: EditArtworkRequest,
    ) -> EditArtworkData:
        """9.2.2 Edit an approved artwork's content and metadata."""
        await AdminRoomService.validate_room(db, room_id)
        artwork_id = AdminRoomService.parse_artwork_id(artwork_id_raw)

        artwork = await db.get(Artwork, artwork_id)
        if not artwork or artwork.room_id != room_id:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy tác phẩm triển lãm"
            )

        if payload.title_vi is not None:
            artwork.title_vi = payload.title_vi
        if payload.title_en is not None:
            artwork.title_en = payload.title_en
        if payload.short_content_vi is not None:
            artwork.short_content_vi = payload.short_content_vi
        if payload.short_content_en is not None:
            artwork.short_content_en = payload.short_content_en
        if payload.content_vi is not None:
            artwork.content_vi = payload.content_vi
        if payload.content_en is not None:
            artwork.content_en = payload.content_en

        if payload.title is not None:
            artwork.title = payload.title
        elif getattr(payload, f"title_{artwork.original_language or 'vi'}") is not None:
            artwork.title = getattr(payload, f"title_{artwork.original_language or 'vi'}")
        if payload.short_content is not None:
            artwork.short_content = payload.short_content
        elif getattr(payload, f"short_content_{artwork.original_language or 'vi'}") is not None:
            artwork.short_content = getattr(payload, f"short_content_{artwork.original_language or 'vi'}")
        if payload.content is not None:
            artwork.content = payload.content
        elif getattr(payload, f"content_{artwork.original_language or 'vi'}") is not None:
            artwork.content = getattr(payload, f"content_{artwork.original_language or 'vi'}")
        if payload.media_url is not None:
            artwork.media_url = payload.media_url
        if payload.tag_category is not None:
            artwork.tag_category = payload.tag_category
        if payload.color_code is not None:
            artwork.color_code = payload.color_code

        # Log audit
        await AuditLogService.log(
            db,
            admin_id=admin.id,
            action_type="UPDATE",
            artwork=artwork,
            note="Admin cập nhật nội dung tác phẩm",
        )

        await db.commit()
        await db.refresh(artwork)

        return EditArtworkData(
            id=artwork.id,
            updated_at=artwork.updated_at,
        )

    @staticmethod
    async def archive_artwork(
        db: AsyncSession,
        admin: User,
        room_id: int,
        artwork_id_raw: str,
        payload: ArchiveArtworkRequest,
    ) -> ArchiveArtworkData:
        """9.2.3 Archive an artwork (remove from gallery, set ARCHIVED)."""
        await AdminRoomService.validate_room(db, room_id)
        artwork_id = AdminRoomService.parse_artwork_id(artwork_id_raw)

        artwork = await db.get(Artwork, artwork_id)
        if not artwork or artwork.room_id != room_id:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy tác phẩm triển lãm"
            )

        artwork.status = "ARCHIVED"
        artwork.admin_note = payload.admin_note

        # Log audit
        await AuditLogService.log(
            db,
            admin_id=admin.id,
            action_type="ARCHIVE",
            artwork=artwork,
            note=payload.admin_note,
        )

        await db.commit()
        await db.refresh(artwork)

        return ArchiveArtworkData(
            id=artwork.id,
            status=artwork.status,
            archived_by=admin.id,
            updated_at=artwork.updated_at,
        )

    @staticmethod
    async def restore_artwork(
        db: AsyncSession,
        admin: User,
        room_id: int,
        artwork_id_raw: str,
    ):
        """Restore an archived artwork back to APPROVED status."""
        await AdminRoomService.validate_room(db, room_id)
        artwork_id = AdminRoomService.parse_artwork_id(artwork_id_raw)

        artwork = await db.get(Artwork, artwork_id)
        if not artwork or artwork.room_id != room_id:
            raise AppException(
                status_code=404,
                error_code="ARTWORK_NOT_FOUND",
                message="Không tìm thấy tác phẩm triển lãm",
            )

        artwork.status = "APPROVED"

        # Log audit
        await AuditLogService.log(
            db,
            admin_id=admin.id,
            action_type="UPDATE",
            artwork=artwork,
            note="Khôi phục tác phẩm từ kho lưu trữ về phòng triển lãm",
        )

        await db.commit()
        await db.refresh(artwork)

        return {
            "id": artwork.id,
            "status": artwork.status,
            "updated_at": artwork.updated_at,
        }

    @staticmethod
    async def get_leaf_categories(
        db: AsyncSession,
        room_id: int,
    ) -> LeafCategoriesData:
        """9.2.4 Lấy tất cả các loại lá (dải thông điệp trên Cây - Phòng 3) và số lượng từng loại."""
        await AdminRoomService.validate_room(db, room_id)
        if room_id != 3:
            raise AppException(
                status_code=400,
                error_code="INVALID_ROOM_TYPE",
                message="Chỉ Phòng 3 (Cây thông điệp) mới có phân loại lá",
            )

        stmt = select(
            Artwork.tag_category,
            func.count().label("total_count"),
            func.count().filter(Artwork.status == "APPROVED").label("approved_count"),
            func.count().filter(Artwork.status == "PENDING").label("pending_count"),
        ).where(Artwork.room_id == 3).group_by(Artwork.tag_category)

        rows = (await db.execute(stmt)).all()
        stat_map = {row.tag_category: row for row in rows}

        total_leaves = 0
        categories = []
        for item in ROOM3_COLOR_LEGEND:
            cat = item["category"]
            row = stat_map.get(cat)
            t_count = int(row.total_count) if row else 0
            a_count = int(row.approved_count) if row else 0
            p_count = int(row.pending_count) if row else 0
            total_leaves += t_count
            categories.append(
                LeafCategoryStatItem(
                    category=cat,
                    label=item["label"],
                    color_code=item["color_code"],
                    total_count=t_count,
                    approved_count=a_count,
                    pending_count=p_count,
                )
            )

        return LeafCategoriesData(
            room_id=3,
            room_code="COMMUNITY",
            total_leaves=total_leaves,
            categories=categories,
        )

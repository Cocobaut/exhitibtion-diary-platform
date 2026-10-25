from datetime import datetime, timezone
import math
from typing import Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.exceptions import AppException
from app.models.admin_audit_log import AdminAuditLog
from app.models.artwork import Artwork
from app.models.room import Room
from app.models.user import User, UserRole
from app.schemas.admin_studio import (
    AuditAdminInfo,
    AuditLogItem,
    AuditLogPagination,
    AuditLogsListData,
    RequestUserDeletionData,
    RequestUserDeletionRequest,
    StudioPublishArtworkData,
    StudioPublishArtworkRequest,
)
from app.services.audit_log_service import AuditLogService
from app.services.notification_service import NotificationService


class AdminStudioService:

    @staticmethod
    def parse_uuid(raw_id: str, error_msg: str = "Không tìm thấy tài nguyên") -> uuid.UUID:
        try:
            return uuid.UUID(str(raw_id))
        except (ValueError, TypeError):
            raise AppException(
                status_code=404,
                error_code="NOT_FOUND",
                message=error_msg
            )

    @staticmethod
    async def publish_artwork_direct(
        db: AsyncSession,
        admin: User,
        payload: StudioPublishArtworkRequest,
    ) -> StudioPublishArtworkData:
        """12.1 Xuất bản trực tiếp tác phẩm lên phòng triển lãm (không qua kiểm duyệt)."""
        room = await db.get(Room, payload.room_id)
        if not room:
            raise AppException(
                status_code=404,
                error_code="ROOM_NOT_FOUND",
                message=f"Phòng triển lãm số {payload.room_id} không tồn tại"
            )

        # Validation Rule Room 1: Bắt buộc có media_url
        if payload.room_id == 1 and not payload.media_url:
            raise AppException(
                status_code=400,
                error_code="MISSING_MEDIA_URL",
                message="Tác phẩm phòng Đổ vỡ bắt buộc phải có ảnh nghệ thuật minh họa"
            )

        now = datetime.now(timezone.utc)
        artwork = Artwork(
            user_id=admin.id,
            room_id=payload.room_id,
            title=payload.title,
            author_display_name=payload.author_display_name or "Triển Lãm Ký Ức (Ban Quản Trị)",
            is_anonymous=payload.is_anonymous,
            short_content=payload.short_content,
            content=payload.content,
            media_url=payload.media_url,
            status="APPROVED",
            reviewed_by=admin.id,
            reviewed_at=now,
            target_date=payload.target_date,
            visibility=payload.visibility,
            tag_category=payload.tag_category,
            color_code=payload.color_code,
            view_count=0,
            created_at=now,
            updated_at=now,
        )
        db.add(artwork)
        await db.flush()

        # Audit Log: Ghi nhận CREATE_DIRECT
        await AuditLogService.log(
            db,
            admin_id=admin.id,
            action_type="CREATE_DIRECT",
            artwork=artwork,
            note="Admin xuất bản bài viết trực tiếp qua Studio",
        )

        await db.commit()
        await db.refresh(artwork)

        return StudioPublishArtworkData(
            id=artwork.id,
            room_id=artwork.room_id,
            title=artwork.title,
            status=artwork.status,
            author_display_name=artwork.author_display_name,
            media_url=artwork.media_url,
            created_by=admin.id,
            created_at=artwork.created_at,
        )

    @staticmethod
    async def list_audit_logs(
        db: AsyncSession,
        room_id: Optional[int] = None,
        admin_id_raw: Optional[str] = None,
        action_type: Optional[str] = None,
        page: int = 1,
        limit: int = 15,
    ) -> AuditLogsListData:
        """12.2 Lấy danh sách lịch sử thao tác quản trị trên toàn bộ hệ thống triển lãm."""
        base_filter = []

        if room_id is not None:
            base_filter.append(AdminAuditLog.room_id == room_id)
        if admin_id_raw:
            try:
                parsed_admin_id = uuid.UUID(str(admin_id_raw))
                base_filter.append(AdminAuditLog.admin_id == parsed_admin_id)
            except (ValueError, TypeError):
                # Return empty if admin_id is invalid
                base_filter.append(AdminAuditLog.admin_id == uuid.uuid4())
        if action_type:
            base_filter.append(AdminAuditLog.action_type == action_type)

        count_stmt = select(func.count()).select_from(AdminAuditLog)
        if base_filter:
            count_stmt = count_stmt.where(*base_filter)
        total_items = (await db.scalar(count_stmt)) or 0
        total_pages = math.ceil(total_items / limit) if limit > 0 and total_items > 0 else 0

        query = (
            select(AdminAuditLog)
            .options(
                joinedload(AdminAuditLog.admin),
                joinedload(AdminAuditLog.room),
                joinedload(AdminAuditLog.artwork).joinedload(Artwork.author),
            )
        )
        if base_filter:
            query = query.where(*base_filter)

        query = query.order_by(AdminAuditLog.performed_at.desc()).offset((page - 1) * limit).limit(limit)
        result = await db.execute(query)
        logs = result.scalars().unique().all()

        items = []
        for log in logs:
            # Determine created_by_admin vs author
            created_by_obj = None
            if log.artwork and log.artwork.author:
                if log.artwork.author.role in (UserRole.ADMIN.value, UserRole.OWNER.value, "ADMIN", "OWNER"):
                    created_by_obj = AuditAdminInfo(
                        id=log.artwork.author.id,
                        username=log.artwork.author.username,
                        nickname=log.artwork.author.nickname,
                    )
            elif log.action_type == "CREATE_DIRECT" and log.admin:
                created_by_obj = AuditAdminInfo(
                    id=log.admin.id,
                    username=log.admin.username,
                    nickname=log.admin.nickname,
                )

            last_updated_by_obj = None
            if log.admin:
                last_updated_by_obj = AuditAdminInfo(
                    id=log.admin.id,
                    username=log.admin.username,
                    nickname=log.admin.nickname,
                )

            room_code_val = log.room.room_code if log.room else f"ROOM_{log.room_id}"

            items.append(
                AuditLogItem(
                    log_id=log.id,
                    artwork_id=log.artwork_id,
                    artwork_title=log.artwork_title,
                    room_id=log.room_id,
                    room_code=room_code_val,
                    action_type=log.action_type,
                    created_by_admin=created_by_obj,
                    last_updated_by_admin=last_updated_by_obj,
                    performed_at=log.performed_at,
                )
            )

        return AuditLogsListData(
            items=items,
            pagination=AuditLogPagination(
                page=page,
                limit=limit,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    @staticmethod
    async def request_user_deletion(
        db: AsyncSession,
        admin: User,
        target_user_id_raw: str,
        payload: RequestUserDeletionRequest,
    ) -> RequestUserDeletionData:
        """12.3 Admin gửi yêu cầu xóa tài khoản người dùng vi phạm đến Owner."""
        try:
            target_user_id = uuid.UUID(str(target_user_id_raw))
        except (ValueError, TypeError):
            raise AppException(
                status_code=404,
                error_code="USER_NOT_FOUND",
                message="Không tìm thấy tài khoản người dùng"
            )

        target_user = await db.get(User, target_user_id)
        if not target_user:
            raise AppException(
                status_code=404,
                error_code="USER_NOT_FOUND",
                message="Không tìm thấy tài khoản người dùng"
            )

        # Safety Guardrails:
        # 1. Admin cannot request to delete themselves
        if target_user.id == admin.id:
            raise AppException(
                status_code=400,
                error_code="INVALID_ACTION",
                message="Bạn không thể tự yêu cầu xóa tài khoản của chính mình"
            )

        # 2. Cannot request to delete an OWNER
        if target_user.role in (UserRole.OWNER.value, "OWNER"):
            raise AppException(
                status_code=403,
                error_code="FORBIDDEN",
                message="Không thể yêu cầu xóa tài khoản của Chủ sở hữu"
            )

        # Notify ALL owners
        owners_stmt = select(User).where(
            User.role.in_([UserRole.OWNER.value, "OWNER"]),
            User.is_active == True,
        )
        owners_res = await db.execute(owners_stmt)
        owners = owners_res.scalars().all()

        now = datetime.now(timezone.utc)
        for owner in owners:
            await NotificationService.create(
                db,
                recipient_id=owner.id,
                sender_id=admin.id,
                type="SYSTEM",
                title="Yêu cầu xóa tài khoản từ Quản trị viên",
                body=f"Quản trị viên '{admin.nickname}' đã đề xuất xóa tài khoản '{target_user.username}' với lý do: {payload.reason}",
                target_url=f"/owner/users/{target_user.id}",
            )

        # Audit log
        await AuditLogService.log(
            db,
            admin_id=admin.id,
            action_type="REQUEST_DELETE_USER",
            artwork_title=f"User: {target_user.username}",
            room_id=1,
            note=payload.reason,
        )

        await db.commit()

        return RequestUserDeletionData(
            target_user_id=target_user.id,
            target_username=target_user.username,
            requested_by=admin.id,
            reason=payload.reason,
            created_at=now,
        )

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
    AdminUpdateUserStatusData,
    AdminUpdateUserStatusRequest,
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
import logging

logger = logging.getLogger("uvicorn.info")


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

        # Bilingual consistency check: If bilingual fields are used, both VI and EN must be provided
        has_bilingual = any([
            payload.title_vi is not None,
            payload.title_en is not None,
            payload.content_vi is not None,
            payload.content_en is not None,
        ])
        if has_bilingual:
            if not payload.title_vi or not payload.title_en or not payload.content_vi or not payload.content_en:
                raise AppException(
                    status_code=400,
                    error_code="INCOMPLETE_BILINGUAL_CONTENT",
                    message="Vui lòng cung cấp đầy đủ cả bản tiếng Việt và tiếng Anh cho tiêu đề và nội dung tác phẩm"
                )

        now = datetime.now(timezone.utc)
        title_val = payload.title or payload.title_vi or ""
        title_vi_val = payload.title_vi or payload.title
        title_en_val = payload.title_en
        short_val = payload.short_content or payload.short_content_vi or ""
        short_vi_val = payload.short_content_vi or payload.short_content
        short_en_val = payload.short_content_en
        content_val = payload.content or payload.content_vi or ""
        content_vi_val = payload.content_vi or payload.content
        content_en_val = payload.content_en

        artwork = Artwork(
            user_id=admin.id,
            room_id=payload.room_id,
            original_language="vi",
            title=title_val,
            title_vi=title_vi_val,
            title_en=title_en_val,
            author_display_name=payload.author_display_name or "Triển Lãm Ký Ức (Ban Quản Trị)",
            is_anonymous=payload.is_anonymous,
            short_content=short_val,
            short_content_vi=short_vi_val,
            short_content_en=short_en_val,
            content=content_val,
            content_vi=content_vi_val,
            content_en=content_en_val,
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
            title_vi=artwork.title_vi,
            title_en=artwork.title_en,
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
        payload: RequestUserDeletionRequest,
        target_user_id_raw: Optional[str] = None,
    ) -> RequestUserDeletionData:
        """12.3 Admin gửi yêu cầu xóa tài khoản người dùng vi phạm đến Owner."""
        target_user: Optional[User] = None

        if target_user_id_raw:
            try:
                target_user_id = uuid.UUID(str(target_user_id_raw))
            except (ValueError, TypeError):
                raise AppException(
                    status_code=404,
                    error_code="USER_NOT_FOUND",
                    message="Không tìm thấy tài khoản người dùng",
                )

            target_user = await db.get(User, target_user_id)
            if not target_user:
                raise AppException(
                    status_code=404,
                    error_code="USER_NOT_FOUND",
                    message="Không tìm thấy tài khoản người dùng",
                )

            # Xác nhận đối chiếu danh tính: username và email phải khớp với tài khoản
            if (
                target_user.username.lower() != payload.username.strip().lower()
                or target_user.email.lower() != payload.email.strip().lower()
            ):
                raise AppException(
                    status_code=400,
                    error_code="USER_IDENTITY_MISMATCH",
                    message="Thông tin xác nhận tài khoản (username hoặc email) không khớp với tài khoản cần xóa",
                )
        else:
            # Tìm trực tiếp qua username và email
            stmt = select(User).where(
                func.lower(User.username) == payload.username.strip().lower(),
                func.lower(User.email) == payload.email.strip().lower(),
            )
            target_user = (await db.execute(stmt)).scalar_one_or_none()
            if not target_user:
                raise AppException(
                    status_code=404,
                    error_code="USER_NOT_FOUND",
                    message="Không tìm thấy tài khoản với username và email đã cung cấp",
                )

        # Safety Guardrails:
        # 1. Admin cannot request to delete themselves
        if target_user.id == admin.id:
            raise AppException(
                status_code=400,
                error_code="INVALID_ACTION",
                message="Bạn không thể tự yêu cầu xóa tài khoản của chính mình",
            )

        # 2. Cannot request to delete an OWNER
        if target_user.role in (UserRole.OWNER.value, "OWNER"):
            raise AppException(
                status_code=403,
                error_code="FORBIDDEN",
                message="Không thể yêu cầu xóa tài khoản của Chủ sở hữu",
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
                body=f"Quản trị viên '{admin.nickname}' đã đề xuất xóa tài khoản '{target_user.username}' ({target_user.email}) với lý do: {payload.reason}",
                target_url=f"/owner/users/{target_user.id}",
            )

        # Audit log
        await AuditLogService.log(
            db,
            admin_id=admin.id,
            action_type="REQUEST_DELETE_USER",
            artwork_title=f"User: {target_user.username} ({target_user.email})",
            room_id=1,
            note=payload.reason,
        )

        await db.commit()

        logger.info(
            f"[12.3] Đề xuất xóa tài khoản: '{target_user.username}' ({target_user.email}) | Admin: '{admin.username}' | Lý do: '{payload.reason}'"
        )

        return RequestUserDeletionData(
            target_user_id=target_user.id,
            target_username=target_user.username,
            requested_by=admin.id,
            reason=payload.reason,
            created_at=now,
        )

    @staticmethod
    async def update_user_status(
        db: AsyncSession,
        admin: User,
        target_user_id_raw: str,
        payload: AdminUpdateUserStatusRequest,
    ) -> AdminUpdateUserStatusData:
        """12.4 Admin hoặc Owner cập nhật trạng thái (chặn/mở chặn) người dùng."""
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
        # 1. Admin/Owner cannot deactivate themselves
        if target_user.id == admin.id:
            raise AppException(
                status_code=400,
                error_code="INVALID_ACTION",
                message="Bạn không thể tự thay đổi trạng thái tài khoản của chính mình"
            )

        # 2. Regular Admin can only block/unblock regular USER
        is_owner = admin.role in (UserRole.OWNER.value, "OWNER")
        if not is_owner:
            if target_user.role in (UserRole.ADMIN.value, UserRole.OWNER.value, "ADMIN", "OWNER"):
                raise AppException(
                    status_code=403,
                    error_code="FORBIDDEN",
                    message="Quản trị viên chỉ có quyền thay đổi trạng thái của người dùng thông thường"
                )
        else:
            # Owner cannot change status of another Owner
            if target_user.role in (UserRole.OWNER.value, "OWNER"):
                raise AppException(
                    status_code=403,
                    error_code="FORBIDDEN",
                    message="Không thể thay đổi trạng thái của tài khoản Chủ sở hữu khác"
                )

        now = datetime.now(timezone.utc)
        target_user.is_active = payload.is_active
        target_user.updated_at = now

        # Audit log
        action = "ACTIVATE_USER" if payload.is_active else "DEACTIVATE_USER"
        await AuditLogService.log(
            db,
            admin_id=admin.id,
            action_type=action,
            artwork_title=f"User: {target_user.username}",
            room_id=1,
            note=payload.reason or f"Admin changed status to {payload.is_active}",
        )

        await db.commit()
        await db.refresh(target_user)

        return AdminUpdateUserStatusData(
            id=target_user.id,
            username=target_user.username,
            role=target_user.role,
            is_active=target_user.is_active,
            updated_at=target_user.updated_at,
        )


from datetime import datetime, timezone
import math
from typing import Optional
import uuid
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.models.artwork import Artwork
from app.models.diary import Diary
from app.models.message_capsule import MessageCapsule
from app.models.notification import Notification
from app.models.user import User, UserRole
from app.models.user_capsule_draw import UserCapsuleDraw
from app.schemas.owner import (
    CapsulesSummary,
    DeleteUserData,
    DiariesSummary,
    ExhibitionSummary,
    OwnerUserDetailData,
    OwnerUserItem,
    OwnerUserPagination,
    OwnerUsersListData,
    SystemStatsData,
    UpdateUserRoleData,
    UpdateUserRoleRequest,
    UpdateUserStatusData,
    UpdateUserStatusRequest,
    UserActivityStats,
    UsersSummary,
)
from app.services.audit_log_service import AuditLogService


class OwnerService:

    @staticmethod
    def parse_user_id(raw_id: str) -> uuid.UUID:
        try:
            return uuid.UUID(str(raw_id))
        except (ValueError, TypeError):
            raise AppException(
                status_code=404,
                error_code="USER_NOT_FOUND",
                message="Không tìm thấy tài khoản người dùng"
            )

    @staticmethod
    async def list_users(
        db: AsyncSession,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        q: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> OwnerUsersListData:
        """13.1 Lấy danh sách toàn bộ người dùng, quản trị viên và chủ sở hữu trên hệ thống."""
        base_filter = []

        if role:
            base_filter.append(User.role == role)
        if is_active is not None:
            base_filter.append(User.is_active == is_active)
        if q:
            term = f"%{q.strip()}%"
            base_filter.append(
                or_(
                    User.username.ilike(term),
                    User.email.ilike(term),
                    User.nickname.ilike(term),
                )
            )

        count_stmt = select(func.count()).select_from(User)
        if base_filter:
            count_stmt = count_stmt.where(*base_filter)
        total_items = (await db.scalar(count_stmt)) or 0
        total_pages = math.ceil(total_items / limit) if limit > 0 and total_items > 0 else 0

        query = select(User)
        if base_filter:
            query = query.where(*base_filter)
        query = query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)

        result = await db.execute(query)
        users = result.scalars().all()

        items = [OwnerUserItem.model_validate(u) for u in users]

        return OwnerUsersListData(
            items=items,
            pagination=OwnerUserPagination(
                page=page,
                limit=limit,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    @staticmethod
    async def get_user_detail(
        db: AsyncSession,
        user_id_raw: str,
    ) -> OwnerUserDetailData:
        """13.2 Xem chi tiết một tài khoản kèm số liệu thống kê hoạt động."""
        user_id = OwnerService.parse_user_id(user_id_raw)
        user = await db.get(User, user_id)

        if not user:
            raise AppException(
                status_code=404,
                error_code="USER_NOT_FOUND",
                message="Không tìm thấy tài khoản người dùng"
            )

        # Count artworks
        artworks_count = (await db.scalar(
            select(func.count(Artwork.id)).where(Artwork.user_id == user_id)
        )) or 0

        # Count diaries
        diaries_count = (await db.scalar(
            select(func.count(Diary.id)).where(Diary.user_id == user_id)
        )) or 0

        # Count notifications
        notifications_count = (await db.scalar(
            select(func.count(Notification.id)).where(Notification.recipient_id == user_id)
        )) or 0

        stats = UserActivityStats(
            artworks_count=artworks_count,
            diaries_count=diaries_count,
            notifications_count=notifications_count,
        )

        return OwnerUserDetailData(
            id=user.id,
            username=user.username,
            email=user.email,
            nickname=user.nickname,
            role=user.role,
            avatar_url=user.avatar_url,
            bio=user.bio,
            is_active=user.is_active,
            stats=stats,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    @staticmethod
    async def update_user_status(
        db: AsyncSession,
        owner: User,
        user_id_raw: str,
        payload: UpdateUserStatusRequest,
    ) -> UpdateUserStatusData:
        """13.3 Kích hoạt lại hoặc vô hiệu hóa tài khoản bất kỳ (kể cả admin)."""
        user_id = OwnerService.parse_user_id(user_id_raw)
        target_user = await db.get(User, user_id)

        if not target_user:
            raise AppException(
                status_code=404,
                error_code="USER_NOT_FOUND",
                message="Không tìm thấy tài khoản người dùng"
            )

        # Safety Guardrails:
        # 1. Owner cannot change their own active status
        if target_user.id == owner.id:
            raise AppException(
                status_code=400,
                error_code="INVALID_ACTION",
                message="Chủ sở hữu không thể tự thao tác trên tài khoản của chính mình"
            )

        # 2. Cannot deactivate another OWNER
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
            admin_id=owner.id,
            action_type=action,
            artwork_title=f"User: {target_user.username}",
            room_id=1,
            note=payload.reason or f"Owner changed status to {payload.is_active}",
        )

        await db.commit()
        await db.refresh(target_user)

        return UpdateUserStatusData(
            id=target_user.id,
            username=target_user.username,
            role=target_user.role,
            is_active=target_user.is_active,
            updated_at=target_user.updated_at,
        )

    @staticmethod
    async def update_user_role(
        db: AsyncSession,
        owner: User,
        user_id_raw: str,
        payload: UpdateUserRoleRequest,
    ) -> UpdateUserRoleData:
        """13.4 Cập nhật vai trò tài khoản (USER <-> ADMIN)."""
        user_id = OwnerService.parse_user_id(user_id_raw)
        target_user = await db.get(User, user_id)

        if not target_user:
            raise AppException(
                status_code=404,
                error_code="USER_NOT_FOUND",
                message="Không tìm thấy tài khoản người dùng"
            )

        # Safety Guardrails:
        # 1. Owner cannot change their own role
        if target_user.id == owner.id:
            raise AppException(
                status_code=400,
                error_code="INVALID_ACTION",
                message="Chủ sở hữu không thể tự thao tác trên tài khoản của chính mình"
            )

        # 2. Cannot demote another OWNER
        if target_user.role in (UserRole.OWNER.value, "OWNER"):
            raise AppException(
                status_code=403,
                error_code="FORBIDDEN",
                message="Không thể thay đổi vai trò của tài khoản Chủ sở hữu khác"
            )

        old_role = target_user.role
        now = datetime.now(timezone.utc)
        target_user.role = payload.role
        target_user.updated_at = now

        # Audit log
        await AuditLogService.log(
            db,
            admin_id=owner.id,
            action_type="UPDATE_USER_ROLE",
            artwork_title=f"User: {target_user.username}",
            room_id=1,
            note=f"Changed role from {old_role} to {payload.role}",
        )

        await db.commit()
        await db.refresh(target_user)

        return UpdateUserRoleData(
            id=target_user.id,
            username=target_user.username,
            old_role=old_role,
            new_role=target_user.role,
            updated_at=target_user.updated_at,
        )

    @staticmethod
    async def delete_user(
        db: AsyncSession,
        owner: User,
        user_id_raw: str,
    ) -> DeleteUserData:
        """13.5 Xóa vĩnh viễn tài khoản người dùng hoặc admin khỏi hệ thống."""
        user_id = OwnerService.parse_user_id(user_id_raw)
        target_user = await db.get(User, user_id)

        if not target_user:
            raise AppException(
                status_code=404,
                error_code="USER_NOT_FOUND",
                message="Không tìm thấy tài khoản người dùng"
            )

        # Safety Guardrails:
        # 1. Owner cannot delete themselves
        if target_user.id == owner.id:
            raise AppException(
                status_code=400,
                error_code="INVALID_ACTION",
                message="Chủ sở hữu không thể tự thao tác trên tài khoản của chính mình"
            )

        # 2. Cannot delete another OWNER
        if target_user.role in (UserRole.OWNER.value, "OWNER"):
            raise AppException(
                status_code=403,
                error_code="FORBIDDEN",
                message="Không thể xóa tài khoản của Chủ sở hữu khác"
            )

        now = datetime.now(timezone.utc)
        target_username = target_user.username

        # Audit log before deletion
        await AuditLogService.log(
            db,
            admin_id=owner.id,
            action_type="DELETE_USER",
            artwork_title=f"User: {target_username}",
            room_id=1,
            note=f"Permanently deleted user {target_username} (ID: {target_user.id})",
        )

        await db.delete(target_user)
        await db.commit()

        return DeleteUserData(
            id=user_id,
            username=target_username,
            deleted_at=now,
        )

    @staticmethod
    async def get_system_stats(
        db: AsyncSession,
    ) -> SystemStatsData:
        """13.6 Lấy thống kê tổng quan toàn hệ thống."""
        # 1. Users Summary
        total_users = (await db.scalar(select(func.count(User.id)))) or 0
        active_users = (await db.scalar(select(func.count(User.id)).where(User.is_active == True))) or 0
        deactivated_users = total_users - active_users

        # Roles breakdown
        role_rows = (await db.execute(
            select(User.role, func.count(User.id)).group_by(User.role)
        )).all()
        by_role = {role: count for role, count in role_rows}

        users_summary = UsersSummary(
            total_users=total_users,
            active_users=active_users,
            deactivated_users=deactivated_users,
            by_role=by_role,
        )

        # 2. Exhibition Artworks Summary
        total_artworks = (await db.scalar(select(func.count(Artwork.id)))) or 0
        pending_artworks = (await db.scalar(select(func.count(Artwork.id)).where(Artwork.status == "PENDING"))) or 0
        approved_artworks = (await db.scalar(select(func.count(Artwork.id)).where(Artwork.status == "APPROVED"))) or 0
        archived_artworks = (await db.scalar(select(func.count(Artwork.id)).where(Artwork.status == "ARCHIVED"))) or 0

        exhibition_summary = ExhibitionSummary(
            total_artworks=total_artworks,
            pending_artworks=pending_artworks,
            approved_artworks=approved_artworks,
            archived_artworks=archived_artworks,
        )

        # 3. Diaries Summary
        total_diaries = (await db.scalar(select(func.count(Diary.id)))) or 0
        public_diaries = (await db.scalar(select(func.count(Diary.id)).where(Diary.is_public == True))) or 0
        pending_approval_diaries = (await db.scalar(
            select(func.count(Diary.id)).where(Diary.is_public == True, Diary.is_approved == False)
        )) or 0

        diaries_summary = DiariesSummary(
            total_diaries=total_diaries,
            public_diaries=public_diaries,
            pending_approval=pending_approval_diaries,
        )

        # 4. Capsules Summary
        total_capsules = (await db.scalar(select(func.count(MessageCapsule.id)))) or 0
        total_draws = (await db.scalar(select(func.count(UserCapsuleDraw.id)))) or 0

        capsules_summary = CapsulesSummary(
            total_capsules=total_capsules,
            total_draws=total_draws,
        )

        return SystemStatsData(
            users_summary=users_summary,
            exhibition_summary=exhibition_summary,
            diaries_summary=diaries_summary,
            capsules_summary=capsules_summary,
        )

from datetime import datetime, timezone
import math
from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.exceptions import AppException
from app.models.message_capsule import MessageCapsule
from app.models.user import User, UserRole
from app.schemas.admin_capsules import (
    AdminCapsuleItem,
    AdminCapsulePagination,
    AdminCapsulesListData,
    CapsuleAuthorInfo,
    CreateCapsuleData,
    CreateCapsuleRequest,
    ToggleCapsuleStatusData,
    ToggleCapsuleStatusRequest,
    UpdateCapsuleData,
    UpdateCapsuleRequest,
)


class AdminCapsuleService:

    @staticmethod
    def parse_capsule_id(raw_id: str) -> int:
        try:
            val = int(raw_id)
            if val <= 0:
                raise ValueError()
            return val
        except (ValueError, TypeError):
            raise AppException(
                status_code=404,
                error_code="CAPSULE_NOT_FOUND",
                message="Không tìm thấy thông điệp"
            )

    @staticmethod
    async def list_capsules(
        db: AsyncSession,
        category: Optional[str] = None,
        is_approved: Optional[bool] = None,
        page: int = 1,
        limit: int = 20,
    ) -> AdminCapsulesListData:
        """11.1 Lấy danh sách thông điệp trong kho có lọc category, is_approved, phân trang."""
        base_filter = []

        if category:
            base_filter.append(MessageCapsule.category == category)
        if is_approved is not None:
            base_filter.append(MessageCapsule.is_approved == is_approved)

        count_stmt = select(func.count()).select_from(MessageCapsule)
        if base_filter:
            count_stmt = count_stmt.where(*base_filter)
        total_items = (await db.scalar(count_stmt)) or 0
        total_pages = math.ceil(total_items / limit) if limit > 0 and total_items > 0 else 0

        query = select(MessageCapsule).options(joinedload(MessageCapsule.author))
        if base_filter:
            query = query.where(*base_filter)
        query = query.order_by(MessageCapsule.id.desc()).offset((page - 1) * limit).limit(limit)

        result = await db.execute(query)
        capsules = result.scalars().unique().all()

        items = []
        for c in capsules:
            author_obj = None
            if c.author:
                author_obj = CapsuleAuthorInfo(
                    id=c.author.id,
                    nickname=c.author.nickname,
                    role=c.author.role,
                )
            items.append(
                AdminCapsuleItem(
                    id=c.id,
                    message=c.message,
                    category=c.category,
                    draw_count=c.draw_count,
                    is_approved=c.is_approved,
                    author=author_obj,
                    created_at=c.created_at,
                    updated_at=c.updated_at,
                )
            )

        return AdminCapsulesListData(
            items=items,
            pagination=AdminCapsulePagination(
                page=page,
                limit=limit,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    @staticmethod
    async def create_capsule(
        db: AsyncSession,
        admin: User,
        payload: CreateCapsuleRequest,
    ) -> CreateCapsuleData:
        """11.2 Thêm mới thông điệp vào kho dữ liệu.
        Quy tắc:
        - author_id = admin.id
        - author_role = admin.role ('ADMIN' hoặc 'OWNER' theo enum hợp lệ)
        - draw_count = 0
        """
        now = datetime.now(timezone.utc)
        author_role_val = admin.role if admin.role in (UserRole.ADMIN.value, UserRole.OWNER.value) else "ADMIN"

        new_capsule = MessageCapsule(
            author_id=admin.id,
            author_role=author_role_val,
            message=payload.message,
            category=payload.category,
            is_approved=payload.is_approved,
            draw_count=0,
            created_at=now,
            updated_at=now,
        )
        db.add(new_capsule)
        await db.commit()
        await db.refresh(new_capsule)

        return CreateCapsuleData(
            id=new_capsule.id,
            message=new_capsule.message,
            category=new_capsule.category,
            author_role=new_capsule.author_role or "ADMIN",
            is_approved=new_capsule.is_approved,
            draw_count=new_capsule.draw_count,
            created_at=new_capsule.created_at,
        )

    @staticmethod
    async def update_capsule(
        db: AsyncSession,
        capsule_id_raw: str,
        payload: UpdateCapsuleRequest,
    ) -> UpdateCapsuleData:
        """11.3 Cập nhật nội dung và chủ đề thông điệp."""
        capsule_id = AdminCapsuleService.parse_capsule_id(capsule_id_raw)
        capsule = await db.get(MessageCapsule, capsule_id)

        if not capsule:
            raise AppException(
                status_code=404,
                error_code="CAPSULE_NOT_FOUND",
                message="Không tìm thấy thông điệp"
            )

        now = datetime.now(timezone.utc)
        capsule.message = payload.message
        capsule.category = payload.category
        capsule.updated_at = now

        await db.commit()
        await db.refresh(capsule)

        return UpdateCapsuleData(
            id=capsule.id,
            message=capsule.message,
            category=capsule.category,
            updated_at=capsule.updated_at,
        )

    @staticmethod
    async def toggle_status(
        db: AsyncSession,
        capsule_id_raw: str,
        payload: ToggleCapsuleStatusRequest,
    ) -> ToggleCapsuleStatusData:
        """11.4 Bật / Tắt trạng thái hoạt động của thông điệp."""
        capsule_id = AdminCapsuleService.parse_capsule_id(capsule_id_raw)
        capsule = await db.get(MessageCapsule, capsule_id)

        if not capsule:
            raise AppException(
                status_code=404,
                error_code="CAPSULE_NOT_FOUND",
                message="Không tìm thấy thông điệp"
            )

        now = datetime.now(timezone.utc)
        capsule.is_approved = payload.is_approved
        capsule.updated_at = now

        await db.commit()
        await db.refresh(capsule)

        return ToggleCapsuleStatusData(
            id=capsule.id,
            is_approved=capsule.is_approved,
        )

    @staticmethod
    async def delete_capsule(
        db: AsyncSession,
        capsule_id_raw: str,
    ) -> None:
        """11.5 Xóa thông điệp khỏi kho dữ liệu.
        Quy tắc:
        - Kiểm tra tồn tại. Không có -> 404.
        - Nếu draw_count > 0: Chặn xóa với 400 để bảo đảm dữ liệu người dùng.
        - Nếu draw_count = 0: Xóa an toàn.
        """
        capsule_id = AdminCapsuleService.parse_capsule_id(capsule_id_raw)
        capsule = await db.get(MessageCapsule, capsule_id)

        if not capsule:
            raise AppException(
                status_code=404,
                error_code="CAPSULE_NOT_FOUND",
                message="Không tìm thấy thông điệp"
            )

        if capsule.draw_count > 0:
            raise AppException(
                status_code=400,
                error_code="CAPSULE_CANNOT_BE_DELETED",
                message="Thông điệp đã có người rút trúng, hãy sử dụng tính năng tắt trạng thái thay vì xóa"
            )

        await db.delete(capsule)
        await db.commit()

from datetime import datetime, timezone
import math
from typing import Optional, Tuple
import uuid
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import CAPSULE_CATEGORIES
from app.core.exceptions import AppException
from app.models.message_capsule import MessageCapsule
from app.models.user_capsule_draw import UserCapsuleDraw
from app.schemas.capsule import (
    DrawCapsuleData,
    PaginationInfo,
    SaveDrawData,
    SavedCapsuleItem,
    SavedCapsulesData,
)


class CapsuleService:
    @staticmethod
    async def draw(
        db: AsyncSession,
        user_id: uuid.UUID,
        category: Optional[str] = None,
    ) -> DrawCapsuleData:
        """3.1 Rút ngẫu nhiên một thông điệp (toàn kho hoặc theo thể loại)."""
        if category is not None and category not in CAPSULE_CATEGORIES:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Thể loại thông điệp không hợp lệ. Chỉ chấp nhận: HEALING, COURAGE, PERSPECTIVE."
            )

        query = select(MessageCapsule.id).where(MessageCapsule.is_approved == True)
        if category:
            query = query.where(MessageCapsule.category == category)
        query = query.order_by(func.random()).limit(1)

        capsule_id = await db.scalar(query)
        if not capsule_id:
            raise AppException(
                status_code=404,
                error_code="CAPSULE_POOL_EMPTY",
                message="Kho thông điệp hiện đang trống hoặc chưa có thông điệp nào được duyệt"
            )

        capsule = await db.get(MessageCapsule, capsule_id)
        if not capsule:
            raise AppException(
                status_code=404,
                error_code="CAPSULE_POOL_EMPTY",
                message="Kho thông điệp hiện đang trống hoặc chưa có thông điệp nào được duyệt"
            )

        # Atomic increment draw_count: SET draw_count = draw_count + 1
        capsule.draw_count = MessageCapsule.draw_count + 1

        # Insert user capsule draw record
        draw = UserCapsuleDraw(
            user_id=user_id,
            capsule_id=capsule_id,
            is_saved=False,
        )
        db.add(draw)
        await db.commit()
        await db.refresh(draw)

        # Select message based on language if available
        msg_vi = capsule.message_vi if capsule.message_vi else capsule.message
        msg_en = capsule.message_en if capsule.message_en else capsule.message

        return DrawCapsuleData(
            draw_id=draw.id,
            capsule_id=capsule.id,
            message=msg_vi,
            message_vi=msg_vi,
            message_en=msg_en,
            category=capsule.category,
            is_saved=draw.is_saved,
            drawn_at=draw.drawn_at,
        )

    @staticmethod
    async def save_draw(
        db: AsyncSession,
        user_id: uuid.UUID,
        draw_id_raw: str,
        is_saved: bool,
    ) -> Tuple[SaveDrawData, str]:
        """3.2 Đánh dấu lưu / bỏ lưu thông điệp vào sổ tay cá nhân."""
        try:
            draw_uuid = uuid.UUID(str(draw_id_raw))
        except (ValueError, TypeError):
            raise AppException(
                status_code=404,
                error_code="DRAW_NOT_FOUND",
                message="Không tìm thấy lượt rút thông điệp"
            )

        draw = await db.get(UserCapsuleDraw, draw_uuid)
        if not draw:
            raise AppException(
                status_code=404,
                error_code="DRAW_NOT_FOUND",
                message="Không tìm thấy lượt rút thông điệp"
            )

        if draw.user_id != user_id:
            raise AppException(
                status_code=403,
                error_code="FORBIDDEN",
                message="Bạn không có quyền cập nhật lượt rút này"
            )

        draw.is_saved = is_saved
        await db.commit()

        now_utc = datetime.now(timezone.utc)
        message = "Đã lưu thông điệp vào sổ tay cá nhân" if is_saved else "Đã bỏ lưu thông điệp khỏi sổ tay"

        data = SaveDrawData(
            draw_id=draw.id,
            is_saved=draw.is_saved,
            updated_at=now_utc,
        )
        return data, message

    @staticmethod
    async def get_saved(
        db: AsyncSession,
        user_id: uuid.UUID,
        page: int = 1,
        limit: int = 10,
        category: Optional[str] = None,
    ) -> SavedCapsulesData:
        """3.3 Lấy danh sách thông điệp đã lưu có phân trang và lọc theo thể loại."""
        if category is not None and category not in CAPSULE_CATEGORIES:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Thể loại thông điệp không hợp lệ. Chỉ chấp nhận: HEALING, COURAGE, PERSPECTIVE."
            )

        base_query = (
            select(
                UserCapsuleDraw.id.label("draw_id"),
                MessageCapsule.id.label("capsule_id"),
                MessageCapsule.message,
                MessageCapsule.message_vi,
                MessageCapsule.message_en,
                MessageCapsule.category,
                UserCapsuleDraw.drawn_at,
            )
            .join(MessageCapsule, MessageCapsule.id == UserCapsuleDraw.capsule_id)
            .where(
                UserCapsuleDraw.user_id == user_id,
                UserCapsuleDraw.is_saved == True,
            )
        )
        count_query = (
            select(func.count(UserCapsuleDraw.id))
            .join(MessageCapsule, MessageCapsule.id == UserCapsuleDraw.capsule_id)
            .where(
                UserCapsuleDraw.user_id == user_id,
                UserCapsuleDraw.is_saved == True,
            )
        )

        if category:
            base_query = base_query.where(MessageCapsule.category == category)
            count_query = count_query.where(MessageCapsule.category == category)

        total_items = (await db.scalar(count_query)) or 0
        total_pages = math.ceil(total_items / limit) if limit > 0 and total_items > 0 else 0

        items_stmt = (
            base_query
            .order_by(UserCapsuleDraw.drawn_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        rows = (await db.execute(items_stmt)).all()

        items = [
            SavedCapsuleItem(
                draw_id=r.draw_id,
                capsule_id=r.capsule_id,
                message=r.message_vi if r.message_vi else r.message,
                message_vi=r.message_vi if r.message_vi else r.message,
                message_en=r.message_en if r.message_en else r.message,
                category=r.category,
                drawn_at=r.drawn_at,
            )
            for r in rows
        ]

        return SavedCapsulesData(
            items=items,
            pagination=PaginationInfo(
                page=page,
                limit=limit,
                total_items=total_items,
                total_pages=total_pages,
            )
        )

    @staticmethod
    async def delete_saved(
        db: AsyncSession,
        user_id: uuid.UUID,
        draw_id_raw: str,
    ) -> None:
        """3.4 Bỏ lưu thông điệp khỏi sổ tay (giữ bản ghi lượt rút với is_saved = False)."""
        try:
            draw_uuid = uuid.UUID(str(draw_id_raw))
        except (ValueError, TypeError):
            raise AppException(
                status_code=404,
                error_code="DRAW_NOT_FOUND",
                message="Không tìm thấy lượt rút thông điệp"
            )

        draw = await db.get(UserCapsuleDraw, draw_uuid)
        if not draw or not draw.is_saved:
            raise AppException(
                status_code=404,
                error_code="DRAW_NOT_FOUND",
                message="Không tìm thấy lượt rút thông điệp"
            )

        if draw.user_id != user_id:
            raise AppException(
                status_code=403,
                error_code="FORBIDDEN",
                message="Bạn không có quyền cập nhật lượt rút này"
            )

        draw.is_saved = False
        await db.commit()

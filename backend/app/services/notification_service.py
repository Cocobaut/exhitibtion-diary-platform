from datetime import datetime
import math
from typing import List, Optional
import uuid
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.exceptions import AppException
from app.models.notification import Notification
from app.schemas.notification import (
    MarkReadData,
    NotificationItem,
    NotificationListData,
    NotificationPagination,
    NotificationSender,
)


class NotificationService:
    @staticmethod
    async def create(
        db: AsyncSession,
        *,
        recipient_id: uuid.UUID,
        type: str,
        title: str,
        body: str,
        target_url: Optional[str] = None,
        sender_id: Optional[uuid.UUID] = None,
    ) -> Optional[Notification]:
        """Tạo thông báo mới dùng chung cho toàn hệ thống (Plan 00 §6.1).
        Quy tắc:
        - Chỉ INSERT, KHÔNG commit — commit cùng transaction của nghiệp vụ gọi nó.
        - type ∈ {INTERACTION, CAPSULE, SYSTEM, REMINDER}.
        - sender_id = None đối với tương tác (INTERACTION) để bảo vệ ẩn danh.
        - Không gửi thông báo khi người tương tác chính là tác giả (recipient_id == sender_id).
        """
        if sender_id is not None and recipient_id == sender_id:
            return None

        notification = Notification(
            recipient_id=recipient_id,
            sender_id=sender_id,
            type=type,
            title=title,
            body=body,
            target_url=target_url,
            is_read=False,
        )
        db.add(notification)
        return notification

    @staticmethod
    async def count_unread(db: AsyncSession, recipient_id: uuid.UUID) -> int:
        """4.1 Đếm số lượng thông báo chưa đọc của user.
        Query: SELECT count(*) FROM notifications WHERE recipient_id = :uid AND is_read = FALSE
        Dùng đúng cú pháp để planner kích hoạt partial index idx_notifications_recipient_unread.
        """
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.recipient_id == recipient_id,
                Notification.is_read == False,
            )
        )
        count = await db.scalar(stmt)
        return count or 0

    @staticmethod
    async def list_notifications(
        db: AsyncSession,
        recipient_id: uuid.UUID,
        page: int = 1,
        limit: int = 15,
        is_read: Optional[bool] = None,
    ) -> NotificationListData:
        """4.2 Danh sách thông báo có phân trang, sắp xếp created_at DESC và ánh xạ sender."""
        base_filter = [Notification.recipient_id == recipient_id]
        if is_read is not None:
            base_filter.append(Notification.is_read == is_read)

        count_stmt = (
            select(func.count())
            .select_from(Notification)
            .where(*base_filter)
        )
        total_items = (await db.scalar(count_stmt)) or 0
        total_pages = math.ceil(total_items / limit) if limit > 0 and total_items > 0 else 0

        stmt = (
            select(Notification)
            .options(joinedload(Notification.sender))
            .where(*base_filter)
            .order_by(Notification.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        result = await db.execute(stmt)
        notifications = result.scalars().unique().all()

        items: List[NotificationItem] = []
        for n in notifications:
            # Ánh xạ sender theo đúng quy tắc 3 trường hợp (§3)
            if n.sender_id is not None and n.sender:
                sender_obj = NotificationSender(
                    nickname=n.sender.nickname,
                    avatar_url=n.sender.avatar_url,
                )
            elif n.type == "INTERACTION":
                sender_obj = NotificationSender(
                    nickname="Người Bạn Ẩn Danh",
                    avatar_url=None,
                )
            else:
                sender_obj = NotificationSender(
                    nickname="Ban Quản Trị",
                    avatar_url=None,
                )

            items.append(
                NotificationItem(
                    id=n.id,
                    type=n.type,
                    title=n.title,
                    body=n.body,
                    target_url=n.target_url,
                    is_read=n.is_read,
                    sender=sender_obj,
                    created_at=n.created_at,
                )
            )

        return NotificationListData(
            items=items,
            pagination=NotificationPagination(
                page=page,
                limit=limit,
                total_items=total_items,
                total_pages=total_pages,
            ),
        )

    @staticmethod
    async def mark_as_read(
        db: AsyncSession,
        notification_id_raw: str,
        recipient_id: uuid.UUID,
    ) -> MarkReadData:
        """4.3 Đánh dấu một thông báo đã đọc (idempotent, trả 404 nếu không tìm thấy hoặc không thuộc về user)."""
        try:
            notif_uuid = uuid.UUID(str(notification_id_raw))
        except (ValueError, TypeError):
            raise AppException(
                status_code=404,
                error_code="NOTIFICATION_NOT_FOUND",
                message="Không tìm thấy thông báo"
            )

        notification = await db.scalar(
            select(Notification).where(
                Notification.id == notif_uuid,
                Notification.recipient_id == recipient_id,
            )
        )
        if not notification:
            raise AppException(
                status_code=404,
                error_code="NOTIFICATION_NOT_FOUND",
                message="Không tìm thấy thông báo"
            )

        notification.is_read = True
        await db.commit()

        return MarkReadData(
            notification_id=notification.id,
            is_read=True,
            target_url=notification.target_url,
        )

    @staticmethod
    async def mark_all_as_read(
        db: AsyncSession,
        recipient_id: uuid.UUID,
    ) -> int:
        """4.4 Đánh dấu tất cả thông báo chưa đọc của user là đã đọc."""
        stmt = (
            update(Notification)
            .where(
                Notification.recipient_id == recipient_id,
                Notification.is_read == False,
            )
            .values(is_read=True)
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount or 0

    @staticmethod
    async def bulk_mark_as_read(
        db: AsyncSession,
        recipient_id: uuid.UUID,
        notification_ids: List[str],
    ) -> int:
        """4.5 Đánh dấu nhiều thông báo là đã đọc."""
        valid_uuids: List[uuid.UUID] = []
        for nid in notification_ids:
            try:
                valid_uuids.append(uuid.UUID(str(nid)))
            except (ValueError, TypeError):
                continue

        if not valid_uuids:
            return 0

        stmt = (
            update(Notification)
            .where(
                Notification.recipient_id == recipient_id,
                Notification.id.in_(valid_uuids),
                Notification.is_read == False,
            )
            .values(is_read=True)
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount or 0


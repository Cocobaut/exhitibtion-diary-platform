from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.notification import (
    MarkReadResponse,
    NotificationListResponse,
    ReadAllData,
    ReadAllResponse,
    UnreadCountData,
    UnreadCountResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter()


# =====================================================================
# 4.1 GET /notifications/unread-count
# (Phải khai báo trước route có path param /{notification_id}/...)
# =====================================================================
@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    status_code=status.HTTP_200_OK,
    summary="Đếm số lượng thông báo chưa đọc"
)
async def get_unread_count(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> UnreadCountResponse:
    """4.1 Đếm số lượng thông báo chưa đọc của người dùng hiện tại."""
    count = await NotificationService.count_unread(db, recipient_id=current_user.id)
    return UnreadCountResponse(
        success=True,
        data=UnreadCountData(unread_count=count)
    )


# =====================================================================
# 4.4 PATCH /notifications/read-all
# (Phải khai báo trước route có path param /{notification_id}/...)
# =====================================================================
@router.patch(
    "/read-all",
    response_model=ReadAllResponse,
    status_code=status.HTTP_200_OK,
    summary="Đánh dấu tất cả thông báo là đã đọc"
)
async def mark_all_read(
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> ReadAllResponse:
    """4.4 Đánh dấu tất cả thông báo chưa đọc của người dùng hiện tại là đã đọc."""
    affected_rows = await NotificationService.mark_all_as_read(db, recipient_id=current_user.id)
    return ReadAllResponse(
        success=True,
        message="Đã đánh dấu tất cả thông báo là đã đọc",
        data=ReadAllData(affected_rows=affected_rows)
    )


# =====================================================================
# 4.2 GET /notifications
# =====================================================================
@router.get(
    "",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy danh sách thông báo của người dùng"
)
async def list_notifications(
    page: int = Query(1, ge=1, description="Số trang (bắt đầu từ 1)"),
    limit: int = Query(15, ge=1, le=50, description="Số lượng mục trên mỗi trang (tối đa 50)"),
    is_read: Optional[bool] = Query(None, description="Lọc theo trạng thái đã đọc (true/false, bỏ trống = tất cả)"),
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> NotificationListResponse:
    """4.2 Danh sách thông báo của tài khoản hiện tại, sắp xếp mới nhất trước."""
    data = await NotificationService.list_notifications(
        db=db,
        recipient_id=current_user.id,
        page=page,
        limit=limit,
        is_read=is_read
    )
    return NotificationListResponse(
        success=True,
        data=data
    )


# =====================================================================
# 4.3 PATCH /notifications/{notification_id}/read
# =====================================================================
@router.patch(
    "/{notification_id}/read",
    response_model=MarkReadResponse,
    status_code=status.HTTP_200_OK,
    summary="Đánh dấu một thông báo là đã đọc"
)
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> MarkReadResponse:
    """4.3 Đánh dấu thông báo cụ thể là đã đọc."""
    data = await NotificationService.mark_as_read(
        db=db,
        notification_id_raw=notification_id,
        recipient_id=current_user.id
    )
    return MarkReadResponse(
        success=True,
        message="Đã đánh dấu thông báo là đã đọc",
        data=data
    )

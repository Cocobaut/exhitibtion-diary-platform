from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.core.responses import ok
from app.models.user import User
from app.schemas.admin_studio import (
    AdminUpdateUserStatusRequest,
    RequestUserDeletionRequest,
    StudioPublishArtworkRequest,
)
from app.services.admin_studio_service import AdminStudioService

router = APIRouter(
    prefix="/admin/studio",
    tags=["Admin - Studio & Audit Log"],
    dependencies=[Depends(require_admin)],
)


# -----------------------------------------------------------------------------
# 12.1 Direct Publish Artwork
# -----------------------------------------------------------------------------

@router.post("/artworks", status_code=status.HTTP_201_CREATED)
async def publish_artwork_direct(
    payload: StudioPublishArtworkRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """12.1 Xuất bản trực tiếp tác phẩm lên phòng triển lãm (không qua duyệt)."""
    data = await AdminStudioService.publish_artwork_direct(
        db=db,
        admin=admin,
        payload=payload,
    )
    return ok(
        message="Đã xuất bản tác phẩm trực tiếp lên phòng triển lãm thành công",
        data=data,
    )


# -----------------------------------------------------------------------------
# 12.2 List Audit Logs
# -----------------------------------------------------------------------------

@router.get("/audit-logs", status_code=status.HTTP_200_OK)
async def list_audit_logs(
    room_id: Optional[int] = Query(None, ge=1, le=3, description="Lọc theo phòng"),
    admin_id: Optional[str] = Query(None, description="Lọc theo ID quản trị viên"),
    action_type: Optional[str] = Query(None, description="Lọc theo loại hành động"),
    page: int = Query(1, ge=1, description="Số trang"),
    limit: int = Query(15, ge=1, le=100, description="Số lượng bản ghi trên một trang"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """12.2 Lấy nhật ký quản trị toàn hệ thống kèm bộ lọc và phân trang."""
    data = await AdminStudioService.list_audit_logs(
        db=db,
        room_id=room_id,
        admin_id_raw=admin_id,
        action_type=action_type,
        page=page,
        limit=limit,
    )
    return ok(data=data)


# -----------------------------------------------------------------------------
# 12.3 Request User Deletion to Owner
# -----------------------------------------------------------------------------

@router.post("/users/request-deletion", status_code=status.HTTP_200_OK)
@router.post("/users/{user_id}/request-deletion", status_code=status.HTTP_200_OK)
async def request_user_deletion(
    payload: RequestUserDeletionRequest,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """12.3 Admin gửi yêu cầu xóa tài khoản người dùng vi phạm đến Owner."""
    data = await AdminStudioService.request_user_deletion(
        db=db,
        admin=admin,
        payload=payload,
        target_user_id_raw=user_id,
    )
    return ok(
        message="Đã gửi yêu cầu xóa tài khoản đến Chủ sở hữu để xem xét phê duyệt",
        data=data,
    )


# -----------------------------------------------------------------------------
# 12.4 Update User Status (Block / Activate User)
# -----------------------------------------------------------------------------

@router.patch("/users/{user_id}/status", status_code=status.HTTP_200_OK)
async def update_user_status(
    user_id: str,
    payload: AdminUpdateUserStatusRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """12.4 Admin hoặc Owner thực hiện chặn (khóa) hoặc kích hoạt lại người dùng."""
    data = await AdminStudioService.update_user_status(
        db=db,
        admin=admin,
        target_user_id_raw=user_id,
        payload=payload,
    )
    return ok(
        message="Cập nhật trạng thái tài khoản thành công",
        data=data,
    )

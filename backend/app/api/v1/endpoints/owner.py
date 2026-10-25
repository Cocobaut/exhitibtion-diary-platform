from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_owner
from app.core.responses import ok
from app.models.user import User
from app.schemas.owner import (
    UpdateUserRoleRequest,
    UpdateUserStatusRequest,
)
from app.services.owner_service import OwnerService

router = APIRouter(
    prefix="/owner",
    tags=["Owner - Master Management"],
    dependencies=[Depends(require_owner)],
)


# -----------------------------------------------------------------------------
# 13.1 List Users & Admins
# -----------------------------------------------------------------------------

@router.get("/users", status_code=status.HTTP_200_OK)
async def list_users(
    role: Optional[str] = Query(None, pattern="^(USER|ADMIN|OWNER)$", description="Lọc theo vai trò"),
    is_active: Optional[bool] = Query(None, description="Lọc theo trạng thái hoạt động"),
    q: Optional[str] = Query(None, description="Tìm theo username, email, hoặc nickname"),
    page: int = Query(1, ge=1, description="Số trang"),
    limit: int = Query(20, ge=1, le=100, description="Số lượng bản ghi trên một trang"),
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(require_owner),
):
    """13.1 Lấy danh sách toàn bộ người dùng, quản trị viên và chủ sở hữu."""
    data = await OwnerService.list_users(
        db=db,
        role=role,
        is_active=is_active,
        q=q,
        page=page,
        limit=limit,
    )
    return ok(data=data)


# -----------------------------------------------------------------------------
# 13.6 System Stats (Placed before /{user_id} to avoid path collision)
# -----------------------------------------------------------------------------

@router.get("/system-stats", status_code=status.HTTP_200_OK)
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(require_owner),
):
    """13.6 Xem thống kê phân bổ và số liệu toàn hệ thống."""
    data = await OwnerService.get_system_stats(db=db)
    return ok(data=data)


# -----------------------------------------------------------------------------
# 13.2 Get User Detail
# -----------------------------------------------------------------------------

@router.get("/users/{user_id}", status_code=status.HTTP_200_OK)
async def get_user_detail(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(require_owner),
):
    """13.2 Xem chi tiết một tài khoản kèm thống kê hoạt động."""
    data = await OwnerService.get_user_detail(
        db=db,
        user_id_raw=user_id,
    )
    return ok(data=data)


# -----------------------------------------------------------------------------
# 13.3 Update User Status
# -----------------------------------------------------------------------------

@router.patch("/users/{user_id}/status", status_code=status.HTTP_200_OK)
async def update_user_status(
    user_id: str,
    payload: UpdateUserStatusRequest,
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(require_owner),
):
    """13.3 Kích hoạt lại hoặc vô hiệu hóa (khóa) tài khoản bất kỳ."""
    data = await OwnerService.update_user_status(
        db=db,
        owner=owner,
        user_id_raw=user_id,
        payload=payload,
    )
    return ok(
        message="Cập nhật trạng thái tài khoản thành công",
        data=data,
    )


# -----------------------------------------------------------------------------
# 13.4 Update User Role
# -----------------------------------------------------------------------------

@router.patch("/users/{user_id}/role", status_code=status.HTTP_200_OK)
async def update_user_role(
    user_id: str,
    payload: UpdateUserRoleRequest,
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(require_owner),
):
    """13.4 Cập nhật vai trò người dùng (USER <-> ADMIN)."""
    data = await OwnerService.update_user_role(
        db=db,
        owner=owner,
        user_id_raw=user_id,
        payload=payload,
    )
    return ok(
        message="Cập nhật vai trò người dùng thành công",
        data=data,
    )


# -----------------------------------------------------------------------------
# 13.5 Delete User Permanently
# -----------------------------------------------------------------------------

@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(require_owner),
):
    """13.5 Xóa vĩnh viễn tài khoản người dùng hoặc admin khỏi hệ thống."""
    data = await OwnerService.delete_user(
        db=db,
        owner=owner,
        user_id_raw=user_id,
    )
    return ok(
        message="Đã xóa vĩnh viễn tài khoản người dùng khỏi hệ thống",
        data=data,
    )

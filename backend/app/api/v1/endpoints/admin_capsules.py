from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.core.responses import ok
from app.models.user import User
from app.schemas.admin_capsules import (
    CreateCapsuleRequest,
    ToggleCapsuleStatusRequest,
    UpdateCapsuleRequest,
)
from app.services.admin_capsule_service import AdminCapsuleService

router = APIRouter(
    prefix="/admin/capsules",
    tags=["Admin - Message Capsules Management"],
    dependencies=[Depends(require_admin)],
)


# -----------------------------------------------------------------------------
# 11.1 List Capsules
# -----------------------------------------------------------------------------

@router.get("", status_code=status.HTTP_200_OK)
async def list_capsules(
    category: Optional[str] = Query(None, pattern="^(HEALING|COURAGE|PERSPECTIVE)$", description="Chủ đề thông điệp"),
    is_approved: Optional[bool] = Query(None, description="Trạng thái phê duyệt hoạt động"),
    page: int = Query(1, ge=1, description="Số trang"),
    limit: int = Query(20, ge=1, le=100, description="Số lượng bản ghi trên một trang"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """11.1 Lấy danh sách thông điệp trong kho kèm bộ lọc và phân trang."""
    data = await AdminCapsuleService.list_capsules(
        db=db,
        category=category,
        is_approved=is_approved,
        page=page,
        limit=limit,
    )
    return ok(data=data)


# -----------------------------------------------------------------------------
# 11.2 Create Capsule
# -----------------------------------------------------------------------------

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_capsule(
    payload: CreateCapsuleRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """11.2 Thêm mới thông điệp vào máy nhả."""
    data = await AdminCapsuleService.create_capsule(
        db=db,
        admin=admin,
        payload=payload,
    )
    return ok(
        message="Thêm thông điệp mới vào máy nhả thành công",
        data=data,
    )


# -----------------------------------------------------------------------------
# 11.3 Update Capsule
# -----------------------------------------------------------------------------

@router.put("/{capsule_id}", status_code=status.HTTP_200_OK)
async def update_capsule(
    capsule_id: str,
    payload: UpdateCapsuleRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """11.3 Cập nhật nội dung và chủ đề thông điệp."""
    data = await AdminCapsuleService.update_capsule(
        db=db,
        capsule_id_raw=capsule_id,
        payload=payload,
    )
    return ok(
        message="Cập nhật thông điệp thành công",
        data=data,
    )


# -----------------------------------------------------------------------------
# 11.4 Toggle Status
# -----------------------------------------------------------------------------

@router.patch("/{capsule_id}/toggle-status", status_code=status.HTTP_200_OK)
async def toggle_capsule_status(
    capsule_id: str,
    payload: ToggleCapsuleStatusRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """11.4 Bật / Tắt trạng thái hoạt động của thông điệp."""
    data = await AdminCapsuleService.toggle_status(
        db=db,
        capsule_id_raw=capsule_id,
        payload=payload,
    )
    return ok(
        message="Đã cập nhật trạng thái hoạt động của thông điệp",
        data=data,
    )


# -----------------------------------------------------------------------------
# 11.5 Delete Capsule
# -----------------------------------------------------------------------------

@router.delete("/{capsule_id}", status_code=status.HTTP_200_OK)
async def delete_capsule(
    capsule_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """11.5 Xóa thông điệp khỏi kho dữ liệu."""
    await AdminCapsuleService.delete_capsule(
        db=db,
        capsule_id_raw=capsule_id,
    )
    return ok(
        message="Đã xóa thông điệp khỏi kho dữ liệu"
    )

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.core.responses import ok
from app.models.user import User
from app.schemas.admin_diaries import (
    RejectDiaryRequest,
    RevokeDiaryRequest,
)
from app.services.admin_diary_service import AdminDiaryService

router = APIRouter(
    prefix="/admin/diaries",
    tags=["Admin - Diaries Moderation"],
    dependencies=[Depends(require_admin)],
)


# -----------------------------------------------------------------------------
# 10.1 Pending Diaries
# -----------------------------------------------------------------------------

@router.get("/pending", status_code=status.HTTP_200_OK)
async def get_pending_diaries(
    page: int = Query(1, ge=1, description="Số trang"),
    limit: int = Query(15, ge=1, le=100, description="Số lượng bản ghi trên một trang"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """10.1 Lấy danh sách nhật ký công khai chờ duyệt."""
    data = await AdminDiaryService.get_pending_diaries(
        db=db,
        page=page,
        limit=limit,
    )
    return ok(data=data)


# -----------------------------------------------------------------------------
# 10.2 Approve Diary
# -----------------------------------------------------------------------------

@router.patch("/{diary_id}/approve", status_code=status.HTTP_200_OK)
async def approve_diary(
    diary_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """10.2 Phê duyệt hiển thị nhật ký lên Tab Cộng đồng."""
    data = await AdminDiaryService.approve_diary(
        db=db,
        admin=admin,
        diary_id_raw=diary_id,
    )
    return ok(
        message="Đã phê duyệt bài nhật ký hiển thị lên Tab Cộng đồng",
        data=data,
    )


# -----------------------------------------------------------------------------
# 10.3 Reject Diary
# -----------------------------------------------------------------------------

@router.patch("/{diary_id}/reject", status_code=status.HTTP_200_OK)
async def reject_diary(
    diary_id: str,
    payload: RejectDiaryRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """10.3 Từ chối phê duyệt công khai bài nhật ký."""
    data = await AdminDiaryService.reject_diary(
        db=db,
        admin=admin,
        diary_id_raw=diary_id,
        payload=payload,
    )
    return ok(
        message="Đã từ chối chia sẻ công khai. Bài viết vẫn được lưu trữ an toàn trong sổ tay riêng tư của người dùng.",
        data=data,
    )


# -----------------------------------------------------------------------------
# 10.4 Approved Diaries Feed Management
# -----------------------------------------------------------------------------

@router.get("/approved", status_code=status.HTTP_200_OK)
async def get_approved_diaries(
    q: Optional[str] = Query(None, description="Tìm theo tiêu đề hoặc tên tác giả"),
    page: int = Query(1, ge=1, description="Số trang"),
    limit: int = Query(15, ge=1, le=100, description="Số lượng bản ghi trên một trang"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """10.4 Danh sách nhật ký cộng đồng đang hiển thị."""
    data = await AdminDiaryService.get_approved_diaries(
        db=db,
        q=q,
        page=page,
        limit=limit,
    )
    return ok(data=data)


# -----------------------------------------------------------------------------
# 10.5 Revoke Diary
# -----------------------------------------------------------------------------

@router.patch("/{diary_id}/revoke", status_code=status.HTTP_200_OK)
async def revoke_diary(
    diary_id: str,
    payload: RevokeDiaryRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """10.5 Gỡ bỏ bài viết khỏi Tab Cộng đồng."""
    data = await AdminDiaryService.revoke_diary(
        db=db,
        admin=admin,
        diary_id_raw=diary_id,
        payload=payload,
    )
    return ok(
        message="Đã gỡ bài viết khỏi Tab Cộng đồng thành công",
        data=data,
    )

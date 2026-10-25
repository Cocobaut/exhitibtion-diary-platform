from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.capsule import (
    DeleteSavedResponse,
    DrawCapsuleResponse,
    SaveDrawRequest,
    SaveDrawResponse,
    SavedCapsulesResponse,
)
from app.services.capsule_service import CapsuleService

router = APIRouter()


@router.post(
    "/draw",
    response_model=DrawCapsuleResponse,
    status_code=status.HTTP_200_OK,
    summary="Rút ngẫu nhiên một thông điệp"
)
async def draw_capsule(
    category: Optional[str] = Query(None, description="Thể loại: HEALING, COURAGE, PERSPECTIVE"),
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> DrawCapsuleResponse:
    """3.1 Rút một thông điệp ngẫu nhiên từ kho thông điệp đã duyệt."""
    data = await CapsuleService.draw(
        db=db,
        user_id=current_user.id,
        category=category
    )
    return DrawCapsuleResponse(
        success=True,
        message="Rút thông điệp thành công",
        data=data
    )


@router.patch(
    "/draws/{draw_id}/save",
    response_model=SaveDrawResponse,
    status_code=status.HTTP_200_OK,
    summary="Đánh dấu lưu hoặc bỏ lưu thông điệp vào sổ tay cá nhân"
)
async def save_draw(
    draw_id: str,
    req: SaveDrawRequest,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> SaveDrawResponse:
    """3.2 Cập nhật trạng thái lưu (is_saved = true/false) của một lượt rút."""
    data, message = await CapsuleService.save_draw(
        db=db,
        user_id=current_user.id,
        draw_id_raw=draw_id,
        is_saved=req.is_saved
    )
    return SaveDrawResponse(
        success=True,
        message=message,
        data=data
    )


@router.get(
    "/saved",
    response_model=SavedCapsulesResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy danh sách các thông điệp đã lưu"
)
async def list_saved_capsules(
    page: int = Query(1, ge=1, description="Số trang (bắt đầu từ 1)"),
    limit: int = Query(10, ge=1, le=50, description="Số lượng mục trên mỗi trang (tối đa 50)"),
    category: Optional[str] = Query(None, description="Lọc theo thể loại"),
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> SavedCapsulesResponse:
    """3.3 Danh sách thông điệp đã lưu trong sổ tay cá nhân của người dùng."""
    data = await CapsuleService.get_saved(
        db=db,
        user_id=current_user.id,
        page=page,
        limit=limit,
        category=category
    )
    return SavedCapsulesResponse(
        success=True,
        data=data
    )


@router.delete(
    "/saved/{draw_id}",
    response_model=DeleteSavedResponse,
    status_code=status.HTTP_200_OK,
    summary="Bỏ lưu thông điệp khỏi sổ tay"
)
async def delete_saved_capsule(
    draw_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> DeleteSavedResponse:
    """3.4 Bỏ lưu thông điệp khỏi sổ tay (chuyển is_saved = false, giữ lịch sử rút)."""
    await CapsuleService.delete_saved(
        db=db,
        user_id=current_user.id,
        draw_id_raw=draw_id
    )
    return DeleteSavedResponse(
        success=True,
        message="Đã bỏ lưu thông điệp khỏi sổ tay"
    )

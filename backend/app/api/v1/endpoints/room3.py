import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_optional_user
from app.core.exceptions import AppException
from app.core.responses import ok
from app.models.user import User
from app.schemas.room3 import (
    Room3CreateRibbonRequest,
    Room3EnergyRequest,
)
from app.services.room3_service import Room3Service

router = APIRouter()


@router.get(
    "/artworks",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="7.1 Lấy danh sách dải thông điệp trên cây"
)
async def get_ribbons(
    category: Optional[str] = Query(None, description="Lọc theo thể loại: ENCOURAGEMENT, HEALING, GRATITUDE, PERSPECTIVE"),
    color_code: Optional[str] = Query(None, description="Lọc theo mã màu hex (ví dụ #FFD700)"),
    filter: str = Query("all", description="Bộ lọc: all hoặc mine"),
    limit: int = Query(50, description="Số lượng dải thông điệp (mặc định 50, tối đa 150)"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Lấy danh sách dải thông điệp đã duyệt trên cây cộng đồng, kèm bảng màu quy chuẩn color_legend."""
    result = await Room3Service.get_ribbons(
        db,
        category=category,
        color_code=color_code,
        filter_type=filter,
        limit=limit,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(result))


@router.get(
    "/search",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="7.5 Tìm kiếm thông điệp trên cây"
)
async def search_ribbons(
    q: str = Query(..., description="Từ khóa tìm kiếm (1-100 ký tự)"),
    category: Optional[str] = Query(None, description="Lọc theo thể loại"),
    color_code: Optional[str] = Query(None, description="Lọc theo mã màu"),
    scope: str = Query("all", description="Phạm vi tìm kiếm: all hoặc mine"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(15, ge=1, le=50, description="Số lượng kết quả mỗi trang (tối đa 50)"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Tìm kiếm thông điệp trong phòng 3 theo từ khóa, lọc theo danh mục và màu sắc."""
    result = await Room3Service.search_ribbons(
        db,
        q=q,
        category=category,
        color_code=color_code,
        scope=scope,
        page=page,
        limit=limit,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(result))


@router.post(
    "/artworks",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="7.4 Treo thông điệp mới lên cây"
)
async def create_ribbon(
    request: Room3CreateRibbonRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tạo dải thông điệp mới kèm danh mục và mã màu chuẩn. Hỗ trợ auto approve theo cấu hình."""
    msg, data = await Room3Service.create_ribbon(
        db,
        request=request,
        current_user=current_user,
    )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=jsonable_encoder(ok(data=data, message=msg))
    )


@router.get(
    "/artworks/{artwork_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="7.2 Xem chi tiết thông điệp Popup Modal"
)
async def get_ribbon_detail(
    artwork_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Xem chi tiết nội dung dải thông điệp, tự động tăng view_count nguyên tử."""
    try:
        art_uuid = uuid.UUID(artwork_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="ARTWORK_NOT_FOUND",
            message="Không tìm thấy thông điệp"
        )

    data = await Room3Service.get_ribbon_detail(
        db,
        ribbon_id=art_uuid,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(data))


@router.post(
    "/artworks/{artwork_id}/energy",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="7.3 Tương tác tiếp sức hoặc thả tim trên thông điệp"
)
async def toggle_energy(
    artwork_id: str,
    request: Room3EnergyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tương tác năng lượng (INSPIRED) hoặc thả tim (HEART) độc lập (toggle on/off)."""
    try:
        art_uuid = uuid.UUID(artwork_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="ARTWORK_NOT_FOUND",
            message="Không tìm thấy thông điệp"
        )

    msg, data = await Room3Service.toggle_energy(
        db,
        ribbon_id=art_uuid,
        action_type=request.action_type,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(data), message=msg)

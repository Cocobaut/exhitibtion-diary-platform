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
from app.schemas.room2 import (
    Room2CreateLanternRequest,
)
from app.services.room2_service import Room2Service

router = APIRouter()


@router.get(
    "/artworks",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="6.1 Lấy danh sách lồng đèn bầu trời đêm"
)
async def get_lanterns(
    filter: str = Query("all", description="Bộ lọc: all, mine, opened, locked"),
    limit: int = Query(30, description="Số lượng lồng đèn (mặc định 30, tối đa 100)"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Lấy danh sách lồng đèn trong phòng 2 theo visible set và bộ lọc."""
    result = await Room2Service.get_lanterns(
        db,
        filter_type=filter,
        limit=limit,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(result))


@router.get(
    "/search",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="6.4 Tìm kiếm lồng đèn phòng 2"
)
async def search_lanterns(
    q: str = Query(..., description="Từ khóa tìm kiếm (1-100 ký tự)"),
    filter: str = Query("all", description="Bộ lọc: all, mine, opened, locked"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(15, ge=1, le=50, description="Số lượng kết quả mỗi trang (tối đa 50)"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Tìm kiếm lồng đèn theo từ khóa trong phạm vi được phép xem (visible set)."""
    result = await Room2Service.search_lanterns(
        db,
        q=q,
        filter_type=filter,
        page=page,
        limit=limit,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(result))


@router.post(
    "/artworks",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="6.3 Thả lồng đèn hy vọng mới"
)
async def create_lantern(
    request: Room2CreateLanternRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thả lồng đèn mới lên bầu trời phòng 2 (PUBLIC: chờ duyệt; PRIVATE: tự duyệt)."""
    msg, data = await Room2Service.create_lantern(
        db,
        request=request,
        current_user=current_user,
    )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=jsonable_encoder(ok(data=data, message=msg))
    )


@router.post(
    "/artworks/{artwork_id}/open",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="6.2 Mở lồng đèn hy vọng"
)
async def open_lantern(
    artwork_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Mở một lồng đèn khi đã đến hạn ngày mở khóa (target_date <= now). Trả về 423 nếu chưa đến ngày."""
    try:
        art_uuid = uuid.UUID(artwork_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="ARTWORK_NOT_FOUND",
            message="Không tìm thấy lồng đèn"
        )

    msg, data = await Room2Service.open_lantern(
        db,
        lantern_id=art_uuid,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(data), message=msg)

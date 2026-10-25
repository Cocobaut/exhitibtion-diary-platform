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
    title: Optional[str] = Query(None, description="Lọc theo tiêu đề lồng đèn"),
    author_display_name: Optional[str] = Query(None, description="Lọc theo tên hiển thị tác giả"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Lấy danh sách lồng đèn trong phòng 2 theo visible set và bộ lọc."""
    result = await Room2Service.get_lanterns(
        db,
        filter_type=filter,
        limit=limit,
        title=title,
        author_display_name=author_display_name,
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


@router.get(
    "/artworks/ready-to-fall",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="6.5 Lấy danh sách lồng đèn của bản thân đến thời điểm rơi xuống"
)
async def get_ready_to_fall_lanterns(
    include_opened: bool = Query(False, description="Bao gồm cả lồng đèn đã mở"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách lồng đèn của người dùng hiện tại có target_date trùng hoặc đã qua thời điểm hiện tại (để frontend kích hoạt hiệu ứng rơi xuống)."""
    result = await Room2Service.get_ready_to_fall_lanterns(
        db,
        current_user=current_user,
        include_opened=include_opened,
    )
    return ok(data=jsonable_encoder(result))


@router.get(
    "/artworks/my-personal",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="6.7 Lấy thông tin lồng đèn cá nhân phục vụ widget đếm ngược"
)
async def get_my_personal_lantern(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy lồng đèn mới nhất của người dùng hiện tại kèm thông số thời gian đếm ngược còn lại."""
    result = await Room2Service.get_my_personal_lantern(db, current_user=current_user)
    return ok(data=jsonable_encoder(result))


@router.get(
    "/artworks/random-opened",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="6.8 Rút ngẫu nhiên một lồng đèn đã mở"
)
async def get_random_opened_lantern(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Rút ngẫu nhiên 1 bức thư lồng đèn đã mở công khai trên bầu trời đêm."""
    result = await Room2Service.get_random_opened_lantern(db, current_user=current_user)
    return ok(data=jsonable_encoder(result))


@router.post(
    "/artworks/{artwork_id}/open",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="6.2 Kéo thả và mở lồng đèn hy vọng"
)
async def open_lantern(
    artwork_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Kéo thả và mở một lồng đèn nằm trong danh sách hợp lệ (PUBLIC đã duyệt hoặc PRIVATE của bản thân) mà không bị giới hạn bởi thời gian khóa."""
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


@router.delete(
    "/artworks/{artwork_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="6.6 Xóa lồng đèn của bản thân (nếu chưa được public)"
)
async def delete_lantern(
    artwork_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa lồng đèn của chính mình khi chưa được công khai duyệt (chặn xóa nếu lồng đèn đã PUBLIC và APPROVED)."""
    try:
        art_uuid = uuid.UUID(artwork_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="ARTWORK_NOT_FOUND",
            message="Không tìm thấy lồng đèn"
        )

    msg = await Room2Service.delete_lantern(
        db,
        lantern_id=art_uuid,
        current_user=current_user,
    )
    return ok(message=msg)


@router.post(
    "/artworks/{artwork_id}/save",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="6.9 Lưu thư lồng đèn vào sổ tay"
)
async def save_lantern_to_notebook(
    artwork_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lưu một bức thư lồng đèn vào sổ tay của người dùng hiện tại."""
    try:
        art_uuid = uuid.UUID(artwork_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="ARTWORK_NOT_FOUND",
            message="Không tìm thấy lồng đèn"
        )

    result = await Room2Service.save_lantern(
        db,
        lantern_id=art_uuid,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(result), message="Đã lưu bức thư lồng đèn vào sổ tay")


@router.delete(
    "/artworks/{artwork_id}/save",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="6.10 Bỏ lưu thư lồng đèn khỏi sổ tay"
)
async def unsave_lantern_from_notebook(
    artwork_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bỏ lưu một bức thư lồng đèn khỏi sổ tay của người dùng hiện tại."""
    try:
        art_uuid = uuid.UUID(artwork_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="ARTWORK_NOT_FOUND",
            message="Không tìm thấy lồng đèn"
        )

    await Room2Service.unsave_lantern(
        db,
        lantern_id=art_uuid,
        current_user=current_user,
    )
    return ok(message="Đã bỏ lưu bức thư khỏi sổ tay")


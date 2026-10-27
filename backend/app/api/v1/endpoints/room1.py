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
from app.schemas.room1 import (
    Room1ArtworkDetail,
    Room1ArtworkListResponse,
    Room1CreateArtworkRequest,
    Room1ReactionRequest,
    Room1SearchResponse,
)
from app.services.room1_service import Room1Service

router = APIRouter()


@router.get(
    "/artworks",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="5.1 Lấy danh sách tác phẩm phòng 1"
)
async def get_artworks(
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(12, ge=1, le=50, description="Số tác phẩm mỗi trang (tối đa 50)"),
    filter: str = Query("all", description="Bộ lọc: all, latest, most_sympathetic, my_artworks"),
    title: Optional[str] = Query(None, description="Lọc theo tiêu đề tác phẩm"),
    author_display_name: Optional[str] = Query(None, description="Lọc theo tên hiển thị tác giả"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Lấy danh sách tác phẩm đã được duyệt trong phòng 1 (Đổ vỡ). Hỗ trợ lọc và phân trang."""
    result = await Room1Service.get_artworks(
        db,
        filter_type=filter,
        page=page,
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
    summary="5.4 Tìm kiếm tác phẩm phòng 1"
)
async def search_artworks(
    q: str = Query(..., description="Từ khóa tìm kiếm (1-100 ký tự)"),
    scope: str = Query("all", description="Phạm vi tìm kiếm: all hoặc mine"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(12, ge=1, le=50, description="Số tác phẩm mỗi trang (tối đa 50)"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Tìm kiếm toàn văn tác phẩm trong phòng 1 theo tiêu đề, nội dung, bút danh."""
    result = await Room1Service.search_artworks(
        db,
        q=q,
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
    summary="5.5 Tạo tác phẩm mới trong phòng 1"
)
async def create_artwork(
    request: Room1CreateArtworkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gửi tác phẩm mới vào phòng 1 (trạng thái ban đầu PENDING chờ duyệt). Áp dụng rate limit."""
    data = await Room1Service.create_artwork(
        db,
        request=request,
        current_user=current_user,
    )
    msg = "Tác phẩm của bạn đang được chuẩn bị, chúng mình sẽ thông báo trong hộp tin nhắn cho bạn sau khi tác phẩm hoàn thành"
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=jsonable_encoder(ok(data=data, message=msg))
    )


@router.get(
    "/artworks/{artwork_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="5.2 Xem chi tiết tác phẩm phòng 1"
)
async def get_artwork_detail(
    artwork_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Xem chi tiết một tác phẩm trong phòng 1, tự động tăng view_count nguyên tử."""
    try:
        art_uuid = uuid.UUID(artwork_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="ARTWORK_NOT_FOUND",
            message="Không tìm thấy tác phẩm"
        )

    data = await Room1Service.get_artwork_detail(
        db,
        artwork_id=art_uuid,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(data))


@router.post(
    "/artworks/{artwork_id}/reactions",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="5.3 Tương tác cảm xúc trên tác phẩm phòng 1"
)
async def toggle_reaction(
    artwork_id: str,
    request: Room1ReactionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thả cảm xúc (HEART, HUG, SYMPATHY) hoặc gỡ bỏ cảm xúc trên tác phẩm phòng 1."""
    try:
        art_uuid = uuid.UUID(artwork_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="ARTWORK_NOT_FOUND",
            message="Không tìm thấy tác phẩm"
        )

    msg, data = await Room1Service.toggle_reaction(
        db,
        artwork_id=art_uuid,
        reaction_type=request.reaction_type,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(data), message=msg)


@router.post(
    "/artworks/{artwork_id}/save",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Lưu tác phẩm phòng 1 vào sổ tay"
)
async def save_artwork_to_notebook(
    artwork_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lưu tác phẩm phòng 1 vào Sổ tay cá nhân của người dùng."""
    try:
        art_uuid = uuid.UUID(artwork_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="ARTWORK_NOT_FOUND",
            message="Không tìm thấy tác phẩm"
        )

    data = await Room1Service.save_artwork_to_notebook(
        db, artwork_id=art_uuid, current_user=current_user
    )
    return ok(data=jsonable_encoder(data), message="Đã lưu tác phẩm vào sổ tay")


@router.delete(
    "/artworks/{artwork_id}/save",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Bỏ lưu tác phẩm phòng 1 khỏi sổ tay"
)
async def unsave_artwork_from_notebook(
    artwork_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bỏ lưu tác phẩm phòng 1 khỏi Sổ tay cá nhân của người dùng."""
    try:
        art_uuid = uuid.UUID(artwork_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="ARTWORK_NOT_FOUND",
            message="Không tìm thấy tác phẩm"
        )

    await Room1Service.unsave_artwork(
        db, artwork_id=art_uuid, current_user=current_user
    )
    return ok(data={"is_saved": False}, message="Đã bỏ lưu khỏi sổ tay")

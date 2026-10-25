from typing import Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.core.responses import ok
from app.models.user import User
from app.schemas.admin_rooms import (
    ApproveArtworkRequest,
    ArchiveArtworkRequest,
    EditArtworkRequest,
    RejectArtworkRequest,
)
from app.services.admin_room_service import AdminRoomService

router = APIRouter(
    prefix="/admin/rooms/{room_id}/artworks",
    tags=["Admin - Exhibition Rooms Management"],
    dependencies=[Depends(require_admin)],
)


# -----------------------------------------------------------------------------
# 9.1 Chờ duyệt (Pending Artworks Management)
# -----------------------------------------------------------------------------

@router.get("/pending", status_code=status.HTTP_200_OK)
async def get_pending_artworks(
    room_id: int,
    page: int = Query(1, ge=1, description="Số trang hiện tại"),
    limit: int = Query(15, ge=1, le=100, description="Số lượng bản ghi trên một trang"),
    sort: str = Query("oldest", pattern="^(oldest|latest)$", description="Thứ tự sắp xếp"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """9.1.1 Lấy danh sách tác phẩm chờ duyệt trong phòng."""
    data = await AdminRoomService.get_pending_artworks(
        db=db,
        room_id=room_id,
        page=page,
        limit=limit,
        sort=sort,
    )
    return ok(data=data)


@router.post("/upload-artwork-image", status_code=status.HTTP_200_OK)
async def upload_artwork_image(
    room_id: int,
    image: UploadFile = File(..., description="File ảnh minh họa nghệ thuật (WebP, PNG, JPG; max 10MB)"),
    admin: User = Depends(require_admin),
):
    """9.1.2 Tải ảnh nghệ thuật minh họa lên hệ thống lưu trữ."""
    data = await AdminRoomService.upload_artwork_image(
        room_id=room_id,
        file=image,
    )
    return ok(
        message="Tải ảnh nghệ thuật lên thành công",
        data=data,
    )


@router.post("/{artwork_id}/approve", status_code=status.HTTP_200_OK)
async def approve_artwork(
    room_id: int,
    artwork_id: str,
    payload: ApproveArtworkRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """9.1.3 Phê duyệt tác phẩm chờ duyệt và xuất bản lên phòng triển lãm."""
    data = await AdminRoomService.approve_artwork(
        db=db,
        admin=admin,
        room_id=room_id,
        artwork_id_raw=artwork_id,
        payload=payload,
    )
    return ok(
        message="Phê duyệt tác phẩm thành công và đã xuất bản lên triển lãm",
        data=data,
    )


@router.post("/{artwork_id}/reject", status_code=status.HTTP_200_OK)
async def reject_artwork(
    room_id: int,
    artwork_id: str,
    payload: RejectArtworkRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """9.1.4 Từ chối tác phẩm chờ duyệt kèm lý do phản hồi."""
    data = await AdminRoomService.reject_artwork(
        db=db,
        admin=admin,
        room_id=room_id,
        artwork_id_raw=artwork_id,
        payload=payload,
    )
    return ok(
        message="Đã từ chối tác phẩm và gửi phản hồi đến người dùng",
        data=data,
    )


# -----------------------------------------------------------------------------
# 9.2 Đang trưng bày (Approved Artworks Management)
# -----------------------------------------------------------------------------

@router.get("/approved", status_code=status.HTTP_200_OK)
async def get_approved_artworks(
    room_id: int,
    q: Optional[str] = Query(None, description="Từ khóa tìm kiếm theo tiêu đề"),
    page: int = Query(1, ge=1, description="Số trang hiện tại"),
    limit: int = Query(15, ge=1, le=100, description="Số lượng bản ghi trên một trang"),
    sort: str = Query("latest", pattern="^(latest|most_viewed|most_interacted)$", description="Tiêu chí sắp xếp"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """9.2.1 Danh sách tác phẩm đang trưng bày kèm thống kê tổng thể phòng."""
    data = await AdminRoomService.get_approved_artworks(
        db=db,
        room_id=room_id,
        q=q,
        page=page,
        limit=limit,
        sort=sort,
    )
    return ok(data=data)


@router.put("/{artwork_id}", status_code=status.HTTP_200_OK)
async def edit_artwork(
    room_id: int,
    artwork_id: str,
    payload: EditArtworkRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """9.2.2 Cập nhật/hiệu đính nội dung tác phẩm đang trưng bày."""
    data = await AdminRoomService.edit_artwork(
        db=db,
        admin=admin,
        room_id=room_id,
        artwork_id_raw=artwork_id,
        payload=payload,
    )
    return ok(
        message="Cập nhật nội dung tác phẩm thành công",
        data=data,
    )


@router.patch("/{artwork_id}/archive", status_code=status.HTTP_200_OK)
async def archive_artwork(
    room_id: int,
    artwork_id: str,
    payload: ArchiveArtworkRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """9.2.3 Gỡ tác phẩm khỏi không gian trưng bày và chuyển vào kho lưu trữ."""
    data = await AdminRoomService.archive_artwork(
        db=db,
        admin=admin,
        room_id=room_id,
        artwork_id_raw=artwork_id,
        payload=payload,
    )
    return ok(
        message="Đã gỡ tác phẩm khỏi không gian trưng bày và chuyển vào kho lưu trữ",
        data=data,
    )

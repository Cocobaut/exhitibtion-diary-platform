import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_optional_user
from app.core.exceptions import AppException
from app.core.responses import ok
from app.models.user import User
from app.schemas.diary import (
    CreateDiaryRequest,
    DiaryReactionRequest,
    UpdateDiaryRequest,
)
from app.services.diary_service import DiaryService

router = APIRouter()


# =====================================================================
# 1. Personal Diaries (/me, /me/{diary_id})
# =====================================================================
@router.get(
    "/me",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="8.1 Danh sách nhật ký cá nhân"
)
async def get_my_diaries(
    view_mode: str = Query("timeline", description="Chế độ hiển thị: timeline hoặc calendar"),
    year: Optional[int] = Query(None, description="Lọc theo năm"),
    month: Optional[int] = Query(None, description="Lọc theo tháng (1-12)"),
    mood: Optional[str] = Query(None, description="Lọc theo tâm trạng"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(15, ge=1, le=50, description="Số lượng bài viết mỗi trang (tối đa 50)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách nhật ký của người dùng hiện tại (hỗ trợ lọc theo thời gian, tâm trạng)."""
    result = await DiaryService.get_my_diaries(
        db,
        user_id=current_user.id,
        view_mode=view_mode,
        year=year,
        month=month,
        mood=mood,
        page=page,
        limit=limit,
    )
    return ok(data=jsonable_encoder(result))


@router.get(
    "/me/{diary_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="8.2 Chi tiết nhật ký cá nhân"
)
async def get_my_diary_detail(
    diary_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xem toàn văn nội dung một bài nhật ký cá nhân của chính mình."""
    try:
        d_uuid = uuid.UUID(diary_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="DIARY_NOT_FOUND",
            message="Không tìm thấy bài nhật ký"
        )

    data = await DiaryService.get_my_diary_detail(
        db,
        diary_id=d_uuid,
        user_id=current_user.id,
    )
    return ok(data=jsonable_encoder(data))


@router.put(
    "/me/{diary_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="8.4 Chỉnh sửa nhật ký cá nhân"
)
async def update_diary(
    diary_id: str,
    request: UpdateDiaryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật nhật ký cá nhân. Nếu bài viết là công khai, tự động reset is_approved=False để duyệt lại."""
    try:
        d_uuid = uuid.UUID(diary_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="DIARY_NOT_FOUND",
            message="Không tìm thấy bài nhật ký"
        )

    msg, data = await DiaryService.update_diary(
        db,
        diary_id=d_uuid,
        request=request,
        user_id=current_user.id,
    )
    return ok(data=jsonable_encoder(data), message=msg)


@router.delete(
    "/me/{diary_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="8.5 Xóa nhật ký cá nhân"
)
async def delete_diary(
    diary_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa vĩnh viễn bài nhật ký của chính mình."""
    try:
        d_uuid = uuid.UUID(diary_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="DIARY_NOT_FOUND",
            message="Không tìm thấy bài nhật ký"
        )

    msg = await DiaryService.delete_diary(
        db,
        diary_id=d_uuid,
        user_id=current_user.id,
    )
    return ok(message=msg)


# =====================================================================
# 2. Upload Media (/upload-media)
# =====================================================================
@router.post(
    "/upload-media",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="8.6 Upload ảnh đính kèm nhật ký"
)
async def upload_media(
    files: List[UploadFile] = File(..., description="Danh sách tối đa 5 file ảnh"),
    current_user: User = Depends(get_current_user),
):
    """Tải lên tối đa 5 hình ảnh đính kèm (PNG, JPEG, WEBP; tối đa 5MB mỗi ảnh)."""
    urls = await DiaryService.upload_media(files)
    return ok(data={"urls": urls})


# =====================================================================
# 3. Community Diaries (/community, /community/{diary_id})
# =====================================================================
@router.get(
    "/community",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="8.2.1 Danh sách nhật ký cộng đồng"
)
async def get_community_diaries(
    mood: Optional[str] = Query(None, description="Lọc theo tâm trạng"),
    sort: str = Query("latest", description="Sắp xếp: latest hoặc most_sympathetic"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(12, ge=1, le=50, description="Số lượng bài viết mỗi trang (tối đa 50)"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Xem danh sách bài nhật ký đã được duyệt chia sẻ cộng đồng."""
    result = await DiaryService.get_community_diaries(
        db,
        mood=mood,
        sort=sort,
        page=page,
        limit=limit,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(result))


@router.get(
    "/community/{diary_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="8.2.2 Xem chi tiết bài nhật ký cộng đồng"
)
async def get_community_diary_detail(
    diary_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Xem chi tiết bài viết công khai cộng đồng."""
    try:
        d_uuid = uuid.UUID(diary_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="DIARY_NOT_FOUND",
            message="Không tìm thấy bài nhật ký"
        )

    data = await DiaryService.get_community_diary_detail(
        db,
        diary_id=d_uuid,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(data))


@router.post(
    "/community/{diary_id}/reactions",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="8.2.3 Thả cảm xúc trên nhật ký cộng đồng"
)
async def toggle_community_reaction(
    diary_id: str,
    request: DiaryReactionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thả cảm xúc hoặc gỡ bỏ cảm xúc trên nhật ký cộng đồng (tối đa 1 reaction / người dùng)."""
    try:
        d_uuid = uuid.UUID(diary_id)
    except (ValueError, TypeError):
        raise AppException(
            status_code=404,
            error_code="DIARY_NOT_FOUND",
            message="Không tìm thấy bài nhật ký"
        )

    msg, data = await DiaryService.toggle_reaction(
        db,
        diary_id=d_uuid,
        reaction_type=request.reaction_type,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(data), message=msg)


# =====================================================================
# 4. Search Diaries (/search)
# =====================================================================
@router.get(
    "/search",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="8.3.1 Tìm kiếm nhật ký"
)
async def search_diaries(
    q: str = Query(..., description="Từ khóa tìm kiếm (1-100 ký tự)"),
    scope: str = Query("mine", description="Phạm vi: mine hoặc community"),
    mood: Optional[str] = Query(None, description="Lọc theo tâm trạng"),
    from_date: Optional[date] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(12, ge=1, le=50, description="Số lượng kết quả mỗi trang (tối đa 50)"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Tìm kiếm nhật ký cá nhân hoặc cộng đồng theo từ khóa, có highlight kết quả."""
    result = await DiaryService.search_diaries(
        db,
        q=q,
        scope=scope,
        mood=mood,
        from_date=from_date,
        to_date=to_date,
        page=page,
        limit=limit,
        current_user=current_user,
    )
    return ok(data=jsonable_encoder(result))


# =====================================================================
# 5. Create Diary (POST /diaries)
# =====================================================================
@router.post(
    "",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="8.3 Viết nhật ký mới"
)
async def create_diary(
    request: CreateDiaryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tạo nhật ký mới (is_public=False: tự duyệt; is_public=True: chờ duyệt để lên Tab Cộng đồng)."""
    msg, data = await DiaryService.create_diary(
        db,
        request=request,
        current_user=current_user,
    )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=jsonable_encoder(ok(data=data, message=msg))
    )

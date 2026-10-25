from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.notebook import NotebookListResponse
from app.services.notebook_service import NotebookService

router = APIRouter()


@router.get(
    "",
    response_model=NotebookListResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy danh sách các mục trong sổ tay ký ức hợp nhất"
)
async def get_notebook(
    source: str = Query("all", description="Bộ lọc nguồn: all, mailbox, lantern"),
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm trong tiêu đề, nội dung, tác giả hoặc thể loại"),
    page: int = Query(1, ge=1, description="Số trang (bắt đầu từ 1)"),
    limit: int = Query(20, ge=1, le=50, description="Số lượng mục trên mỗi trang (tối đa 50)"),
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> NotebookListResponse:
    """API Sổ tay hợp nhất gom thông điệp hòm thư và thư lồng đèn đã lưu."""
    data = await NotebookService.get_notebook(
        db=db,
        user_id=current_user.id,
        source=source,
        search=search,
        page=page,
        limit=limit,
    )
    return NotebookListResponse(
        success=True,
        data=data
    )

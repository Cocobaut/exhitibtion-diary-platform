from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# 12.1 Studio Direct Publish
# -----------------------------------------------------------------------------

class StudioPublishArtworkRequest(BaseModel):
    room_id: int = Field(..., ge=1, le=3, description="Phòng triển lãm 1 (Đổ vỡ), 2 (Hy vọng), 3 (Thông điệp)")
    title: str = Field(..., min_length=1, max_length=150, description="Tiêu đề tác phẩm")
    author_display_name: Optional[str] = Field("Triển Lãm Ký Ức (Ban Quản Trị)", max_length=50)
    short_content: str = Field(..., min_length=1, description="Đoạn trích tóm tắt")
    content: str = Field(..., min_length=1, description="Nội dung đầy đủ của tác phẩm")
    media_url: Optional[str] = None
    is_anonymous: bool = False

    # Room 2 attributes
    target_date: Optional[datetime] = None
    visibility: str = Field("PUBLIC", pattern="^(PUBLIC|PRIVATE)$")

    # Room 3 attributes
    tag_category: Optional[str] = Field(None, max_length=30)
    color_code: Optional[str] = Field(None, max_length=10)


class StudioPublishArtworkData(BaseModel):
    id: uuid.UUID
    room_id: int
    title: str
    status: str
    author_display_name: Optional[str] = None
    media_url: Optional[str] = None
    created_by: uuid.UUID
    created_at: datetime


# -----------------------------------------------------------------------------
# 12.2 Studio Audit Logs
# -----------------------------------------------------------------------------

class AuditAdminInfo(BaseModel):
    id: uuid.UUID
    username: str
    nickname: str

    model_config = ConfigDict(from_attributes=True)


class AuditLogItem(BaseModel):
    log_id: uuid.UUID
    artwork_id: Optional[uuid.UUID] = None
    artwork_title: str
    room_id: int
    room_code: str
    action_type: str
    created_by_admin: Optional[AuditAdminInfo] = None
    last_updated_by_admin: Optional[AuditAdminInfo] = None
    performed_at: datetime


class AuditLogPagination(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int


class AuditLogsListData(BaseModel):
    items: List[AuditLogItem]
    pagination: AuditLogPagination


# -----------------------------------------------------------------------------
# 12.3 Request User Deletion to Owner
# -----------------------------------------------------------------------------

class RequestUserDeletionRequest(BaseModel):
    reason: str = Field(..., min_length=5, description="Lý do đề xuất xóa tài khoản")


class RequestUserDeletionData(BaseModel):
    target_user_id: uuid.UUID
    target_username: str
    requested_by: uuid.UUID
    reason: str
    created_at: datetime

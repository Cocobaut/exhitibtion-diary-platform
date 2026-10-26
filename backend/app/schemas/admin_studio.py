from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# 12.1 Studio Direct Publish
# -----------------------------------------------------------------------------

class StudioPublishArtworkRequest(BaseModel):
    room_id: int = Field(..., ge=1, le=3, description="Phòng triển lãm 1 (Đổ vỡ), 2 (Hy vọng), 3 (Thông điệp)")
    title: Optional[str] = Field(None, max_length=150, description="Tiêu đề tác phẩm")
    title_vi: Optional[str] = Field(None, max_length=150, description="Tiêu đề tiếng Việt")
    title_en: Optional[str] = Field(None, max_length=150, description="Tiêu đề tiếng Anh")
    author_display_name: Optional[str] = Field("Triển Lãm Ký Ức (Ban Quản Trị)", max_length=50)
    short_content: Optional[str] = Field(None, description="Đoạn trích tóm tắt")
    short_content_vi: Optional[str] = Field(None, description="Tóm tắt tiếng Việt")
    short_content_en: Optional[str] = Field(None, description="Tóm tắt tiếng Anh")
    content: Optional[str] = Field(None, description="Nội dung đầy đủ của tác phẩm")
    content_vi: Optional[str] = Field(None, description="Nội dung tiếng Việt")
    content_en: Optional[str] = Field(None, description="Nội dung tiếng Anh")
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
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
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
    username: str = Field(..., min_length=1, max_length=50, description="Tên đăng nhập xác nhận của tài khoản cần xóa")
    email: str = Field(..., min_length=3, max_length=100, description="Email xác nhận của tài khoản cần xóa")
    reason: str = Field(..., min_length=5, max_length=500, description="Lý do chi tiết đề xuất xóa tài khoản")


class RequestUserDeletionData(BaseModel):
    target_user_id: uuid.UUID
    target_username: str
    requested_by: uuid.UUID
    reason: str
    created_at: datetime


# -----------------------------------------------------------------------------
# 12.4 Update User Status (Block / Activate)
# -----------------------------------------------------------------------------

class AdminUpdateUserStatusRequest(BaseModel):
    is_active: bool = Field(..., description="Trạng thái kích hoạt tài khoản")
    reason: Optional[str] = Field(None, description="Lý do khóa hoặc mở khóa")


class AdminUpdateUserStatusData(BaseModel):
    id: uuid.UUID
    username: str
    role: str
    is_active: bool
    updated_at: datetime


# -----------------------------------------------------------------------------
# 12.5 Admin Presence (Online / Offline)
# -----------------------------------------------------------------------------

class AdminPresenceItem(BaseModel):
    id: uuid.UUID
    username: str
    nickname: str
    role: str
    avatar_url: Optional[str] = None
    color: str
    is_online: bool
    last_seen_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminPresenceData(BaseModel):
    total_admins: int
    total_online: int
    total_offline: int
    admins: List[AdminPresenceItem]


from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator


# -----------------------------------------------------------------------------
# Common Models
# -----------------------------------------------------------------------------

class AuthorInfo(BaseModel):
    id: uuid.UUID
    username: str
    email: str

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# 9.1.1 Pending Artworks
# -----------------------------------------------------------------------------

class PendingArtworkAuthor(BaseModel):
    id: uuid.UUID
    username: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class PendingArtworkDetail(BaseModel):
    id: uuid.UUID
    original_language: str = "vi"
    title: str
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    author_display_name: Optional[str] = None
    short_content: str
    short_content_vi: Optional[str] = None
    short_content_en: Optional[str] = None
    content: str
    content_vi: Optional[str] = None
    content_en: Optional[str] = None
    media_url: Optional[str] = None
    is_anonymous: bool
    target_date: Optional[datetime] = None
    tag_category: Optional[str] = None
    color_code: Optional[str] = None
    created_at: datetime
    author: PendingArtworkAuthor

    model_config = ConfigDict(from_attributes=True)


class PendingPagination(BaseModel):
    page: int
    limit: int
    total_pending: int
    total_pages: int


class PendingArtworksData(BaseModel):
    room_id: int
    room_code: str
    items: List[PendingArtworkDetail]
    pagination: PendingPagination


# -----------------------------------------------------------------------------
# 9.1.2 Upload Artwork Image
# -----------------------------------------------------------------------------

class UploadArtworkImageResponse(BaseModel):
    media_url: str


# -----------------------------------------------------------------------------
# 9.1.3 Approve Artwork
# -----------------------------------------------------------------------------

class ApproveArtworkRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=150)
    title_vi: Optional[str] = Field(None, max_length=150)
    title_en: Optional[str] = Field(None, max_length=150)
    author_display_name: Optional[str] = Field(None, max_length=50)
    short_content: Optional[str] = None
    short_content_vi: Optional[str] = None
    short_content_en: Optional[str] = None
    content: Optional[str] = None
    content_vi: Optional[str] = None
    content_en: Optional[str] = None
    media_url: Optional[str] = None
    tag_category: Optional[str] = Field(None, max_length=30)
    color_code: Optional[str] = Field(None, max_length=10)


class ApproveArtworkData(BaseModel):
    id: uuid.UUID
    room_id: int
    status: str
    reviewed_by: uuid.UUID
    reviewed_at: datetime
    media_url: Optional[str] = None
    notification_sent: bool


# -----------------------------------------------------------------------------
# 9.1.4 Reject Artwork
# -----------------------------------------------------------------------------

class RejectArtworkRequest(BaseModel):
    admin_note: str = Field(..., min_length=1, description="Lý do từ chối tác phẩm")


class RejectArtworkData(BaseModel):
    id: uuid.UUID
    status: str
    admin_note: str
    reviewed_by: uuid.UUID
    reviewed_at: datetime


# -----------------------------------------------------------------------------
# 9.2.1 Approved Artworks (Gallery Management)
# -----------------------------------------------------------------------------

class RoomApprovedSummary(BaseModel):
    room_id: int
    room_code: str
    total_approved_artworks: int
    total_views: int
    total_reactions: int


class ApprovedArtworkListItem(BaseModel):
    id: uuid.UUID
    title: str
    author_display_name: Optional[str] = None
    media_url: Optional[str] = None
    view_count: int
    reactions_count: int
    status: str
    reviewed_at: Optional[datetime] = None
    author: AuthorInfo

    model_config = ConfigDict(from_attributes=True)


class ApprovedPagination(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int


class ApprovedArtworksData(BaseModel):
    summary: RoomApprovedSummary
    items: List[ApprovedArtworkListItem]
    pagination: ApprovedPagination


# -----------------------------------------------------------------------------
# 9.2.2 Edit Approved Artwork
# -----------------------------------------------------------------------------

class EditArtworkRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=150)
    title_vi: Optional[str] = Field(None, max_length=150)
    title_en: Optional[str] = Field(None, max_length=150)
    short_content: Optional[str] = None
    short_content_vi: Optional[str] = None
    short_content_en: Optional[str] = None
    content: Optional[str] = None
    content_vi: Optional[str] = None
    content_en: Optional[str] = None
    media_url: Optional[str] = None
    tag_category: Optional[str] = Field(None, max_length=30)
    color_code: Optional[str] = Field(None, max_length=10)
    author_display_name: Optional[str] = Field(None, description="Tuyệt đối không được chỉnh sửa trường này")

    @field_validator("author_display_name")
    @classmethod
    def validate_no_author_display_name(cls, v):
        if v is not None:
            raise ValueError("Tuyệt đối không được sửa author_display_name (tên tác giả được cố định theo bí danh của tài khoản)")
        return v


class EditArtworkData(BaseModel):
    id: uuid.UUID
    updated_at: datetime


# -----------------------------------------------------------------------------
# 9.2.3 Archive Artwork
# -----------------------------------------------------------------------------

class ArchiveArtworkRequest(BaseModel):
    admin_note: str = Field(..., min_length=1, description="Lý do gỡ và lưu trữ tác phẩm")


class ArchiveArtworkData(BaseModel):
    id: uuid.UUID
    status: str
    archived_by: uuid.UUID
    updated_at: datetime


# -----------------------------------------------------------------------------
# 9.2.4 Leaf Categories & Stats (Room 3)
# -----------------------------------------------------------------------------

class LeafCategoryStatItem(BaseModel):
    category: str
    label: str
    color_code: str
    total_count: int
    approved_count: int
    pending_count: int


class LeafCategoriesData(BaseModel):
    room_id: int
    room_code: str
    total_leaves: int
    categories: List[LeafCategoryStatItem]

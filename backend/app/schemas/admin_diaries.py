from datetime import date, datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# Common Author Models
# -----------------------------------------------------------------------------

class PendingDiaryAuthor(BaseModel):
    id: uuid.UUID
    username: str
    nickname: str

    model_config = ConfigDict(from_attributes=True)


class ApprovedDiaryAuthor(BaseModel):
    id: uuid.UUID
    nickname: str
    username: str

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# 10.1 Pending Diaries
# -----------------------------------------------------------------------------

class PendingDiaryItem(BaseModel):
    id: uuid.UUID
    entry_date: date
    original_language: str = "vi"
    title: Optional[str] = None
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    mood: Optional[str] = None
    content: str
    content_vi: Optional[str] = None
    content_en: Optional[str] = None
    media_urls: List[str] = []
    author: PendingDiaryAuthor
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PendingDiaryPagination(BaseModel):
    page: int
    limit: int
    total_pending: int
    total_pages: int


class PendingDiariesData(BaseModel):
    items: List[PendingDiaryItem]
    pagination: PendingDiaryPagination


# -----------------------------------------------------------------------------
# 10.2 Approve Diary
# -----------------------------------------------------------------------------

class ApproveDiaryRequest(BaseModel):
    title_vi: Optional[str] = Field(None, max_length=150, description="Tiêu đề tiếng Việt")
    title_en: Optional[str] = Field(None, max_length=150, description="Tiêu đề tiếng Anh")
    content_vi: Optional[str] = Field(None, description="Nội dung tiếng Việt")
    content_en: Optional[str] = Field(None, description="Nội dung tiếng Anh")


class ApproveDiaryData(BaseModel):
    diary_id: uuid.UUID
    is_public: bool
    is_approved: bool
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    updated_at: datetime


# -----------------------------------------------------------------------------
# 10.3 Reject Diary
# -----------------------------------------------------------------------------

class RejectDiaryRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Lý do từ chối chia sẻ công khai")


class RejectDiaryData(BaseModel):
    diary_id: uuid.UUID
    is_public: bool
    is_approved: bool


# -----------------------------------------------------------------------------
# 10.4 Approved Diaries (Community Feed Management)
# -----------------------------------------------------------------------------

class ApprovedDiaryItem(BaseModel):
    id: uuid.UUID
    entry_date: date
    title: Optional[str] = None
    author: ApprovedDiaryAuthor
    reactions_total: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApprovedDiaryPagination(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int


class ApprovedDiariesData(BaseModel):
    items: List[ApprovedDiaryItem]
    pagination: ApprovedDiaryPagination


# -----------------------------------------------------------------------------
# 10.5 Revoke Diary
# -----------------------------------------------------------------------------

class RevokeDiaryRequest(BaseModel):
    admin_reason: str = Field(..., min_length=1, description="Lý do thu hồi quyền hiển thị công khai")


class RevokeDiaryData(BaseModel):
    diary_id: uuid.UUID
    is_public: bool
    is_approved: bool

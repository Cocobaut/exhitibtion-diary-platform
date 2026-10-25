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
    title: Optional[str] = None
    mood: Optional[str] = None
    content: str
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

class ApproveDiaryData(BaseModel):
    diary_id: uuid.UUID
    is_public: bool
    is_approved: bool
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

import uuid
from datetime import date, datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.core.exceptions import AppException


def serialize_utc_datetime(dt: Optional[datetime]) -> Optional[str]:
    """Serialize datetime to ISO-8601 UTC with 'Z' suffix."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


class PaginationInfo(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int


class CommunityAuthorInfo(BaseModel):
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None


class CommunityDiaryReactions(BaseModel):
    HEART: int = 0
    HUG: int = 0
    total: int = 0


class DiaryListItem(BaseModel):
    id: uuid.UUID
    entry_date: date
    title: Optional[str] = None
    mood: Optional[str] = None
    snippet: str
    media_urls: List[str] = Field(default_factory=list)
    is_public: bool
    is_encrypted: bool
    created_at: datetime
    updated_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    @field_serializer("updated_at")
    def serialize_updated_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class DiaryListResponse(BaseModel):
    items: List[DiaryListItem]
    pagination: PaginationInfo


class DiaryDetail(BaseModel):
    id: uuid.UUID
    entry_date: date
    title: Optional[str] = None
    mood: Optional[str] = None
    content: str
    media_urls: List[str] = Field(default_factory=list)
    is_public: bool
    is_approved: bool
    is_encrypted: bool
    created_at: datetime
    updated_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    @field_serializer("updated_at")
    def serialize_updated_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class CreateDiaryRequest(BaseModel):
    entry_date: Optional[date] = None
    title: Optional[str] = None
    mood: Optional[str] = None
    content: str
    media_urls: Optional[List[str]] = Field(default_factory=list)
    is_public: bool = False
    is_encrypted: bool = False

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        clean_v = v.strip() if v else ""
        if not clean_v:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Nội dung nhật ký không được để trống"
            )
        return clean_v


class CreateDiaryResponseData(BaseModel):
    id: uuid.UUID
    entry_date: date
    title: Optional[str] = None
    mood: Optional[str] = None
    is_public: bool
    is_approved: bool
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class UpdateDiaryRequest(BaseModel):
    entry_date: Optional[date] = None
    title: Optional[str] = None
    mood: Optional[str] = None
    content: Optional[str] = None
    media_urls: Optional[List[str]] = None
    is_public: Optional[bool] = None
    is_encrypted: Optional[bool] = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Nội dung nhật ký không được để trống"
            )
        return v.strip() if v else None


class UpdateDiaryResponseData(BaseModel):
    id: uuid.UUID
    title: Optional[str] = None
    updated_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("updated_at")
    def serialize_updated_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class CommunityDiaryListItem(BaseModel):
    id: uuid.UUID
    entry_date: date
    title: Optional[str] = None
    mood: Optional[str] = None
    snippet: str
    media_urls: List[str] = Field(default_factory=list)
    author: CommunityAuthorInfo
    reactions: CommunityDiaryReactions
    my_reaction: Optional[str] = None
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class CommunityDiaryListResponse(BaseModel):
    items: List[CommunityDiaryListItem]
    pagination: PaginationInfo


class CommunityDiaryDetail(BaseModel):
    id: uuid.UUID
    entry_date: date
    title: Optional[str] = None
    mood: Optional[str] = None
    content: str
    media_urls: List[str] = Field(default_factory=list)
    author: CommunityAuthorInfo
    reactions: CommunityDiaryReactions
    my_reaction: Optional[str] = None
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class DiaryReactionRequest(BaseModel):
    reaction_type: str

    @field_validator("reaction_type")
    @classmethod
    def validate_reaction_type(cls, v: str) -> str:
        clean_v = v.strip().upper() if v else ""
        if clean_v not in ("HEART", "HUG", "SYMPATHY"):
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="reaction_type phải là HEART, HUG hoặc SYMPATHY"
            )
        return clean_v


class DiaryReactionResponseData(BaseModel):
    diary_id: uuid.UUID
    current_reaction: Optional[str] = None
    reactions: CommunityDiaryReactions

    @field_serializer("diary_id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)


class DiarySearchItem(BaseModel):
    id: uuid.UUID
    entry_date: date
    title: Optional[str] = None
    mood: Optional[str] = None
    scope: str
    highlight: Dict[str, List[str]] = Field(default_factory=dict)
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)


class DiarySearchPagination(BaseModel):
    page: int
    limit: int
    total_hits: int


class DiarySearchResponse(BaseModel):
    items: List[DiarySearchItem]
    pagination: DiarySearchPagination

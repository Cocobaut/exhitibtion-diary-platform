import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.core.constants import ROOM1_REACTIONS
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


class Room1ReactionType(str, Enum):
    HEART = "HEART"
    HUG = "HUG"
    SYMPATHY = "SYMPATHY"


class ReactionsSummary(BaseModel):
    HEART: int = 0
    HUG: int = 0
    SYMPATHY: int = 0
    total: int = 0


class PaginationInfo(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int


class Room1ArtworkListItem(BaseModel):
    id: uuid.UUID
    original_language: str = "vi"
    title: str
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    short_content: str
    short_content_vi: Optional[str] = None
    short_content_en: Optional[str] = None
    media_url: Optional[str] = None
    author_display_name: str
    is_anonymous: bool
    view_count: int
    reactions: ReactionsSummary
    my_reaction: Optional[str] = None
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class Room1ArtworkListResponse(BaseModel):
    items: List[Room1ArtworkListItem]
    pagination: PaginationInfo


class Room1ArtworkDetail(BaseModel):
    id: uuid.UUID
    room_id: int
    original_language: str = "vi"
    title: str
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    author_display_name: str
    is_anonymous: bool
    short_content: str
    short_content_vi: Optional[str] = None
    short_content_en: Optional[str] = None
    content: str
    content_vi: Optional[str] = None
    content_en: Optional[str] = None
    media_url: Optional[str] = None
    view_count: int
    reactions: ReactionsSummary
    my_reaction: Optional[str] = None
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class Room1ReactionRequest(BaseModel):
    reaction_type: str

    @field_validator("reaction_type")
    @classmethod
    def validate_reaction_type(cls, v: str) -> str:
        clean_v = v.strip().upper() if v else ""
        if clean_v not in ROOM1_REACTIONS:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message=f"Loại cảm xúc không hợp lệ cho phòng 1 (chỉ chấp nhận {', '.join(ROOM1_REACTIONS)})"
            )
        return clean_v


class Room1ReactionResponseData(BaseModel):
    artwork_id: uuid.UUID
    current_reaction: Optional[str]
    reactions_summary: ReactionsSummary

    @field_serializer("artwork_id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)


class Room1SearchItem(BaseModel):
    id: uuid.UUID
    title: str
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    short_content: str
    short_content_vi: Optional[str] = None
    short_content_en: Optional[str] = None
    content: Optional[str] = None
    content_vi: Optional[str] = None
    content_en: Optional[str] = None
    author_display_name: str
    media_url: Optional[str] = None
    highlight: Dict[str, List[str]] = Field(default_factory=dict)
    reactions_total: int
    view_count: int

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)


class Room1SearchPagination(BaseModel):
    page: int
    limit: int
    total_hits: int


class Room1SearchResponse(BaseModel):
    items: List[Room1SearchItem]
    pagination: Room1SearchPagination


class Room1CreateArtworkRequest(BaseModel):
    original_language: str = Field("vi", pattern="^(vi|en)$", description="Ngôn ngữ bài viết gốc: vi hoặc en")
    author_display_name: Optional[str] = None
    title: str
    short_content: Optional[str] = None
    content: str
    is_anonymous: bool = False

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        clean_v = v.strip() if v else ""
        if len(clean_v) < 3 or len(clean_v) > 150:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Tiêu đề hoặc nội dung quá ngắn/để trống"
            )
        return clean_v

    @field_validator("short_content")
    @classmethod
    def validate_short_content(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        clean_v = v.strip()
        if not clean_v:
            return None
        if len(clean_v) > 300:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Tóm tắt không được vượt quá 300 ký tự"
            )
        return clean_v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        clean_v = v.strip() if v else ""
        if len(clean_v) < 30 or len(clean_v) > 20000:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Tiêu đề hoặc nội dung quá ngắn/để trống"
            )
        return clean_v

    @field_validator("author_display_name")
    @classmethod
    def validate_author_display_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean_v = v.strip()
        if not clean_v:
            return None
        if len(clean_v) > 50:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Bút danh không được quá 50 ký tự"
            )
        return clean_v


class Room1CreateArtworkResponseData(BaseModel):
    id: uuid.UUID
    room_id: int
    title: str
    author_display_name: str
    status: str
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)

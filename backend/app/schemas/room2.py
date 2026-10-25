import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional
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


class LanternVisibility(str, Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class Room2LanternListItem(BaseModel):
    id: uuid.UUID
    original_language: str = "vi"
    title: str
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    author_display_name: str
    visibility: str
    is_mine: bool
    short_content: Optional[str] = None
    short_content_vi: Optional[str] = None
    short_content_en: Optional[str] = None
    content: Optional[str] = None
    content_vi: Optional[str] = None
    content_en: Optional[str] = None
    target_date: Optional[datetime] = None
    is_unlockable: bool
    remaining_seconds: int
    is_opened: bool
    media_url: Optional[str] = None
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("target_date")
    def serialize_target_date(self, dt: Optional[datetime]) -> Optional[str]:
        return serialize_utc_datetime(dt)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class Room2LanternListResponse(BaseModel):
    items: List[Room2LanternListItem]
    total_lanterns: int


class Room2LanternDetail(BaseModel):
    id: uuid.UUID
    original_language: str = "vi"
    title: str
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    author_display_name: str
    short_content: Optional[str] = None
    short_content_vi: Optional[str] = None
    short_content_en: Optional[str] = None
    content: str
    content_vi: Optional[str] = None
    content_en: Optional[str] = None
    media_url: Optional[str] = None
    visibility: str
    target_date: Optional[datetime] = None
    is_opened: bool
    view_count: int
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("target_date")
    def serialize_target_date(self, dt: Optional[datetime]) -> Optional[str]:
        return serialize_utc_datetime(dt)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class Room2CreateLanternRequest(BaseModel):
    original_language: str = Field("vi", pattern="^(vi|en)$", description="Ngôn ngữ bài viết gốc: vi hoặc en")
    author_display_name: Optional[str] = None
    title: str
    short_content: str
    content: str
    target_date: datetime
    visibility: str
    is_anonymous: bool = False

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        clean_v = v.strip() if v else ""
        if len(clean_v) < 3 or len(clean_v) > 150:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Tiêu đề phải từ 3 đến 150 ký tự"
            )
        return clean_v

    @field_validator("short_content")
    @classmethod
    def validate_short_content(cls, v: str) -> str:
        clean_v = v.strip() if v else ""
        if len(clean_v) < 5 or len(clean_v) > 300:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Tóm tắt ngắn phải từ 5 đến 300 ký tự"
            )
        return clean_v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        clean_v = v.strip() if v else ""
        if len(clean_v) < 10 or len(clean_v) > 20000:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Nội dung bức thư phải từ 10 đến 20.000 ký tự"
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

    @field_validator("visibility")
    @classmethod
    def validate_visibility(cls, v: str) -> str:
        clean_v = v.strip().upper() if v else ""
        if clean_v not in ("PUBLIC", "PRIVATE"):
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Visibility phải là PUBLIC hoặc PRIVATE"
            )
        return clean_v

    @field_validator("target_date")
    @classmethod
    def validate_target_date(cls, v: datetime) -> datetime:
        now = datetime.now(timezone.utc)
        dt = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        if dt <= now:
            raise AppException(
                status_code=400,
                error_code="INVALID_TARGET_DATE",
                message="Ngày mở khóa không hợp lệ hoặc nằm trong quá khứ"
            )
        return dt


class Room2CreateLanternResponseData(BaseModel):
    id: uuid.UUID
    room_id: int
    original_language: str = "vi"
    title: str
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    author_display_name: Optional[str] = None
    short_content: Optional[str] = None
    short_content_vi: Optional[str] = None
    short_content_en: Optional[str] = None
    content: Optional[str] = None
    content_vi: Optional[str] = None
    content_en: Optional[str] = None
    visibility: str
    status: str
    target_date: Optional[datetime] = None
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("target_date")
    def serialize_target_date(self, dt: Optional[datetime]) -> Optional[str]:
        return serialize_utc_datetime(dt)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class Room2SearchItem(BaseModel):
    id: uuid.UUID
    title: str
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    author_display_name: str
    short_content: Optional[str] = None
    short_content_vi: Optional[str] = None
    short_content_en: Optional[str] = None
    content: Optional[str] = None
    content_vi: Optional[str] = None
    content_en: Optional[str] = None
    visibility: str
    is_opened: bool
    is_unlockable: bool
    target_date: Optional[datetime] = None
    highlight: Dict[str, List[str]] = Field(default_factory=dict)

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("target_date")
    def serialize_target_date(self, dt: Optional[datetime]) -> Optional[str]:
        return serialize_utc_datetime(dt)


class Room2SearchPagination(BaseModel):
    page: int
    limit: int
    total_hits: int


class Room2SearchResponse(BaseModel):
    items: List[Room2SearchItem]
    pagination: Room2SearchPagination


class Room2ReadyToFallItem(BaseModel):
    id: uuid.UUID
    original_language: str = "vi"
    title: str
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    author_display_name: str
    short_content: Optional[str] = None
    short_content_vi: Optional[str] = None
    short_content_en: Optional[str] = None
    content: Optional[str] = None
    content_vi: Optional[str] = None
    content_en: Optional[str] = None
    visibility: str
    status: str
    target_date: Optional[datetime] = None
    is_opened: bool
    media_url: Optional[str] = None
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("target_date")
    def serialize_target_date(self, dt: Optional[datetime]) -> Optional[str]:
        return serialize_utc_datetime(dt)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class Room2ReadyToFallResponse(BaseModel):
    items: List[Room2ReadyToFallItem]
    total: int

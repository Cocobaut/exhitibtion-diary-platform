import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.core.constants import ROOM3_COLOR_LEGEND
from app.core.exceptions import AppException

ROOM3_CATEGORY_COLORS = {item["category"]: item["color_code"] for item in ROOM3_COLOR_LEGEND}


def serialize_utc_datetime(dt: Optional[datetime]) -> Optional[str]:
    """Serialize datetime to ISO-8601 UTC with 'Z' suffix."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


class Room3Reactions(BaseModel):
    ENERGY: int = 0
    HEART: int = 0
    total: int = 0


class ColorLegendItem(BaseModel):
    category: str
    color_code: str
    label: str


class Room3RibbonListItem(BaseModel):
    id: uuid.UUID
    title: str
    author_display_name: str
    tag_category: Optional[str] = None
    color_code: Optional[str] = None
    reactions: Room3Reactions
    has_received_energy: bool = False
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class Room3RibbonListResponse(BaseModel):
    color_legend: List[ColorLegendItem]
    items: List[Room3RibbonListItem]
    total_ribbons: int


class Room3RibbonDetail(BaseModel):
    id: uuid.UUID
    room_id: int
    original_language: str = "vi"
    title: str
    title_vi: Optional[str] = None
    title_en: Optional[str] = None
    author_display_name: str
    tag_category: Optional[str] = None
    color_code: Optional[str] = None
    content: str
    content_vi: Optional[str] = None
    content_en: Optional[str] = None
    reactions: Room3Reactions
    has_received_energy: bool = False
    view_count: int
    created_at: datetime

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> Optional[str]:
        return serialize_utc_datetime(dt)

    model_config = ConfigDict(from_attributes=True)


class Room3EnergyRequest(BaseModel):
    action_type: str

    @field_validator("action_type")
    @classmethod
    def validate_action_type(cls, v: str) -> str:
        clean_v = v.strip().upper() if v else ""
        if clean_v not in ("INSPIRED", "HEART"):
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="action_type phải là INSPIRED hoặc HEART"
            )
        return clean_v


class Room3EnergyResponseData(BaseModel):
    artwork_id: uuid.UUID
    current_action: Optional[str] = None
    reactions: Room3Reactions

    @field_serializer("artwork_id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)


class Room3CreateRibbonRequest(BaseModel):
    original_language: str = Field("vi", pattern="^(vi|en)$", description="Ngôn ngữ bài viết gốc: vi hoặc en")
    author_display_name: Optional[str] = None
    title: str
    tag_category: str
    color_code: str
    content: str
    short_content: str
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
                message="Nội dung thông điệp phải từ 10 đến 20.000 ký tự"
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

    @field_validator("tag_category")
    @classmethod
    def validate_tag_category(cls, v: str) -> str:
        clean_v = v.strip().upper() if v else ""
        if clean_v not in ROOM3_CATEGORY_COLORS:
            raise AppException(
                status_code=400,
                error_code="INVALID_CATEGORY_COLOR",
                message="Danh mục không hợp lệ"
            )
        return clean_v

    @field_validator("color_code")
    @classmethod
    def validate_color_code(cls, v: str) -> str:
        clean_v = v.strip().upper() if v else ""
        if not clean_v.startswith("#") and len(clean_v) == 6:
            clean_v = f"#{clean_v}"
        return clean_v


class Room3CreateRibbonResponseData(BaseModel):
    id: uuid.UUID
    room_id: int
    title: str
    tag_category: str
    color_code: str
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


class Room3SearchItem(BaseModel):
    id: uuid.UUID
    title: str
    author_display_name: str
    tag_category: Optional[str] = None
    color_code: Optional[str] = None
    highlight: Dict[str, List[str]] = Field(default_factory=dict)
    energy_count: int = 0

    @field_serializer("id")
    def serialize_uuid(self, v: uuid.UUID) -> str:
        return str(v)


class Room3SearchPagination(BaseModel):
    page: int
    limit: int
    total_hits: int


class Room3SearchResponse(BaseModel):
    items: List[Room3SearchItem]
    pagination: Room3SearchPagination

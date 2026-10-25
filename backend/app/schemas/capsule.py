import enum
from datetime import datetime, timezone
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_serializer


def serialize_utc_datetime(dt: datetime) -> str:
    """Format datetime as ISO-8601 UTC with 'Z' suffix."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class CapsuleCategory(str, enum.Enum):
    HEALING = "HEALING"
    COURAGE = "COURAGE"
    PERSPECTIVE = "PERSPECTIVE"


# =====================================================================
# 3.1 POST /capsules/draw
# =====================================================================
class DrawCapsuleData(BaseModel):
    draw_id: uuid.UUID
    capsule_id: int
    message: str
    category: str
    is_saved: bool
    drawn_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("drawn_at")
    def serialize_drawn_at(self, dt: datetime) -> str:
        return serialize_utc_datetime(dt)


class DrawCapsuleResponse(BaseModel):
    success: bool = True
    message: str = "Rút thông điệp thành công"
    data: DrawCapsuleData


# =====================================================================
# 3.2 PATCH /capsules/draws/{draw_id}/save
# =====================================================================
class SaveDrawRequest(BaseModel):
    is_saved: bool = Field(..., description="Trạng thái lưu vào sổ tay cá nhân")


class SaveDrawData(BaseModel):
    draw_id: uuid.UUID
    is_saved: bool
    updated_at: datetime

    @field_serializer("updated_at")
    def serialize_updated_at(self, dt: datetime) -> str:
        return serialize_utc_datetime(dt)


class SaveDrawResponse(BaseModel):
    success: bool = True
    message: str
    data: SaveDrawData


# =====================================================================
# 3.3 GET /capsules/saved
# =====================================================================
class SavedCapsuleItem(BaseModel):
    draw_id: uuid.UUID
    capsule_id: int
    message: str
    category: str
    drawn_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("drawn_at")
    def serialize_drawn_at(self, dt: datetime) -> str:
        return serialize_utc_datetime(dt)


class PaginationInfo(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int


class SavedCapsulesData(BaseModel):
    items: List[SavedCapsuleItem]
    pagination: PaginationInfo


class SavedCapsulesResponse(BaseModel):
    success: bool = True
    data: SavedCapsulesData


# =====================================================================
# 3.4 DELETE /capsules/saved/{draw_id}
# =====================================================================
class DeleteSavedResponse(BaseModel):
    success: bool = True
    message: str = "Đã bỏ lưu thông điệp khỏi sổ tay"

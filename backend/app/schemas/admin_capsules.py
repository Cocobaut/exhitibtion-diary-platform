from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# Common Author Models
# -----------------------------------------------------------------------------

class CapsuleAuthorInfo(BaseModel):
    id: Optional[uuid.UUID] = None
    nickname: Optional[str] = None
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# 11.1 List Capsules
# -----------------------------------------------------------------------------

class AdminCapsuleItem(BaseModel):
    id: int
    message: str
    message_vi: str = ""
    message_en: str = ""
    category: str
    draw_count: int
    is_approved: bool
    author: Optional[CapsuleAuthorInfo] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminCapsulePagination(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int


class AdminCapsulesListData(BaseModel):
    items: List[AdminCapsuleItem]
    pagination: AdminCapsulePagination


# -----------------------------------------------------------------------------
# 11.2 Create Capsule
# -----------------------------------------------------------------------------

class CreateCapsuleRequest(BaseModel):
    message: Optional[str] = Field(None, description="Nội dung thông điệp (tùy chọn nếu đã có message_vi)")
    message_vi: Optional[str] = Field(None, description="Nội dung thông điệp tiếng Việt")
    message_en: Optional[str] = Field(None, description="Nội dung thông điệp tiếng Anh")
    category: str = Field("HEALING", pattern="^(HEALING|COURAGE|PERSPECTIVE)$", description="Chủ đề thông điệp")
    is_approved: bool = Field(True, description="Trạng thái kích hoạt thông điệp")


class CreateCapsuleData(BaseModel):
    id: int
    message: str
    message_vi: str = ""
    message_en: str = ""
    category: str
    author_role: str
    is_approved: bool
    draw_count: int
    created_at: datetime


# -----------------------------------------------------------------------------
# 11.3 Update Capsule
# -----------------------------------------------------------------------------

class UpdateCapsuleRequest(BaseModel):
    message: Optional[str] = Field(None, description="Nội dung thông điệp mới")
    message_vi: Optional[str] = Field(None, description="Nội dung thông điệp tiếng Việt")
    message_en: Optional[str] = Field(None, description="Nội dung thông điệp tiếng Anh")
    category: str = Field("HEALING", pattern="^(HEALING|COURAGE|PERSPECTIVE)$", description="Chủ đề thông điệp")


class UpdateCapsuleData(BaseModel):
    id: int
    message: str
    message_vi: str = ""
    message_en: str = ""
    category: str
    updated_at: datetime


# -----------------------------------------------------------------------------
# 11.4 Toggle Capsule Status
# -----------------------------------------------------------------------------

class ToggleCapsuleStatusRequest(BaseModel):
    is_approved: bool = Field(..., description="false: tạm dừng nhả, true: kích hoạt lại")


class ToggleCapsuleStatusData(BaseModel):
    id: int
    is_approved: bool

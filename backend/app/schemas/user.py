from datetime import datetime, timezone
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


def serialize_utc_datetime(dt: datetime) -> str:
    """Format datetime as ISO-8601 UTC with 'Z' suffix."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# =====================================================================
# 2.1 GET /users/me
# =====================================================================
class UserMeOut(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    nickname: str
    role: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    theme_preference: str = "museum"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> str:
        return serialize_utc_datetime(dt)


class UserMeResponse(BaseModel):
    success: bool = True
    data: UserMeOut


# =====================================================================
# 2.2 PATCH /users/me
# =====================================================================
class UserProfilePatch(BaseModel):
    nickname: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    theme_preference: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, v: Optional[str]) -> str:
        if v is None:
            raise ValueError("Nickname không được là null")
        stripped = v.strip()
        if not stripped or len(stripped) > 50:
            raise ValueError("Nickname phải từ 1 đến 50 ký tự")
        return stripped

    @field_validator("bio")
    @classmethod
    def validate_bio(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        stripped = v.strip()
        if not stripped:
            return None
        if len(stripped) > 255:
            raise ValueError("Bio không được vượt quá 255 ký tự")
        return stripped

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        stripped = v.strip()
        if not stripped:
            return None
        if not (stripped.startswith("http://") or stripped.startswith("https://")):
            raise ValueError("avatar_url phải là URL hợp lệ (http:// hoặc https://)")
        if len(stripped) > 2048:
            raise ValueError("avatar_url không được vượt quá 2048 ký tự")
        return stripped

    @field_validator("theme_preference")
    @classmethod
    def validate_theme_preference(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        stripped = v.strip().lower()
        valid_themes = {"museum", "moss", "plum", "paper"}
        if stripped not in valid_themes:
            raise ValueError("theme_preference phải là một trong: museum, moss, plum, paper")
        return stripped


class UserProfilePatchOut(BaseModel):
    id: uuid.UUID
    nickname: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    theme_preference: Optional[str] = "museum"
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("updated_at")
    def serialize_updated_at(self, dt: datetime) -> str:
        return serialize_utc_datetime(dt)


class UserProfilePatchResponse(BaseModel):
    success: bool = True
    message: str = "Cập nhật hồ sơ thành công"
    data: UserProfilePatchOut


# =====================================================================
# 2.3 PUT /users/me/password
# =====================================================================
class ChangePasswordIn(BaseModel):
    current_password: str = Field(..., min_length=1, description="Mật khẩu hiện tại")
    new_password: str = Field(..., min_length=1, description="Mật khẩu mới")


class ChangePasswordResponse(BaseModel):
    success: bool = True
    message: str = "Đổi mật khẩu thành công"


# =====================================================================
# 2.4 POST /users/me/avatar
# =====================================================================
class AvatarOut(BaseModel):
    avatar_url: str


class AvatarResponse(BaseModel):
    success: bool = True
    message: str = "Tải ảnh đại diện thành công"
    data: AvatarOut

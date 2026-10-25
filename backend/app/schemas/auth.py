import re
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.security import validate_password_strength


class RegisterRequest(BaseModel):
    username: str = Field(
        ...,
        pattern=r"^[A-Za-z0-9_]{3,50}$",
        description="3-50 ký tự alnum và gạch dưới"
    )
    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=1, max_length=128)
    nickname: str = Field(..., min_length=1, max_length=50)

    model_config = ConfigDict(extra="ignore")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped or len(stripped) > 50:
            raise ValueError("Nickname phải từ 1 đến 50 ký tự")
        return stripped

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        validate_password_strength(v)
        return v


class LoginRequest(BaseModel):
    account: str = Field(..., min_length=1, max_length=255, description="Email hoặc Username")
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("account")
    @classmethod
    def strip_account(cls, v: str) -> str:
        return v.strip()


class ChangePasswordRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    email: EmailStr = Field(..., max_length=255)
    new_password: str = Field(..., min_length=1, max_length=128)

    model_config = ConfigDict(extra="ignore")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("username")
    @classmethod
    def normalize_username(cls, v: str) -> str:
        return v.strip()

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        validate_password_strength(v)
        return v


class UserAuthProfile(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    nickname: str
    role: str
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RegisterResponseData(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    nickname: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class RegisterResponse(BaseModel):
    success: bool = True
    message: str = "Tài khoản tạo thành công"
    body: RegisterResponseData


class LoginResponseData(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int = 86400
    user: UserAuthProfile


class LoginResponse(BaseModel):
    success: bool = True
    message: str
    body: LoginResponseData


class MessageResponse(BaseModel):
    success: bool = True
    message: str

import json
from typing import Annotated, List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


DEV_SECRET_KEY = "super-secret-development-key-change-in-production-exhibition-diary-2026"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Project Exhibition & Diary Platform API"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # CORS
    BACKEND_CORS_ORIGINS: Annotated[List[str], NoDecode] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        # Chấp nhận cả dạng JSON '["a","b"]' lẫn dạng 'a,b'
        if isinstance(v, str):
            if v.strip().startswith("["):
                return json.loads(v)
            return [i.strip() for i in v.split(",") if i.strip()]
        if isinstance(v, list):
            return v
        return []

    # Security & JWT
    SECRET_KEY: str = DEV_SECRET_KEY
    ALGORITHM: str = "HS256"
    JWT_EXPIRE_SECONDS: int = 86400  # 24 hours as specified in API spec
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/exhibition_diary_db"
    DB_ECHO: bool = False

    # Frontend URLs
    # Link trong email đặt lại mật khẩu: <FRONTEND_RESET_URL>?reset_token=...
    FRONTEND_RESET_URL: str = "http://localhost:3000/"

    # File Upload & Storage
    STORAGE_BACKEND: str = "local"  # "local" or "s3"
    UPLOAD_DIR: str = "uploads"
    PUBLIC_BASE_URL: str = "http://localhost:8000"

    # Business Rules Configuration
    ROOM3_AUTO_APPROVE: bool = False
    ARTWORK_RATE_LIMIT_WINDOW_MINUTES: int = 10
    ARTWORK_RATE_LIMIT_MAX_PER_WINDOW: int = 3

    # Email
    EMAIL_BACKEND: str = "console"  # "console" or "smtp"
    SMTP_HOST: str = "smtp.example.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@exhibition.edu.vn"
    EMAILS_FROM_NAME: str = "Triển Lãm Ký Ức"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @model_validator(mode="after")
    def require_real_secret_outside_debug(self) -> "Settings":
        # SECRET_KEY ký JWT và mã hóa API key AI: không được dùng key mặc định khi DEBUG=False
        if not self.DEBUG and self.SECRET_KEY == DEV_SECRET_KEY:
            raise ValueError("SECRET_KEY mặc định chỉ dùng cho môi trường dev; hãy đặt SECRET_KEY riêng khi DEBUG=False")
        return self


settings = Settings()

from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Project Exhibition & Diary Platform API"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        return []

    # Security & JWT
    SECRET_KEY: str = "super-secret-development-key-change-in-production-exhibition-diary-2026"
    ALGORITHM: str = "HS256"
    JWT_EXPIRE_SECONDS: int = 86400  # 24 hours as specified in API spec
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/exhibition_diary_db"

    # Frontend URLs
    FRONTEND_RESET_URL: str = "http://localhost:3000/reset-password"

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


settings = Settings()

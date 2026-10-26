import uuid
from typing import Optional
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class AiProviderSetting(Base, TimestampMixin):
    """Configuration for AI Providers (Moderation and Image Generation).
    Managed exclusively by Owner users.
    """
    __tablename__ = "ai_provider_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    # Master switch for entire AI system
    is_ai_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # 1. Moderation Service Config
    is_moderation_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    moderation_provider: Mapped[str] = mapped_column(String(50), default="gemini", nullable=False)
    moderation_base_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    moderation_encrypted_api_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    moderation_model_name: Mapped[str] = mapped_column(String(100), default="gemini-2.5-flash", nullable=False)

    # 2. Image Generation Service Config
    is_image_gen_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    image_provider: Mapped[str] = mapped_column(String(50), default="gemini", nullable=False)
    image_base_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    image_encrypted_api_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_model_name: Mapped[str] = mapped_column(String(100), default="imagen-3.0-generate-002", nullable=False)

    # Global runtime parameters
    max_tokens_per_req: Mapped[int] = mapped_column(Integer, default=2048, nullable=False)
    temperature: Mapped[float] = mapped_column(Float, default=0.20, nullable=False)

    # Audit
    updated_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    updated_by_user = relationship("User", foreign_keys=[updated_by_user_id])

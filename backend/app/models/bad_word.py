import uuid
from typing import Any, List
from sqlalchemy import Boolean, Integer, JSON, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class BadWord(Base, TimestampMixin):
    """Stores bad words, profanities, and their teencode / leet variants for fast matching."""
    __tablename__ = "bad_words"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    term: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="vi", nullable=False)
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    base_penalty: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    variants: Mapped[List[Any]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

import uuid
from datetime import date
from typing import Any, List, Optional
from sqlalchemy import Boolean, Date, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Diary(Base, TimestampMixin):
    __tablename__ = "diaries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    original_language: Mapped[str] = mapped_column(String(5), default="vi", nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    title_vi: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    title_en: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_vi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mood: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    media_urls: Mapped[Optional[List[Any]]] = mapped_column(
        JSONB,
        default=list,
        server_default=text("'[]'"),
        nullable=True
    )
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    entry_date: Mapped[date] = mapped_column(
        Date,
        default=date.today,
        server_default=func.current_date(),
        nullable=False,
        index=True
    )

    # Relationships
    user = relationship("User", lazy="joined")

    def __repr__(self) -> str:
        return f"<Diary id={self.id} user_id={self.user_id} date={self.entry_date}>"

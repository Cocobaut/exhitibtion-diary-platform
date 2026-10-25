import uuid
from typing import Optional
from sqlalchemy import BigInteger, Boolean, ForeignKeyConstraint, Identity, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class MessageCapsule(Base, TimestampMixin):
    __tablename__ = "message_capsules"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        Identity(),
        primary_key=True,
        autoincrement=True
    )
    author_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    author_role: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="ADMIN")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    message_vi: Mapped[str] = mapped_column(Text, nullable=False, default="")
    message_en: Mapped[str] = mapped_column(Text, nullable=False, default="")
    category: Mapped[str] = mapped_column(String(30), default="HEALING", nullable=False, index=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    draw_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    __table_args__ = (
        ForeignKeyConstraint(
            ["author_id", "author_role"],
            ["users.id", "users.role"],
            ondelete="SET NULL",
            name="fk_message_capsules_author"
        ),
    )

    # Relationship to author
    author = relationship("User", foreign_keys=[author_id], lazy="select")

    def __repr__(self) -> str:
        return f"<MessageCapsule id={self.id} category={self.category} approved={self.is_approved}>"

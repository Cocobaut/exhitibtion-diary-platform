import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    artwork_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("artworks.id", ondelete="SET NULL"),
        nullable=True
    )
    artwork_title: Mapped[str] = mapped_column(String(150), nullable=False)
    room_id: Mapped[int] = mapped_column(
        SmallInteger,
        ForeignKey("rooms.id"),
        nullable=False,
        index=True
    )
    admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    action_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    performed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    # Relationships
    admin = relationship("User", foreign_keys=[admin_id], lazy="joined")
    artwork = relationship("Artwork", foreign_keys=[artwork_id], lazy="select")
    room = relationship("Room", foreign_keys=[room_id], lazy="joined")

    def __repr__(self) -> str:
        return f"<AdminAuditLog id={self.id} action={self.action_type} room={self.room_id}>"

import uuid
from datetime import datetime
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserCapsuleDraw(Base):
    __tablename__ = "user_capsule_draws"

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
    capsule_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("message_capsules.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    is_saved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    drawn_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    # Relationships
    user = relationship("User", lazy="select")
    capsule = relationship("MessageCapsule", lazy="joined")

    def __repr__(self) -> str:
        return f"<UserCapsuleDraw id={self.id} user_id={self.user_id} capsule_id={self.capsule_id}>"

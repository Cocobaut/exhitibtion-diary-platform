import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_audit_log import AdminAuditLog
from app.models.artwork import Artwork


class AuditLogService:
    @staticmethod
    async def log(
        db: AsyncSession,
        *,
        admin_id: Optional[uuid.UUID],
        action_type: str,
        artwork: Optional[Artwork] = None,
        artwork_id: Optional[uuid.UUID] = None,
        artwork_title: Optional[str] = None,
        room_id: Optional[int] = None,
        note: Optional[str] = None,
    ) -> AdminAuditLog:
        """Record an admin action in admin_audit_logs.
        Captures a snapshot of artwork_title and room_id.
        Does NOT commit on its own — commits in caller's transaction.
        """
        target_artwork_id = artwork.id if artwork else artwork_id
        target_title = (artwork.title if artwork else artwork_title) or "N/A"
        target_room_id = (artwork.room_id if artwork else room_id) or 1

        log_entry = AdminAuditLog(
            artwork_id=target_artwork_id,
            artwork_title=target_title,
            room_id=target_room_id,
            admin_id=admin_id,
            action_type=action_type,
            note=note,
        )
        db.add(log_entry)
        return log_entry

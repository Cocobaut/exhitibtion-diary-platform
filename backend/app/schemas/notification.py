from datetime import datetime, timezone
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, field_serializer


def serialize_utc_datetime(dt: datetime) -> str:
    """Format datetime as ISO-8601 UTC with 'Z' suffix."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# =====================================================================
# 4.1 GET /notifications/unread-count
# =====================================================================
class UnreadCountData(BaseModel):
    unread_count: int


class UnreadCountResponse(BaseModel):
    success: bool = True
    data: UnreadCountData


# =====================================================================
# 4.2 GET /notifications
# =====================================================================
class NotificationSender(BaseModel):
    nickname: str
    avatar_url: Optional[str] = None


class NotificationItem(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    body: str
    target_url: Optional[str] = None
    is_read: bool
    sender: NotificationSender
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> str:
        return serialize_utc_datetime(dt)


class NotificationPagination(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int


class NotificationListData(BaseModel):
    items: List[NotificationItem]
    pagination: NotificationPagination


class NotificationListResponse(BaseModel):
    success: bool = True
    data: NotificationListData


# =====================================================================
# 4.3 PATCH /notifications/{notification_id}/read
# =====================================================================
class MarkReadData(BaseModel):
    notification_id: uuid.UUID
    is_read: bool
    target_url: Optional[str] = None


class MarkReadResponse(BaseModel):
    success: bool = True
    message: str = "Đã đánh dấu thông báo là đã đọc"
    data: MarkReadData


# =====================================================================
# 4.4 PATCH /notifications/read-all
# =====================================================================
class ReadAllData(BaseModel):
    affected_rows: int


class ReadAllResponse(BaseModel):
    success: bool = True
    message: str = "Đã đánh dấu tất cả thông báo là đã đọc"
    data: ReadAllData

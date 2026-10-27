from datetime import datetime, timezone
import math
from typing import List, Literal, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


def serialize_utc_datetime(dt: Optional[datetime]) -> Optional[str]:
    """Format datetime as ISO-8601 UTC with 'Z' suffix."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


class NotebookItem(BaseModel):
    id: str
    source: str  # 'mailbox' | 'lantern' | 'room1' | 'room3'
    source_label: str
    source_id: str
    category: Optional[str] = None
    badge_class: str = "b-ok"
    icon: str = "sparkle"
    title: Optional[str] = None
    content: str
    author: Optional[str] = None
    symbol: Optional[str] = None
    media_url: Optional[str] = None
    saved_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NotebookCounts(BaseModel):
    all: int = 0
    mailbox: int = 0
    lantern: int = 0
    room1: int = 0
    room3: int = 0



class NotebookPagination(BaseModel):
    page: int = 1
    limit: int = 20
    total_items: int = 0
    total_pages: int = 1
    counts: NotebookCounts


class NotebookListData(BaseModel):
    items: List[NotebookItem]
    pagination: NotebookPagination


class NotebookListResponse(BaseModel):
    success: bool = True
    data: NotebookListData

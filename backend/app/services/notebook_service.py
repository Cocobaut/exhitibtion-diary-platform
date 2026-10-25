import math
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.constants import ROOM_HOPE
from app.core.exceptions import AppException
from app.models.artwork import Artwork
from app.models.message_capsule import MessageCapsule
from app.models.user import User
from app.models.user_capsule_draw import UserCapsuleDraw
from app.models.user_saved_artwork import UserSavedArtwork
from app.schemas.notebook import (
    NotebookCounts,
    NotebookItem,
    NotebookListData,
    NotebookPagination,
    serialize_utc_datetime,
)

CATEGORY_LABELS = {
    "HEALING": "Chữa lành",
    "COURAGE": "Can đảm",
    "PERSPECTIVE": "Góc nhìn",
}


class NotebookService:
    @staticmethod
    async def get_notebook(
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        source: str = "all",
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> NotebookListData:
        """Fetch unified notebook items combining saved mailbox capsules and saved Room 2 lanterns."""
        if source not in ("all", "mailbox", "lantern"):
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Nguồn source không hợp lệ (hỗ trợ all, mailbox, lantern)"
            )
        if limit < 1 or limit > 50:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="limit phải từ 1 đến 50"
            )
        if page < 1:
            page = 1

        items_all: List[Dict[str, Any]] = []

        # 1. Fetch Mailbox saved capsules
        draws_stmt = (
            select(UserCapsuleDraw)
            .options(joinedload(UserCapsuleDraw.capsule))
            .where(
                UserCapsuleDraw.user_id == user_id,
                UserCapsuleDraw.is_saved.is_(True),
            )
        )
        draws = (await db.execute(draws_stmt)).scalars().unique().all()
        for d in draws:
            capsule = d.capsule
            cat_raw = capsule.category if capsule else "HEALING"
            cat_display = CATEGORY_LABELS.get(cat_raw, cat_raw)
            msg = (capsule.message or capsule.message_vi or capsule.message_en) if capsule else ""
            items_all.append({
                "id": f"nb_mb_{d.id}",
                "source": "mailbox",
                "source_label": f"Hòm thư · {cat_display}",
                "source_id": str(d.id),
                "category": cat_display,
                "badge_class": "b-ok",
                "icon": "sparkle",
                "title": None,
                "content": msg,
                "author": "một người lạ ở Phòng 3, đã được kiểm duyệt",
                "symbol": None,
                "saved_at": serialize_utc_datetime(d.drawn_at),
                "saved_at_dt": d.drawn_at,
            })

        # 2. Fetch Room 2 saved lanterns
        lanterns_stmt = (
            select(UserSavedArtwork)
            .options(joinedload(UserSavedArtwork.artwork).joinedload(Artwork.author))
            .where(
                UserSavedArtwork.user_id == user_id,
            )
        )
        saved_arts = (await db.execute(lanterns_stmt)).scalars().unique().all()
        for sa in saved_arts:
            art = sa.artwork
            if not art or art.room_id != ROOM_HOPE:
                continue
            cat_display = art.tag_category or "Hy vọng"
            author_name = art.author_display_name or (
                art.author.nickname if art.author and not art.is_anonymous else "Ẩn danh"
            )
            items_all.append({
                "id": f"nb_lt_{sa.id}",
                "source": "lantern",
                "source_label": "Lồng đèn hạ xuống · Phòng 2",
                "source_id": str(art.id),
                "category": cat_display,
                "badge_class": "b-wait",
                "icon": "r2",
                "title": art.title,
                "content": art.content or art.short_content,
                "short_content": art.short_content,
                "author": author_name,
                "symbol": art.color_code or art.tag_category or "heart",
                "saved_at": serialize_utc_datetime(sa.saved_at),
                "saved_at_dt": sa.saved_at,
            })

        # 3. Filter by search keyword if provided
        if search and search.strip():
            kw = search.strip().lower()
            filtered = []
            for it in items_all:
                title_match = bool(it["title"] and kw in it["title"].lower())
                content_match = bool(
                    (it["content"] and kw in it["content"].lower()) or
                    (it.get("short_content") and kw in it["short_content"].lower())
                )
                author_match = bool(it["author"] and kw in it["author"].lower())
                cat_match = bool(it["category"] and kw in it["category"].lower())
                if title_match or content_match or author_match or cat_match:
                    filtered.append(it)
            items_all = filtered

        # 4. Compute counts
        total_mailbox = sum(1 for it in items_all if it["source"] == "mailbox")
        total_lantern = sum(1 for it in items_all if it["source"] == "lantern")
        total_all = len(items_all)
        counts = NotebookCounts(all=total_all, mailbox=total_mailbox, lantern=total_lantern)

        # 5. Filter by source
        if source == "mailbox":
            selected = [it for it in items_all if it["source"] == "mailbox"]
        elif source == "lantern":
            selected = [it for it in items_all if it["source"] == "lantern"]
        else:
            selected = items_all

        # 6. Sort by saved_at descending
        selected.sort(key=lambda x: x["saved_at_dt"], reverse=True)

        # 7. Pagination
        total_items = len(selected)
        total_pages = math.ceil(total_items / limit) if total_items > 0 else 1
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paged_items = selected[start_idx:end_idx]

        out_items = [
            NotebookItem(
                id=it["id"],
                source=it["source"],
                source_label=it["source_label"],
                source_id=it["source_id"],
                category=it["category"],
                badge_class=it["badge_class"],
                icon=it["icon"],
                title=it["title"],
                content=it["content"],
                author=it["author"],
                symbol=it["symbol"],
                saved_at=it["saved_at"],
            )
            for it in paged_items
        ]

        return NotebookListData(
            items=out_items,
            pagination=NotebookPagination(
                page=page,
                limit=limit,
                total_items=total_items,
                total_pages=total_pages,
                counts=counts,
            )
        )

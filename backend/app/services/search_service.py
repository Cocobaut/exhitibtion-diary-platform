import re
import uuid
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.models.artwork import Artwork
from app.models.diary import Diary
from app.services.artwork_query_service import ArtworkQueryService


class SearchService:
    @staticmethod
    def _is_postgres(db: AsyncSession) -> bool:
        bind = db.get_bind()
        return bind.dialect.name == "postgresql" if bind else True

    @staticmethod
    async def search_artworks(
        db: AsyncSession,
        *,
        room_id: int,
        q: str,
        filters: Optional[Dict[str, Any]] = None,
        extra_conditions: Optional[List[Any]] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Search artworks in a specific room using PostgreSQL Full Text Search + unaccent fallback.
        Returns:
            (items, total_hits)
            Each item is a dict with artwork details and a 'highlight' field.
        """
        clean_q = q.strip() if q else ""
        if not clean_q:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Từ khóa tìm kiếm (q) không được để trống"
            )

        is_pg = SearchService._is_postgres(db)

        # Base conditions
        conditions = [Artwork.room_id == room_id]

        # Apply optional filters
        if filters:
            for k, v in filters.items():
                if hasattr(Artwork, k) and v is not None:
                    conditions.append(getattr(Artwork, k) == v)

        if extra_conditions:
            conditions.extend(extra_conditions)

        # Full-text / unaccent match conditions
        if is_pg:
            fts_query = func.plainto_tsquery("simple", clean_q)
            fts_vector = func.to_tsvector("simple", func.concat(Artwork.title, " ", Artwork.short_content, " ", Artwork.content))
            fts_match = fts_vector.op("@@")(fts_query)

            pattern = f"%{clean_q}%"
            unaccent_match = or_(
                func.unaccent(func.lower(Artwork.title)).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(Artwork.short_content)).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(Artwork.content)).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Artwork.author_display_name, ""))).like(
                    func.unaccent(func.lower(pattern))
                ),
            )
            conditions.append(or_(fts_match, unaccent_match))

            rank_expr = func.ts_rank(fts_vector, fts_query).label("search_rank")
            title_headline = func.ts_headline(
                "simple", Artwork.title, fts_query,
                "StartSel=<em>, StopSel=</em>, MaxFragments=1"
            ).label("hl_title")
            content_headline = func.ts_headline(
                "simple", Artwork.content, fts_query,
                "StartSel=<em>, StopSel=</em>, MaxFragments=2, MinWords=5, MaxWords=25"
            ).label("hl_content")

            # Count total hits
            count_stmt = select(func.count(Artwork.id)).where(*conditions)
            total_hits = (await db.scalar(count_stmt)) or 0

            # Query items with rank and headlines
            stmt = (
                select(Artwork, rank_expr, title_headline, content_headline)
                .where(*conditions)
                .order_by(rank_expr.desc(), Artwork.created_at.desc())
                .offset((page - 1) * limit)
                .limit(limit)
            )
            result = await db.execute(stmt)
            rows = result.all()

            items = []
            for art, rank, hl_t, hl_c in rows:
                hl_dict: Dict[str, List[str]] = {}
                if hl_t and "<em>" in hl_t:
                    hl_dict["title"] = [hl_t]
                if hl_c and "<em>" in hl_c:
                    hl_dict["content"] = [hl_c]

                item_data = {
                    "id": art.id,
                    "room_id": art.room_id,
                    "title": hl_t if (hl_t and "<em>" in hl_t) else art.title,
                    "author_display_name": ArtworkQueryService.get_author_display_name(art),
                    "is_anonymous": art.is_anonymous,
                    "short_content": art.short_content,
                    "content": art.content,
                    "media_url": art.media_url,
                    "tag_category": art.tag_category,
                    "color_code": art.color_code,
                    "view_count": art.view_count,
                    "created_at": art.created_at,
                    "target_date": art.target_date,
                    "is_opened": art.is_opened,
                    "highlight": hl_dict,
                }
                items.append(item_data)

            return items, total_hits

        else:
            # Fallback for non-postgres (e.g. SQLite test environment)
            pattern = f"%{clean_q}%"
            conditions.append(
                or_(
                    Artwork.title.ilike(pattern),
                    Artwork.content.ilike(pattern),
                    Artwork.short_content.ilike(pattern),
                    Artwork.author_display_name.ilike(pattern),
                )
            )
            count_stmt = select(func.count(Artwork.id)).where(*conditions)
            total_hits = (await db.scalar(count_stmt)) or 0

            stmt = (
                select(Artwork)
                .where(*conditions)
                .order_by(Artwork.created_at.desc())
                .offset((page - 1) * limit)
                .limit(limit)
            )
            result = await db.execute(stmt)
            arts = result.scalars().all()

            items = []
            for art in arts:
                hl_dict: Dict[str, List[str]] = {}
                # simple regex highlight
                if re.search(re.escape(clean_q), art.title, re.IGNORECASE):
                    hl_title = re.sub(
                        f"({re.escape(clean_q)})", r"<em>\1</em>", art.title, flags=re.IGNORECASE
                    )
                    hl_dict["title"] = [hl_title]
                else:
                    hl_title = art.title

                if re.search(re.escape(clean_q), art.content, re.IGNORECASE):
                    hl_content = re.sub(
                        f"({re.escape(clean_q)})", r"<em>\1</em>", art.content, flags=re.IGNORECASE
                    )
                    hl_dict["content"] = [hl_content]

                items.append({
                    "id": art.id,
                    "room_id": art.room_id,
                    "title": hl_title,
                    "author_display_name": ArtworkQueryService.get_author_display_name(art),
                    "is_anonymous": art.is_anonymous,
                    "short_content": art.short_content,
                    "content": art.content,
                    "media_url": art.media_url,
                    "tag_category": art.tag_category,
                    "color_code": art.color_code,
                    "view_count": art.view_count,
                    "created_at": art.created_at,
                    "target_date": art.target_date,
                    "is_opened": art.is_opened,
                    "highlight": hl_dict,
                })

            return items, total_hits

    @staticmethod
    async def search_diaries(
        db: AsyncSession,
        *,
        q: str,
        user_id: Optional[uuid.UUID] = None,
        is_community: bool = True,
        extra_conditions: Optional[List[Any]] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Search diaries for community (public + approved) or personal."""
        clean_q = q.strip() if q else ""
        if not clean_q:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Từ khóa tìm kiếm (q) không được để trống"
            )

        is_pg = SearchService._is_postgres(db)

        conditions = []
        if is_community:
            conditions.extend([
                Diary.is_public.is_(True),
                Diary.is_approved.is_(True),
                Diary.is_encrypted.is_(False),
            ])
        elif user_id:
            conditions.append(Diary.user_id == user_id)

        if extra_conditions:
            conditions.extend(extra_conditions)

        if is_pg:
            fts_query = func.plainto_tsquery("simple", clean_q)
            fts_vector = func.to_tsvector("simple", func.concat(func.coalesce(Diary.title, ""), " ", Diary.content))
            fts_match = fts_vector.op("@@")(fts_query)

            pattern = f"%{clean_q}%"
            unaccent_match = or_(
                func.unaccent(func.lower(func.coalesce(Diary.title, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(Diary.content)).like(func.unaccent(func.lower(pattern))),
            )
            conditions.append(or_(fts_match, unaccent_match))

            rank_expr = func.ts_rank(fts_vector, fts_query).label("search_rank")
            title_headline = func.ts_headline(
                "simple", func.coalesce(Diary.title, ""), fts_query,
                "StartSel=<em>, StopSel=</em>, MaxFragments=1"
            ).label("hl_title")
            content_headline = func.ts_headline(
                "simple", Diary.content, fts_query,
                "StartSel=<em>, StopSel=</em>, MaxFragments=2, MinWords=5, MaxWords=25"
            ).label("hl_content")

            count_stmt = select(func.count(Diary.id)).where(*conditions)
            total_hits = (await db.scalar(count_stmt)) or 0

            stmt = (
                select(Diary, rank_expr, title_headline, content_headline)
                .where(*conditions)
                .order_by(rank_expr.desc(), Diary.created_at.desc())
                .offset((page - 1) * limit)
                .limit(limit)
            )
            result = await db.execute(stmt)
            rows = result.all()

            items = []
            for diary, rank, hl_t, hl_c in rows:
                hl_dict: Dict[str, List[str]] = {}
                if hl_t and "<em>" in hl_t:
                    hl_dict["title"] = [hl_t]
                if hl_c and "<em>" in hl_c:
                    hl_dict["content"] = [hl_c]

                items.append({
                    "id": diary.id,
                    "title": hl_t if (hl_t and "<em>" in hl_t) else diary.title,
                    "content": diary.content,
                    "mood": diary.mood,
                    "media_urls": diary.media_urls or [],
                    "entry_date": diary.entry_date,
                    "created_at": diary.created_at,
                    "highlight": hl_dict,
                })

            return items, total_hits

        else:
            pattern = f"%{clean_q}%"
            conditions.append(
                or_(
                    Diary.title.ilike(pattern),
                    Diary.content.ilike(pattern),
                )
            )
            count_stmt = select(func.count(Diary.id)).where(*conditions)
            total_hits = (await db.scalar(count_stmt)) or 0

            stmt = (
                select(Diary)
                .where(*conditions)
                .order_by(Diary.created_at.desc())
                .offset((page - 1) * limit)
                .limit(limit)
            )
            result = await db.execute(stmt)
            diaries = result.scalars().all()

            items = []
            for d in diaries:
                hl_dict = {}
                d_title = d.title or ""
                if re.search(re.escape(clean_q), d_title, re.IGNORECASE):
                    hl_dict["title"] = [re.sub(f"({re.escape(clean_q)})", r"<em>\1</em>", d_title, flags=re.IGNORECASE)]
                if re.search(re.escape(clean_q), d.content, re.IGNORECASE):
                    hl_dict["content"] = [re.sub(f"({re.escape(clean_q)})", r"<em>\1</em>", d.content, flags=re.IGNORECASE)]

                items.append({
                    "id": d.id,
                    "title": d.title,
                    "content": d.content,
                    "mood": d.mood,
                    "media_urls": d.media_urls or [],
                    "entry_date": d.entry_date,
                    "created_at": d.created_at,
                    "highlight": hl_dict,
                })

            return items, total_hits

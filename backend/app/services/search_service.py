import re
import unicodedata
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
    def _strip_accents(s: str) -> str:
        s = s.replace("đ", "d").replace("Đ", "D")
        return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")

    @staticmethod
    def _highlight_snippet(text_val: Optional[str], query: str, is_snippet: bool = False) -> Optional[str]:
        if not text_val or not query:
            return None
        escaped_q = re.escape(query)
        pattern = re.compile(f"({escaped_q})", re.IGNORECASE)
        match = pattern.search(text_val)

        # Direct match found
        if match:
            if is_snippet:
                start = max(0, match.start() - 40)
                end = min(len(text_val), match.end() + 60)
                prefix = "..." if start > 0 else ""
                suffix = "..." if end < len(text_val) else ""
                subtext = text_val[start:end]
                return prefix + pattern.sub(r"<em>\1</em>", subtext) + suffix
            else:
                return pattern.sub(r"<em>\1</em>", text_val)

        # Unaccent fallback: search unaccented query on unaccented text
        # Since strip_accents preserves length 1-to-1, indices map directly to text_val!
        u_text = SearchService._strip_accents(text_val)
        u_query = SearchService._strip_accents(query)
        u_match = re.search(re.escape(u_query), u_text, re.IGNORECASE)
        if not u_match:
            return None

        m_start, m_end = u_match.start(), u_match.end()
        if is_snippet:
            start = max(0, m_start - 40)
            end = min(len(text_val), m_end + 60)
            prefix = "..." if start > 0 else ""
            suffix = "..." if end < len(text_val) else ""
            subtext = (
                text_val[start:m_start]
                + "<em>"
                + text_val[m_start:m_end]
                + "</em>"
                + text_val[m_end:end]
            )
            return prefix + subtext + suffix
        else:
            return (
                text_val[:m_start]
                + "<em>"
                + text_val[m_start:m_end]
                + "</em>"
                + text_val[m_end:]
            )

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
            fts_vector = func.to_tsvector(
                "simple",
                func.concat_ws(
                    " ",
                    func.coalesce(Artwork.title, ""),
                    func.coalesce(Artwork.title_vi, ""),
                    func.coalesce(Artwork.title_en, ""),
                    func.coalesce(Artwork.short_content, ""),
                    func.coalesce(Artwork.short_content_vi, ""),
                    func.coalesce(Artwork.short_content_en, ""),
                    func.coalesce(Artwork.content, ""),
                    func.coalesce(Artwork.content_vi, ""),
                    func.coalesce(Artwork.content_en, ""),
                    func.coalesce(Artwork.author_display_name, ""),
                ),
            )
            fts_match = fts_vector.op("@@")(fts_query)

            pattern = f"%{clean_q}%"
            unaccent_match = or_(
                func.unaccent(func.lower(func.coalesce(Artwork.title, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Artwork.title_vi, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Artwork.title_en, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Artwork.short_content, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Artwork.short_content_vi, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Artwork.short_content_en, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Artwork.content, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Artwork.content_vi, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Artwork.content_en, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Artwork.author_display_name, ""))).like(func.unaccent(func.lower(pattern))),
            )
            conditions.append(or_(fts_match, unaccent_match))

            rank_expr = func.ts_rank(fts_vector, fts_query).label("search_rank")
            title_headline = func.ts_headline(
                "simple", func.coalesce(Artwork.title, Artwork.title_vi, ""), fts_query,
                "StartSel=<em>, StopSel=</em>, MaxFragments=1"
            ).label("hl_title")
            short_content_headline = func.ts_headline(
                "simple", func.coalesce(Artwork.short_content, Artwork.short_content_vi, ""), fts_query,
                "StartSel=<em>, StopSel=</em>, MaxFragments=2, MinWords=5, MaxWords=25"
            ).label("hl_short_content")
            content_headline = func.ts_headline(
                "simple", func.coalesce(Artwork.content, Artwork.content_vi, ""), fts_query,
                "StartSel=<em>, StopSel=</em>, MaxFragments=2, MinWords=5, MaxWords=25"
            ).label("hl_content")

            # Count total hits
            count_stmt = select(func.count(Artwork.id)).where(*conditions)
            total_hits = (await db.scalar(count_stmt)) or 0

            # Query items with rank and headlines
            stmt = (
                select(Artwork, rank_expr, title_headline, short_content_headline, content_headline)
                .where(*conditions)
                .order_by(rank_expr.desc(), Artwork.created_at.desc())
                .offset((page - 1) * limit)
                .limit(limit)
            )
            result = await db.execute(stmt)
            rows = result.all()

            items = []
            for art, rank, hl_t, hl_s, hl_c in rows:
                hl_dict: Dict[str, List[str]] = {}
                if hl_t and "<em>" in hl_t:
                    hl_dict["title"] = [hl_t]
                if hl_s and "<em>" in hl_s:
                    hl_dict["short_content"] = [hl_s]
                if hl_c and "<em>" in hl_c:
                    hl_dict["content"] = [hl_c]

                # Fallback highlight for unaccent/partial match when ts_headline produces no tag
                if "title" not in hl_dict:
                    hl_fallback = (
                        SearchService._highlight_snippet(art.title, clean_q)
                        or SearchService._highlight_snippet(art.title_vi, clean_q)
                        or SearchService._highlight_snippet(art.title_en, clean_q)
                    )
                    if hl_fallback:
                        hl_dict["title"] = [hl_fallback]

                if "short_content" not in hl_dict:
                    hl_fallback = (
                        SearchService._highlight_snippet(art.short_content, clean_q)
                        or SearchService._highlight_snippet(art.short_content_vi, clean_q)
                        or SearchService._highlight_snippet(art.short_content_en, clean_q)
                    )
                    if hl_fallback:
                        hl_dict["short_content"] = [hl_fallback]

                if "content" not in hl_dict:
                    hl_fallback = (
                        SearchService._highlight_snippet(art.content, clean_q, is_snippet=True)
                        or SearchService._highlight_snippet(art.content_vi, clean_q, is_snippet=True)
                        or SearchService._highlight_snippet(art.content_en, clean_q, is_snippet=True)
                    )
                    if hl_fallback:
                        hl_dict["content"] = [hl_fallback]

                if "author_display_name" not in hl_dict:
                    hl_fallback = SearchService._highlight_snippet(art.author_display_name, clean_q)
                    if hl_fallback:
                        hl_dict["author_display_name"] = [hl_fallback]

                item_data = {
                    "id": art.id,
                    "room_id": art.room_id,
                    "title": hl_dict.get("title", [art.title])[0] if "title" in hl_dict else art.title,
                    "title_vi": art.title_vi,
                    "title_en": art.title_en,
                    "author_display_name": ArtworkQueryService.get_author_display_name(art),
                    "is_anonymous": art.is_anonymous,
                    "short_content": art.short_content,
                    "short_content_vi": art.short_content_vi,
                    "short_content_en": art.short_content_en,
                    "content": art.content,
                    "content_vi": art.content_vi,
                    "content_en": art.content_en,
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
                    Artwork.title_vi.ilike(pattern),
                    Artwork.title_en.ilike(pattern),
                    Artwork.short_content.ilike(pattern),
                    Artwork.short_content_vi.ilike(pattern),
                    Artwork.short_content_en.ilike(pattern),
                    Artwork.content.ilike(pattern),
                    Artwork.content_vi.ilike(pattern),
                    Artwork.content_en.ilike(pattern),
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
                display_title = art.title or ""

                hl_t = (
                    SearchService._highlight_snippet(art.title, clean_q)
                    or SearchService._highlight_snippet(art.title_vi, clean_q)
                    or SearchService._highlight_snippet(art.title_en, clean_q)
                )
                if hl_t:
                    hl_dict["title"] = [hl_t]
                    display_title = hl_t

                hl_s = (
                    SearchService._highlight_snippet(art.short_content, clean_q)
                    or SearchService._highlight_snippet(art.short_content_vi, clean_q)
                    or SearchService._highlight_snippet(art.short_content_en, clean_q)
                )
                if hl_s:
                    hl_dict["short_content"] = [hl_s]

                hl_c = (
                    SearchService._highlight_snippet(art.content, clean_q, is_snippet=True)
                    or SearchService._highlight_snippet(art.content_vi, clean_q, is_snippet=True)
                    or SearchService._highlight_snippet(art.content_en, clean_q, is_snippet=True)
                )
                if hl_c:
                    hl_dict["content"] = [hl_c]

                hl_a = SearchService._highlight_snippet(art.author_display_name, clean_q)
                if hl_a:
                    hl_dict["author_display_name"] = [hl_a]

                items.append({
                    "id": art.id,
                    "room_id": art.room_id,
                    "title": display_title,
                    "title_vi": art.title_vi,
                    "title_en": art.title_en,
                    "author_display_name": ArtworkQueryService.get_author_display_name(art),
                    "is_anonymous": art.is_anonymous,
                    "short_content": art.short_content,
                    "short_content_vi": art.short_content_vi,
                    "short_content_en": art.short_content_en,
                    "content": art.content,
                    "content_vi": art.content_vi,
                    "content_en": art.content_en,
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
            fts_vector = func.to_tsvector(
                "simple",
                func.concat_ws(
                    " ",
                    func.coalesce(Diary.title, ""),
                    func.coalesce(Diary.title_vi, ""),
                    func.coalesce(Diary.title_en, ""),
                    func.coalesce(Diary.content, ""),
                    func.coalesce(Diary.content_vi, ""),
                    func.coalesce(Diary.content_en, ""),
                ),
            )
            fts_match = fts_vector.op("@@")(fts_query)

            pattern = f"%{clean_q}%"
            unaccent_match = or_(
                func.unaccent(func.lower(func.coalesce(Diary.title, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Diary.title_vi, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Diary.title_en, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Diary.content, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Diary.content_vi, ""))).like(func.unaccent(func.lower(pattern))),
                func.unaccent(func.lower(func.coalesce(Diary.content_en, ""))).like(func.unaccent(func.lower(pattern))),
            )
            conditions.append(or_(fts_match, unaccent_match))

            rank_expr = func.ts_rank(fts_vector, fts_query).label("search_rank")
            title_headline = func.ts_headline(
                "simple", func.coalesce(Diary.title, ""), fts_query,
                "StartSel=<em>, StopSel=</em>, MaxFragments=1"
            ).label("hl_title")
            content_headline = func.ts_headline(
                "simple", func.coalesce(Diary.content, ""), fts_query,
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

                if "title" not in hl_dict:
                    hl_fallback = (
                        SearchService._highlight_snippet(diary.title, clean_q)
                        or SearchService._highlight_snippet(diary.title_vi, clean_q)
                        or SearchService._highlight_snippet(diary.title_en, clean_q)
                    )
                    if hl_fallback:
                        hl_dict["title"] = [hl_fallback]

                if "content" not in hl_dict:
                    hl_fallback = (
                        SearchService._highlight_snippet(diary.content, clean_q, is_snippet=True)
                        or SearchService._highlight_snippet(diary.content_vi, clean_q, is_snippet=True)
                        or SearchService._highlight_snippet(diary.content_en, clean_q, is_snippet=True)
                    )
                    if hl_fallback:
                        hl_dict["content"] = [hl_fallback]

                items.append({
                    "id": diary.id,
                    "title": hl_dict.get("title", [diary.title])[0] if "title" in hl_dict else diary.title,
                    "title_vi": diary.title_vi,
                    "title_en": diary.title_en,
                    "content": diary.content,
                    "content_vi": diary.content_vi,
                    "content_en": diary.content_en,
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
                    Diary.title_vi.ilike(pattern),
                    Diary.title_en.ilike(pattern),
                    Diary.content.ilike(pattern),
                    Diary.content_vi.ilike(pattern),
                    Diary.content_en.ilike(pattern),
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
                hl_t = (
                    SearchService._highlight_snippet(d_title, clean_q)
                    or SearchService._highlight_snippet(d.title_vi, clean_q)
                    or SearchService._highlight_snippet(d.title_en, clean_q)
                )
                if hl_t:
                    hl_dict["title"] = [hl_t]

                hl_c = (
                    SearchService._highlight_snippet(d.content, clean_q, is_snippet=True)
                    or SearchService._highlight_snippet(d.content_vi, clean_q, is_snippet=True)
                    or SearchService._highlight_snippet(d.content_en, clean_q, is_snippet=True)
                )
                if hl_c:
                    hl_dict["content"] = [hl_c]

                items.append({
                    "id": d.id,
                    "title": hl_dict.get("title", [d.title])[0] if "title" in hl_dict else d.title,
                    "title_vi": d.title_vi,
                    "title_en": d.title_en,
                    "content": d.content,
                    "content_vi": d.content_vi,
                    "content_en": d.content_en,
                    "mood": d.mood,
                    "media_urls": d.media_urls or [],
                    "entry_date": d.entry_date,
                    "created_at": d.created_at,
                    "highlight": hl_dict,
                })

            return items, total_hits

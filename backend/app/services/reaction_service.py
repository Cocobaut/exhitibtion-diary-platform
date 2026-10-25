import uuid
from typing import Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.artwork_interaction import ArtworkInteraction
from app.models.diary_interaction import DiaryInteraction


class ReactionService:
    @staticmethod
    async def summary(
        db: AsyncSession,
        artwork_ids: List[uuid.UUID],
        types: Optional[List[str]] = None,
    ) -> Dict[uuid.UUID, Dict[str, int]]:
        """Get reaction counts grouped by artwork_id and reaction_type in 1 query.
        Guarantees all specified types are present with default 0, plus a 'total' key.
        Prevents N+1 query issue for list endpoints.
        """
        if types is None:
            types = ["HUG", "HEART", "SYMPATHY", "INSPIRED"]

        # Initialize result map
        results: Dict[uuid.UUID, Dict[str, int]] = {
            aid: {rtype: 0 for rtype in types} | {"total": 0}
            for aid in artwork_ids
        }

        if not artwork_ids:
            return results

        stmt = (
            select(
                ArtworkInteraction.artwork_id,
                ArtworkInteraction.reaction_type,
                func.count(ArtworkInteraction.id).label("count")
            )
            .where(ArtworkInteraction.artwork_id.in_(artwork_ids))
            .group_by(ArtworkInteraction.artwork_id, ArtworkInteraction.reaction_type)
        )
        rows = await db.execute(stmt)

        for aid, rtype, cnt in rows.all():
            if aid in results:
                results[aid][rtype] = cnt
                results[aid]["total"] += cnt

        return results

    @staticmethod
    async def my_reactions(
        db: AsyncSession,
        artwork_ids: List[uuid.UUID],
        user_id: Optional[uuid.UUID],
    ) -> Dict[uuid.UUID, List[str]]:
        """Get the current user's reaction types for a list of artwork_ids in 1 query.
        Returns a dict mapping artwork_id -> list of reaction_types (e.g. ['HEART', 'HUG']).
        """
        results: Dict[uuid.UUID, List[str]] = {aid: [] for aid in artwork_ids}
        if not artwork_ids or user_id is None:
            return results

        stmt = (
            select(ArtworkInteraction.artwork_id, ArtworkInteraction.reaction_type)
            .where(
                ArtworkInteraction.artwork_id.in_(artwork_ids),
                ArtworkInteraction.user_id == user_id
            )
        )
        rows = await db.execute(stmt)
        for aid, rtype in rows.all():
            if aid in results:
                results[aid].append(rtype)

        return results

    @staticmethod
    async def diary_summary(
        db: AsyncSession,
        diary_ids: List[uuid.UUID],
        types: Optional[List[str]] = None,
    ) -> Dict[uuid.UUID, Dict[str, int]]:
        """Reaction summary for diaries in 1 query (HEART, HUG, SYMPATHY)."""
        if types is None:
            types = ["HEART", "HUG", "SYMPATHY"]

        results: Dict[uuid.UUID, Dict[str, int]] = {
            did: {rtype: 0 for rtype in types} | {"total": 0}
            for did in diary_ids
        }

        if not diary_ids:
            return results

        stmt = (
            select(
                DiaryInteraction.diary_id,
                DiaryInteraction.reaction_type,
                func.count(DiaryInteraction.id).label("count")
            )
            .where(DiaryInteraction.diary_id.in_(diary_ids))
            .group_by(DiaryInteraction.diary_id, DiaryInteraction.reaction_type)
        )
        rows = await db.execute(stmt)

        for did, rtype, cnt in rows.all():
            if did in results:
                results[did][rtype] = cnt
                results[did]["total"] += cnt

        return results

    @staticmethod
    async def my_diary_reactions(
        db: AsyncSession,
        diary_ids: List[uuid.UUID],
        user_id: Optional[uuid.UUID],
    ) -> Dict[uuid.UUID, Optional[str]]:
        """Get the current user's reaction on each diary (at most 1 reaction per diary)."""
        results: Dict[uuid.UUID, Optional[str]] = {did: None for did in diary_ids}
        if not diary_ids or user_id is None:
            return results

        stmt = (
            select(DiaryInteraction.diary_id, DiaryInteraction.reaction_type)
            .where(
                DiaryInteraction.diary_id.in_(diary_ids),
                DiaryInteraction.user_id == user_id
            )
        )
        rows = await db.execute(stmt)
        for did, rtype in rows.all():
            if did in results:
                results[did] = rtype

        return results

import math
from typing import Any, List, Optional


def ok(data: Any = None, message: Optional[str] = None, key: str = "data") -> dict:
    """Format standard API success response."""
    res = {"success": True}
    if message is not None:
        res["message"] = message
    if data is not None:
        res[key] = data
    return res


def paginated(
    items: List[Any],
    page: int,
    limit: int,
    total_items: int,
    total_key: str = "total_items",
    pages_key: str = "total_pages"
) -> dict:
    """Helper to structure pagination response."""
    total_pages = math.ceil(total_items / limit) if limit > 0 else 0
    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            total_key: total_items,
            pages_key: total_pages
        }
    }


def search_result(items: List[Any], page: int, limit: int, total_hits: int) -> dict:
    """Helper for search endpoints that return total_hits instead of total_pages."""
    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_hits": total_hits
        }
    }

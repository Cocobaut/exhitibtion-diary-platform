import uuid
from typing import AsyncGenerator, Optional
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.exceptions import AppException
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.models.revoked_token import RevokedToken

# HTTPBearer with auto_error=False so we can handle custom error codes & optional auth
http_bearer = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to provide an asynchronous database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
) -> User:
    """Validate Bearer access token and return the current active user.
    Raises:
        AppException 401 UNAUTHORIZED: missing token, invalid, expired, revoked, or user not found.
        AppException 403 ACCOUNT_LOCKED: user is deactivated.
    """
    if not auth_header or not auth_header.credentials:
        raise AppException(
            status_code=401,
            error_code="UNAUTHORIZED",
            message="Vui lòng cung cấp token xác thực (Bearer token)"
        )

    token = auth_header.credentials
    payload = decode_token(token)
    if payload is None:
        raise AppException(
            status_code=401,
            error_code="UNAUTHORIZED",
            message="Token không hợp lệ hoặc đã hết hạn"
        )

    jti = payload.get("jti")
    if not jti:
        raise AppException(
            status_code=401,
            error_code="UNAUTHORIZED",
            message="Token không hợp lệ (thiếu jti)"
        )

    # Check if token has been revoked (e.g. user logged out)
    revoked = await db.scalar(select(RevokedToken).where(RevokedToken.jti == jti))
    if revoked:
        raise AppException(
            status_code=401,
            error_code="UNAUTHORIZED",
            message="Token đã bị thu hồi do đăng xuất"
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AppException(
            status_code=401,
            error_code="UNAUTHORIZED",
            message="Token không hợp lệ (thiếu sub)"
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise AppException(
            status_code=401,
            error_code="UNAUTHORIZED",
            message="Token không hợp lệ (sub không phải UUID)"
        )

    user = await db.get(User, user_id)
    if user is None:
        raise AppException(
            status_code=401,
            error_code="UNAUTHORIZED",
            message="Người dùng không tồn tại"
        )

    if not user.is_active:
        raise AppException(
            status_code=403,
            error_code="ACCOUNT_LOCKED",
            message="Tài khoản của bạn đã bị khóa"
        )

    return user


async def get_optional_user(
    db: AsyncSession = Depends(get_db),
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
) -> Optional[User]:
    """Soft authentication for public endpoints.
    Returns:
        User if token is valid and active, else None.
    """
    if not auth_header or not auth_header.credentials:
        return None

    try:
        token = auth_header.credentials
        payload = decode_token(token)
        if not payload:
            return None

        jti = payload.get("jti")
        if not jti:
            return None

        revoked = await db.scalar(select(RevokedToken).where(RevokedToken.jti == jti))
        if revoked:
            return None

        user_id_str = payload.get("sub")
        if not user_id_str:
            return None

        user_id = uuid.UUID(user_id_str)
        user = await db.get(User, user_id)
        if not user or not user.is_active:
            return None

        return user
    except Exception:
        return None


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency verifying that the current authenticated user has ADMIN or OWNER role.
    Raises:
        AppException 403 FORBIDDEN if not an admin or owner.
    """
    if current_user.role not in (UserRole.ADMIN.value, "ADMIN", UserRole.OWNER.value, "OWNER"):
        raise AppException(
            status_code=403,
            error_code="FORBIDDEN",
            message="Yêu cầu quyền Quản trị viên"
        )
    return current_user


async def require_owner(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency verifying that the current authenticated user has OWNER role.
    Raises:
        AppException 403 FORBIDDEN if not an owner.
    """
    if current_user.role != UserRole.OWNER.value and current_user.role != "OWNER":
        raise AppException(
            status_code=403,
            error_code="FORBIDDEN",
            message="Yêu cầu quyền Chủ sở hữu (Owner)"
        )
    return current_user

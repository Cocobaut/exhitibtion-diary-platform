from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.revoked_token import RevokedToken
from app.models.user import User, UserRole
from app.schemas.auth import ChangePasswordRequest, LoginRequest, RegisterRequest


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, req: RegisterRequest) -> User:
        """Register a new user account as specified in Plan 01."""
        # 1. Check duplicate username (case-insensitive)
        existing_username = await db.scalar(
            select(User.id).where(func.lower(User.username) == req.username.lower())
        )
        if existing_username:
            raise AppException(
                status_code=409,
                error_code="USERNAME_TAKEN",
                message="Tên đăng nhập đã tồn tại trên hệ thống"
            )

        # 2. Check duplicate email (case-insensitive)
        existing_email = await db.scalar(
            select(User.id).where(func.lower(User.email) == req.email.lower())
        )
        if existing_email:
            raise AppException(
                status_code=409,
                error_code="EMAIL_TAKEN",
                message="Email đã tồn tại trên hệ thống"
            )

        # 3. Create user entity
        user = User(
            username=req.username,
            email=req.email,
            password_hash=hash_password(req.password),
            nickname=req.nickname,
            role=UserRole.USER.value,
            is_active=True,
        )
        db.add(user)

        try:
            await db.commit()
            await db.refresh(user)
        except IntegrityError as exc:
            await db.rollback()
            error_str = str(exc).lower()
            if "username" in error_str:
                raise AppException(
                    status_code=409,
                    error_code="USERNAME_TAKEN",
                    message="Tên đăng nhập đã tồn tại trên hệ thống"
                )
            elif "email" in error_str:
                raise AppException(
                    status_code=409,
                    error_code="EMAIL_TAKEN",
                    message="Email đã tồn tại trên hệ thống"
                )
            raise AppException(
                status_code=409,
                error_code="CONFLICT",
                message="Thông tin tài khoản đã tồn tại trên hệ thống"
            )

        return user

    @staticmethod
    async def login(db: AsyncSession, req: LoginRequest) -> Tuple[User, str, str]:
        """Authenticate user by account (username or email) and password."""
        account = req.account.strip()
        is_email = "@" in account

        if is_email:
            user = await db.scalar(
                select(User).where(func.lower(User.email) == account.lower())
            )
        else:
            user = await db.scalar(
                select(User).where(func.lower(User.username) == account.lower())
            )

        # Protection against timing attack when user does not exist
        if not user:
            verify_password(req.password, DUMMY_PASSWORD_HASH)
            raise AppException(
                status_code=401,
                error_code="INVALID_CREDENTIALS",
                message="Tài khoản hoặc mật khẩu không chính xác"
            )

        if not verify_password(req.password, user.password_hash):
            raise AppException(
                status_code=401,
                error_code="INVALID_CREDENTIALS",
                message="Tài khoản hoặc mật khẩu không chính xác"
            )

        if not user.is_active:
            raise AppException(
                status_code=403,
                error_code="ACCOUNT_LOCKED",
                message="Tài khoản của bạn đang bị khóa"
            )

        access_token = create_access_token(subject=user.id, role=user.role)

        if user.role in (UserRole.ADMIN.value, "ADMIN"):
            message = "Đăng nhập quyền quản trị viên thành công"
        elif user.role in (UserRole.OWNER.value, "OWNER"):
            message = "Đăng nhập quyền chủ sở hữu thành công"
        else:
            message = "Đăng nhập thành công"

        return user, access_token, message

    @staticmethod
    async def change_password(db: AsyncSession, req: ChangePasswordRequest) -> None:
        """Reset / change password directly using matching username and email."""
        user = await db.scalar(
            select(User).where(
                func.lower(User.username) == req.username.lower(),
                func.lower(User.email) == req.email.lower()
            )
        )

        if not user:
            raise AppException(
                status_code=400,
                error_code="INVALID_CREDENTIALS",
                message="Tài khoản hoặc email không chính xác"
            )

        if not user.is_active:
            raise AppException(
                status_code=403,
                error_code="ACCOUNT_LOCKED",
                message="Tài khoản của bạn đang bị khóa"
            )

        user.password_hash = hash_password(req.new_password)
        db.add(user)
        await db.commit()

    @staticmethod
    async def logout(db: AsyncSession, token: str) -> None:
        """Revoke current JWT access token so it cannot be reused."""
        payload = decode_token(token)
        if not payload or not payload.get("jti"):
            raise AppException(
                status_code=401,
                error_code="UNAUTHORIZED",
                message="Token không hợp lệ hoặc đã hết hạn"
            )

        jti = payload["jti"]
        exp = payload.get("exp")
        if exp:
            expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
        else:
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=86400)

        existing = await db.scalar(select(RevokedToken.jti).where(RevokedToken.jti == jti))
        if not existing:
            revoked_token = RevokedToken(jti=jti, expires_at=expires_at)
            db.add(revoked_token)
            await db.commit()

    @staticmethod
    async def cleanup_expired_tokens(db: AsyncSession) -> int:
        """Purge expired revoked tokens from the database."""
        now = datetime.now(timezone.utc)
        result = await db.execute(delete(RevokedToken).where(RevokedToken.expires_at < now))
        await db.commit()
        return result.rowcount or 0

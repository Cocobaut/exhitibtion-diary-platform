from datetime import datetime, timezone, timedelta
import hashlib
import secrets
from typing import Optional, Tuple
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.password_reset_token import PasswordResetToken
from app.models.revoked_token import RevokedToken
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, ResetPasswordRequest
from app.services.email_service import send_email


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
    def _hash_reset_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str) -> None:
        """Gửi link đặt lại mật khẩu nếu email thuộc một tài khoản đang hoạt động.

        Luôn im lặng khi email không tồn tại để không lộ ai đã đăng ký.
        """
        user = await db.scalar(select(User).where(func.lower(User.email) == email.lower()))
        if not user or not user.is_active:
            return

        now = datetime.now(timezone.utc)
        # Mỗi lần chỉ một link còn hiệu lực
        await db.execute(
            delete(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used_at.is_(None),
            )
        )
        token = secrets.token_urlsafe(32)
        db.add(PasswordResetToken(
            user_id=user.id,
            token_hash=AuthService._hash_reset_token(token),
            expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
        ))
        await db.commit()

        sep = "&" if "?" in settings.FRONTEND_RESET_URL else "?"
        link = f"{settings.FRONTEND_RESET_URL}{sep}reset_token={token}"
        await send_email(
            to=user.email,
            subject="Đặt lại mật khẩu - Bảo Tàng Gọi Tên Cảm Xúc",
            body=(
                f"Chào {user.nickname or user.username},\n\n"
                "Có người vừa yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n"
                f"Bấm vào link sau để đặt mật khẩu mới (hết hạn sau {settings.PASSWORD_RESET_EXPIRE_MINUTES} phút):\n\n"
                f"{link}\n\n"
                "Nếu không phải bạn yêu cầu, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.\n"
            ),
        )

    @staticmethod
    async def reset_password(db: AsyncSession, req: ResetPasswordRequest) -> None:
        """Đặt mật khẩu mới bằng token một lần dùng từ email."""
        now = datetime.now(timezone.utc)
        record = await db.scalar(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == AuthService._hash_reset_token(req.token)
            )
        )
        expires_at = record.expires_at if record else None
        if expires_at is not None and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if not record or record.used_at is not None or expires_at <= now:
            raise AppException(
                status_code=400,
                error_code="INVALID_RESET_TOKEN",
                message="Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"
            )

        user = await db.get(User, record.user_id)
        if not user or not user.is_active:
            raise AppException(
                status_code=403,
                error_code="ACCOUNT_LOCKED",
                message="Tài khoản của bạn đang bị khóa"
            )

        user.password_hash = hash_password(req.new_password)
        record.used_at = now
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

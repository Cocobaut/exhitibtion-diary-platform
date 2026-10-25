from datetime import datetime, timedelta, timezone
import re
from typing import Any, Optional, Union
import uuid
import bcrypt
import jwt

from app.core.config import settings
from app.core.exceptions import AppException


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


DUMMY_PASSWORD_HASH = "$2b$12$4rMuWtyzLY5uTLP.RmaHju8XneNlR.4KCO8h1cXFMnCyXo2Ug/rzq"


def validate_password_strength(password: str) -> None:
    """Validate that password meets security requirements.
    8–128 ký tự, có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số, 1 ký tự đặc biệt.
    """
    if len(password) < 8 or len(password) > 128:
        raise AppException(
            status_code=400,
            error_code="WEAK_PASSWORD",
            message="Mật khẩu quá yếu: cần tối thiểu 8 ký tự gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt"
        )
    
    has_upper = re.search(r"[A-Z]", password)
    has_lower = re.search(r"[a-z]", password)
    has_digit = re.search(r"\d", password)
    has_special = re.search(r"[^A-Za-z0-9\s]", password)

    if not (has_upper and has_lower and has_digit and has_special):
        raise AppException(
            status_code=400,
            error_code="WEAK_PASSWORD",
            message="Mật khẩu quá yếu: cần tối thiểu 8 ký tự gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt"
        )


def create_access_token(
    subject: Union[str, Any],
    role: str = "USER",
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token with subject (UUID str), role, jti, and expiration."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(seconds=settings.JWT_EXPIRE_SECONDS)

    to_encode = {
        "sub": str(subject),
        "role": role,
        "jti": uuid.uuid4().hex,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

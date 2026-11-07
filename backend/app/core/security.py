from datetime import datetime, timedelta, timezone
import re
from typing import Any, Optional, Union
import hashlib
import hmac
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


def password_fingerprint(password_hash: str) -> str:
    """Dấu vân tay ngắn của password_hash đặt trong JWT.
    Đổi hoặc đặt lại mật khẩu thì dấu này đổi theo, nên mọi token cũ hết hiệu lực.
    Dùng HMAC để payload JWT (ai cũng đọc được) không lộ gì về hash mật khẩu.
    """
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"), password_hash.encode("utf-8"), hashlib.sha256
    ).hexdigest()[:24]


def create_access_token(
    subject: Union[str, Any],
    role: str = "USER",
    expires_delta: Optional[timedelta] = None,
    password_hash: Optional[str] = None,
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
    if password_hash:
        to_encode["pwd"] = password_fingerprint(password_hash)
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def validate_safe_base_url(url: Optional[str]) -> str:
    """Validates that a custom provider base_url is safe from SSRF attacks.
    Blocks private IP addresses, loopback, link-local, cloud metadata (169.254.169.254),
    and non-http(s) schemes.
    """
    import ipaddress
    import socket
    from urllib.parse import urlparse

    if not url or not url.strip():
        raise AppException(
            status_code=400,
            error_code="INVALID_BASE_URL",
            message="base_url không được để trống.",
        )

    cleaned = url.strip()
    parsed = urlparse(cleaned)
    if (parsed.scheme or "").lower() not in ("http", "https"):
        raise AppException(
            status_code=400,
            error_code="SSRF_UNSUPPORTED_SCHEME",
            message=f"Giao thức '{parsed.scheme}' không được hỗ trợ. Chỉ cho phép http:// hoặc https://",
        )

    hostname = parsed.hostname
    if not hostname:
        raise AppException(
            status_code=400,
            error_code="SSRF_MISSING_HOSTNAME",
            message="base_url không chứa tên miền hoặc địa chỉ máy chủ hợp lệ.",
        )

    # Direct loopback / localhost block
    if hostname.lower() in ("localhost", "127.0.0.1", "::1", "0.0.0.0") or hostname.lower().endswith(".localhost"):
        raise AppException(
            status_code=400,
            error_code="SSRF_LOCAL_HOST_BLOCKED",
            message="Từ chối kết nối tới localhost hoặc loopback máy chủ nội bộ.",
        )

    # Phân giải MỌI địa chỉ (IPv4 lẫn IPv6) của tên miền; chỉ cần một địa chỉ nội bộ là chặn
    try:
        infos = socket.getaddrinfo(hostname, parsed.port or None, proto=socket.IPPROTO_TCP)
    except (socket.gaierror, UnicodeError):
        raise AppException(
            status_code=400,
            error_code="SSRF_DNS_RESOLVE_FAILED",
            message=f"Không thể phân giải tên miền: '{hostname}'. Vui lòng kiểm tra lại địa chỉ máy chủ.",
        )
    for info in infos:
        ip = ipaddress.ip_address(info[4][0].split("%", 1)[0])
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        if (
            ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
            or ip.is_multicast or ip.is_unspecified or not ip.is_global
        ):
            raise AppException(
                status_code=400,
                error_code="SSRF_PRIVATE_IP_BLOCKED",
                message=f"Địa chỉ đích ({ip}) thuộc mạng nội bộ hoặc dải địa chỉ bị hạn chế (SSRF Protection).",
            )

    return cleaned.rstrip("/")


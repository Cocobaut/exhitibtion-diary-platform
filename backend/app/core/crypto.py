"""Cryptographic utilities for securely storing and retrieving AI Provider API Keys.
Uses AES-256-GCM authenticated encryption.
"""

import base64
import hashlib
import os
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings


def _derive(secret: str) -> bytes:
    return hashlib.sha256(secret.encode("utf-8")).digest()


def _get_derived_key() -> bytes:
    """Khoá dùng để mã hoá: AI_ENCRYPTION_KEY nếu có, không thì SECRET_KEY."""
    return _derive(settings.AI_ENCRYPTION_KEY or settings.SECRET_KEY)


def _candidate_keys() -> list:
    """Khoá thử khi giải mã: khoá hiện tại, rồi SECRET_KEY cho dữ liệu mã hoá trước khi có AI_ENCRYPTION_KEY."""
    keys = [_get_derived_key()]
    legacy = _derive(settings.SECRET_KEY)
    if legacy not in keys:
        keys.append(legacy)
    return keys


def encrypt_aes_256(plain_text: Optional[str]) -> Optional[str]:
    """Encrypt a string using AES-256-GCM.
    Returns base64-encoded string: nonce (12 bytes) + ciphertext + auth tag (16 bytes).
    """
    if not plain_text:
        return None
    key = _get_derived_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 12-byte nonce recommended for GCM
    ciphertext = aesgcm.encrypt(nonce, plain_text.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_aes_256(encrypted_text: Optional[str]) -> Optional[str]:
    """Decrypt a base64-encoded AES-256-GCM string."""
    if not encrypted_text:
        return None
    try:
        raw_data = base64.b64decode(encrypted_text.encode("utf-8"))
        if len(raw_data) < 28:  # 12 bytes nonce + min 16 bytes tag
            return None
        nonce = raw_data[:12]
        ciphertext = raw_data[12:]
    except Exception:
        return None
    for key in _candidate_keys():
        try:
            return AESGCM(key).decrypt(nonce, ciphertext, None).decode("utf-8")
        except Exception:
            continue
    return None


def mask_api_key(api_key: Optional[str]) -> str:
    """Mask an API key for safe UI display (e.g. 'AIzaSy...4AbC' or 'sk-pro...9Z1a')."""
    if not api_key:
        return ""
    stripped = api_key.strip()
    if len(stripped) <= 10:
        return "****"
    prefix = stripped[:6]
    suffix = stripped[-4:]
    return f"{prefix}...{suffix}"

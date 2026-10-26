from typing import Any, Dict
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.core.crypto import decrypt_aes_256
from app.services.owner_ai_service import OwnerAiService


async def require_moderation_guard(
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Ensures AI moderation is enabled and decrypted API key is present."""
    setting = await OwnerAiService.get_or_create_settings(db)

    if not setting.is_ai_enabled:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Tính năng AI đang tạm thời vô hiệu hóa bởi Quản trị viên tối cao (Owner).",
        )

    if not setting.is_moderation_enabled:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Dịch vụ AI Kiểm duyệt bài viết đang bị tắt bởi Quản trị viên tối cao (Owner).",
        )

    api_key = decrypt_aes_256(setting.moderation_encrypted_api_key)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Dịch vụ AI Kiểm duyệt chưa được cấu hình API Key bởi Quản trị viên tối cao (Owner).",
        )

    return {
        "provider": setting.moderation_provider,
        "api_key": api_key,
        "model_name": setting.moderation_model_name,
        "base_url": setting.moderation_base_url,
    }


async def require_image_gen_guard(
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Ensures AI image generation is enabled and decrypted API key is present."""
    setting = await OwnerAiService.get_or_create_settings(db)

    if not setting.is_ai_enabled:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Tính năng AI đang tạm thời vô hiệu hóa bởi Quản trị viên tối cao (Owner).",
        )

    if not setting.is_image_gen_enabled:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Dịch vụ AI Sinh ảnh nghệ thuật đang bị tắt bởi Quản trị viên tối cao (Owner).",
        )

    api_key = decrypt_aes_256(setting.image_encrypted_api_key)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Dịch vụ AI Sinh ảnh chưa được cấu hình API Key bởi Quản trị viên tối cao (Owner).",
        )

    return {
        "provider": setting.image_provider,
        "api_key": api_key,
        "model_name": setting.image_model_name,
        "base_url": setting.image_base_url,
    }

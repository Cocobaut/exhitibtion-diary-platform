from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, require_admin
from app.api.deps_ai import require_image_gen_guard, require_moderation_guard
from app.core.rate_limit import SlidingWindowLimiter, admin_ai_image_limiter, admin_ai_limiter, enforce_limit
from app.core.responses import ok
from app.models.user import User
from app.schemas.ai_copilot import (
    BuildImagePromptRequest,
    GenerateArtImageRequest,
    ModerateArtRequest,
    TranslateContentRequest,
)
from app.services.ai_image_prompt_service import AiImagePromptService
from app.services.ai_image_service import AiImageService
from app.services.ai_moderation_service import AiModerationService
from app.services.ai_translation_service import AiTranslationService


def _enforce_ai_limit(limiter: SlidingWindowLimiter, admin: User, action_name: str) -> None:
    enforce_limit(
        limiter,
        f"{admin.id}:{action_name}",
        f"Tần suất yêu cầu quá nhanh. Vui lòng chờ 1 phút trước khi tiếp tục {action_name}.",
    )


router = APIRouter(
    prefix="/admin/ai",
    tags=["Admin - AI Copilot"],
    dependencies=[Depends(require_admin)],
)


@router.post("/moderate", status_code=status.HTTP_200_OK)
async def moderate_artwork(
    payload: ModerateArtRequest,
    config: Dict[str, Any] = Depends(require_moderation_guard),
    current_admin: User = Depends(require_admin),
):
    """Admin inspects and moderates an artwork content using AI Copilot and 100-point Rubric."""
    _enforce_ai_limit(admin_ai_limiter, current_admin, "kiểm duyệt nội dung")
    result = await AiModerationService.moderate(
        req=payload,
        provider=config["provider"],
        api_key=config["api_key"],
        model_name=config["model_name"],
        base_url=config.get("base_url"),
    )
    return ok(data=result.model_dump())


@router.post("/generate-image", status_code=status.HTTP_200_OK)
async def generate_artwork_image(
    payload: GenerateArtImageRequest,
    config: Dict[str, Any] = Depends(require_image_gen_guard),
    current_admin: User = Depends(require_admin),
):
    """Admin synthesizes artistic visual prompt and generates illustration image for an artwork."""
    _enforce_ai_limit(admin_ai_image_limiter, current_admin, "sinh ảnh nghệ thuật")
    result = await AiImageService.generate_image(
        req=payload,
        provider=config["provider"],
        api_key=config["api_key"],
        model_name=config["model_name"],
        base_url=config.get("base_url"),
    )
    return ok(data=result.model_dump())


@router.post("/build-image-prompt", status_code=status.HTTP_200_OK)
async def build_image_prompt(
    payload: BuildImagePromptRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Bước 1→2 của luồng tạo ảnh: soạn prompt hoàn chỉnh (VI/EN) từ nội dung Admin/Owner đã rà soát.

    - Dùng LLM của dịch vụ Kiểm duyệt nếu đã cấu hình; nếu chưa/lỗi thì ghép bằng mẫu cố định.
    - Luôn trả về trạng thái API sinh ảnh để frontend bật/tắt nút "Tạo ảnh bằng AI"
      (nút "Copy" luôn dùng được để Admin tự dán vào Gemini cá nhân).
    """
    _enforce_ai_limit(admin_ai_limiter, current_admin, "soạn prompt tạo ảnh")

    llm_config: Optional[Dict[str, Any]] = None
    try:
        llm_config = await require_moderation_guard(db)
    except HTTPException:
        llm_config = None

    image_gen_available, unavailable_reason = True, None
    try:
        await require_image_gen_guard(db)
    except HTTPException as ex:
        image_gen_available, unavailable_reason = False, str(ex.detail)

    result = await AiImagePromptService.build_prompt(
        req=payload,
        llm_config=llm_config,
        image_gen_available=image_gen_available,
        image_gen_unavailable_reason=unavailable_reason,
    )
    return ok(data=result.model_dump())


@router.post("/translate", status_code=status.HTTP_200_OK)
async def translate_content(
    payload: TranslateContentRequest,
    config: Dict[str, Any] = Depends(require_moderation_guard),
    current_admin: User = Depends(require_admin),
):
    """Admin requests an AI draft translation of user content to review before approving."""
    _enforce_ai_limit(admin_ai_limiter, current_admin, "dịch song ngữ")
    result = await AiTranslationService.translate(
        req=payload,
        provider=config["provider"],
        api_key=config["api_key"],
        model_name=config["model_name"],
        base_url=config.get("base_url"),
    )
    return ok(data=result.model_dump())

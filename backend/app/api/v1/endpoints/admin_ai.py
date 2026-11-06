from collections import defaultdict
import time
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, require_admin
from app.api.deps_ai import require_image_gen_guard, require_moderation_guard
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

# In-memory sliding window rate limiter: Dict[str, list[float]]
_admin_ai_request_log = defaultdict(list)


def enforce_admin_ai_rate_limit(admin_id: str, action: str, max_requests: int = 20, window_seconds: int = 60) -> None:
    now = time.time()
    key = f"{admin_id}:{action}"
    timestamps = _admin_ai_request_log[key]

    # Clean timestamps older than window
    valid_timestamps = [ts for ts in timestamps if now - ts < window_seconds]
    _admin_ai_request_log[key] = valid_timestamps

    if len(valid_timestamps) >= max_requests:
        action_names = {
            "generate_image": "sinh ảnh nghệ thuật",
            "build_image_prompt": "soạn prompt tạo ảnh",
            "moderate": "kiểm duyệt nội dung",
            "translate": "dịch song ngữ",
        }
        action_name = action_names.get(action, "gọi dịch vụ AI")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Tần suất yêu cầu quá nhanh ({len(valid_timestamps)}/{max_requests} lượt/{window_seconds}s). Vui lòng chờ 1 phút trước khi tiếp tục {action_name}.",
        )

    _admin_ai_request_log[key].append(now)


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
    enforce_admin_ai_rate_limit(str(current_admin.id), "moderate", max_requests=20, window_seconds=60)
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
    enforce_admin_ai_rate_limit(str(current_admin.id), "generate_image", max_requests=8, window_seconds=60)
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
    enforce_admin_ai_rate_limit(str(current_admin.id), "build_image_prompt", max_requests=20, window_seconds=60)

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
    enforce_admin_ai_rate_limit(str(current_admin.id), "translate", max_requests=20, window_seconds=60)
    result = await AiTranslationService.translate(
        req=payload,
        provider=config["provider"],
        api_key=config["api_key"],
        model_name=config["model_name"],
        base_url=config.get("base_url"),
    )
    return ok(data=result.model_dump())

from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from app.api.deps import require_admin
from app.api.deps_ai import require_image_gen_guard, require_moderation_guard
from app.core.responses import ok
from app.models.user import User
from app.schemas.ai_copilot import (
    GenerateArtImageRequest,
    ModerateArtRequest,
    TranslateContentRequest,
)
from app.services.ai_image_service import AiImageService
from app.services.ai_moderation_service import AiModerationService
from app.services.ai_translation_service import AiTranslationService

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
    result = await AiImageService.generate_image(
        req=payload,
        provider=config["provider"],
        api_key=config["api_key"],
        model_name=config["model_name"],
        base_url=config.get("base_url"),
    )
    return ok(data=result.model_dump())


@router.post("/translate", status_code=status.HTTP_200_OK)
async def translate_content(
    payload: TranslateContentRequest,
    config: Dict[str, Any] = Depends(require_moderation_guard),
    current_admin: User = Depends(require_admin),
):
    """Admin requests an AI draft translation of user content to review before approving."""
    result = await AiTranslationService.translate(
        req=payload,
        provider=config["provider"],
        api_key=config["api_key"],
        model_name=config["model_name"],
        base_url=config.get("base_url"),
    )
    return ok(data=result.model_dump())

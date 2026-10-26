from typing import Optional
from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, require_owner
from app.core.responses import ok
from app.models.user import User
from app.schemas.ai_copilot import (
    DiscoverModelsRequest,
    ToggleAiServiceRequest,
    UpdateAiSettingsRequest,
)
from app.services.ai_discovery_service import AiDiscoveryService
from app.services.owner_ai_service import OwnerAiService

router = APIRouter(
    prefix="/owner/ai-settings",
    tags=["Owner - AI Configuration"],
    dependencies=[Depends(require_owner)],
)



@router.get("", status_code=status.HTTP_200_OK)
async def get_ai_settings(
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(require_owner),
):
    """Owner views current AI configurations, masked keys, and active models."""
    data = await OwnerAiService.get_settings_data(db)
    return ok(data=data.model_dump())


@router.post("/discover-models", status_code=status.HTTP_200_OK)
async def discover_models(
    payload: DiscoverModelsRequest,
    owner: User = Depends(require_owner),
):
    """Owner tests API Key and dynamically discovers available models from the provider's real API."""
    data = await AiDiscoveryService.discover_models(
        api_key=payload.api_key,
        provider=payload.provider or "auto",
        task_type=payload.task_type,
        base_url=payload.base_url,
    )
    return ok(data=data.model_dump())


@router.put("", status_code=status.HTTP_200_OK)
async def update_ai_settings(
    payload: UpdateAiSettingsRequest,
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(require_owner),
):
    """Owner updates AI configuration, enables/disables services, and updates encrypted API keys."""
    data = await OwnerAiService.update_settings(db, owner, payload)
    return ok(message="Cập nhật cấu hình AI Copilot thành công", data=data.model_dump())


@router.post("/activate", status_code=status.HTTP_200_OK)
@router.post("/enable", status_code=status.HTTP_200_OK)
@router.patch("/activate", status_code=status.HTTP_200_OK)
@router.patch("/enable", status_code=status.HTTP_200_OK)
async def activate_ai_service(
    payload: Optional[ToggleAiServiceRequest] = Body(None),
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(require_owner),
):
    """Owner kích hoạt hệ thống AI hoặc từng dịch vụ con ('all' | 'moderation' | 'image_generation')."""
    target = payload.service if payload and payload.service else "all"
    data = await OwnerAiService.activate_service(db, owner, target)
    return ok(message=f"Kích hoạt dịch vụ AI ({target}) thành công", data=data.model_dump())


@router.post("/deactivate", status_code=status.HTTP_200_OK)
@router.post("/disable", status_code=status.HTTP_200_OK)
@router.patch("/deactivate", status_code=status.HTTP_200_OK)
@router.patch("/disable", status_code=status.HTTP_200_OK)
async def deactivate_ai_service(
    payload: Optional[ToggleAiServiceRequest] = Body(None),
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(require_owner),
):
    """Owner vô hiệu hóa / tắt hệ thống AI hoặc từng dịch vụ con ('all' | 'moderation' | 'image_generation')."""
    target = payload.service if payload and payload.service else "all"
    data = await OwnerAiService.deactivate_service(db, owner, target)
    return ok(message=f"Vô hiệu hóa dịch vụ AI ({target}) thành công", data=data.model_dump())


@router.delete("/api-key/moderation", status_code=status.HTTP_200_OK)
@router.delete("/moderation/api-key", status_code=status.HTTP_200_OK)
async def delete_moderation_api_key(
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(require_owner),
):
    """Owner xóa API Key đã lưu của dịch vụ Kiểm duyệt nội dung."""
    data = await OwnerAiService.delete_api_key(db, owner, "moderation")
    return ok(message="Đã xóa API Key dịch vụ kiểm duyệt nội dung thành công", data=data.model_dump())


@router.delete("/api-key/image-generation", status_code=status.HTTP_200_OK)
@router.delete("/image-generation/api-key", status_code=status.HTTP_200_OK)
@router.delete("/image/api-key", status_code=status.HTTP_200_OK)
async def delete_image_generation_api_key(
    db: AsyncSession = Depends(get_db),
    owner: User = Depends(require_owner),
):
    """Owner xóa API Key đã lưu của dịch vụ Sinh ảnh nghệ thuật."""
    data = await OwnerAiService.delete_api_key(db, owner, "image_generation")
    return ok(message="Đã xóa API Key dịch vụ sinh ảnh nghệ thuật thành công", data=data.model_dump())



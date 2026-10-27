from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.crypto import decrypt_aes_256, encrypt_aes_256, mask_api_key
from app.models.ai_provider_setting import AiProviderSetting
from app.models.user import User
from app.schemas.ai_copilot import (
    AiSettingsData,
    ServiceSettingInfo,
    UpdateAiSettingsRequest,
)
from app.services.ai_discovery_service import AiDiscoveryService


class OwnerAiService:

    @classmethod
    async def get_or_create_settings(cls, db: AsyncSession) -> AiProviderSetting:
        stmt = select(AiProviderSetting).limit(1)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            record = AiProviderSetting(
                is_ai_enabled=False,
                is_moderation_enabled=True,
                moderation_provider="gemini",
                moderation_model_name="gemini-2.5-flash",
                is_image_gen_enabled=True,
                image_provider="gemini",
                image_model_name="imagen-3.0-generate-002",
            )
            db.add(record)
            await db.commit()
            await db.refresh(record)
        return record

    @classmethod
    async def get_settings_data(cls, db: AsyncSession) -> AiSettingsData:
        record = await cls.get_or_create_settings(db)
        mod_decrypted = decrypt_aes_256(record.moderation_encrypted_api_key)
        img_decrypted = decrypt_aes_256(record.image_encrypted_api_key)

        return AiSettingsData(
            is_ai_enabled=record.is_ai_enabled,
            moderation=ServiceSettingInfo(
                is_enabled=record.is_moderation_enabled,
                provider=record.moderation_provider,
                is_key_configured=bool(mod_decrypted),
                masked_api_key=mask_api_key(mod_decrypted),
                model_name=record.moderation_model_name,
                base_url=record.moderation_base_url,
            ),
            image_generation=ServiceSettingInfo(
                is_enabled=record.is_image_gen_enabled,
                provider=record.image_provider,
                is_key_configured=bool(img_decrypted),
                masked_api_key=mask_api_key(img_decrypted),
                model_name=record.image_model_name,
                base_url=record.image_base_url,
            ),
        )

    @classmethod
    async def update_settings(
        cls, db: AsyncSession, owner: User, payload: UpdateAiSettingsRequest
    ) -> AiSettingsData:
        record = await cls.get_or_create_settings(db)
        record.is_ai_enabled = payload.is_ai_enabled

        # Update Moderation
        if payload.moderation:
            m = payload.moderation
            record.is_moderation_enabled = m.is_enabled
            if m.provider:
                record.moderation_provider = m.provider
            if m.model_name:
                record.moderation_model_name = m.model_name
            if m.base_url is not None:
                record.moderation_base_url = m.base_url
            if m.api_key and m.api_key.strip():
                # Encrypt and save key directly so owner is never blocked
                record.moderation_encrypted_api_key = encrypt_aes_256(m.api_key.strip())
                try:
                    await AiDiscoveryService.discover_models(
                        api_key=m.api_key.strip(),
                        provider=m.provider or record.moderation_provider,
                        task_type="moderation",
                        base_url=m.base_url or record.moderation_base_url,
                    )
                except Exception as ex:
                    print(f"[OwnerAiService] Moderation key saved. Model discovery note: {ex}")

        # Update Image Generation
        if payload.image_generation:
            img = payload.image_generation
            record.is_image_gen_enabled = img.is_enabled
            if img.provider:
                record.image_provider = img.provider
            if img.model_name:
                record.image_model_name = img.model_name
            if img.base_url is not None:
                record.image_base_url = img.base_url
            if img.api_key and img.api_key.strip():
                # Encrypt and save key directly so owner is never blocked
                record.image_encrypted_api_key = encrypt_aes_256(img.api_key.strip())
                try:
                    await AiDiscoveryService.discover_models(
                        api_key=img.api_key.strip(),
                        provider=img.provider or record.image_provider,
                        task_type="image_generation",
                        base_url=img.base_url or record.image_base_url,
                    )
                except Exception as ex:
                    print(f"[OwnerAiService] Image key saved. Model discovery note: {ex}")

        record.updated_by_user_id = owner.id
        await db.commit()
        await db.refresh(record)

        return await cls.get_settings_data(db)

    @classmethod
    async def activate_service(
        cls, db: AsyncSession, owner: User, service: str = "all"
    ) -> AiSettingsData:
        record = await cls.get_or_create_settings(db)
        target = (service or "all").lower().strip()

        if target in ("moderation", "moderate"):
            record.is_moderation_enabled = True
            record.is_ai_enabled = True
        elif target in ("image_generation", "image", "image_gen"):
            record.is_image_gen_enabled = True
            record.is_ai_enabled = True
        else:
            record.is_ai_enabled = True

        record.updated_by_user_id = owner.id
        await db.commit()
        await db.refresh(record)
        return await cls.get_settings_data(db)

    @classmethod
    async def deactivate_service(
        cls, db: AsyncSession, owner: User, service: str = "all"
    ) -> AiSettingsData:
        record = await cls.get_or_create_settings(db)
        target = (service or "all").lower().strip()

        if target in ("moderation", "moderate"):
            record.is_moderation_enabled = False
        elif target in ("image_generation", "image", "image_gen"):
            record.is_image_gen_enabled = False
        else:
            record.is_ai_enabled = False

        record.updated_by_user_id = owner.id
        await db.commit()
        await db.refresh(record)
        return await cls.get_settings_data(db)

    @classmethod
    async def delete_api_key(
        cls, db: AsyncSession, owner: User, service: str
    ) -> AiSettingsData:
        record = await cls.get_or_create_settings(db)
        target = (service or "").lower().strip()

        if target in ("moderation", "moderate"):
            record.moderation_encrypted_api_key = None
        elif target in ("image_generation", "image", "image_gen"):
            record.image_encrypted_api_key = None
        else:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dịch vụ không hợp lệ: '{service}'. Hỗ trợ 'moderation' hoặc 'image_generation'."
            )

        record.updated_by_user_id = owner.id
        await db.commit()
        await db.refresh(record)
        return await cls.get_settings_data(db)



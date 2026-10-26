from typing import Any, Dict, List, Optional
import httpx
from fastapi import HTTPException, status
from app.schemas.ai_copilot import DiscoveredModelItem, DiscoverModelsData


def detect_provider(api_key: str, chosen_provider: Optional[str] = "auto") -> str:
    """Detects AI provider from the API key format if provider is set to 'auto'."""
    if chosen_provider and chosen_provider.lower() not in ("auto", ""):
        return chosen_provider.lower()
    if not api_key:
        return "custom"
    stripped = api_key.strip()
    # Google Gemini keys can start with 'AIza' (classic) or 'AQ.' / 'AQ' (Google AI Studio / Vertex / Gemini Developer API)
    if stripped.startswith("AIza") or stripped.startswith("AQ.") or stripped.startswith("AQ-") or (stripped.startswith("AQ") and len(stripped) > 20):
        return "gemini"
    if stripped.startswith("sk-ant-"):
        return "anthropic"
    if stripped.startswith("sk-"):
        return "openai"
    return "custom"


class AiDiscoveryService:

    @classmethod
    async def discover_models(
        cls,
        api_key: str,
        provider: str = "auto",
        task_type: str = "moderation",
        base_url: Optional[str] = None,
    ) -> DiscoverModelsData:
        detected_p = detect_provider(api_key, provider)

        if not api_key or len(api_key.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Khóa API không hợp lệ hoặc quá ngắn.",
            )

        try:
            if detected_p == "gemini":
                return await cls._discover_gemini_models(api_key, task_type)
            elif detected_p == "openai":
                return await cls._discover_openai_models(api_key, task_type, base_url)
            elif detected_p == "anthropic":
                return await cls._discover_anthropic_models(api_key, task_type)
            else:
                # Custom OpenAI-compatible endpoint
                if not base_url:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Không thể tự động nhận diện Provider từ định dạng API Key. Vui lòng chọn rõ Provider (ví dụ: 'gemini', 'openai', 'anthropic') hoặc cung cấp 'base_url' cho Custom Provider."
                    )
                return await cls._discover_openai_models(api_key, task_type, base_url)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lỗi khi kết nối tới Provider ({detected_p}): {str(e)}",
            )

    @classmethod
    async def _discover_gemini_models(cls, api_key: str, task_type: str) -> DiscoverModelsData:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key.strip()}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)

        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google API Key không hợp lệ hoặc không có quyền truy cập (HTTP {resp.status_code}).",
            )

        data = resp.json()
        raw_models: List[Dict[str, Any]] = data.get("models", [])
        discovered: List[DiscoveredModelItem] = []

        if task_type == "moderation":
            for m in raw_models:
                m_name = m.get("name", "").replace("models/", "")
                methods = m.get("supportedGenerationMethods", [])
                if "generateContent" in methods:
                    display = m.get("displayName", m_name)
                    discovered.append(DiscoveredModelItem(
                        id=m_name,
                        display_name=display,
                        is_recommended=False,
                        badge="Khả dụng",
                        reason=m.get("description", "Hỗ trợ sinh văn bản và kiểm duyệt"),
                    ))

            # Prioritize active Gemini models with high speed and JSON compliance
            priority_order = [
                "gemini-3-flash-preview",
                "gemini-3.6-flash",
                "gemini-3.5-flash",
                "gemini-2.5-flash",
                "gemini-flash-latest",
            ]
            rec_id = None
            for p in priority_order:
                for item in discovered:
                    if p in item.id:
                        rec_id = item.id
                        item.is_recommended = True
                        item.badge = "Khuyên dùng số 1"
                        item.reason = "Tốc độ cực nhanh, tuân thủ JSON Schema hoàn hảo cho kiểm duyệt."
                        break
                if rec_id:
                    break


            if not rec_id and discovered:
                discovered[0].is_recommended = True
                rec_id = discovered[0].id

        else:  # image_generation
            for m in raw_models:
                m_name = m.get("name", "").replace("models/", "")
                if (
                    "imagen" in m_name.lower()
                    or "image" in m_name.lower()
                    or "banana" in m_name.lower()
                ):
                    discovered.append(DiscoveredModelItem(
                        id=m_name,
                        display_name=m.get("displayName", m_name),
                        is_recommended=False,
                        badge="Khả dụng",
                        reason=m.get("description", "Mô hình sinh ảnh nghệ thuật của Google"),
                    ))

            # Flagship Imagen 3 (imagen-3.0-generate-002) is Google's primary requested text-to-image engine
            has_imagen_3 = any("imagen-3.0-generate-002" in item.id for item in discovered)
            if not has_imagen_3:
                discovered.insert(0, DiscoveredModelItem(
                    id="imagen-3.0-generate-002",
                    display_name="Google Imagen 3 (imagen-3.0-generate-002)",
                    is_recommended=True,
                    badge="Khuyên dùng số 1",
                    reason="Mô hình sinh ảnh nghệ thuật tiêu chuẩn cao cấp nhất của Google (độ nét 1024x1024, phong cách nghệ thuật tinh xảo).",
                ))
                rec_id = "imagen-3.0-generate-002"
            else:
                priority_image_order = [
                    "imagen-3.0-generate-002",
                    "gemini-2.5-flash-image",
                    "gemini-3-pro-image",
                    "gemini-3.1-flash-image",
                ]
                rec_id = None
                for p in priority_image_order:
                    for item in discovered:
                        if p in item.id:
                            rec_id = item.id
                            item.is_recommended = True
                            item.badge = "Khuyên dùng số 1"
                            item.reason = "Chất lượng hình ảnh nghệ thuật đỉnh cao, độ chi tiết tinh xảo và phản hồi nhanh."
                            break
                    if rec_id:
                        break

                if not rec_id and discovered:
                    discovered[0].is_recommended = True
                    rec_id = discovered[0].id



        return DiscoverModelsData(
            is_valid=True,
            detected_provider="gemini",
            task_type=task_type,
            total_models_in_account=len(raw_models),
            recommended_model_id=rec_id,
            discovered_models=discovered,
        )

    @classmethod
    async def _discover_openai_models(
        cls, api_key: str, task_type: str, base_url: Optional[str] = None
    ) -> DiscoverModelsData:
        root_url = (base_url or "https://api.openai.com").rstrip("/")
        url = f"{root_url}/v1/models"
        headers = {"Authorization": f"Bearer {api_key.strip()}"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)

        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OpenAI API Key không hợp lệ hoặc không có quyền truy cập (HTTP {resp.status_code}).",
            )

        data = resp.json()
        raw_models: List[Dict[str, Any]] = data.get("data", [])
        discovered: List[DiscoveredModelItem] = []

        if task_type == "moderation":
            for m in raw_models:
                m_id = m.get("id", "")
                # Filter for chat / text models
                if any(k in m_id for k in ["gpt-4o", "gpt-4", "o1", "chatgpt"]) and not any(
                    x in m_id for x in ["audio", "realtime", "search", "transcribe"]
                ):
                    discovered.append(DiscoveredModelItem(
                        id=m_id,
                        display_name=m_id.upper(),
                        is_recommended=False,
                        badge="Khả dụng",
                        reason="Mô hình chat/reasoning của OpenAI",
                    ))

            rec_id = None
            for target in ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"]:
                for item in discovered:
                    if target in item.id:
                        item.is_recommended = True
                        item.badge = "Khuyên dùng số 1"
                        item.reason = "Chi phí siêu tối ưu, tốc độ phản hồi nhanh, hỗ trợ JSON Schema tốt."
                        rec_id = item.id
                        break
                if rec_id:
                    break

            if not rec_id and discovered:
                discovered[0].is_recommended = True
                rec_id = discovered[0].id

        else:  # image_generation
            for m in raw_models:
                m_id = m.get("id", "")
                if "dall-e" in m_id:
                    discovered.append(DiscoveredModelItem(
                        id=m_id,
                        display_name=m_id.upper(),
                        is_recommended=False,
                        badge="Sinh ảnh",
                        reason="Mô hình sinh ảnh nghệ thuật DALL-E của OpenAI",
                    ))

            rec_id = None
            for item in discovered:
                if "dall-e-3" in item.id:
                    item.is_recommended = True
                    item.badge = "Khuyên dùng số 1"
                    item.reason = "Khả năng tuân thủ prompt visual tốt nhất của OpenAI."
                    rec_id = item.id
                    break

            if not rec_id and discovered:
                discovered[0].is_recommended = True
                rec_id = discovered[0].id
            elif not discovered:
                rec_id = "dall-e-3"
                discovered.append(DiscoveredModelItem(
                    id="dall-e-3",
                    display_name="OpenAI DALL-E 3 (Default)",
                    is_recommended=True,
                    badge="Khuyên dùng số 1",
                    reason="Mô hình sinh ảnh nghệ thuật tiêu chuẩn cao cấp của OpenAI.",
                ))


        return DiscoverModelsData(
            is_valid=True,
            detected_provider="openai",
            task_type=task_type,
            total_models_in_account=len(raw_models),
            recommended_model_id=rec_id,
            discovered_models=discovered,
        )

    @classmethod
    async def _discover_anthropic_models(cls, api_key: str, task_type: str) -> DiscoverModelsData:
        url = "https://api.anthropic.com/v1/models"
        headers = {
            "x-api-key": api_key.strip(),
            "anthropic-version": "2023-06-01",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)

        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Anthropic API Key không hợp lệ (HTTP {resp.status_code}).",
            )

        data = resp.json()
        raw_models: List[Dict[str, Any]] = data.get("data", [])
        discovered: List[DiscoveredModelItem] = []

        if task_type == "moderation":
            for m in raw_models:
                m_id = m.get("id", "")
                discovered.append(DiscoveredModelItem(
                    id=m_id,
                    display_name=m.get("display_name", m_id),
                    is_recommended=False,
                    badge="Khả dụng",
                    reason="Mô hình Claude của Anthropic",
                ))

            rec_id = None
            for target in ["claude-3-5-sonnet", "claude-3-haiku"]:
                for item in discovered:
                    if target in item.id:
                        item.is_recommended = True
                        item.badge = "Khuyên dùng số 1"
                        rec_id = item.id
                        break
                if rec_id:
                    break

            if not rec_id and discovered:
                discovered[0].is_recommended = True
                rec_id = discovered[0].id
        else:
            rec_id = None

        return DiscoverModelsData(
            is_valid=True,
            detected_provider="anthropic",
            task_type=task_type,
            total_models_in_account=len(raw_models),
            recommended_model_id=rec_id,
            discovered_models=discovered,
        )

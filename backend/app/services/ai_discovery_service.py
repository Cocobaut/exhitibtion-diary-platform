from typing import Any, Dict, List, Optional
import httpx
from fastapi import HTTPException, status
from app.schemas.ai_copilot import DiscoveredModelItem, DiscoverModelsData


def detect_provider(api_key: str, chosen_provider: Optional[str] = "auto") -> str:
    """Detects AI provider from the API key format or explicit choice."""
    stripped = (api_key or "").strip()
    chosen = (chosen_provider or "").strip().lower()

    # If provider is explicitly set to gemini, but key is obviously an sk- key (DeepSeek / OpenAI)
    if chosen == "gemini" and stripped.startswith("sk-"):
        if len(stripped) == 35 or "deepseek" in stripped.lower():
            return "deepseek"
        return "openai"

    if chosen and chosen not in ("auto", ""):
        return chosen

    if not stripped:
        return "custom"

    # Google Gemini keys can start with 'AIza' (classic) or 'AQ.' / 'AQ' (Google AI Studio / Vertex / Gemini Developer API)
    if stripped.startswith("AIza") or stripped.startswith("AQ.") or stripped.startswith("AQ-") or (stripped.startswith("AQ") and len(stripped) > 20):
        return "gemini"
    if stripped.startswith("sk-ant-"):
        return "anthropic"
    if stripped.startswith("fal_") or (":" in stripped and "fal" in stripped.lower()):
        return "fal"
    if stripped.startswith("sk-"):
        if len(stripped) == 35 or "deepseek" in stripped.lower():
            return "deepseek"
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
            if base_url:
                from app.core.security import validate_safe_base_url
                base_url = validate_safe_base_url(base_url)

            if detected_p == "gemini":
                return await cls._discover_gemini_models(api_key, task_type)
            elif detected_p == "fal":
                return await cls._discover_fal_models(api_key, task_type)
            elif detected_p == "deepseek":
                deepseek_url = base_url or "https://api.deepseek.com"
                return await cls._discover_openai_models(api_key, task_type, deepseek_url)
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
    async def _discover_fal_models(cls, api_key: str, task_type: str) -> DiscoverModelsData:
        discovered = [
            DiscoveredModelItem(
                id="fal-ai/flux/schnell",
                display_name="FLUX.1 [schnell] (fal-ai/flux/schnell)",
                is_recommended=True,
                badge="Khuyên dùng · Tốc độ cao",
                reason="Mô hình FLUX.1 thế hệ mới của Fal.ai tối ưu 4-step, tạo tranh nghệ thuật siêu nhanh và độ nét 1024x1024.",
            ),
            DiscoveredModelItem(
                id="fal-ai/flux/dev",
                display_name="FLUX.1 [dev] (fal-ai/flux/dev)",
                is_recommended=False,
                badge="Chi tiết cao",
                reason="Mô hình FLUX.1 phiên bản chất lượng cao cho bố cục tinh xảo và độ sâu mỹ thuật ấn tượng.",
            ),
            DiscoveredModelItem(
                id="fal-ai/flux-pro",
                display_name="FLUX.1 [pro] (fal-ai/flux-pro)",
                is_recommended=False,
                badge="Chuyên nghiệp",
                reason="Mô hình FLUX.1 cao cấp nhất phục vụ đồ họa chuyên nghiệp và bố cục phức tạp.",
            ),
        ]
        return DiscoverModelsData(
            is_valid=True,
            detected_provider="fal",
            task_type=task_type,
            total_models_in_account=len(discovered),
            recommended_model_id="fal-ai/flux/schnell",
            discovered_models=discovered,
        )

    @classmethod
    async def _discover_gemini_models(cls, api_key: str, task_type: str) -> DiscoverModelsData:
        url = f"https://generativelanguage.googleapis.com/v1beta/models"
        async with httpx.AsyncClient(timeout=10.0, headers={"x-goog-api-key": api_key.strip()}) as client:
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

            rec_id = discovered[0].id if discovered else None
            if discovered:
                discovered[0].is_recommended = True
                discovered[0].badge = "Khả dụng"
                discovered[0].reason = "Mô hình khả dụng được cung cấp trực tiếp từ Provider API cho tài khoản của bạn."

        else:  # image_generation
            # Predefined comprehensive Google Imagen & Gemini Image models suite
            google_image_catalog = [
                DiscoveredModelItem(
                    id="imagen-3.0-generate-002",
                    display_name="Google Imagen 3 (imagen-3.0-generate-002)",
                    is_recommended=True,
                    badge="Khuyên dùng số 1",
                    reason="Mô hình sinh ảnh nghệ thuật tiêu chuẩn cao cấp nhất của Google (độ nét 1024x1024, phong cách hội họa tinh xảo).",
                ),
                DiscoveredModelItem(
                    id="imagen-3.0-fast-generate-001",
                    display_name="Google Imagen 3 Fast (imagen-3.0-fast-generate-001)",
                    is_recommended=False,
                    badge="Tốc độ cao",
                    reason="Mô hình sinh ảnh tốc độ cao của Google, tối ưu hạn ngạch (quota) và thời gian phản hồi.",
                ),
                DiscoveredModelItem(
                    id="imagen-3.0-capability-001",
                    display_name="Google Imagen 3 Capability (imagen-3.0-capability-001)",
                    is_recommended=False,
                    badge="Đa năng",
                    reason="Hỗ trợ các yêu cầu tạo hình ảnh nghệ thuật và bố cục đa phong cách.",
                ),
                DiscoveredModelItem(
                    id="gemini-2.5-flash",
                    display_name="Gemini 2.5 Flash Art Vector Engine (gemini-2.5-flash)",
                    is_recommended=False,
                    badge="Vector SVG",
                    reason="Tương thích 100% mọi API Key (kể cả key dùng thử). Sinh tranh nghệ thuật dạng vector SVG tuyệt đẹp.",
                ),
                DiscoveredModelItem(
                    id="gemini-2.0-flash",
                    display_name="Gemini 2.0 Flash Art Engine (gemini-2.0-flash)",
                    is_recommended=False,
                    badge="Khả dụng",
                    reason="Mô hình thế hệ mới với khả năng hiểu ngữ nghĩa văn học và dựng tranh nghệ thuật sắc sảo.",
                ),
                DiscoveredModelItem(
                    id="gemini-1.5-pro",
                    display_name="Gemini 1.5 Pro Art Master (gemini-1.5-pro)",
                    is_recommended=False,
                    badge="Chuyên sâu",
                    reason="Mô hình suy luận sâu, tái hiện chi tiết bối cảnh và cảm xúc phức tạp của tác phẩm.",
                ),
            ]

            catalog_ids = {item.id for item in google_image_catalog}
            for m in raw_models:
                m_name = m.get("name", "").replace("models/", "")
                if ("imagen" in m_name.lower() or "image" in m_name.lower()) and m_name not in catalog_ids:
                    google_image_catalog.append(DiscoveredModelItem(
                        id=m_name,
                        display_name=m.get("displayName", m_name),
                        is_recommended=False,
                        badge="Khả dụng",
                        reason=m.get("description", "Mô hình sinh ảnh bổ sung phát hiện từ tài khoản Google."),
                    ))
                    catalog_ids.add(m_name)

            discovered = google_image_catalog
            rec_id = "imagen-3.0-generate-002" 



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
        if root_url.endswith("/v1"):
            url = f"{root_url}/models"
        else:
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
            is_deepseek = "deepseek" in root_url.lower()
            for m in raw_models:
                m_id = m.get("id", "")
                # Filter for chat / text models
                if is_deepseek or any(k in m_id.lower() for k in ["gpt-4o", "gpt-4", "o1", "o3", "chatgpt", "deepseek", "chat"]):
                    if not any(x in m_id.lower() for x in ["audio", "realtime", "search", "transcribe"]):
                        discovered.append(DiscoveredModelItem(
                            id=m_id,
                            display_name=m_id,
                            is_recommended=False,
                            badge="Khả dụng",
                            reason="Mô hình suy luận tốc độ cao của DeepSeek" if is_deepseek else "Mô hình chat/reasoning của OpenAI",
                        ))

            rec_id = None
            if is_deepseek:
                for target in ["deepseek-chat", "deepseek-flash", "deepseek-v4-pro", "deepseek-reasoner"]:
                    for item in discovered:
                        if target in item.id.lower():
                            item.is_recommended = True
                            item.badge = "Khuyên dùng số 1"
                            item.reason = "Mô hình tối ưu chi phí, tốc độ suy luận nhanh và tuân thủ JSON Schema tuyệt vời."
                            rec_id = item.id
                            break
                    if rec_id:
                        break
            else:
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
            detected_provider="deepseek" if "deepseek" in root_url.lower() else "openai",
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

"""Tests for the 2-step human-in-the-loop image prompt flow."""
from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.ai_copilot import BuildImagePromptRequest, GenerateArtImageRequest
from app.services.ai_image_prompt_service import AiImagePromptService
from app.services.ai_image_service import AiImageService


def _req(**kw):
    base = dict(
        art_id="art-1",
        target_room="room1",
        title_vi="Chiếc ly vỡ",
        title_en="The broken glass",
        short_content_vi="Kỷ niệm sau chia tay",
        content_vi="Tôi giữ lại chiếc ly vỡ bên cửa sổ. Gọi tôi 0987654321.",
    )
    base.update(kw)
    return BuildImagePromptRequest(**base)


@pytest.mark.asyncio
async def test_template_fallback_when_llm_not_configured():
    data = await AiImagePromptService.build_prompt(_req(), llm_config=None, image_gen_available=False,
                                                   image_gen_unavailable_reason="chưa cấu hình")
    assert data.is_template_fallback is True
    assert data.model_used is None
    assert data.image_gen_available is False
    assert "Chiếc ly vỡ" in data.prompt_vi
    assert "The broken glass" in data.prompt_en
    # Missing EN content falls back to VI source instead of inventing text
    assert "chiếc ly vỡ bên cửa sổ" in data.prompt_en
    # PII must be masked
    assert "0987654321" not in data.prompt_vi and "0987654321" not in data.prompt_en


@pytest.mark.asyncio
async def test_llm_prompt_is_used_when_it_passes_guard():
    llm = {"prompt_vi": "Vẽ một bức tranh về chiếc ly vỡ bên cửa sổ, tranh sơn dầu biểu cảm.",
           "prompt_en": "Create an illustration of a broken glass by the window, expressive oil painting."}
    with patch("app.services.ai_image_prompt_service._call_llm", new=AsyncMock(return_value=(llm, "gemini-flash-latest"))):
        data = await AiImagePromptService.build_prompt(
            _req(), llm_config={"provider": "gemini", "api_key": "k", "model_name": "m"}, image_gen_available=True)
    assert data.is_template_fallback is False
    assert data.model_used == "gemini-flash-latest"
    assert data.prompt_vi == llm["prompt_vi"]


@pytest.mark.asyncio
async def test_llm_prompt_with_invented_numbers_is_rejected():
    llm = {"prompt_vi": "Vẽ chiếc ly vỡ vào năm 1999 lúc 23 giờ.", "prompt_en": "A broken glass in 1999 at 23:00."}
    with patch("app.services.ai_image_prompt_service._call_llm", new=AsyncMock(return_value=(llm, "deepseek-chat"))):
        data = await AiImagePromptService.build_prompt(
            _req(), llm_config={"provider": "openai", "api_key": "k", "model_name": "deepseek-chat"},
            image_gen_available=True)
    assert data.is_template_fallback is True
    assert "1999" not in data.prompt_vi and "1999" not in data.prompt_en


@pytest.mark.asyncio
async def test_empty_form_is_rejected():
    from app.core.exceptions import AppException
    with pytest.raises(AppException):
        await AiImagePromptService.build_prompt(
            BuildImagePromptRequest(art_id="x"), llm_config=None, image_gen_available=False)


@pytest.mark.asyncio
async def test_generate_image_sends_confirmed_prompt_verbatim():
    captured = {}

    async def fake_fal(prompt, api_key, model_name, base_url=None, append_style=True):
        captured["prompt"], captured["append_style"] = prompt, append_style
        return b"\x89PNG\r\n\x1a\nfake"

    with patch.object(AiImageService, "_generate_fal_flux", new=fake_fal):
        res = await AiImageService.generate_image(
            req=GenerateArtImageRequest(art_id="art-verbatim", final_prompt="  Exact admin prompt  "),
            provider="fal", api_key="id:fal_sk_x", model_name="fal-ai/flux/schnell")
    assert captured == {"prompt": "Exact admin prompt", "append_style": False}
    assert res.visual_prompt == "Exact admin prompt"
    assert res.is_fallback_art is False

"""Dịch nội dung người dùng giữa tiếng Việt và tiếng Anh để admin xem lại trước khi duyệt.

Bản dịch chỉ là bản nháp điền sẵn cho admin; nội dung gốc của tác giả không bị thay đổi.
"""

import json
from typing import Any, Dict, Optional

import httpx

from app.core.exceptions import AppException
from app.schemas.ai_copilot import TranslateContentData, TranslateContentRequest

LANG_NAMES = {"vi": "Vietnamese", "en": "English"}

# Model dự phòng khi model Owner cấu hình không còn khả dụng với key này
GEMINI_FALLBACK_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"]

TRANSLATION_PROMPT = """You translate personal, emotional writing from {source} to {target} for a community art museum.
Rules:
- Keep the author's voice, tone and meaning. Do not add, remove or soften anything.
- Keep line breaks. Do not translate names of people or places.
- Translate each provided field independently. Leave a field null if it was not provided.
- Reply with JSON only: {{"title": string|null, "short_content": string|null, "content": string|null}}"""


class AiTranslationService:
    @classmethod
    async def translate(
        cls,
        req: TranslateContentRequest,
        provider: str,
        api_key: str,
        model_name: str,
        base_url: Optional[str] = None,
    ) -> TranslateContentData:
        if req.source_lang == req.target_lang:
            raise AppException(400, "SAME_LANGUAGE", "Ngôn ngữ gốc và ngôn ngữ đích phải khác nhau")

        fields = {k: v for k, v in {
            "title": req.title,
            "short_content": req.short_content,
            "content": req.content,
        }.items() if v and v.strip()}
        if not fields:
            raise AppException(400, "NOTHING_TO_TRANSLATE", "Không có nội dung để dịch")

        system = TRANSLATION_PROMPT.format(source=LANG_NAMES[req.source_lang], target=LANG_NAMES[req.target_lang])
        user_text = json.dumps(fields, ensure_ascii=False)

        if (provider or "gemini").lower() == "gemini":
            result, used = await cls._call_gemini(system, user_text, api_key, model_name)
        else:
            result, used = await cls._call_openai(system, user_text, api_key, model_name, base_url)

        if result is None:
            raise AppException(502, "TRANSLATION_FAILED", "AI chưa dịch được lúc này, bạn thử lại sau nhé")

        return TranslateContentData(
            target_lang=req.target_lang,
            title=result.get("title") if "title" in fields else None,
            short_content=result.get("short_content") if "short_content" in fields else None,
            content=result.get("content") if "content" in fields else None,
            model_used=used,
        )

    @staticmethod
    def _parse_json(text: str) -> Optional[Dict[str, Any]]:
        clean = text.strip()
        if clean.startswith("```"):
            lines = clean.splitlines()[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            clean = "\n".join(lines).strip()
        try:
            data = json.loads(clean)
        except json.JSONDecodeError:
            return None
        return data if isinstance(data, dict) else None

    @classmethod
    async def _call_gemini(cls, system: str, user_text: str, api_key: str, model_name: str):
        payload = {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"parts": [{"text": user_text}]}],
            "generationConfig": {"temperature": 0.2, "response_mime_type": "application/json"},
        }
        models = [m for m in [(model_name or "").strip(), *GEMINI_FALLBACK_MODELS] if m]
        async with httpx.AsyncClient(timeout=30.0, headers={"x-goog-api-key": api_key.strip()}) as client:
            for m in dict.fromkeys(models):
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"
                try:
                    resp = await client.post(url, json=payload)
                except httpx.HTTPError as ex:
                    print(f"[AI Translation] Error calling {m}: {ex}")
                    continue
                if resp.status_code != 200:
                    print(f"[AI Translation] Model '{m}' returned HTTP {resp.status_code}")
                    continue
                candidates = resp.json().get("candidates", [])
                parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
                data = cls._parse_json(parts[0].get("text", "")) if parts else None
                if data is not None:
                    return data, m
        return None, None

    @classmethod
    async def _call_openai(cls, system: str, user_text: str, api_key: str, model_name: str, base_url: Optional[str]):
        root_url = (base_url or "https://api.openai.com").rstrip("/")
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(
                    f"{root_url}/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key.strip()}"},
                    json=payload,
                )
            except httpx.HTTPError as ex:
                print(f"[AI Translation] Error calling {model_name}: {ex}")
                return None, None
        if resp.status_code != 200:
            print(f"[AI Translation] Model '{model_name}' returned HTTP {resp.status_code}")
            return None, None
        data = cls._parse_json(resp.json()["choices"][0]["message"]["content"])
        return (data, model_name) if data is not None else (None, None)

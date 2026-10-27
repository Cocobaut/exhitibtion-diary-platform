import base64
from datetime import datetime, timezone
import os
from pathlib import Path
from typing import Optional
import httpx
from app.core.config import settings
from app.schemas.ai_copilot import GenerateArtImageData, GenerateArtImageRequest


class AiImageService:

    @classmethod
    async def generate_image(
        cls,
        req: GenerateArtImageRequest,
        provider: str,
        api_key: str,
        model_name: str,
        base_url: Optional[str] = None,
    ) -> GenerateArtImageData:
        """Extracts visual prompt and generates artistic illustration."""
        # 1. Synthesize visual prompt from content
        visual_prompt = cls._extract_visual_prompt(req.source_content, req.custom_prompt_addon)

        # 2. Call Image Generation Provider
        image_bytes = None
        try:
            if provider == "openai":
                image_bytes = await cls._generate_openai_dalle(visual_prompt, api_key, model_name, base_url)
            elif provider == "gemini":
                image_bytes = await cls._generate_gemini_imagen(visual_prompt, api_key, model_name)
        except Exception as e:
            print(f"Warning: Upstream image generation error ({e}), using fallback art renderer.")

        # 3. Save to local storage
        upload_dir = Path(settings.UPLOAD_DIR) / "artworks" / "ai_generated"
        upload_dir.mkdir(parents=True, exist_ok=True)

        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        safe_art_id = req.art_id.replace("-", "")[:8]
        is_svg = bool(image_bytes and image_bytes.lstrip().startswith(b"<svg"))
        ext = "svg" if is_svg else "webp"
        filename = f"ai_{safe_art_id}_{timestamp_str}.{ext}"
        file_path = upload_dir / filename

        if image_bytes:
            with open(file_path, "wb") as f:
                f.write(image_bytes)
        else:
            # Fallback aesthetic SVG art if offline
            cls._create_fallback_art_file(file_path, visual_prompt)

        image_url = f"/uploads/artworks/ai_generated/{filename}"

        return GenerateArtImageData(
            art_id=req.art_id,
            image_url=image_url,
            visual_prompt=visual_prompt,
            width=1024,
            height=1024,
        )

    @classmethod
    def _extract_visual_prompt(cls, content: str, addon: Optional[str] = None) -> str:
        # Extract keywords and mood
        mood = "melancholic and serene"
        if any(w in content.lower() for w in ["hy vọng", "tương lai", "ước nguyện", "sao", "lồng đèn"]):
            mood = "hopeful golden lantern glowing in starry night sky"
        elif any(w in content.lower() for w in ["đổ vỡ", "chia tay", "ly", "mảnh vỡ", "buồn"]):
            mood = "shattered delicate glass under gentle sunset window light"
        elif any(w in content.lower() for w in ["cây", "lá", "bình yên", "thông điệp"]):
            mood = "luminous wishing tree with glowing pastel crystal leaves"

        base = f"A museum exhibition fine art masterpiece representing {mood}, emotional solitude, soft atmospheric lighting"
        if addon and addon.strip():
            return f"{base}, {addon.strip()}"
        return f"{base}, watercolor and oil painting aesthetic, ultra high detail"

    @classmethod
    async def _generate_openai_dalle(
        cls, prompt: str, api_key: str, model_name: str, base_url: Optional[str] = None
    ) -> Optional[bytes]:
        root_url = (base_url or "https://api.openai.com").rstrip("/")
        url = f"{root_url}/v1/images/generations"
        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model_name or "dall-e-3",
            "prompt": prompt,
            "n": 1,
            "size": "1024x1024",
            "response_format": "b64_json",
        }
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                b64 = resp.json()["data"][0]["b64_json"]
                return base64.b64decode(b64)
        return None

    @classmethod
    async def _generate_gemini_imagen(cls, prompt: str, api_key: str, model_name: str) -> Optional[bytes]:
        # 1. Try Google Imagen predict endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name or 'imagen-3.0-generate-002'}:predict?key={api_key.strip()}"
        payload = {
            "instances": [{"prompt": prompt}],
            "parameters": {"sampleCount": 1, "aspectRatio": "1:1"},
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    predictions = data.get("predictions", [])
                    if predictions and "bytesBase64Encoded" in predictions[0]:
                        b64 = predictions[0]["bytesBase64Encoded"]
                        print("[AI Copilot Image] Successfully generated raster image via Google Imagen 3.")
                        return base64.b64decode(b64)
        except Exception:
            pass

        # 2. If trial key doesn't have Vertex/Imagen quota, use Gemini to synthesize high-res SVG art
        return await cls._synthesize_gemini_svg_art(prompt, api_key)

    @classmethod
    async def _synthesize_gemini_svg_art(cls, prompt: str, api_key: str) -> Optional[bytes]:
        import re
        # Dynamically discover models supported by this key
        candidates = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                m_resp = await client.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key.strip()}")
                if m_resp.status_code == 200:
                    models_data = m_resp.json().get("models", [])
                    candidates = [
                        m.get("name", "").replace("models/", "")
                        for m in models_data
                        if "generateContent" in m.get("supportedGenerationMethods", [])
                    ]
        except Exception:
            pass
        instruction = (
            f"You are a master digital fine-artist. Generate an SVG artwork illustration representing: {prompt}. "
            "Return strictly raw valid SVG code starting with <svg and ending with </svg>. "
            "Use viewBox='0 0 1024 1024', linearGradient / radialGradient, harmonious rich colors, and delicate artistic shapes. "
            "Do NOT include any markdown code blocks, backticks, or text outside the <svg> tags."
        )
        async with httpx.AsyncClient(timeout=25.0) as client:
            for m in candidates:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key.strip()}"
                payload = {"contents": [{"parts": [{"text": instruction}]}]}
                try:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        candidates_data = resp.json().get("candidates", [])
                        if candidates_data:
                            text = candidates_data[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            match = re.search(r"(<svg[\s\S]*?</svg>)", text)
                            if match:
                                print(f"[AI Copilot Image] Real Gemini AI ({m}) successfully synthesized artwork illustration!")
                                return match.group(1).strip().encode("utf-8")
                except Exception as ex:
                    print(f"[AI Copilot Image] Error generating art with {m}: {ex}")
        return None

    @classmethod
    def _create_fallback_art_file(cls, path: Path, prompt: str):
        """Creates a standalone stylized SVG artwork file if completely offline."""
        svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="50%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#4338ca"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="512" cy="512" r="320" fill="url(#glow)"/>
  <text x="512" y="520" font-family="sans-serif" font-size="28" fill="#f8fafc" text-anchor="middle" font-weight="600">Museum of Feelings</text>
  <text x="512" y="565" font-family="sans-serif" font-size="18" fill="#cbd5e1" text-anchor="middle">Art Illustration</text>
</svg>"""
        with open(path, "wb") as f:
            f.write(svg_content.encode("utf-8"))


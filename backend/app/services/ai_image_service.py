import base64
from datetime import datetime, timezone
import os
from pathlib import Path
import re
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
        # 1. Prompt: ưu tiên prompt cuối cùng Admin/Owner đã xác nhận (gửi nguyên văn, không thêm/bớt)
        confirmed_prompt = (req.final_prompt or "").strip()
        if confirmed_prompt:
            visual_prompt = confirmed_prompt
        else:
            visual_prompt = cls._extract_visual_prompt(req.source_content, req.custom_prompt_addon)
        append_style = not confirmed_prompt

        # 2. Call Image Generation Provider
        image_bytes = None
        try:
            if provider == "fal" or (api_key and ("fal" in provider.lower() or api_key.strip().startswith("fal_") or ":" in api_key)):
                image_bytes = await cls._generate_fal_flux(visual_prompt, api_key, model_name, base_url, append_style=append_style)
            elif provider == "openai":
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
        if is_svg:
            ext = "svg"
        elif image_bytes and image_bytes.startswith(b"\xff\xd8\xff"):
            ext = "jpg"
        elif image_bytes and image_bytes.startswith(b"\x89PNG"):
            ext = "png"
        else:
            ext = "webp"
        filename = f"ai_{safe_art_id}_{timestamp_str}.{ext}"
        file_path = upload_dir / filename

        if image_bytes:
            if is_svg:
                try:
                    svg_text = image_bytes.decode("utf-8", errors="replace")
                    sanitized_text = cls.sanitize_svg(svg_text)
                    image_bytes = sanitized_text.encode("utf-8")
                except Exception as ex:
                    print(f"Warning: Failed to sanitize SVG: {ex}")
            with open(file_path, "wb") as f:
                f.write(image_bytes)
        else:
            # Fallback aesthetic SVG art if offline
            cls._create_fallback_art_file(file_path, visual_prompt)

        image_url = f"/static/artworks/ai_generated/{filename}"

        return GenerateArtImageData(
            art_id=req.art_id,
            image_url=image_url,
            visual_prompt=visual_prompt,
            width=1024,
            height=1024,
            is_fallback_art=not bool(image_bytes),
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
    async def _generate_fal_flux(
        cls, prompt: str, api_key: str, model_name: str, base_url: Optional[str] = None, append_style: bool = True
    ) -> Optional[bytes]:
        """Calls Fal.ai FLUX.1 (default: fal-ai/flux/schnell) to synthesize high-res illustration."""
        clean_key = api_key.strip()
        headers = {
            "Authorization": f"Key {clean_key}",
            "Content-Type": "application/json",
        }
        endpoint = model_name if model_name and "/" in model_name else "fal-ai/flux/schnell"
        root_url = (base_url or "https://fal.run").rstrip("/")
        url = f"{root_url}/{endpoint}"

        payload = {
            "prompt": (
                f"{prompt}, museum fine art, expressive oil painting aesthetic, rich textures, 8k masterpiece"
                if append_style else prompt
            ),
            "image_size": "square_hd",
            "num_inference_steps": 4,
            "num_images": 1,
            "enable_safety_checker": True,
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                images = data.get("images", [])
                if images and "url" in images[0]:
                    img_url = images[0]["url"]
                    img_resp = await client.get(img_url, timeout=30.0)
                    if img_resp.status_code == 200:
                        print(f"[AI Image Service] Fal.ai FLUX ({endpoint}) synthesized image successfully!")
                        return img_resp.content
            else:
                err_text = resp.text[:250].replace("\n", " ")
                print(f"[AI Image Service] Fal.ai returned HTTP {resp.status_code}: {err_text}")
        return None

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
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name or 'imagen-3.0-generate-002'}:predict"
        payload = {
            "instances": [{"prompt": prompt}],
            "parameters": {"sampleCount": 1, "aspectRatio": "1:1"},
        }
        try:
            async with httpx.AsyncClient(timeout=20.0, headers={"x-goog-api-key": api_key.strip()}) as client:
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
            async with httpx.AsyncClient(timeout=10.0, headers={"x-goog-api-key": api_key.strip()}) as client:
                m_resp = await client.get(f"https://generativelanguage.googleapis.com/v1beta/models")
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
        async with httpx.AsyncClient(timeout=25.0, headers={"x-goog-api-key": api_key.strip()}) as client:
            for m in candidates:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"
                payload = {"contents": [{"parts": [{"text": instruction}]}]}
                try:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        candidates_data = resp.json().get("candidates", [])
                        if candidates_data:
                            text = candidates_data[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            match = re.search(r"(<svg[\s\S]*?</svg>)", text)
                            if match:
                                raw_svg = match.group(1).strip()
                                sanitized_svg = cls.sanitize_svg(raw_svg)
                                print(f"[AI Copilot Image] Real Gemini AI ({m}) successfully synthesized artwork illustration!")
                                return sanitized_svg.encode("utf-8")
                except Exception as ex:
                    print(f"[AI Copilot Image] Error generating art with {m}: {ex}")
        return None

    @classmethod
    def sanitize_svg(cls, svg_content: str) -> str:
        """Sanitizes raw SVG code to eliminate Stored XSS attack vectors.
        Removes <script>, <foreignObject>, <animate>, <set>, <handler>, <use>,
        inline event attributes (onload, onerror, etc.), and dangerous URI schemes.
        """
        if not svg_content:
            return ""
        # 1. Remove entire <script>...</script> tags
        cleaned = re.sub(r"<script[\s\S]*?</script>", "", svg_content, flags=re.IGNORECASE)
        # 2. Remove dangerous structural/animation tags
        cleaned = re.sub(r"<(foreignObject|animate|set|handler|use)[\s\S]*?</\1>", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"<(foreignObject|animate|set|handler|use)[^>]*/>", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"<(foreignObject|animate|set|handler|use)[^>]*>", "", cleaned, flags=re.IGNORECASE)
        # 3. Remove inline event handlers (onload, onclick, onerror, onmouseover, etc.)
        cleaned = re.sub(r"\son\w+\s*=\s*(?:'[^']*'|\"[^\"]*\"|[^\s>]+)", "", cleaned, flags=re.IGNORECASE)
        # 4. Remove dangerous URLs containing javascript: or data: in href/xlink:href/style
        cleaned = re.sub(r'(?:href|xlink:href)\s*=\s*["\']\s*(?:javascript|data):[^"\']*["\']', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'url\s*\(\s*["\']?\s*(?:javascript|data):[^)]*["\']?\s*\)', '', cleaned, flags=re.IGNORECASE)
        return cleaned.strip()

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


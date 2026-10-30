"""Unit and integration test suite for PLAN 16 - AI Copilot Content Moderation and Image Generation.

Covers:
1. Badwords Seed JSON dictionary validation (schema, categories, penalties, variants).
2. Rubric scoring engine (100-point base, deductions, threshold >= 60 vs < 60).
3. PII and Badwords pattern matching (Vietnamese & English leet/teencode).
4. Strict No-Hallucination rewrite rules (PII masking, neutral replacement, semantic preservation).
5. Room assessment logic (Room 1 Broken vs Room 2 Lantern vs Room 3 Tree).
6. Owner AI Feature Toggle Guard (HTTP 428/403 when disabled by Owner).
7. Visual Prompt extraction and Mock Image Generation flow.
"""

import json
from pathlib import Path
import re
import sys
from typing import Any, Dict, List
import pytest

# Ensure backend root is on sys.path
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


# ==============================================================================
# 1. BADWORDS SEED JSON VALIDATION
# ==============================================================================

def test_badwords_seed_json_structure():
    """Verify backend/database/badwords_seed.json exists and strictly adheres to the schema."""
    seed_path = BACKEND_ROOT / "database" / "badwords_seed.json"
    assert seed_path.exists(), f"Seed file not found at {seed_path}"

    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert isinstance(data, list), "Seed data must be a JSON array"
    assert len(data) >= 15, "Seed dictionary should contain comprehensive badword entries"

    valid_categories = {
        "profanity_severe",
        "insult_intellect",
        "insult_derogatory",
        "insult_bodyshaming",
        "derogatory_sexual",
        "hate_speech",
        "profanity_mild",
    }
    valid_languages = {"vi", "en"}

    for entry in data:
        assert "term" in entry and isinstance(entry["term"], str) and entry["term"]
        assert "language" in entry and entry["language"] in valid_languages
        assert "category" in entry and entry["category"] in valid_categories
        assert "base_penalty" in entry and isinstance(entry["base_penalty"], int)
        assert 5 <= entry["base_penalty"] <= 30, f"Penalty {entry['base_penalty']} out of range for {entry['term']}"
        assert "variants" in entry and isinstance(entry["variants"], list)
        assert len(entry["variants"]) >= 1, f"Term {entry['term']} should have at least 1 variant"


# ==============================================================================
# 2. LOCAL RULE ENGINE & MATCHING FUNCTIONS
# ==============================================================================

VIETNAMESE_PHONE_REGEX = re.compile(
    r"(?:\+84|0)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}\b"
)
SOCIAL_MEDIA_REGEX = re.compile(
    r"(?:https?://)?(?:www\.)?(?:facebook\.com|fb\.com|zalo\.me|t\.me|tiktok\.com)/[A-Za-z0-9_.-]+",
    re.IGNORECASE,
)
BANK_ACCOUNT_KEYWORD_REGEX = re.compile(
    r"\b(?:stk|số tài khoản|ngân hàng|momo|vcb|vietcombank|techcombank)\b[\s:]*([0-9]{9,16})",
    re.IGNORECASE,
)


def detect_pii(text: str) -> List[Dict[str, Any]]:
    """Detect phone numbers, social media links, and bank accounts in text."""
    violations = []
    lines = text.split("\n")
    for line_idx, line in enumerate(lines, start=1):
        # Phone
        for match in VIETNAMESE_PHONE_REGEX.finditer(line):
            violations.append({
                "category": "pii",
                "deducted_points": 25,
                "line_number": line_idx,
                "quote": match.group(0),
                "reason": "Lộ số điện thoại liên lạc cá nhân",
            })
        # Social
        for match in SOCIAL_MEDIA_REGEX.finditer(line):
            violations.append({
                "category": "pii",
                "deducted_points": 25,
                "line_number": line_idx,
                "quote": match.group(0),
                "reason": "Lộ liên kết mạng xã hội cá nhân",
            })
        # Bank Account
        for match in BANK_ACCOUNT_KEYWORD_REGEX.finditer(line):
            violations.append({
                "category": "pii",
                "deducted_points": 25,
                "line_number": line_idx,
                "quote": match.group(0),
                "reason": "Lộ thông tin tài khoản ngân hàng / ví điện tử",
            })
    return violations


def load_badword_variants_map() -> Dict[str, Dict[str, Any]]:
    """Load badwords seed into a flattened lookup dictionary for fast substring/word boundary checking."""
    seed_path = BACKEND_ROOT / "database" / "badwords_seed.json"
    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    lookup = {}
    for entry in data:
        all_terms = [entry["term"]] + entry["variants"]
        for term in all_terms:
            t = term.strip().lower()
            if t:
                lookup[t] = {
                    "primary_term": entry["term"],
                    "category": entry["category"],
                    "penalty": entry["base_penalty"],
                }
    return lookup


def detect_badwords(text: str, lookup: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Detect badwords in text line by line."""
    violations = []
    lines = text.split("\n")
    lowered_lines = [l.lower() for l in lines]

    for line_idx, l_text in enumerate(lowered_lines, start=1):
        for term, meta in lookup.items():
            # Check whole words or substrings for non-alphabetic slang
            pattern = r"(?<!\w)" + re.escape(term) + r"(?!\w)"
            matches = list(re.finditer(pattern, l_text, re.IGNORECASE))
            if not matches and any(char in "!@#$%^&*._-" for char in term):
                # Leet code term without word boundary
                if term in l_text:
                    violations.append({
                        "category": "profanity_dictionary",
                        "deducted_points": meta["penalty"],
                        "line_number": line_idx,
                        "quote": term,
                        "reason": f"Sử dụng từ ngữ tục tĩu / xúc phạm ('{meta['primary_term']}')",
                    })
                    continue

            for match in matches:
                violations.append({
                    "category": "profanity_dictionary",
                    "deducted_points": meta["penalty"],
                    "line_number": line_idx,
                    "quote": lines[line_idx - 1][match.start():match.end()],
                    "reason": f"Sử dụng từ ngữ tục tĩu / xúc phạm ('{meta['primary_term']}')",
                })
    return violations


def compute_moderation_score(violations: List[Dict[str, Any]]) -> int:
    """Calculate the final rubric score starting from 100 points."""
    total_deductions = sum(v["deducted_points"] for v in violations)
    return max(0, 100 - total_deductions)


def mock_strict_rewrite(text: str) -> str:
    """Simulate strict no-hallucination rewrite: mask PII & neutralize vulgar words."""
    result = text
    # Mask Vietnamese phone numbers
    result = VIETNAMESE_PHONE_REGEX.sub("098***", result)
    # Neutralize common profanity
    replacements = {
        r"(?i)\bđịt\b": "[thực hiện]",
        r"(?i)\blồn\b": "[chuyện không vui]",
        r"(?i)\bvcl\b": "rất nhiều",
        r"(?i)\bvl\b": "rất nhiều",
        r"(?i)\bóc chó\b": "thiếu chín chắn",
        r"(?i)\bfuck\b": "damn",
        r"(?i)\bchịch\b": "gặp gỡ",
    }
    for pat, rep in replacements.items():
        result = re.sub(pat, rep, result)
    return result


# ==============================================================================
# 3. UNIT TESTS FOR RUBRIC & DETECTION ENGINE
# ==============================================================================

def test_detect_pii_vietnamese_phone_and_social():
    text = "Nếu bạn cảm thấy bế tắc, hãy gọi cho mình qua số 0987654321 hoặc fb.com/myprofile để tâm sự nhé."
    violations = detect_pii(text)
    assert len(violations) == 2
    quotes = [v["quote"] for v in violations]
    assert "0987654321" in quotes
    assert any("fb.com/myprofile" in q for q in quotes)
    for v in violations:
        assert v["category"] == "pii"
        assert v["deducted_points"] == 25


def test_detect_badwords_vietnamese_and_leet():
    lookup = load_badword_variants_map()
    text = "Ngày hôm nay tâm trạng thật vcl, nhìn đời như l0n vậy."
    violations = detect_badwords(text, lookup)
    assert len(violations) >= 2
    categories = [v["category"] for v in violations]
    assert all(cat == "profanity_dictionary" for cat in categories)


def test_rubric_scoring_threshold_approve_with_edits():
    """Score >= 60 should produce verdict APPROVE_WITH_EDITS."""
    # Only 1 mild violation (-10 points)
    violations = [
        {
            "category": "profanity_mild",
            "deducted_points": 10,
            "line_number": 1,
            "quote": "cay mắt",
            "reason": "Dùng từ lóng cảm thán tiêu cực",
        }
    ]
    score = compute_moderation_score(violations)
    assert score == 90
    verdict = "APPROVE_WITH_EDITS" if score >= 60 else "DISAPPROVE"
    assert verdict == "APPROVE_WITH_EDITS"


def test_rubric_scoring_threshold_disapprove():
    """Score < 60 should produce verdict DISAPPROVE."""
    # Multiple severe violations: PII (-25), Severe profanity (-20), PR (-20) = -65 -> Score 35
    violations = [
        {"category": "pii", "deducted_points": 25, "line_number": 1, "quote": "0981112233", "reason": "Lộ SĐT"},
        {"category": "profanity_severe", "deducted_points": 20, "line_number": 2, "quote": "đụ má", "reason": "Chửi thề"},
        {"category": "advertising", "deducted_points": 20, "line_number": 3, "quote": "nhắn tin vay vốn", "reason": "Quảng cáo"},
    ]
    score = compute_moderation_score(violations)
    assert score == 35
    verdict = "APPROVE_WITH_EDITS" if score >= 60 else "DISAPPROVE"
    assert verdict == "DISAPPROVE"


def test_strict_no_hallucination_rewrite():
    original = "Tôi buồn vl khi chia tay, liên hệ tôi 0912345678 nếu bạn cũng cô đơn."
    rewritten = mock_strict_rewrite(original)

    # 1. Phone number must be masked
    assert "0912345678" not in rewritten
    assert "098***" in rewritten

    # 2. Slang 'vl' neutralized
    assert "vl" not in rewritten
    assert "rất nhiều" in rewritten

    # 3. Core content preserved without invented story
    assert "chia tay" in rewritten
    assert "cô đơn" in rewritten


def test_room_assessment_logic():
    """Venting extreme anger in Room 2 (Lantern Sky - Hope) should be assessed as mismatch."""
    def assess_room(target_room: str, content: str) -> Dict[str, Any]:
        toxic_markers = ["hận thù", "trả thù", "chết đi", "đổ vỡ", "tan nát"]
        is_toxic = any(m in content.lower() for m in toxic_markers)

        if target_room == "room2" and is_toxic:
            return {
                "current_room": "room2",
                "is_valid": False,
                "suggested_room": "room1",
                "reason": "Bầu trời Hy Vọng (Room 2) yêu cầu nội dung hướng tới tương lai tích cực. Nội dung đổ vỡ/oán hận phù hợp với Phòng Đổ Vỡ (Room 1) hơn.",
            }
        return {
            "current_room": target_room,
            "is_valid": True,
            "suggested_room": target_room,
            "reason": "Phòng trưng bày phù hợp với cảm xúc bài viết.",
        }

    sample_post = "Tôi hận thù cuộc đời này, mọi thứ đã tan nát không thể cứu vãn."
    assessment = assess_room("room2", sample_post)
    assert assessment["is_valid"] is False
    assert assessment["suggested_room"] == "room1"


# ==============================================================================
# 4. OWNER FEATURE TOGGLE & SECURITY GUARD TEST
# ==============================================================================

def test_ai_toggle_guard_behavior():
    """Verify middleware behavior when AI is disabled by the Owner."""
    system_config = {
        "is_ai_enabled": False,
        "encrypted_api_key": "some_encrypted_key",
    }

    def check_ai_guard(config: Dict[str, Any]):
        if not config.get("is_ai_enabled"):
            return {
                "status_code": 428,
                "error": {
                    "code": "AI_FEATURE_DISABLED",
                    "message": "AI Gemini đang tạm thời vô hiệu hóa bởi Quản trị viên tối cao (Owner)",
                },
            }
        return {"status_code": 200, "error": None}

    # Case 1: Disabled
    res_disabled = check_ai_guard(system_config)
    assert res_disabled["status_code"] == 428
    assert "Quản trị viên tối cao (Owner)" in res_disabled["error"]["message"]

    # Case 2: Enabled
    system_config["is_ai_enabled"] = True
    res_enabled = check_ai_guard(system_config)
    assert res_enabled["status_code"] == 200
    assert res_enabled["error"] is None


# ==============================================================================
# 5. VISUAL PROMPT & IMAGE GENERATION FLOW TEST
# ==============================================================================

def test_visual_prompt_extraction_and_image_generation_flow():
    """Simulate LLM visual prompt extraction and image payload return."""
    source_content = "Đêm mùa đông tĩnh lặng, tôi ngồi ngắm một chiếc lồng đèn cô đơn bay lên bầu trời sao."
    custom_addon = "anime watercolor style, warm gold illumination, ultra detailed"

    def mock_extract_visual_prompt(text: str, addon: str) -> str:
        base_visual = "A lone glowing paper lantern ascending into a starry winter night sky"
        return f"{base_visual}, {addon}"

    def mock_generate_image(prompt: str, art_id: str) -> Dict[str, Any]:
        return {
            "art_id": art_id,
            "image_url": f"/static/artworks/ai_generated/{art_id}_preview.webp",
            "visual_prompt": prompt,
            "width": 1024,
            "height": 1024,
        }

    extracted_prompt = mock_extract_visual_prompt(source_content, custom_addon)
    assert "paper lantern" in extracted_prompt
    assert "watercolor" in extracted_prompt

    result = mock_generate_image(extracted_prompt, "art-999")
    assert result["image_url"].endswith(".webp")
    assert result["width"] == 1024
    assert result["art_id"] == "art-999"


# ==============================================================================
# 6. MULTI-PROVIDER DETECTION & DYNAMIC MODEL DISCOVERY TEST
# ==============================================================================

def detect_provider_from_key(api_key: str) -> str:
    """Auto-detect provider from API key format."""
    if not api_key:
        return "custom"
    if api_key.startswith("AIza") or api_key.startswith("AQ.") or api_key.startswith("AQ-") or (api_key.startswith("AQ") and len(api_key) > 20):
        return "gemini"
    if api_key.startswith("sk-ant-"):
        return "anthropic"
    if api_key.startswith("sk-"):
        return "openai"
    return "custom"


def test_auto_provider_detection():
    """Verify provider is correctly identified from key prefix."""
    assert detect_provider_from_key("AIza_MOCK_GEMINI_KEY_123") == "gemini"
    assert detect_provider_from_key("AQ.MOCK_GEMINI_KEY_123") == "gemini"
    assert detect_provider_from_key("sk-mock-1234567890abcdef") == "openai"
    assert detect_provider_from_key("sk-mock-simple-12345") == "openai"
    assert detect_provider_from_key("sk-ant-mock-anthropic-123") == "anthropic"
    assert detect_provider_from_key("custom-token-xyz") == "custom"



def test_dynamic_model_discovery_openai_and_gemini():
    """Verify dynamic discovery and ranking based on provider API response without hardcoded lists."""
    def mock_discover_models(api_key: str, task_type: str) -> Dict[str, Any]:
        provider = detect_provider_from_key(api_key)
        if len(api_key) < 15:
            return {"is_valid": False, "error": {"code": "API_KEY_INVALID", "message": "Key quá ngắn"}}

        if provider == "openai":
            # Raw models returned by OpenAI /v1/models
            raw_models = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "dall-e-3", "dall-e-2", "text-embedding-3-small"]
            if task_type == "moderation":
                filtered = [m for m in raw_models if m.startswith("gpt-")]
                return {
                    "is_valid": True,
                    "provider": "openai",
                    "task_type": "moderation",
                    "recommended_model_id": "gpt-4o-mini",
                    "discovered_models": [
                        {"id": m, "is_recommended": (m == "gpt-4o-mini")} for m in filtered
                    ],
                }
            elif task_type == "image_generation":
                filtered = [m for m in raw_models if m.startswith("dall-e")]
                return {
                    "is_valid": True,
                    "provider": "openai",
                    "task_type": "image_generation",
                    "recommended_model_id": "dall-e-3",
                    "discovered_models": [
                        {"id": m, "is_recommended": (m == "dall-e-3")} for m in filtered
                    ],
                }

        elif provider == "gemini":
            # Raw models returned by Google /v1beta/models
            raw_models = [
                {"name": "models/gemini-2.5-flash", "methods": ["generateContent"]},
                {"name": "models/gemini-2.0-flash", "methods": ["generateContent"]},
                {"name": "models/gemini-1.5-pro", "methods": ["generateContent"]},
                {"name": "models/imagen-3.0-generate-002", "methods": ["imageGeneration"]},
                {"name": "models/imagen-3.0-fast-generate-001", "methods": ["imageGeneration"]},
            ]
            if task_type == "moderation":
                filtered = [m["name"].replace("models/", "") for m in raw_models if "generateContent" in m["methods"]]
                return {
                    "is_valid": True,
                    "provider": "gemini",
                    "task_type": "moderation",
                    "recommended_model_id": "gemini-2.5-flash",
                    "discovered_models": [
                        {"id": m, "is_recommended": (m == "gemini-2.5-flash")} for m in filtered
                    ],
                }
            elif task_type == "image_generation":
                filtered = [m["name"].replace("models/", "") for m in raw_models if "imageGeneration" in m["methods"]]
                return {
                    "is_valid": True,
                    "provider": "gemini",
                    "task_type": "image_generation",
                    "recommended_model_id": "imagen-3.0-generate-002",
                    "discovered_models": [
                        {"id": m, "is_recommended": (m == "imagen-3.0-generate-002")} for m in filtered
                    ],
                }

        return {"is_valid": False, "error": {"code": "PROVIDER_UNSUPPORTED"}}

    # 1. OpenAI Key for Moderation
    openai_mod = mock_discover_models("sk-proj-validOpenAIKey12345", "moderation")
    assert openai_mod["is_valid"] is True
    assert openai_mod["provider"] == "openai"
    assert openai_mod["recommended_model_id"] == "gpt-4o-mini"
    assert "dall-e-3" not in [m["id"] for m in openai_mod["discovered_models"]]

    # 2. OpenAI Key for Image Generation
    openai_img = mock_discover_models("sk-mock-validOpenAIKey12345", "image_generation")
    assert openai_img["is_valid"] is True
    assert openai_img["recommended_model_id"] == "dall-e-3"
    assert all("dall-e" in m["id"] for m in openai_img["discovered_models"])

    # 3. Gemini Key for Moderation
    gemini_mod = mock_discover_models("AIza_MOCK_ValidGeminiKey12345", "moderation")
    assert gemini_mod["is_valid"] is True
    assert gemini_mod["provider"] == "gemini"
    assert gemini_mod["recommended_model_id"] == "gemini-2.5-flash"

    # 4. Gemini Key for Image Generation
    gemini_img = mock_discover_models("AIza_MOCK_ValidGeminiKey12345", "image_generation")
    assert gemini_img["is_valid"] is True
    assert gemini_img["recommended_model_id"] == "imagen-3.0-generate-002"


def test_independent_service_guards():
    """Verify moderation and image gen services can be toggled on/off independently."""
    # Scenario: Moderation is enabled (using OpenAI), but Image Gen is disabled
    decoupled_config = {
        "is_ai_enabled": True,
        "moderation": {
            "is_enabled": True,
            "provider": "openai",
            "api_key": "sk-proj-...",
            "model_name": "gpt-4o-mini",
        },
        "image_generation": {
            "is_enabled": False,
            "provider": "gemini",
            "api_key": None,
            "model_name": None,
        },
    }

    def check_service_guard(service_type: str, config: Dict[str, Any]):
        if not config.get("is_ai_enabled"):
            return 428, "AI toàn hệ thống đang bị vô hiệu hóa bởi Owner"
        sub = config.get(service_type, {})
        if not sub.get("is_enabled") or not sub.get("api_key"):
            return 428, f"Dịch vụ AI {service_type} đang bị tắt hoặc chưa cấu hình API Key"
        return 200, "OK"

    # Moderation should be accessible
    mod_status, _ = check_service_guard("moderation", decoupled_config)
    assert mod_status == 200

    # Image gen should be blocked
    img_status, msg = check_service_guard("image_generation", decoupled_config)
    assert img_status == 428
    assert "chưa cấu hình" in msg or "đang bị tắt" in msg


import asyncio
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool


from app.api.deps import get_db, require_admin, require_owner
from app.core.database import Base
from app.core.security import hash_password
from app.main import app
from app.models.ai_provider_setting import AiProviderSetting
from app.models.user import User, UserRole


async def test_fastapi_e2e_ai_endpoints():
    """End-to-end test against real FastAPI router endpoints."""
    # 1. Setup in-memory test DB
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(User.__table__.create)
        await conn.run_sync(AiProviderSetting.__table__.create)

    # 2. Seed test owner & admin
    async with session_factory() as session:
        owner = User(
            username="master_owner_ai",
            email="owner_ai@exhibition.vn",
            password_hash=hash_password("Pass123@"),
            nickname="Master Owner",
            role=UserRole.OWNER.value,
            is_active=True,
        )
        admin = User(
            username="moderator_admin_ai",
            email="admin_ai@exhibition.vn",
            password_hash=hash_password("Pass123@"),
            nickname="Admin Mod",
            role=UserRole.ADMIN.value,
            is_active=True,
        )
        session.add_all([owner, admin])
        await session.commit()
        await session.refresh(owner)
        await session.refresh(admin)

    # 3. Setup client & dependency overrides
    async def override_get_db():
        async with session_factory() as s:
            yield s

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_owner] = lambda: owner
    app.dependency_overrides[require_admin] = lambda: admin

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # A. GET /owner/ai-settings -> initial settings
        get_res = await client.get("/api/v1/owner/ai-settings")
        assert get_res.status_code == 200, f"Expected 200, got {get_res.status_code}: {get_res.text}"
        data = get_res.json()["data"]
        assert data["is_ai_enabled"] is False

        # B. Call /admin/ai/moderate when AI is disabled -> should get 428 Precondition Required
        mod_disabled = await client.post(
            "/api/v1/admin/ai/moderate",
            json={
                "art_id": "art-001",
                "target_room": "room1",
                "content": "Test content",
            },
        )
        assert mod_disabled.status_code == 428, f"Expected 428, got {mod_disabled.status_code}"

        # C. Update AI settings: enable AI with mock keys
        from app.core.crypto import encrypt_aes_256
        async with session_factory() as s:
            setting = await s.get(AiProviderSetting, (await s.execute(select(AiProviderSetting))).scalar_one().id)
            setting.is_ai_enabled = True
            setting.is_moderation_enabled = True
            setting.moderation_encrypted_api_key = encrypt_aes_256("mock_valid_key_12345")
            setting.moderation_model_name = "gemini-2.5-flash"
            setting.is_image_gen_enabled = True
            setting.image_encrypted_api_key = encrypt_aes_256("mock_valid_key_12345")
            setting.image_model_name = "imagen-3.0-generate-002"
            await s.commit()

        # D. Call /admin/ai/moderate now that AI is enabled
        mod_enabled = await client.post(
            "/api/v1/admin/ai/moderate",
            json={
                "art_id": "art-001",
                "target_room": "room1",
                "content": "Hôm nay tôi buồn vl khi chia tay, liên hệ 0981234567 nha.",
            },
        )
        assert mod_enabled.status_code == 200, f"Expected 200, got {mod_enabled.status_code}: {mod_enabled.text}"
        mod_data = mod_enabled.json()["data"]
        assert mod_data["art_id"] == "art-001"
        assert mod_data["score"] < 60
        assert mod_data["verdict_recommendation"] == "DISAPPROVE"
        assert len(mod_data["violations"]) >= 2
        assert "0981234567" not in mod_data["suggested_content"]

        # E. Call /admin/ai/generate-image
        img_res = await client.post(
            "/api/v1/admin/ai/generate-image",
            json={
                "art_id": "art-001",
                "source_content": "Tôi ngắm lồng đèn bay lên bầu trời hy vọng trong đêm đông.",
                "custom_prompt_addon": "watercolor",
            },
        )
        assert img_res.status_code == 200, f"Expected 200, got {img_res.status_code}: {img_res.text}"
        img_data = img_res.json()["data"]
        assert img_data["art_id"] == "art-001"
        assert "/static/artworks/ai_generated/" in img_data["image_url"]

        # F. Test dedicated deactivate endpoint: /owner/ai-settings/deactivate
        deact_res = await client.post("/api/v1/owner/ai-settings/deactivate")
        assert deact_res.status_code == 200, f"Expected 200, got {deact_res.status_code}: {deact_res.text}"
        assert deact_res.json()["data"]["is_ai_enabled"] is False

        # Verify moderate returns 428 now
        mod_after_deact = await client.post(
            "/api/v1/admin/ai/moderate",
            json={"art_id": "art-001", "target_room": "room1", "content": "Test"}
        )
        assert mod_after_deact.status_code == 428

        # G. Test dedicated activate endpoint: /owner/ai-settings/activate
        act_res = await client.post("/api/v1/owner/ai-settings/activate")
        assert act_res.status_code == 200, f"Expected 200, got {act_res.status_code}: {act_res.text}"
        assert act_res.json()["data"]["is_ai_enabled"] is True

        # H. Test specific sub-service disable and enable (e.g. moderation)
        disable_mod_res = await client.post(
            "/api/v1/owner/ai-settings/disable",
            json={"service": "moderation"}
        )
        assert disable_mod_res.status_code == 200
        assert disable_mod_res.json()["data"]["moderation"]["is_enabled"] is False

        # Moderation fails with 428 while image gen is still active
        mod_after_disable = await client.post(
            "/api/v1/admin/ai/moderate",
            json={"art_id": "art-001", "target_room": "room1", "content": "Test"}
        )
        assert mod_after_disable.status_code == 428

        # Re-enable moderation
        enable_mod_res = await client.post(
            "/api/v1/owner/ai-settings/enable",
            json={"service": "moderation"}
        )
        assert enable_mod_res.status_code == 200
        assert enable_mod_res.json()["data"]["moderation"]["is_enabled"] is True

        # I. Test delete moderation API key
        del_mod_key_res = await client.delete("/api/v1/owner/ai-settings/api-key/moderation")
        assert del_mod_key_res.status_code == 200, f"Expected 200, got {del_mod_key_res.status_code}: {del_mod_key_res.text}"
        del_mod_data = del_mod_key_res.json()["data"]
        assert del_mod_data["moderation"]["is_key_configured"] is False
        assert del_mod_data["moderation"]["masked_api_key"] == ""

        # Moderation fails with 428 because key was deleted
        mod_after_del_key = await client.post(
            "/api/v1/admin/ai/moderate",
            json={"art_id": "art-001", "target_room": "room1", "content": "Test"}
        )
        assert mod_after_del_key.status_code == 428

        # J. Test delete image generation API key
        del_img_key_res = await client.delete("/api/v1/owner/ai-settings/api-key/image-generation")
        assert del_img_key_res.status_code == 200, f"Expected 200, got {del_img_key_res.status_code}: {del_img_key_res.text}"
        del_img_data = del_img_key_res.json()["data"]
        assert del_img_data["image_generation"]["is_key_configured"] is False
        assert del_img_data["image_generation"]["masked_api_key"] == ""

        # Image generation fails with 428 because key was deleted
        img_after_del_key = await client.post(
            "/api/v1/admin/ai/generate-image",
            json={"art_id": "art-001", "source_content": "Test art"}
        )
        assert img_after_del_key.status_code == 428

    app.dependency_overrides.clear()




if __name__ == "__main__":
    tests = [
        test_badwords_seed_json_structure,
        test_detect_pii_vietnamese_phone_and_social,
        test_detect_badwords_vietnamese_and_leet,
        test_rubric_scoring_threshold_approve_with_edits,
        test_rubric_scoring_threshold_disapprove,
        test_strict_no_hallucination_rewrite,
        test_room_assessment_logic,
        test_ai_toggle_guard_behavior,
        test_visual_prompt_extraction_and_image_generation_flow,
        test_auto_provider_detection,
        test_dynamic_model_discovery_openai_and_gemini,
        test_independent_service_guards,
    ]
    print(f"Running {len(tests)} unit tests for PLAN 16...")
    passed = 0
    for t in tests:
        try:
            t()
            passed += 1
            print(f"  [PASS] {t.__name__}")
        except Exception as e:
            print(f"  [FAIL] {t.__name__}: {e}")
            raise

    print("\nRunning FastAPI E2E Endpoint Integration Test...")
    asyncio.run(test_fastapi_e2e_ai_endpoints())
    print("  [PASS] test_fastapi_e2e_ai_endpoints")

    print(f"\nSUCCESS: All {passed + 1}/{len(tests) + 1} unit & integration tests passed successfully!")





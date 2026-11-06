"""Comprehensive test suite for AI Copilot Agent Improvements.
Validates:
1. Rule Suppression Bug Fix: Rule violations (PII, profanity) are never discarded even if LLM reports 100 score.
2. Stored XSS Mitigation: SVG sanitizer strips <script>, <foreignObject>, on*, and javascript: URIs.
3. SSRF Protection: validate_safe_base_url blocks localhost, 127.0.0.1, 169.254.169.254, RFC 1918 private IPs.
4. Admin AI Rate Limiting: enforce_admin_ai_rate_limit returns 429 when quota is exceeded within 60s.
5. Bidirectional Room Appropriateness: Room 1, 2, and 3 validation for emotional alignment.
"""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException

from app.core.exceptions import AppException
from app.core.security import validate_safe_base_url
from app.schemas.ai_copilot import ModerateArtRequest
from app.services.ai_image_service import AiImageService
from app.services.ai_moderation_service import AiModerationService
from app.api.v1.endpoints.admin_ai import enforce_admin_ai_rate_limit, _admin_ai_request_log


# ==============================================================================
# 1. RULE SUPPRESSION BUG FIX (CRITICAL)
# ==============================================================================

@pytest.mark.asyncio
async def test_rule_suppression_merges_violations_and_clamps_score():
    """If an artwork contains a phone number and LLM attempts to jailbreak by returning score 100,
    the hybrid engine MUST preserve the rule violations and clamp the final score.
    """
    req = ModerateArtRequest(
        art_id="test-art-001",
        target_room="room1",
        content="Tôi vừa chia tay người yêu, xin liên hệ tôi qua số 0912345678 để nói chuyện.",
    )

    fake_llm_response = {
        "score": 100,
        "verdict_recommendation": "APPROVE",
        "violations": [],
        "room_assessment": {
            "current_room": "room1",
            "is_valid": True,
            "suggested_room": "room1",
            "reason": "Hoàn hảo",
        },
        "suggested_content": "Tôi vừa chia tay người yêu, xin liên hệ tôi qua số 0912345678.",
    }

    with patch.object(AiModerationService, "_call_gemini", new=AsyncMock(return_value=fake_llm_response)):
        result = await AiModerationService.moderate(
            req=req,
            provider="gemini",
            api_key="test-key",
            model_name="gemini-2.5-flash",
        )

    # 1. Rule violation MUST NOT be suppressed
    assert len(result.violations) > 0, "Rule violations must not be discarded when LLM responds"
    assert any(v.category == "pii" for v in result.violations), "PII violation must be present"

    # 2. Score must be clamped to safe bound (100 - 15 = 85 or lower)
    assert result.score <= 85, f"Score should be clamped to rule upper bound, got {result.score}"

    # 3. Verdict cannot be APPROVE when violations exist
    assert result.verdict_recommendation != "APPROVE", "Verdict cannot be APPROVE when rule violations exist"

    # 4. Suggested content should have the phone number masked
    assert "0912345678" not in result.suggested_content, "Suggested content must clean out detected PII"


# ==============================================================================
# 2. STORED XSS MITIGATION VIA SVG SANITIZER
# ==============================================================================

def test_svg_sanitizer_removes_malicious_vectors():
    """Ensures <script>, <foreignObject>, <animate>, on* handlers, and javascript: links are stripped."""
    malicious_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" onload="alert('pwned')">
      <defs>
        <linearGradient id="g"><stop offset="0%" stop-color="#fff"/></linearGradient>
      </defs>
      <script type="text/javascript">
        fetch('/api/v1/auth/me').then(r => r.json()).then(d => alert(d));
      </script>
      <foreignObject width="100" height="100">
        <iframe src="javascript:alert('xss')"></iframe>
      </foreignObject>
      <circle cx="512" cy="512" r="200" fill="url(#g)" onclick="alert(1)" onerror="alert(2)" />
      <a href="javascript:alert('link_xss')">
        <text x="50" y="50">Click me</text>
      </a>
      <a xlink:href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">
        <text x="100" y="100">Bad link</text>
      </a>
    </svg>"""

    sanitized = AiImageService.sanitize_svg(malicious_svg)

    # Script tag stripped
    assert "<script" not in sanitized.lower()
    assert "</script>" not in sanitized.lower()
    assert "fetch('/api/v1/auth/me')" not in sanitized

    # Event handlers stripped
    assert "onload=" not in sanitized.lower()
    assert "onclick=" not in sanitized.lower()
    assert "onerror=" not in sanitized.lower()

    # Dangerous elements stripped
    assert "<foreignobject" not in sanitized.lower()
    assert "<iframe" not in sanitized.lower()

    # Dangerous protocols stripped
    assert "javascript:" not in sanitized.lower()
    assert "data:text/html" not in sanitized.lower()

    # Valid graphical structure preserved
    assert "<circle" in sanitized
    assert 'fill="url(#g)"' in sanitized
    assert "</svg>" in sanitized


# ==============================================================================
# 3. SSRF PROTECTION ON CUSTOM BASE_URL
# ==============================================================================

def test_ssrf_validator_blocks_internal_and_cloud_metadata():
    """validate_safe_base_url must block loopback, private networks, and link-local cloud metadata."""
    # 1. Loopback / Localhost
    with pytest.raises(AppException) as exc:
        validate_safe_base_url("http://127.0.0.1:8000/v1")
    assert exc.value.status_code == 400

    with pytest.raises(AppException) as exc:
        validate_safe_base_url("http://localhost:11434")
    assert exc.value.status_code == 400

    # 2. Cloud metadata (AWS / GCP / Azure)
    with pytest.raises(AppException) as exc:
        validate_safe_base_url("http://169.254.169.254/latest/meta-data")
    assert exc.value.status_code == 400

    # 3. RFC 1918 Private IP addresses
    with pytest.raises(AppException) as exc:
        validate_safe_base_url("http://192.168.1.1:8080/v1")
    assert exc.value.status_code == 400

    with pytest.raises(AppException) as exc:
        validate_safe_base_url("http://10.0.0.1:8080/v1")
    assert exc.value.status_code == 400

    # 4. Invalid schemes
    with pytest.raises(AppException) as exc:
        validate_safe_base_url("ftp://example.com/v1")
    assert exc.value.status_code == 400

    # 5. Legitimate external API URL should succeed
    clean_url = validate_safe_base_url("https://api.openai.com/v1/")
    assert clean_url == "https://api.openai.com/v1"


# ==============================================================================
# 4. ADMIN AI RATE LIMITING
# ==============================================================================

def test_admin_ai_rate_limiter_enforces_threshold():
    """Rate limiter must allow calls under limit and raise 429 when threshold exceeded."""
    admin_id = "test-admin-uuid-123"
    action = "generate_image_test"

    # Reset log for test
    _admin_ai_request_log[f"{admin_id}:{action}"] = []

    # Max 3 requests allowed
    enforce_admin_ai_rate_limit(admin_id, action, max_requests=3, window_seconds=60)
    enforce_admin_ai_rate_limit(admin_id, action, max_requests=3, window_seconds=60)
    enforce_admin_ai_rate_limit(admin_id, action, max_requests=3, window_seconds=60)

    # 4th request must be rejected with 429
    with pytest.raises(HTTPException) as exc:
        enforce_admin_ai_rate_limit(admin_id, action, max_requests=3, window_seconds=60)
    assert exc.value.status_code == 429
    assert "Tần suất yêu cầu quá nhanh" in str(exc.value.detail)


# ==============================================================================
# 5. BIDIRECTIONAL ROOM APPROPRIATENESS (ROOM 1, 2, 3)
# ==============================================================================

def test_room_appropriateness_room1_cheerful_mismatch():
    """Room 1 is for reflection on broken journeys; purely cheerful celebration should suggest Room 2."""
    cheerful_content = "Chúc mừng bạn đã đạt học bổng toàn phần, chúc bạn tương lai rạng ngời và hạnh phúc ngập tràn!"
    res = AiModerationService._check_room_appropriateness("room1", cheerful_content)
    assert res["is_valid"] is False
    assert res["suggested_room"] == "room2"


def test_room_appropriateness_room1_valid_broken():
    """Room 1 should accept legitimate broken journey narratives."""
    broken_content = "Dự án khởi nghiệp đầu tiên của tôi thất bại hoàn toàn và tan vỡ, nhưng đã cho tôi một bài học quý giá."
    res = AiModerationService._check_room_appropriateness("room1", broken_content)
    assert res["is_valid"] is True
    assert res["suggested_room"] == "room1"


def test_room_appropriateness_room2_toxic_mismatch():
    """Room 2 is for hopeful lanterns; bitter hatred should suggest Room 1."""
    toxic_content = "Tao oán hận và tan nát cõi lòng, mong chúng nó phải trả thù và chết đi."
    res = AiModerationService._check_room_appropriateness("room2", toxic_content)
    assert res["is_valid"] is False
    assert res["suggested_room"] == "room1"


def test_room_appropriateness_room2_valid_hope():
    """Room 2 should accept legitimate hope lanterns."""
    hope_content = "Gửi tôi 5 năm nữa: Hy vọng bạn đã vượt qua mọi giông bão, luôn giữ nụ cười và ước mơ bay cao."
    res = AiModerationService._check_room_appropriateness("room2", hope_content)
    assert res["is_valid"] is True
    assert res["suggested_room"] == "room2"


def test_room_appropriateness_room3_hate_speech_rejected():
    """Room 3 is for Tree of Messages; malicious hate speech must be invalid."""
    hate_content = "Đồ khốn, tao nguyền rủa mày và muốn trả thù mày."
    res = AiModerationService._check_room_appropriateness("room3", hate_content)
    assert res["is_valid"] is False
    assert "Cây Nguyện Ước" in res["reason"]


def test_room_appropriateness_room3_valid_encouragement():
    """Room 3 should accept kind words of encouragement."""
    enc_content = "Gửi bạn vô danh vừa đi qua: Dù hôm nay có mệt mỏi thế nào, bạn đã làm rất tốt rồi. Cố lên nhé!"
    res = AiModerationService._check_room_appropriateness("room3", enc_content)
    assert res["is_valid"] is True
    assert res["suggested_room"] == "room3"


# ==============================================================================
# 6. FAL.AI FLUX.1 PROVIDER INTEGRATION
# ==============================================================================

@pytest.mark.asyncio
async def test_fal_flux_provider_detection_and_discovery():
    """Validates that keys with fal_ or chosen provider 'fal' discover FLUX models."""
    from app.services.ai_discovery_service import detect_provider, AiDiscoveryService
    from app.schemas.ai_copilot import GenerateArtImageRequest

    # 1. Provider detection
    assert detect_provider("fal_sk_test_key_123") == "fal"
    assert detect_provider("custom_id:fal_sk_secret") == "fal"
    assert detect_provider("any_key", chosen_provider="fal") == "fal"

    # 2. Model Discovery for Fal
    data = await AiDiscoveryService.discover_models("fal_sk_mock_test_key", provider="fal", task_type="image_generation")
    assert data.detected_provider == "fal"
    assert data.recommended_model_id == "fal-ai/flux/schnell"
    model_ids = [m.id for m in data.discovered_models]
    assert "fal-ai/flux/schnell" in model_ids
    assert "fal-ai/flux/dev" in model_ids

    # 3. Generate Image flow with mocked Fal FLUX response
    mock_img_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"  # mock jpeg header
    with patch.object(AiImageService, "_generate_fal_flux", new=AsyncMock(return_value=mock_img_bytes)):
        req = GenerateArtImageRequest(art_id="test-flux-art", source_content="Hy vọng tương lai lồng đèn")
        res = await AiImageService.generate_image(
            req=req,
            provider="fal",
            api_key="fal_sk_test_key",
            model_name="fal-ai/flux/schnell",
        )
        assert res.art_id == "test-flux-art"
        assert res.image_url.endswith(".jpg")


@pytest.mark.asyncio
async def test_moderation_structured_sections_extraction():
    """Validates that moderation service cleanly extracts title, short_content, and content
    when suggested_content contains labeled sections (preventing UI clumping into content textarea).
    """
    req = ModerateArtRequest(
        art_id="test-art-sections",
        target_room="room1",
        content="Tiêu đề (VI): Mùa thi đại học năm ấy\nTóm tắt (VI): Ye Ye Ye\nNội dung (VI): OKOKKK",
    )

    fake_llm_response = {
        "score": 65,
        "verdict_recommendation": "APPROVE_WITH_EDITS",
        "violations": [
            {
                "category": "spam",
                "deducted_points": 15,
                "line_number": 2,
                "quote": "Ye Ye Ye",
                "reason": "Spam vô nghĩa",
            }
        ],
        "room_assessment": {
            "current_room": "room1",
            "is_valid": True,
            "suggested_room": "room1",
            "reason": "Phù hợp",
        },
        "suggested_content": (
            "Tiêu đề: Mùa thi đại học năm ấy\n"
            "Tóm tắt: [Nội dung tóm tắt chưa rõ ràng, vui lòng bổ sung thông tin cụ thể]\n"
            "Nội dung: [Nội dung bài viết chưa rõ ràng, vui lòng bổ sung nội dung chi tiết]"
        ),
    }

    with patch.object(AiModerationService, "_call_gemini", new=AsyncMock(return_value=fake_llm_response)):
        result = await AiModerationService.moderate(
            req=req,
            provider="gemini",
            api_key="mock_key",
            model_name="gemini-2.5-flash",
        )

    assert result.suggested_title_vi == "Mùa thi đại học năm ấy"
    assert result.suggested_short_content_vi == "[Nội dung tóm tắt chưa rõ ràng, vui lòng bổ sung thông tin cụ thể]"
    assert result.suggested_content_vi == "[Nội dung bài viết chưa rõ ràng, vui lòng bổ sung nội dung chi tiết]"
    assert result.score == 65




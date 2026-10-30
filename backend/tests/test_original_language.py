"""Nội dung người dùng giữ ngôn ngữ gốc; bản dịch là tuỳ chọn do admin thêm khi duyệt."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.language import detect_language
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.admin_audit_log import AdminAuditLog
from app.models.ai_provider_setting import AiProviderSetting
from app.models.artwork import Artwork
from app.models.artwork_interaction import ArtworkInteraction
from app.models.diary import Diary
from app.models.diary_interaction import DiaryInteraction
from app.models.notification import Notification
from app.models.revoked_token import RevokedToken
from app.models.room import Room
from app.models.user import User, UserRole
from app.schemas.ai_copilot import TranslateContentRequest
from app.services.ai_translation_service import AiTranslationService

TABLES = [User, RevokedToken, Room, Artwork, ArtworkInteraction, Diary, DiaryInteraction,
          Notification, AdminAuditLog, AiProviderSetting]


@pytest.mark.parametrize("text,expected", [
    ("Hôm nay mình buồn quá", "vi"),
    ("toi buon qua khong biet lam sao", "vi"),
    ("I failed my exam today and I feel lost", "en"),
    ("Listening to the gentle raindrops wash away the worries.", "en"),
])
def test_detect_language(text, expected):
    assert detect_language(text) == expected


def test_detect_language_uses_fallback_when_unsure():
    assert detect_language("OK", fallback="en") == "en"
    assert detect_language("", fallback="vi") == "vi"


@pytest.fixture
async def api():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False},
                                 poolclass=StaticPool)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        for m in TABLES:
            await conn.run_sync(m.__table__.create)

    async with session_factory() as s:
        s.add_all([Room(id=i, room_code=c, title=c) for i, c in [(1, "BROKEN"), (2, "HOPE"), (3, "COMMUNITY")]])
        admin = User(username="admin_lang", email="admin.lang@example.com", password_hash=hash_password("Pass123@"),
                     nickname="Admin", role=UserRole.ADMIN.value, is_active=True)
        user = User(username="user_lang", email="user.lang@example.com", password_hash=hash_password("Pass123@"),
                    nickname="Writer", role=UserRole.USER.value, is_active=True)
        s.add_all([admin, user])
        await s.commit()
        await s.refresh(admin)
        await s.refresh(user)

    async def override_get_db():
        async with session_factory() as s:
            try:
                yield s
                await s.commit()
            except Exception:
                await s.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield {
            "client": client,
            "admin": {"Authorization": f"Bearer {create_access_token(admin.id, admin.role)}"},
            "user": {"Authorization": f"Bearer {create_access_token(user.id, user.role)}"},
        }
    app.dependency_overrides.clear()
    await engine.dispose()


async def test_english_artwork_detected_even_if_client_sends_vi(api):
    c = api["client"]
    res = await c.post("/api/v1/rooms/1/artworks", headers=api["user"], json={
        "original_language": "vi",
        "title": "The night I gave up",
        "content": "I failed my driving test for the third time and I wanted to quit everything.",
        "is_anonymous": False,
    })
    assert res.status_code == 201, res.text
    data = res.json()["data"]
    assert data["original_language"] == "en"

    detail = (await c.get(f"/api/v1/admin/rooms/1/artworks/pending", headers=api["admin"])).json()["data"]
    item = next(i for i in detail["items"] if i["id"] == data["id"])
    assert item["title_en"] == "The night I gave up"
    assert item["title_vi"] is None


async def test_approve_without_translation_keeps_original(api):
    c = api["client"]
    created = await c.post("/api/v1/rooms/1/artworks", headers=api["user"], json={
        "title": "The night I gave up",
        "content": "I failed my driving test for the third time and I wanted to quit everything.",
        "is_anonymous": False,
    })
    art_id = created.json()["data"]["id"]

    approve = await c.post(f"/api/v1/admin/rooms/1/artworks/{art_id}/approve", headers=api["admin"], json={
        "media_url": "https://example.com/art.png",
        "title_en": "The night I gave up",
        "content_en": "I failed my driving test for the third time and I wanted to quit everything.",
    })
    assert approve.status_code == 200, approve.text

    pub = (await c.get(f"/api/v1/rooms/1/artworks/{art_id}")).json()["data"]
    assert pub["title"] == "The night I gave up"
    assert pub["title_vi"] is None


async def test_adding_translation_does_not_overwrite_english_original(api):
    c = api["client"]
    created = await c.post("/api/v1/rooms/1/artworks", headers=api["user"], json={
        "title": "The night I gave up",
        "content": "I failed my driving test for the third time and I wanted to quit everything.",
        "is_anonymous": False,
    })
    art_id = created.json()["data"]["id"]

    approve = await c.post(f"/api/v1/admin/rooms/1/artworks/{art_id}/approve", headers=api["admin"], json={
        "media_url": "https://example.com/art.png",
        "title_vi": "Đêm tôi muốn bỏ cuộc",
        "content_vi": "Tôi trượt bài thi lái xe lần thứ ba.",
        "title_en": "The night I gave up",
        "content_en": "I failed my driving test for the third time and I wanted to quit everything.",
    })
    assert approve.status_code == 200, approve.text

    pub = (await c.get(f"/api/v1/rooms/1/artworks/{art_id}")).json()["data"]
    assert pub["original_language"] == "en"
    assert pub["title"] == "The night I gave up"
    assert pub["title_vi"] == "Đêm tôi muốn bỏ cuộc"


async def test_diary_edit_replaces_original_and_drops_stale_translation(api):
    c = api["client"]
    created = await c.post("/api/v1/diaries", headers=api["user"], json={
        "title": "Một ngày mệt", "content": "Hôm nay mình mệt quá nhưng vẫn cố gắng.", "is_public": False,
    })
    diary_id = created.json()["data"]["id"]
    assert created.json()["data"]["original_language"] == "vi"

    updated = await c.put(f"/api/v1/diaries/me/{diary_id}", headers=api["user"], json={
        "content": "Hôm nay mình đã nghỉ ngơi và thấy khá hơn.",
    })
    assert updated.status_code == 200, updated.text

    detail = (await c.get(f"/api/v1/diaries/me/{diary_id}", headers=api["user"])).json()["data"]
    assert detail["content_vi"] == "Hôm nay mình đã nghỉ ngơi và thấy khá hơn."
    assert detail["content_en"] is None


async def test_translate_endpoint_requires_ai_enabled(api):
    res = await api["client"].post("/api/v1/admin/ai/translate", headers=api["admin"], json={
        "source_lang": "vi", "target_lang": "en", "title": "Một ngày mệt",
    })
    assert res.status_code == 428, res.text


async def test_translation_service_returns_only_requested_fields(monkeypatch):
    async def fake_gemini(cls, system, user_text, api_key, model_name):
        assert "Vietnamese" in system and "English" in system
        return {"title": "A tiring day", "short_content": "ignored", "content": "I am tired."}, "fake-model"

    monkeypatch.setattr(AiTranslationService, "_call_gemini", classmethod(fake_gemini))
    result = await AiTranslationService.translate(
        TranslateContentRequest(source_lang="vi", target_lang="en", title="Một ngày mệt", content="Mình mệt."),
        provider="gemini", api_key="k", model_name="m",
    )
    assert result.title == "A tiring day"
    assert result.content == "I am tired."
    assert result.short_content is None
    assert result.model_used == "fake-model"

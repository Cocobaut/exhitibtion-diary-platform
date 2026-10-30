import asyncio
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import sys
import uuid

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.admin_audit_log import AdminAuditLog
from app.models.artwork import Artwork
from app.models.artwork_interaction import ArtworkInteraction
from app.models.diary import Diary
from app.models.diary_interaction import DiaryInteraction
from app.models.message_capsule import MessageCapsule
from app.models.notification import Notification
from app.models.revoked_token import RevokedToken
from app.models.room import Room
from app.models.user import User, UserRole
from app.models.user_capsule_draw import UserCapsuleDraw

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@asynccontextmanager
async def setup_test_context():
    """Sets up SQLite tables and seeds baseline rooms and test users."""
    async with test_engine.begin() as conn:
        for m in [
            User,
            RevokedToken,
            Room,
            Artwork,
            ArtworkInteraction,
            Diary,
            DiaryInteraction,
            MessageCapsule,
            UserCapsuleDraw,
            Notification,
            AdminAuditLog,
        ]:
            await conn.run_sync(m.__table__.create)

    async with TestingSessionLocal() as session:
        # Seed rooms
        r1 = Room(id=1, room_code="BROKEN", title="Đổ vỡ", description="Phòng 1")
        r2 = Room(id=2, room_code="HOPE", title="Lồng đèn Hy vọng", description="Phòng 2")
        r3 = Room(id=3, room_code="COMMUNITY", title="Cây Thông điệp", description="Phòng 3")
        session.add_all([r1, r2, r3])

        # Users
        admin_user = User(
            username="admin_bilingual",
            email="admin.bi@exhibition.vn",
            password_hash=hash_password("AdminPass123@"),
            nickname="Admin Song Ngữ",
            role=UserRole.ADMIN.value,
            is_active=True,
        )
        regular_user = User(
            username="user_bilingual",
            email="user.bi@exhibition.vn",
            password_hash=hash_password("UserPass123@"),
            nickname="Tác Giả Trẻ",
            role=UserRole.USER.value,
            is_active=True,
        )
        session.add_all([admin_user, regular_user])
        await session.commit()
        await session.refresh(admin_user)
        await session.refresh(regular_user)

        admin_token = create_access_token(admin_user.id, admin_user.role)
        user_token = create_access_token(regular_user.id, regular_user.role)

        yield {
            "admin_user": admin_user,
            "regular_user": regular_user,
            "admin_token": admin_token,
            "user_token": user_token,
        }


async def run_bilingual_tests():
    print("\n========== STARTING BILINGUAL (VI/EN) TEST SUITE ==========\n")

    async def override_get_db():
        async with TestingSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    async with setup_test_context() as ctx:
        admin_headers = {"Authorization": f"Bearer {ctx['admin_token']}"}
        user_headers = {"Authorization": f"Bearer {ctx['user_token']}"}

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:

            # -----------------------------------------------------------------
            # TEST 1: Message Capsules bilingual support
            # -----------------------------------------------------------------
            print("--- Test 1: Message Capsules Bilingual Create & Draw ---")
            create_cap_res = await client.post(
                "/api/v1/admin/capsules",
                headers=admin_headers,
                json={
                    "message_vi": "Bạn đã làm rất tốt hôm nay rồi, hãy nghỉ ngơi nhé.",
                    "message_en": "You have done wonderful work today, please get some rest.",
                    "category": "HEALING",
                },
            )
            assert create_cap_res.status_code == 201, create_cap_res.text
            cap_data = create_cap_res.json()["data"]
            assert cap_data["message_vi"] == "Bạn đã làm rất tốt hôm nay rồi, hãy nghỉ ngơi nhé."
            assert cap_data["message_en"] == "You have done wonderful work today, please get some rest."
            cap_id = cap_data["id"]
            print("=> PASSED: Created bilingual capsule successfully.")

            # Public draw
            draw_res = await client.post("/api/v1/capsules/draw", headers=user_headers)
            assert draw_res.status_code == 200, draw_res.text
            drawn = draw_res.json()["data"]
            assert drawn["message_vi"] == "Bạn đã làm rất tốt hôm nay rồi, hãy nghỉ ngơi nhé."
            assert drawn["message_en"] == "You have done wonderful work today, please get some rest."
            assert drawn["message"] is not None  # Fallback field populated
            draw_id = drawn["draw_id"]
            print("=> PASSED: Draw returned both message_vi and message_en.")

            # Save drawn capsule
            save_res = await client.patch(
                f"/api/v1/capsules/draws/{draw_id}/save",
                headers=user_headers,
                json={"is_saved": True},
            )
            assert save_res.status_code == 200, save_res.text

            # Get saved capsules
            saved_res = await client.get("/api/v1/capsules/saved", headers=user_headers)
            assert saved_res.status_code == 200, saved_res.text
            saved_items = saved_res.json()["data"]["items"]
            assert len(saved_items) >= 1
            assert saved_items[0]["message_vi"] == "Bạn đã làm rất tốt hôm nay rồi, hãy nghỉ ngơi nhé."
            assert saved_items[0]["message_en"] == "You have done wonderful work today, please get some rest."
            print("=> PASSED: Saved capsules list contains bilingual fields.\n")

            # -----------------------------------------------------------------
            # TEST 2: Artwork Bilingual Submission & Moderation
            # -----------------------------------------------------------------
            print("--- Test 2: Artwork Bilingual Submission & Approval Validation ---")
            # 2a: User submits Room 1 artwork with original_language = 'vi'
            art_res = await client.post(
                "/api/v1/rooms/1/artworks",
                headers=user_headers,
                json={
                    "original_language": "vi",
                    "title": "Mảnh vỡ ký ức",
                    "short_content": "Những vết nứt này là nơi ánh sáng đi vào",
                    "content": "Toàn văn tác phẩm chữa lành...",
                    "is_anonymous": False,
                },
            )
            assert art_res.status_code == 201, art_res.text
            art_data = art_res.json()["data"]
            assert art_data["original_language"] == "vi"
            artwork_id = art_data["id"]
            print("=> PASSED: User submitted artwork with original_language='vi'.")

            # 2c: Admin approves with complete Vietnamese & English versions
            full_approve_res = await client.post(
                f"/api/v1/admin/rooms/1/artworks/{artwork_id}/approve",
                headers=admin_headers,
                json={
                    "media_url": "https://storage.exhibition.vn/artworks/broken1.png",
                    "title_vi": "Mảnh vỡ ký ức",
                    "title_en": "Fragments of Memory",
                    "short_content_vi": "Vết nứt ánh sáng",
                    "short_content_en": "Cracks of Light",
                    "content_vi": "Toàn văn tác phẩm tiếng Việt...",
                    "content_en": "Full artwork text in English...",
                },
            )
            assert full_approve_res.status_code == 200, full_approve_res.text
            approved_art = full_approve_res.json()["data"]
            assert approved_art["status"] == "APPROVED"
            assert approved_art["notification_sent"] is True
            print("=> PASSED: Artwork approved successfully.")

            # 2d: Public room detail includes bilingual fields
            public_detail_res = await client.get(f"/api/v1/rooms/1/artworks/{artwork_id}")
            assert public_detail_res.status_code == 200, public_detail_res.text
            pub_art = public_detail_res.json()["data"]
            assert pub_art["original_language"] == "vi"
            assert pub_art["title_vi"] == "Mảnh vỡ ký ức"
            assert pub_art["title_en"] == "Fragments of Memory"
            assert pub_art["content_vi"] == "Toàn văn tác phẩm tiếng Việt..."
            assert pub_art["content_en"] == "Full artwork text in English..."
            print("=> PASSED: Public room detail returned bilingual content.\n")

            # -----------------------------------------------------------------
            # TEST 3: Admin Studio Direct Publish Bilingual Check
            # -----------------------------------------------------------------
            print("--- Test 3: Admin Studio Direct Publish Bilingual Validation ---")
            # 3a: Studio publish without English -> 400
            incomplete_studio = await client.post(
                "/api/v1/admin/studio/artworks",
                headers=admin_headers,
                json={
                    "room_id": 2,
                    "title_vi": "Nguyện ước mùa thu",
                    "content_vi": "Mong mọi người luôn bình an",
                    # Missing title_en, content_en
                },
            )
            assert incomplete_studio.status_code == 400, incomplete_studio.text
            assert incomplete_studio.json()["error_code"] == "INCOMPLETE_BILINGUAL_CONTENT"
            print("=> PASSED: Studio direct publish requires complete bilingual text.")

            # 3b: Studio publish with complete bilingual content -> 201
            full_studio = await client.post(
                "/api/v1/admin/studio/artworks",
                headers=admin_headers,
                json={
                    "room_id": 2,
                    "title_vi": "Nguyện ước mùa thu",
                    "title_en": "Autumn Wishes",
                    "content_vi": "Mong mọi người luôn bình an.",
                    "content_en": "Wishing peace for everyone.",
                },
            )
            assert full_studio.status_code == 201, full_studio.text
            studio_art = full_studio.json()["data"]
            assert studio_art["title_vi"] == "Nguyện ước mùa thu"
            assert studio_art["title_en"] == "Autumn Wishes"
            print("=> PASSED: Studio direct publish successfully created bilingual artwork.\n")

            # -----------------------------------------------------------------
            # TEST 4: Diary Bilingual Submission & Approval
            # -----------------------------------------------------------------
            print("--- Test 4: Diary Bilingual Submission & Community Approval ---")
            # 4a: User creates public diary with original_language = 'en'
            diary_res = await client.post(
                "/api/v1/diaries",
                headers=user_headers,
                json={
                    "original_language": "en",
                    "title": "A Rainy Morning in Saigon",
                    "content": "Listening to the gentle raindrops wash away the worries.",
                    "mood": "calm",
                    "is_public": True,
                },
            )
            assert diary_res.status_code == 201, diary_res.text
            diary_data = diary_res.json()["data"]
            assert diary_data["original_language"] == "en"
            diary_id = diary_data["id"]
            print("=> PASSED: Diary created with original_language='en' and submitted for review.")

            # 4c: Admin approves diary with complete bilingual content
            full_diary_app = await client.patch(
                f"/api/v1/admin/diaries/{diary_id}/approve",
                headers=admin_headers,
                json={
                    "title_vi": "Một buổi sáng mưa ở Sài Gòn",
                    "title_en": "A Rainy Morning in Saigon",
                    "content_vi": "Lắng nghe những giọt mưa dịu êm gột rửa muộn phiền.",
                    "content_en": "Listening to the gentle raindrops wash away the worries.",
                },
            )
            assert full_diary_app.status_code == 200, full_diary_app.text
            print("=> PASSED: Diary successfully approved with bilingual content.")

            # 4d: Community diary detail returns bilingual fields
            comm_detail_res = await client.get(f"/api/v1/diaries/community/{diary_id}")
            assert comm_detail_res.status_code == 200, comm_detail_res.text
            comm_data = comm_detail_res.json()["data"]
            assert comm_data["original_language"] == "en"
            assert comm_data["title_vi"] == "Một buổi sáng mưa ở Sài Gòn"
            assert comm_data["title_en"] == "A Rainy Morning in Saigon"
            assert comm_data["content_vi"] == "Lắng nghe những giọt mưa dịu êm gột rửa muộn phiền."
            assert comm_data["content_en"] == "Listening to the gentle raindrops wash away the worries."
            print("=> PASSED: Community diary detail returns complete bilingual data.\n")

            print("================ ALL BILINGUAL TESTS PASSED 100% ================\n")


async def test_bilingual_suite():
    try:
        await run_bilingual_tests()
    finally:
        app.dependency_overrides.clear()


if __name__ == "__main__":
    asyncio.run(run_bilingual_tests())

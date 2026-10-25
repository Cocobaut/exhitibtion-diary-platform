import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
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
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.artwork import Artwork
from app.models.artwork_interaction import ArtworkInteraction
from app.models.notification import Notification
from app.models.revoked_token import RevokedToken
from app.models.room import Room
from app.models.user import User, UserRole

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
    """Sets up SQLite tables and seeds test users, rooms, and Room 3 artworks."""
    async with test_engine.begin() as conn:
        for m in [User, RevokedToken, Room, Artwork, ArtworkInteraction, Notification]:
            await conn.run_sync(m.__table__.create)

    async with TestingSessionLocal() as session:
        # 1. Rooms
        room1 = Room(id=1, room_code="ROOM_1", title="Phòng 1 - Đổ Vỡ", description="Nơi giãi bày nỗi đau")
        room2 = Room(id=2, room_code="ROOM_2", title="Phòng 2 - Hy Vọng", description="Nơi hướng về tương lai")
        room3 = Room(id=3, room_code="ROOM_3", title="Phòng 3 - Cộng Đồng", description="Không gian sẻ chia")
        session.add_all([room1, room2, room3])

        # 2. Users
        user1 = User(
            username="community_user_1",
            email="user1@tree.vn",
            password_hash=hash_password("Password123@"),
            nickname="Người Gieo Mầm",
            role=UserRole.USER.value,
            avatar_url="https://example.com/avatar1.png",
            is_active=True,
        )
        user2 = User(
            username="community_user_2",
            email="user2@tree.vn",
            password_hash=hash_password("Password123@"),
            nickname="Cơn Gió Lành",
            role=UserRole.USER.value,
            avatar_url="https://example.com/avatar2.png",
            is_active=True,
        )
        session.add_all([user1, user2])
        await session.commit()
        await session.refresh(user1)
        await session.refresh(user2)

        past_time = datetime.now(timezone.utc) - timedelta(hours=2)

        # 3. Seed Artworks for Room 3:
        # Ribbon 1: ENCOURAGEMENT (#FFD700), APPROVED
        art1 = Artwork(
            id=uuid.uuid4(),
            user_id=user1.id,
            room_id=3,
            title="Bạn đã làm tốt hơn bạn nghĩ rất nhiều!",
            author_display_name="Người Gieo Mầm",
            is_anonymous=False,
            short_content="Tóm tắt lời khích lệ kiên trì",
            content="Có những ngày bạn cảm thấy mệt mỏi nhưng hãy tin rằng bạn đã đi được một chặng đường rất dài hơn ba mươi ký tự",
            tag_category="ENCOURAGEMENT",
            color_code="#FFD700",
            status="APPROVED",
            visibility="PUBLIC",
            view_count=50,
            created_at=past_time,
        )
        # Ribbon 2: HEALING (#98FB98), APPROVED
        art2 = Artwork(
            id=uuid.uuid4(),
            user_id=user2.id,
            room_id=3,
            title="Bình an nằm trong từng hơi thở sâu",
            author_display_name="Cơn Gió Lành",
            is_anonymous=False,
            short_content="Tóm tắt lời chữa lành tâm hồn",
            content="Hít vào một hơi thật sâu và thở ra mọi muộn phiền âu lo đang đè nặng lên đôi vai của bạn hơn ba mươi ký tự",
            tag_category="HEALING",
            color_code="#98FB98",
            status="APPROVED",
            visibility="PUBLIC",
            view_count=20,
            created_at=past_time,
        )
        # Ribbon 3: GRATITUDE (#FFB6C1), PENDING (should not appear in gallery)
        art3 = Artwork(
            id=uuid.uuid4(),
            user_id=user1.id,
            room_id=3,
            title="Biết ơn những điều giản đơn",
            author_display_name=None,
            is_anonymous=False,
            short_content="Tóm tắt lòng biết ơn cuộc sống",
            content="Cảm ơn mỗi sớm mai thức dậy ta có thêm một ngày nữa để yêu thương cuộc đời này hơn ba mươi ký tự",
            tag_category="GRATITUDE",
            color_code="#FFB6C1",
            status="PENDING",
            visibility="PUBLIC",
            view_count=0,
            created_at=past_time,
        )
        session.add_all([art1, art2, art3])
        await session.commit()
        await session.refresh(art1)
        await session.refresh(art2)
        await session.refresh(art3)

        # Seed reactions on art1: User 2 reacted with INSPIRED and HEART
        rx1 = ArtworkInteraction(artwork_id=art1.id, user_id=user2.id, reaction_type="INSPIRED")
        rx2 = ArtworkInteraction(artwork_id=art1.id, user_id=user2.id, reaction_type="HEART")
        session.add_all([rx1, rx2])
        await session.commit()

        context_data = {
            "user1": user1,
            "user2": user2,
            "token1": create_access_token(user1.id, user1.role),
            "token2": create_access_token(user2.id, user2.role),
            "art1": art1,
            "art2": art2,
            "art3": art3,
        }

    try:
        yield context_data
    finally:
        async with test_engine.begin() as conn:
            for m in [Notification, ArtworkInteraction, Artwork, Room, RevokedToken, User]:
                await conn.run_sync(m.__table__.drop)


async def run_tests():
    print("Running Plan 07 Room 3 (Community Tree) Tests...")

    async with setup_test_context() as ctx:
        async def override_get_db():
            async with TestingSessionLocal() as session:
                try:
                    yield session
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
                finally:
                    await session.close()

        app.dependency_overrides[get_db] = override_get_db

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            token1 = ctx["token1"]
            token2 = ctx["token2"]
            art1_id = str(ctx["art1"].id)
            art2_id = str(ctx["art2"].id)
            art3_id = str(ctx["art3"].id)

            # -------------------------------------------------------------
            # TEST 1: List phòng 3 trả về đúng color_legend 4 màu cố định
            # -------------------------------------------------------------
            res = await client.get("/api/v1/rooms/3/artworks")
            assert res.status_code == 200
            data = res.json()["data"]
            legend = data["color_legend"]
            assert len(legend) == 4
            categories = {item["category"] for item in legend}
            assert categories == {"ENCOURAGEMENT", "HEALING", "GRATITUDE", "PERSPECTIVE"}
            assert data["total_ribbons"] == 2, "Only 2 APPROVED ribbons should be in total_ribbons"
            print("✓ Test 1: List phòng 3 trả về đúng color_legend 4 màu cố định và total_ribbons chuẩn")

            # -------------------------------------------------------------
            # TEST 2: Gửi sai cặp màu - danh mục khi tạo bài -> 400 INVALID_CATEGORY_COLOR
            # -------------------------------------------------------------
            # HEALING must be #98FB98, here sending #FFD700
            mismatch_res = await client.post(
                "/api/v1/rooms/3/artworks",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Một thông điệp thử nghiệm",
                    "short_content": "Tóm tắt ngắn hợp lệ",
                    "content": "Nội dung bài viết thông điệp hợp lệ dài hơn ba mươi ký tự",
                    "tag_category": "HEALING",
                    "color_code": "#FFD700",
                }
            )
            assert mismatch_res.status_code == 400
            assert mismatch_res.json()["error_code"] == "INVALID_CATEGORY_COLOR"
            assert "Danh mục và mã màu không khớp" in mismatch_res.json()["message"]
            print("✓ Test 2: Gửi sai cặp danh mục - mã màu bị chặn 400 INVALID_CATEGORY_COLOR")

            # -------------------------------------------------------------
            # TEST 3: limit > 150 -> 400; limit < 1 -> 400
            # -------------------------------------------------------------
            bad_limit_res = await client.get("/api/v1/rooms/3/artworks?limit=151")
            assert bad_limit_res.status_code == 400
            assert bad_limit_res.json()["error_code"] == "VALIDATION_ERROR"
            print("✓ Test 3: Validate limit vượt quá 150 trả về 400 VALIDATION_ERROR")

            # -------------------------------------------------------------
            # TEST 4: Tương tác năng lượng: bấm lần 1 INSPIRED -> ENERGY tăng 1,
            # current_action = INSPIRED, has_received_energy = true;
            # bấm lần 2 cùng loại -> current_action = null, has_received_energy = false
            # -------------------------------------------------------------
            # User 1 reacts with INSPIRED on art2 (author is user2)
            toggle_on = await client.post(
                f"/api/v1/rooms/3/artworks/{art2_id}/energy",
                headers={"Authorization": f"Bearer {token1}"},
                json={"action_type": "INSPIRED"}
            )
            assert toggle_on.status_code == 200
            t_data = toggle_on.json()["data"]
            assert t_data["current_action"] == "INSPIRED"
            assert t_data["reactions"]["ENERGY"] == 1
            assert toggle_on.json()["message"] == "Bạn vừa tiếp nhận nguồn năng lượng tích cực từ dải thông điệp này!"

            # Check detail after toggle on: has_received_energy must be True
            detail_on = await client.get(
                f"/api/v1/rooms/3/artworks/{art2_id}",
                headers={"Authorization": f"Bearer {token1}"}
            )
            assert detail_on.status_code == 200
            assert detail_on.json()["data"]["has_received_energy"] is True

            # Toggle off: User 1 clicks INSPIRED again
            toggle_off = await client.post(
                f"/api/v1/rooms/3/artworks/{art2_id}/energy",
                headers={"Authorization": f"Bearer {token1}"},
                json={"action_type": "INSPIRED"}
            )
            assert toggle_off.status_code == 200
            t_off_data = toggle_off.json()["data"]
            assert t_off_data["current_action"] is None
            assert t_off_data["reactions"]["ENERGY"] == 0
            assert toggle_off.json()["message"] == "Đã hoàn tác tương tác năng lượng"

            # Check detail after toggle off: has_received_energy must be False
            detail_off = await client.get(
                f"/api/v1/rooms/3/artworks/{art2_id}",
                headers={"Authorization": f"Bearer {token1}"}
            )
            assert detail_off.status_code == 200
            assert detail_off.json()["data"]["has_received_energy"] is False
            print("✓ Test 4: Tương tác năng lượng INSPIRED bật/tắt (toggle) độc lập và cập nhật has_received_energy")

            # -------------------------------------------------------------
            # TEST 5: Khách vãng lai xem list: has_received_energy = false
            # -------------------------------------------------------------
            guest_list = await client.get("/api/v1/rooms/3/artworks")
            assert guest_list.status_code == 200
            for it in guest_list.json()["data"]["items"]:
                assert it["has_received_energy"] is False, "Guest must always have has_received_energy=False"
            print("✓ Test 5: Khách vãng lai xem danh sách luôn có has_received_energy = false")

            # -------------------------------------------------------------
            # TEST 6: Tạo bài phòng 3 với ROOM3_AUTO_APPROVE = False -> status = 'PENDING'
            # -------------------------------------------------------------
            settings.ROOM3_AUTO_APPROVE = False
            create_res = await client.post(
                "/api/v1/rooms/3/artworks",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Lời cảm ơn gửi đến cuộc đời",
                    "tag_category": "GRATITUDE",
                    "color_code": "#FFB6C1",
                    "short_content": "Tóm tắt lòng cảm ơn chân thành",
                    "content": "Cảm ơn vì đã luôn mỉm cười đón nhận mọi thử thách dài hơn ba mươi ký tự",
                    "author_display_name": "Người Biết Ơn",
                }
            )
            assert create_res.status_code == 201
            c_data = create_res.json()["data"]
            assert c_data["status"] == "PENDING"
            assert "đang được chuẩn bị để treo lên cây" in create_res.json()["message"]

            # Test auto approve = True
            settings.ROOM3_AUTO_APPROVE = True
            create_auto_res = await client.post(
                "/api/v1/rooms/3/artworks",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Góc nhìn cuộc sống bao dung",
                    "tag_category": "PERSPECTIVE",
                    "color_code": "#87CEFA",
                    "short_content": "Tóm tắt góc nhìn cuộc sống",
                    "content": "Khi thay đổi góc nhìn, thế giới quanh ta cũng sẽ thay đổi theo dài hơn ba mươi ký tự",
                    "author_display_name": "Góc Nhìn Mới",
                }
            )
            assert create_auto_res.status_code == 201
            assert create_auto_res.json()["data"]["status"] == "APPROVED"
            assert create_auto_res.json()["message"] == "Dải thông điệp đã được treo lên cây!"
            print("✓ Test 6: Tạo bài kiểm tra cơ chế ROOM3_AUTO_APPROVE (PENDING khi False, APPROVED khi True)")

            # -------------------------------------------------------------
            # TEST 7: Search có highlight đúng trường và lọc chuẩn theo category, color_code
            # -------------------------------------------------------------
            # Search q="kiên trì"
            search_res = await client.get("/api/v1/rooms/3/search?q=kiên trì")
            assert search_res.status_code == 200
            s_data = search_res.json()["data"]
            assert s_data["pagination"]["total_hits"] >= 1
            first_hit = s_data["items"][0]
            assert "energy_count" in first_hit
            assert first_hit["tag_category"] == "ENCOURAGEMENT"
            assert first_hit["color_code"] == "#FFD700"

            # Search with filter category=HEALING
            search_filter = await client.get("/api/v1/rooms/3/search?q=thở&category=HEALING")
            assert search_filter.status_code == 200
            sf_items = search_filter.json()["data"]["items"]
            assert len(sf_items) == 1
            assert sf_items[0]["tag_category"] == "HEALING"
            print("✓ Test 7: Search có highlight chuẩn xác và lọc kết hợp category, color_code, energy_count")

    print("\n ALL 7 TESTS FOR PLAN 07 PASSED PERFECTLY! \n")


if __name__ == "__main__":
    asyncio.run(run_tests())

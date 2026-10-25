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
    """Sets up SQLite tables and seeds test users, rooms, and Room 2 artworks."""
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
            username="hope_user_1",
            email="user1@hope.vn",
            password_hash=hash_password("Password123@"),
            nickname="Nguyện Ước Xanh",
            role=UserRole.USER.value,
            avatar_url="https://example.com/avatar1.png",
            is_active=True,
        )
        user2 = User(
            username="hope_user_2",
            email="user2@hope.vn",
            password_hash=hash_password("Password123@"),
            nickname="Bình Minh Vàng",
            role=UserRole.USER.value,
            avatar_url="https://example.com/avatar2.png",
            is_active=True,
        )
        session.add_all([user1, user2])
        await session.commit()
        await session.refresh(user1)
        await session.refresh(user2)

        now = datetime.now(timezone.utc)
        past_time = now - timedelta(hours=2)

        # 3. Seed Artworks for Room 2:
        # Art 1: PUBLIC, APPROVED, target_date in past (already unlockable)
        art1 = Artwork(
            id=uuid.uuid4(),
            user_id=user1.id,
            room_id=2,
            title="Lồng đèn ước mơ ngày hôm qua",
            author_display_name="Kẻ Gieo Hy Vọng",
            is_anonymous=False,
            short_content="Tóm tắt lời ước đã đến hạn mở",
            content="Nội dung bức thư lồng đèn hy vọng đã đến ngày hạ cánh thành công dài hơn 30 ký tự",
            media_url="https://example.com/art1.jpg",
            visibility="PUBLIC",
            status="APPROVED",
            target_date=now - timedelta(days=1),
            is_opened=False,
            view_count=5,
            created_at=past_time,
        )
        # Art 2: PUBLIC, APPROVED, target_date in future (locked)
        art2 = Artwork(
            id=uuid.uuid4(),
            user_id=user1.id,
            room_id=2,
            title="Lồng đèn gửi tới năm 2030",
            author_display_name=None,
            is_anonymous=False,
            short_content="Tóm tắt bức thư tương lai xa",
            content="Nội dung bức thư bí mật của tương lai xa xôi chưa thể mở lúc này dài hơn 30 ký tự",
            media_url=None,
            visibility="PUBLIC",
            status="APPROVED",
            target_date=now + timedelta(days=365),
            is_opened=False,
            view_count=0,
            created_at=past_time,
        )
        # Art 3: PUBLIC, PENDING (Should never appear in gallery/search)
        art3 = Artwork(
            id=uuid.uuid4(),
            user_id=user1.id,
            room_id=2,
            title="Lồng đèn công khai chờ duyệt",
            author_display_name=None,
            is_anonymous=False,
            short_content="Tóm tắt lồng đèn chờ duyệt",
            content="Nội dung lồng đèn đang chờ kiểm duyệt từ ban quản trị dài hơn 30 ký tự",
            media_url=None,
            visibility="PUBLIC",
            status="PENDING",
            target_date=now + timedelta(days=5),
            is_opened=False,
            view_count=0,
            created_at=past_time,
        )
        # Art 4: PRIVATE, APPROVED of user1 (target_date in future)
        art4 = Artwork(
            id=uuid.uuid4(),
            user_id=user1.id,
            room_id=2,
            title="Nhật ký riêng tư của User 1",
            author_display_name=None,
            is_anonymous=False,
            short_content="Tóm tắt thư riêng tư của User 1",
            content="Nội dung bức thư bí mật riêng tư của người dùng một gửi chính mình dài hơn 30 ký tự",
            media_url=None,
            visibility="PRIVATE",
            status="APPROVED",
            target_date=now + timedelta(days=10),
            is_opened=False,
            view_count=0,
            created_at=past_time,
        )
        # Art 5: PRIVATE, APPROVED of user2 (target_date in past, already opened)
        art5 = Artwork(
            id=uuid.uuid4(),
            user_id=user2.id,
            room_id=2,
            title="Bức thư riêng tư của User 2",
            author_display_name="Người Thầm Lặng",
            is_anonymous=False,
            short_content="Tóm tắt thư riêng của người dùng 2",
            content="Nội dung riêng tư của người dùng hai đã mở khóa dài hơn 30 ký tự",
            media_url=None,
            visibility="PRIVATE",
            status="APPROVED",
            target_date=now - timedelta(days=2),
            is_opened=True,
            view_count=2,
            created_at=past_time,
        )
        # Art 6: PUBLIC, APPROVED, target_date is NULL (unlockable)
        art6 = Artwork(
            id=uuid.uuid4(),
            user_id=user1.id,
            room_id=2,
            title="Lồng đèn không thời hạn mở",
            author_display_name="Người Vô Danh",
            is_anonymous=False,
            short_content="Tóm tắt không thời hạn",
            content="Nội dung bức thư không có thời hạn khóa thời gian dài hơn 30 ký tự",
            media_url=None,
            visibility="PUBLIC",
            status="APPROVED",
            target_date=None,
            is_opened=False,
            view_count=0,
            created_at=past_time,
        )

        session.add_all([art1, art2, art3, art4, art5, art6])
        await session.commit()
        await session.refresh(art1)
        await session.refresh(art2)
        await session.refresh(art3)
        await session.refresh(art4)
        await session.refresh(art5)
        await session.refresh(art6)

        context_data = {
            "user1": user1,
            "user2": user2,
            "token1": create_access_token(user1.id, user1.role),
            "token2": create_access_token(user2.id, user2.role),
            "art1": art1,
            "art2": art2,
            "art3": art3,
            "art4": art4,
            "art5": art5,
            "art6": art6,
        }

    try:
        yield context_data
    finally:
        async with test_engine.begin() as conn:
            for m in [Notification, ArtworkInteraction, Artwork, Room, RevokedToken, User]:
                await conn.run_sync(m.__table__.drop)


async def run_tests():
    print("Running Plan 06 Room 2 (Hope Lanterns) Tests...")

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
            art4_id = str(ctx["art4"].id)
            art5_id = str(ctx["art5"].id)
            art6_id = str(ctx["art6"].id)

            # -------------------------------------------------------------
            # TEST 1: Khách chỉ thấy PUBLIC+APPROVED; user A thấy thêm PRIVATE của A, không thấy PRIVATE của B
            # -------------------------------------------------------------
            # Guest request
            guest_res = await client.get("/api/v1/rooms/2/artworks")
            assert guest_res.status_code == 200
            guest_items = guest_res.json()["data"]["items"]
            guest_ids = {it["id"] for it in guest_items}
            # Expected in guest: art1, art2, art6 (all PUBLIC + APPROVED).
            assert art1_id in guest_ids
            assert art2_id in guest_ids
            assert art6_id in guest_ids
            assert art3_id not in guest_ids, "PUBLIC PENDING must not be visible"
            assert art4_id not in guest_ids, "PRIVATE of user1 must not be visible to guest"
            assert art5_id not in guest_ids, "PRIVATE of user2 must not be visible to guest"

            # User 1 request
            u1_res = await client.get(
                "/api/v1/rooms/2/artworks",
                headers={"Authorization": f"Bearer {token1}"}
            )
            assert u1_res.status_code == 200
            u1_items = u1_res.json()["data"]["items"]
            u1_ids = {it["id"] for it in u1_items}
            assert art4_id in u1_ids, "User 1 must see their own PRIVATE artwork"
            assert art5_id not in u1_ids, "User 1 must NOT see User 2's PRIVATE artwork"
            print("✓ Test 1: Khách chỉ thấy PUBLIC+APPROVED; user A thấy PRIVATE của A và không thấy PRIVATE của B")

            # -------------------------------------------------------------
            # TEST 2: PUBLIC PENDING không xuất hiện (kể cả với chính tác giả)
            # -------------------------------------------------------------
            assert art3_id not in u1_ids, "PUBLIC PENDING must not appear even for the author"
            print("✓ Test 2: Tác phẩm PUBLIC PENDING không xuất hiện trong danh sách dù là tác giả gọi")

            # -------------------------------------------------------------
            # TEST 3: remaining_seconds/is_unlockable đúng với target_date tương lai, quá khứ, NULL
            # -------------------------------------------------------------
            item_map = {it["id"]: it for it in u1_items}
            # art1: target in past -> is_unlockable=True, remaining_seconds=0
            assert item_map[art1_id]["is_unlockable"] is True
            assert item_map[art1_id]["remaining_seconds"] == 0

            # art2: target in future (365 days) -> is_unlockable=False, remaining_seconds > 0
            assert item_map[art2_id]["is_unlockable"] is False
            assert item_map[art2_id]["remaining_seconds"] > 30000000

            # art6: target is NULL -> is_unlockable=True, remaining_seconds=0
            assert item_map[art6_id]["is_unlockable"] is True
            assert item_map[art6_id]["remaining_seconds"] == 0
            print("✓ Test 3: Tính toán remaining_seconds và is_unlockable chuẩn xác cho quá khứ, tương lai và NULL")

            # -------------------------------------------------------------
            # TEST 4: limit=101 -> 400; filter=mine không token -> 401; total_lanterns = COUNT thật
            # -------------------------------------------------------------
            bad_limit = await client.get("/api/v1/rooms/2/artworks?limit=101")
            assert bad_limit.status_code == 400
            assert bad_limit.json()["error_code"] == "VALIDATION_ERROR"

            mine_guest = await client.get("/api/v1/rooms/2/artworks?filter=mine")
            assert mine_guest.status_code == 401
            assert mine_guest.json()["error_code"] == "UNAUTHORIZED"

            # Check total_lanterns with limit=1
            lim1_res = await client.get("/api/v1/rooms/2/artworks?limit=1")
            assert lim1_res.status_code == 200
            assert len(lim1_res.json()["data"]["items"]) == 1
            assert lim1_res.json()["data"]["total_lanterns"] == 3, "total_lanterns must count all visible matching records"
            print("✓ Test 4: Giới hạn limit tối đa 100 (400), filter=mine yêu cầu token (401), total_lanterns phản ánh COUNT thật")

            # -------------------------------------------------------------
            # TEST 5: Open PUBLIC đã đến hạn bởi khách -> 200, is_opened=true, view_count +1
            # -------------------------------------------------------------
            # art1: target_date in past, view_count=5
            open_pub = await client.post(f"/api/v1/rooms/2/artworks/{art1_id}/open")
            assert open_pub.status_code == 200
            data_open = open_pub.json()["data"]
            assert data_open["is_opened"] is True
            assert data_open["view_count"] == 6
            assert open_pub.json()["message"] == "Lồng đèn đã hạ cánh. Chúc mừng bạn đã chạm tới bức thư tương lai!"
            print("✓ Test 5: Khách mở lồng đèn PUBLIC đã đến hạn thành công (200), is_opened=true, view_count tăng")

            # -------------------------------------------------------------
            # TEST 6: Open khi target_date tương lai -> 423 đúng body (error_code, data.remaining_seconds)
            # -------------------------------------------------------------
            # art2: target in future
            locked_res = await client.post(f"/api/v1/rooms/2/artworks/{art2_id}/open")
            assert locked_res.status_code == 423
            err_body = locked_res.json()
            assert err_body["success"] is False
            assert err_body["error_code"] == "TIME_CAPSULE_LOCKED"
            assert "chưa đến lúc hạ cánh" in err_body["message"]
            assert err_body["data"]["remaining_seconds"] > 0
            assert "Z" in err_body["data"]["target_date"]
            print("✓ Test 6: Mở lồng đèn khi chưa đến hạn trả mã 423 TIME_CAPSULE_LOCKED kèm số giây còn lại")

            # -------------------------------------------------------------
            # TEST 7: Open PRIVATE không token -> 401; PRIVATE của người khác -> 404
            # -------------------------------------------------------------
            # art4 is private of user 1
            open_priv_guest = await client.post(f"/api/v1/rooms/2/artworks/{art4_id}/open")
            assert open_priv_guest.status_code == 401

            # user 2 attempts to open private art4 of user 1 -> 404 (not disclosing existence)
            open_priv_other = await client.post(
                f"/api/v1/rooms/2/artworks/{art4_id}/open",
                headers={"Authorization": f"Bearer {token2}"}
            )
            assert open_priv_other.status_code == 404
            assert open_priv_other.json()["error_code"] == "ARTWORK_NOT_FOUND"
            print("✓ Test 7: Mở lồng đèn PRIVATE không token trả 401; mở thư riêng người khác trả 404 bảo mật")

            # -------------------------------------------------------------
            # TEST 8: Create PUBLIC -> PENDING + message PUBLIC; PRIVATE -> APPROVED + message PRIVATE
            # -------------------------------------------------------------
            now_future = datetime.now(timezone.utc) + timedelta(days=30)
            target_iso = now_future.strftime("%Y-%m-%dT%H:%M:%SZ")

            # 8a: Create PUBLIC
            pub_create = await client.post(
                "/api/v1/rooms/2/artworks",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Thả lồng đèn công khai mới",
                    "short_content": "Tóm tắt lời ước công khai mới",
                    "content": "Nội dung bức thư công khai gửi lên bầu trời đêm dài hơn ba mươi ký tự",
                    "target_date": target_iso,
                    "visibility": "PUBLIC",
                }
            )
            assert pub_create.status_code == 201
            pub_data = pub_create.json()["data"]
            assert pub_data["status"] == "PENDING"
            assert pub_data["visibility"] == "PUBLIC"
            assert pub_create.json()["message"] == "Lồng đèn của bạn đang được chuẩn bị, chúng mình sẽ thông báo trong hộp tin nhắn cho bạn sau khi tác phẩm hoàn thành"

            # 8b: Create PRIVATE
            priv_create = await client.post(
                "/api/v1/rooms/2/artworks",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Thả lồng đèn riêng tư mới",
                    "short_content": "Tóm tắt lời ước riêng tư mới",
                    "content": "Nội dung bức thư riêng tư gửi chính mình trong tương lai dài hơn ba mươi ký tự",
                    "target_date": target_iso,
                    "visibility": "PRIVATE",
                }
            )
            assert priv_create.status_code == 201
            priv_data = priv_create.json()["data"]
            assert priv_data["status"] == "APPROVED", "PRIVATE lanterns must be automatically APPROVED"
            assert priv_data["visibility"] == "PRIVATE"
            assert priv_create.json()["message"] == "Lồng đèn hy vọng đã được thả bay lên bầu trời riêng của bạn!"
            print("✓ Test 8: Tạo lồng đèn PUBLIC trả về PENDING, PRIVATE tự động APPROVED kèm thông điệp phù hợp")

            # -------------------------------------------------------------
            # TEST 9: Create target_date quá khứ -> 400 INVALID_TARGET_DATE
            # -------------------------------------------------------------
            past_iso = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
            past_create = await client.post(
                "/api/v1/rooms/2/artworks",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Lồng đèn ngày hôm qua",
                    "short_content": "Tóm tắt ngày hôm qua",
                    "content": "Nội dung thư ngày hôm qua hợp lệ dài hơn ba mươi ký tự",
                    "target_date": past_iso,
                    "visibility": "PUBLIC",
                }
            )
            assert past_create.status_code == 400
            assert past_create.json()["error_code"] == "INVALID_TARGET_DATE"
            assert past_create.json()["message"] == "Ngày mở khóa không hợp lệ hoặc nằm trong quá khứ"
            print("✓ Test 9: Tạo lồng đèn với ngày mở khóa quá khứ bị từ chối 400 INVALID_TARGET_DATE")

            # -------------------------------------------------------------
            # TEST 10: Search không trả PRIVATE của người khác; item đang khoá không có highlight.content
            # -------------------------------------------------------------
            # Search as guest for "riêng tư" (which appears in art4, art5)
            s_guest = await client.get("/api/v1/rooms/2/search?q=riêng tư")
            assert s_guest.status_code == 200
            assert s_guest.json()["data"]["pagination"]["total_hits"] == 0, "Guest must never find PRIVATE lanterns"

            # Search as User 1 for "riêng tư" -> art4 must be found, art5 (user2) must NOT be found
            s_u1 = await client.get(
                "/api/v1/rooms/2/search?q=riêng tư",
                headers={"Authorization": f"Bearer {token1}"}
            )
            assert s_u1.status_code == 200
            u1_hits = s_u1.json()["data"]["items"]
            u1_hit_ids = {h["id"] for h in u1_hits}
            assert art4_id in u1_hit_ids, "User 1 must find their own private lantern"
            assert art5_id not in u1_hit_ids, "User 1 must NEVER find User 2's private lantern"

            # Check that locked item (art4 is locked) does NOT include 'content' in highlight
            art4_hit = next(h for h in u1_hits if h["id"] == art4_id)
            assert "content" not in art4_hit["highlight"], "Locked lantern must not expose content in highlight"

            # Search for unlocked item (art1 "hôm qua") -> should include highlight without restriction
            s_unlocked = await client.get("/api/v1/rooms/2/search?q=hôm qua")
            assert s_unlocked.status_code == 200
            assert s_unlocked.json()["data"]["pagination"]["total_hits"] >= 1
            print("✓ Test 10: Search cách ly PRIVATE của người khác và bảo vệ nội dung chưa mở (không highlight content)")

    print("\n ALL 10 TESTS FOR PLAN 06 PASSED PERFECTLY! \n")


if __name__ == "__main__":
    asyncio.run(run_tests())

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
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.artwork import Artwork
from app.models.message_capsule import MessageCapsule
from app.models.revoked_token import RevokedToken
from app.models.room import Room
from app.models.user import User, UserRole
from app.models.user_capsule_draw import UserCapsuleDraw
from app.models.user_saved_artwork import UserSavedArtwork

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
    """Sets up SQLite tables and seeds test user, room 2, saved capsule and saved lantern."""
    async with test_engine.begin() as conn:
        for m in [User, RevokedToken, Room, Artwork, MessageCapsule, UserCapsuleDraw, UserSavedArtwork]:
            await conn.run_sync(m.__table__.create)

    async with TestingSessionLocal() as session:
        # 1. Rooms
        room2 = Room(id=2, room_code="HOPE", title="Phòng Hy Vọng", description="Phòng lồng đèn")
        session.add(room2)

        # 2. User
        user = User(
            id=uuid.uuid4(),
            username="notebook_user",
            email="notebook@example.com",
            password_hash=hash_password("Pass123@"),
            nickname="Người Lưu Ký Ức",
            role=UserRole.USER.value,
            theme_preference="museum",
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        # 3. Message Capsule + saved Draw
        capsule = MessageCapsule(
            id=1,
            author_id=user.id,
            author_role=UserRole.ADMIN.value,
            message="Can đảm là vẫn bước tiếp dù tay còn run.",
            message_vi="Can đảm là vẫn bước tiếp dù tay còn run.",
            message_en="Courage is continuing even when trembling.",
            category="COURAGE",
            is_approved=True,
            draw_count=1,
        )
        session.add(capsule)
        await session.commit()

        draw = UserCapsuleDraw(
            id=uuid.uuid4(),
            user_id=user.id,
            capsule_id=1,
            is_saved=True,
            drawn_at=datetime.now(timezone.utc) - timedelta(hours=2),
        )
        session.add(draw)

        # 4. Artwork in Room 2 + UserSavedArtwork
        art = Artwork(
            id=uuid.uuid4(),
            user_id=user.id,
            room_id=2,
            title="Bức thư gửi tương lai năm 2030",
            author_display_name="Linh Thảo",
            short_content="Ước mơ trở thành họa sĩ.",
            content="Nội dung bức thư lồng đèn hy vọng năm 2030 gửi cho chính mình.",
            visibility="PUBLIC",
            status="APPROVED",
            tag_category="Hy vọng",
            color_code="heart",
            is_opened=True,
            target_date=datetime.now(timezone.utc) - timedelta(days=1),
            view_count=5,
        )
        session.add(art)
        await session.commit()
        await session.refresh(art)

        saved_art = UserSavedArtwork(
            id=uuid.uuid4(),
            user_id=user.id,
            artwork_id=art.id,
            saved_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        session.add(saved_art)
        await session.commit()

        context_data = {
            "user": user,
            "token": create_access_token(user.id, user.role),
            "capsule": capsule,
            "draw": draw,
            "artwork": art,
            "saved_art": saved_art,
        }

    try:
        yield context_data
    finally:
        async with test_engine.begin() as conn:
            for m in [UserSavedArtwork, UserCapsuleDraw, MessageCapsule, Artwork, Room, RevokedToken, User]:
                await conn.run_sync(m.__table__.drop)


async def run_tests():
    print("Running Plan 14 Unified Notebook Tests...")

    async with setup_test_context() as ctx:
        async def override_get_db():
            async with TestingSessionLocal() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            token = ctx["token"]

            # Test 1: Khách không token -> 401
            res_guest = await client.get("/api/v1/notebook")
            assert res_guest.status_code == 401
            print("✓ Test 1: Khách không có token bị từ chối 401")

            # Test 2: User lấy toàn bộ sổ tay -> 200 OK (có cả mailbox và lantern)
            res_all = await client.get("/api/v1/notebook", headers={"Authorization": f"Bearer {token}"})
            assert res_all.status_code == 200
            data_all = res_all.json()["data"]
            assert data_all["pagination"]["total_items"] == 2
            assert data_all["pagination"]["counts"]["all"] == 2
            assert data_all["pagination"]["counts"]["mailbox"] == 1
            assert data_all["pagination"]["counts"]["lantern"] == 1
            sources = {it["source"] for it in data_all["items"]}
            assert sources == {"mailbox", "lantern"}
            print("✓ Test 2: Lấy toàn bộ sổ tay hợp nhất thành công với counts đầy đủ")

            # Test 3: Lọc theo source=mailbox
            res_mb = await client.get("/api/v1/notebook?source=mailbox", headers={"Authorization": f"Bearer {token}"})
            assert res_mb.status_code == 200
            items_mb = res_mb.json()["data"]["items"]
            assert len(items_mb) == 1
            assert items_mb[0]["source"] == "mailbox"
            assert items_mb[0]["category"] == "Can đảm"
            print("✓ Test 3: Lọc nguồn mailbox trả về đúng danh sách thông điệp hòm thư")

            # Test 4: Lọc theo source=lantern
            res_lt = await client.get("/api/v1/notebook?source=lantern", headers={"Authorization": f"Bearer {token}"})
            assert res_lt.status_code == 200
            items_lt = res_lt.json()["data"]["items"]
            assert len(items_lt) == 1
            assert items_lt[0]["source"] == "lantern"
            assert items_lt[0]["title"] == "Bức thư gửi tương lai năm 2030"
            print("✓ Test 4: Lọc nguồn lantern trả về đúng bức thư lồng đèn")

            # Test 5: Tìm kiếm từ khóa search
            res_search = await client.get("/api/v1/notebook?search=họa sĩ", headers={"Authorization": f"Bearer {token}"})
            assert res_search.status_code == 200
            search_items = res_search.json()["data"]["items"]
            assert len(search_items) == 1
            assert search_items[0]["source"] == "lantern"

            res_search_mb = await client.get("/api/v1/notebook?search=Can đảm", headers={"Authorization": f"Bearer {token}"})
            assert res_search_mb.status_code == 200
            assert len(res_search_mb.json()["data"]["items"]) == 1
            print("✓ Test 5: Tìm kiếm theo từ khóa hoạt động chính xác trên cả 2 nguồn")

            # Test 6: Phân trang (page=1, limit=1)
            res_page = await client.get("/api/v1/notebook?page=1&limit=1", headers={"Authorization": f"Bearer {token}"})
            assert res_page.status_code == 200
            page_data = res_page.json()["data"]
            assert len(page_data["items"]) == 1
            assert page_data["pagination"]["limit"] == 1
            assert page_data["pagination"]["total_pages"] == 2
            print("✓ Test 6: Phân trang hợp nhất hoạt động chính xác")

    print("\n ALL 6 TESTS FOR PLAN 14 NOTEBOOK PASSED PERFECTLY! \n")


if __name__ == "__main__":
    asyncio.run(run_tests())

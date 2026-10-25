import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
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
from app.models.notification import Notification
from app.models.revoked_token import RevokedToken
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
    """Sets up SQLite tables, seeds default test users and notifications."""
    async with test_engine.begin() as conn:
        await conn.run_sync(User.__table__.create)
        await conn.run_sync(RevokedToken.__table__.create)
        await conn.run_sync(Notification.__table__.create)

    async with TestingSessionLocal() as session:
        # 1. Admin / Moderator (Sender)
        admin = User(
            username="admin_user",
            email="admin@exhibition.edu.vn",
            password_hash=hash_password("AdminPassword@2026"),
            nickname="Ban Quản Trị",
            role=UserRole.ADMIN.value,
            avatar_url="https://example.com/admin_avatar.png",
            is_active=True,
        )
        # 2. Main recipient user
        user1 = User(
            username="hoanghon_01",
            email="hoanghon@example.com",
            password_hash=hash_password("StrongPassword123@"),
            nickname="Người Lữ Khách",
            role=UserRole.USER.value,
            avatar_url=None,
            is_active=True,
        )
        # 3. Other user
        user2 = User(
            username="other_user",
            email="other@example.com",
            password_hash=hash_password("StrongPassword123@"),
            nickname="Người Khác",
            role=UserRole.USER.value,
            avatar_url=None,
            is_active=True,
        )
        session.add_all([admin, user1, user2])
        await session.commit()
        await session.refresh(admin)
        await session.refresh(user1)
        await session.refresh(user2)

        # 4. Seed notifications for User 1:
        # Case A: sender_id có giá trị (admin gửi duyệt)
        n1 = Notification(
            recipient_id=user1.id,
            sender_id=admin.id,
            type="SYSTEM",
            title="Tác phẩm của bạn đã được trưng bày!",
            body="Admin đã phê duyệt tác phẩm của bạn vào Phòng 1.",
            target_url="/rooms/1/artworks/00000000-0000-0000-0000-000000000001",
            is_read=False,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=10),
        )
        # Case B: sender_id IS NULL và type = 'INTERACTION' -> "Người Bạn Ẩn Danh"
        n2 = Notification(
            recipient_id=user1.id,
            sender_id=None,
            type="INTERACTION",
            title="Có người vừa gửi đồng cảm đến bạn",
            body="Một người bạn vừa thả tim cho tác phẩm của bạn.",
            target_url="/rooms/1/artworks/00000000-0000-0000-0000-000000000001",
            is_read=False,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        )
        # Case C: sender_id IS NULL và type = 'SYSTEM' -> "Ban Quản Trị" (đã đọc)
        n3 = Notification(
            recipient_id=user1.id,
            sender_id=None,
            type="SYSTEM",
            title="Chào mừng bạn đến với triển lãm",
            body="Hãy khám phá các phòng trưng bày nghệ thuật.",
            target_url="/rooms/1",
            is_read=True,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
        # Notification for User 2 (User 1 không được nhìn thấy)
        n4_other = Notification(
            recipient_id=user2.id,
            sender_id=admin.id,
            type="SYSTEM",
            title="Thông báo riêng của User 2",
            body="Nội dung riêng tư",
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        session.add_all([n1, n2, n3, n4_other])
        await session.commit()
        await session.refresh(n1)
        await session.refresh(n2)
        await session.refresh(n3)
        await session.refresh(n4_other)

        token1 = create_access_token(subject=user1.id, role=user1.role)
        auth1 = {"Authorization": f"Bearer {token1}"}

        token2 = create_access_token(subject=user2.id, role=user2.role)
        auth2 = {"Authorization": f"Bearer {token2}"}

        async def override_get_db():
            async with TestingSessionLocal() as s:
                yield s

        app.dependency_overrides[get_db] = override_get_db

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield client, session, auth1, user1, auth2, user2, (n1, n2, n3, n4_other)

        app.dependency_overrides.clear()

    async with test_engine.begin() as conn:
        await conn.run_sync(Notification.__table__.drop)
        await conn.run_sync(RevokedToken.__table__.drop)
        await conn.run_sync(User.__table__.drop)


# -------------------------------------------------------------
# 7 TEST CASES COVERING §5 OF PLAN 04 SPECIFICATION
# -------------------------------------------------------------

def test_01_unauthenticated_requests():
    """Test 1: Không có token → 401 cho cả 4 endpoint."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2, notifs):
            n1 = notifs[0]
            # 1. GET /notifications/unread-count
            r1 = await client.get("/api/v1/notifications/unread-count")
            assert r1.status_code == 401
            assert r1.json()["error_code"] == "UNAUTHORIZED"

            # 2. GET /notifications
            r2 = await client.get("/api/v1/notifications")
            assert r2.status_code == 401
            assert r2.json()["error_code"] == "UNAUTHORIZED"

            # 3. PATCH /notifications/{id}/read
            r3 = await client.patch(f"/api/v1/notifications/{n1.id}/read")
            assert r3.status_code == 401
            assert r3.json()["error_code"] == "UNAUTHORIZED"

            # 4. PATCH /notifications/read-all
            r4 = await client.patch("/api/v1/notifications/read-all")
            assert r4.status_code == 401
            assert r4.json()["error_code"] == "UNAUTHORIZED"

    asyncio.run(run())


def test_02_unread_count():
    """Test 2: unread-count chỉ đếm thông báo chưa đọc của chính user."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2, notifs):
            # User 1 có 3 thông báo (2 chưa đọc: n1, n2; 1 đã đọc: n3)
            # User 2 có 1 thông báo chưa đọc (n4_other)
            res1 = await client.get("/api/v1/notifications/unread-count", headers=auth1)
            assert res1.status_code == 200
            assert res1.json()["success"] is True
            assert res1.json()["data"]["unread_count"] == 2

            res2 = await client.get("/api/v1/notifications/unread-count", headers=auth2)
            assert res2.status_code == 200
            assert res2.json()["data"]["unread_count"] == 1

    asyncio.run(run())


def test_03_list_notifications_sorting_filter_isolation():
    """Test 3: List sắp xếp created_at DESC; lọc is_read=false đúng; không thấy thông báo của user khác."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2, notifs):
            # 1. Lấy tất cả thông báo của User 1
            res_all = await client.get("/api/v1/notifications", headers=auth1)
            assert res_all.status_code == 200
            data_all = res_all.json()["data"]
            assert data_all["pagination"]["total_items"] == 3
            items = data_all["items"]

            # Kiểm tra thứ tự sắp xếp mới nhất trước (created_at DESC): n3 > n2 > n1
            dates = [it["created_at"] for it in items]
            assert dates == sorted(dates, reverse=True)

            # Không xuất hiện thông báo của User 2
            ids = [it["id"] for it in items]
            assert str(notifs[3].id) not in ids

            # 2. Lọc thông báo chưa đọc (is_read=false) -> chỉ trả về n2, n1 (2 items)
            res_unread = await client.get("/api/v1/notifications?is_read=false", headers=auth1)
            assert res_unread.status_code == 200
            data_unread = res_unread.json()["data"]
            assert data_unread["pagination"]["total_items"] == 2
            for it in data_unread["items"]:
                assert it["is_read"] is False

            # 3. Lọc thông báo đã đọc (is_read=true) -> chỉ trả về n3 (1 item)
            res_read = await client.get("/api/v1/notifications?is_read=true", headers=auth1)
            assert res_read.status_code == 200
            data_read = res_read.json()["data"]
            assert data_read["pagination"]["total_items"] == 1
            assert data_read["items"][0]["is_read"] is True

    asyncio.run(run())


def test_04_sender_mapping_rules():
    """Test 4: sender đúng 3 trường hợp ánh xạ theo đặc tả §3 (4.2)."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2, notifs):
            res = await client.get("/api/v1/notifications", headers=auth1)
            assert res.status_code == 200
            items_by_id = {it["id"]: it for it in res.json()["data"]["items"]}

            # TH 1: sender_id có giá trị -> nickname & avatar_url của sender (Admin)
            item_n1 = items_by_id[str(notifs[0].id)]
            assert item_n1["sender"]["nickname"] == "Ban Quản Trị"
            assert item_n1["sender"]["avatar_url"] == "https://example.com/admin_avatar.png"

            # TH 2: sender_id IS NULL và type = 'INTERACTION' -> "Người Bạn Ẩn Danh", avatar null
            item_n2 = items_by_id[str(notifs[1].id)]
            assert item_n2["sender"]["nickname"] == "Người Bạn Ẩn Danh"
            assert item_n2["sender"]["avatar_url"] is None

            # TH 3: sender_id IS NULL và type = 'SYSTEM' -> "Ban Quản Trị", avatar null
            item_n3 = items_by_id[str(notifs[2].id)]
            assert item_n3["sender"]["nickname"] == "Ban Quản Trị"
            assert item_n3["sender"]["avatar_url"] is None

    asyncio.run(run())


def test_05_mark_single_notification_read():
    """Test 5: Mark-read thông báo của user khác → 404; mark-read 2 lần → 200 cả hai."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2, notifs):
            n1 = notifs[0]
            n4_other = notifs[3]

            # 1. User 1 cố tình đánh dấu thông báo của User 2 → 404 NOTIFICATION_NOT_FOUND
            r_other = await client.patch(f"/api/v1/notifications/{n4_other.id}/read", headers=auth1)
            assert r_other.status_code == 404
            assert r_other.json()["error_code"] == "NOTIFICATION_NOT_FOUND"

            # UUID sai định dạng → 404
            r_bad = await client.patch("/api/v1/notifications/invalid-uuid/read", headers=auth1)
            assert r_bad.status_code == 404

            # 2. Đánh dấu n1 lần 1 → 200, is_read = True
            r1 = await client.patch(f"/api/v1/notifications/{n1.id}/read", headers=auth1)
            assert r1.status_code == 200
            assert r1.json()["success"] is True
            assert r1.json()["message"] == "Đã đánh dấu thông báo là đã đọc"
            assert r1.json()["data"]["is_read"] is True
            assert r1.json()["data"]["target_url"] == n1.target_url

            # 3. Đánh dấu n1 lần 2 (Idempotent) → 200
            r2 = await client.patch(f"/api/v1/notifications/{n1.id}/read", headers=auth1)
            assert r2.status_code == 200
            assert r2.json()["data"]["is_read"] is True

            # Kiểm tra unread-count giảm còn 1 (chỉ còn n2)
            c = await client.get("/api/v1/notifications/unread-count", headers=auth1)
            assert c.json()["data"]["unread_count"] == 1

    asyncio.run(run())


def test_06_mark_all_read():
    """Test 6: read-all trả affected_rows đúng; gọi lần 2 → affected_rows = 0."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2, notifs):
            # User 1 ban đầu có 2 thông báo chưa đọc (n1, n2)
            res1 = await client.patch("/api/v1/notifications/read-all", headers=auth1)
            assert res1.status_code == 200
            assert res1.json()["success"] is True
            assert res1.json()["message"] == "Đã đánh dấu tất cả thông báo là đã đọc"
            assert res1.json()["data"]["affected_rows"] == 2

            # unread-count giờ là 0
            c = await client.get("/api/v1/notifications/unread-count", headers=auth1)
            assert c.json()["data"]["unread_count"] == 0

            # Gọi lại lần 2 → affected_rows = 0
            res2 = await client.patch("/api/v1/notifications/read-all", headers=auth1)
            assert res2.status_code == 200
            assert res2.json()["data"]["affected_rows"] == 0

    asyncio.run(run())


def test_07_route_order_no_path_collision():
    """Test 7: PATCH /notifications/read-all không bị route /{notification_id}/read nuốt."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2, notifs):
            # Nếu route thứ tự sai, /read-all sẽ bị xem là notification_id="read-all" và gọi /{id}/read -> trả 404
            # Khi thứ tự đúng, /read-all được match chính xác -> trả 200
            res = await client.patch("/api/v1/notifications/read-all", headers=auth1)
            assert res.status_code == 200
            assert "affected_rows" in res.json()["data"]

    asyncio.run(run())


if __name__ == "__main__":
    print("Running Plan 04 Notifications Tests...")
    test_01_unauthenticated_requests()
    print("✓ Test 1: Không có token trả về 401 cho cả 4 endpoint")
    test_02_unread_count()
    print("✓ Test 2: Đếm số lượng thông báo chưa đọc chính xác theo user")
    test_03_list_notifications_sorting_filter_isolation()
    print("✓ Test 3: Danh sách thông báo sắp xếp DESC, lọc trạng thái và cô lập theo user")
    test_04_sender_mapping_rules()
    print("✓ Test 4: Ánh xạ sender đúng 3 trường hợp theo đặc tả")
    test_05_mark_single_notification_read()
    print("✓ Test 5: Đánh dấu 1 thông báo đã đọc, kiểm tra quyền và tính idempotent")
    test_06_mark_all_read()
    print("✓ Test 6: Đánh dấu tất cả thông báo đã đọc và kiểm tra affected_rows")
    test_07_route_order_no_path_collision()
    print("✓ Test 7: Thứ tự route chuẩn xác, không bị xung đột path parameter")
    print("\n ALL 7 TESTS FOR PLAN 04 PASSED PERFECTLY! ")

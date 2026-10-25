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
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.diary import Diary
from app.models.diary_interaction import DiaryInteraction
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
    """Sets up SQLite tables and seeds test users and diaries."""
    async with test_engine.begin() as conn:
        for m in [User, RevokedToken, Notification, Diary, DiaryInteraction]:
            await conn.run_sync(m.__table__.create)

    async with TestingSessionLocal() as session:
        # Users
        admin_user = User(
            username="admin_diary_mod",
            email="admin.mod@exhibition.vn",
            password_hash=hash_password("AdminPass123@"),
            nickname="Quản Trị Viên Nhật Ký",
            role=UserRole.ADMIN.value,
            is_active=True,
        )
        owner_user = User(
            username="owner_diary_master",
            email="owner.mod@exhibition.vn",
            password_hash=hash_password("OwnerPass123@"),
            nickname="Chủ Sở Hữu",
            role=UserRole.OWNER.value,
            is_active=True,
        )
        regular_user = User(
            username="regular_visitor",
            email="visitor@exhibition.vn",
            password_hash=hash_password("UserPass123@"),
            nickname="Khách Vãng Lai",
            role=UserRole.USER.value,
            is_active=True,
        )
        author_user = User(
            username="hoanghon_01",
            email="hoanghon@exhibition.vn",
            password_hash=hash_password("AuthorPass123@"),
            nickname="Người Lữ Khách",
            role=UserRole.USER.value,
            is_active=True,
        )
        session.add_all([admin_user, owner_user, regular_user, author_user])
        await session.flush()

        now = datetime.now(timezone.utc)
        past = now - timedelta(hours=3)

        # Diary 1: PENDING (is_public=True, is_approved=False)
        pending_d1 = Diary(
            id=uuid.uuid4(),
            user_id=author_user.id,
            entry_date=date(2026, 10, 24),
            title="Lời cảm ơn gửi đến những ngày đã qua",
            mood="grateful",
            content="Cảm ơn những vấp ngã đã qua giúp mình mạnh mẽ hơn rất nhiều trong cuộc sống...",
            media_urls=["https://cdn.exhibition.com/diaries/memories-2026.webp"],
            is_public=True,
            is_approved=False,
            created_at=past,
            updated_at=past,
        )
        # Diary 2: APPROVED (is_public=True, is_approved=True)
        approved_d2 = Diary(
            id=uuid.uuid4(),
            user_id=author_user.id,
            entry_date=date(2026, 10, 23),
            title="Hôm nay mình đã học được cách buông bỏ",
            mood="melancholy",
            content="Buông bỏ để thấy lòng nhẹ nhàng hơn giữa bộn bề thành phố...",
            media_urls=[],
            is_public=True,
            is_approved=True,
            created_at=past - timedelta(days=1),
            updated_at=past - timedelta(days=1),
        )
        # Diary 3: PRIVATE (is_public=False, is_approved=True)
        private_d3 = Diary(
            id=uuid.uuid4(),
            user_id=author_user.id,
            entry_date=date(2026, 10, 22),
            title="Bí mật riêng tư chỉ một mình tôi biết",
            mood="calm",
            content="Những trang viết chỉ để bản thân đọc lại trong tĩnh lặng...",
            media_urls=[],
            is_public=False,
            is_approved=True,
            created_at=past - timedelta(days=2),
            updated_at=past - timedelta(days=2),
        )
        session.add_all([pending_d1, approved_d2, private_d3])
        await session.flush()

        # Add interaction for approved_d2
        rx = DiaryInteraction(diary_id=approved_d2.id, user_id=regular_user.id, reaction_type="HUG")
        session.add(rx)

        await session.commit()

        yield {
            "admin_user": admin_user,
            "owner_user": owner_user,
            "regular_user": regular_user,
            "author_user": author_user,
            "pending_d1_id": pending_d1.id,
            "approved_d2_id": approved_d2.id,
            "private_d3_id": private_d3.id,
        }

    async with test_engine.begin() as conn:
        for m in reversed([User, RevokedToken, Notification, Diary, DiaryInteraction]):
            await conn.run_sync(m.__table__.drop)


async def override_get_db():
    async with TestingSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


# -----------------------------------------------------------------------------
# Test Cases
# -----------------------------------------------------------------------------

async def run_all_tests():
    async with setup_test_context() as ctx:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            admin_token = create_access_token(ctx["admin_user"].id, ctx["admin_user"].role)
            owner_token = create_access_token(ctx["owner_user"].id, ctx["owner_user"].role)
            regular_token = create_access_token(ctx["regular_user"].id, ctx["regular_user"].role)

            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            owner_headers = {"Authorization": f"Bearer {owner_token}"}
            regular_headers = {"Authorization": f"Bearer {regular_token}"}

            print("\n========== STARTING PLAN 10 ADMIN DIARIES TESTS ==========\n")

            # -----------------------------------------------------------------
            # Test 1: User bình thường gọi bất kỳ endpoint nào trong nhóm 10 -> 403 FORBIDDEN
            # -----------------------------------------------------------------
            print("--- Test 1: Regular user is forbidden (403 FORBIDDEN) ---")
            forbidden_endpoints = [
                ("GET", "/api/v1/admin/diaries/pending", None),
                ("PATCH", f"/api/v1/admin/diaries/{ctx['pending_d1_id']}/approve", None),
                ("PATCH", f"/api/v1/admin/diaries/{ctx['pending_d1_id']}/reject", {"reason": "X"}),
                ("GET", "/api/v1/admin/diaries/approved", None),
                ("PATCH", f"/api/v1/admin/diaries/{ctx['approved_d2_id']}/revoke", {"admin_reason": "X"}),
            ]
            for method, path, payload in forbidden_endpoints:
                if method == "GET":
                    res = await client.get(path, headers=regular_headers)
                elif method == "PATCH":
                    res = await client.patch(path, json=payload, headers=regular_headers)

                assert res.status_code == 403, f"Expected 403 on {method} {path}, got {res.status_code}"
                assert res.json()["error_code"] == "FORBIDDEN"
            print("=> PASSED: All admin diaries endpoints securely block regular users with 403.\n")

            # -----------------------------------------------------------------
            # Test 1b: OWNER có toàn quyền truy cập các endpoint của admin/diaries
            # -----------------------------------------------------------------
            print("--- Test 1b: OWNER has full access to admin diaries endpoints ---")
            res_owner = await client.get("/api/v1/admin/diaries/pending", headers=owner_headers)
            assert res_owner.status_code == 200, f"Expected 200 for OWNER, got {res_owner.status_code}"
            print("=> PASSED: OWNER successfully accesses admin diaries without 403.\n")

            # -----------------------------------------------------------------
            # Test 2: 10.1 Lấy danh sách nhật ký công khai chờ duyệt
            # -----------------------------------------------------------------
            print("--- Test 2: 10.1 Get pending diaries ---")
            res_pending = await client.get("/api/v1/admin/diaries/pending?page=1&limit=15", headers=admin_headers)
            assert res_pending.status_code == 200, res_pending.text
            pending_data = res_pending.json()["data"]
            assert pending_data["pagination"]["total_pending"] >= 1
            assert any(item["id"] == str(ctx["pending_d1_id"]) for item in pending_data["items"])
            first_item = pending_data["items"][0]
            assert "author" in first_item
            assert first_item["author"]["username"] == "hoanghon_01"
            assert first_item["author"]["nickname"] == "Người Lữ Khách"
            print("=> PASSED: 10.1 Pending diaries query and author mapping successful.\n")

            # -----------------------------------------------------------------
            # Test 3: 10.2 Phê duyệt hiển thị lên Tab Cộng đồng
            # -----------------------------------------------------------------
            print("--- Test 3: 10.2 Approve pending diary ---")
            # Before approve: not in community feed
            res_comm_before = await client.get("/api/v1/diaries/community")
            assert res_comm_before.status_code == 200
            assert all(item["id"] != str(ctx["pending_d1_id"]) for item in res_comm_before.json()["data"]["items"])

            res_appr = await client.patch(
                f"/api/v1/admin/diaries/{ctx['pending_d1_id']}/approve",
                headers=admin_headers,
            )
            assert res_appr.status_code == 200, res_appr.text
            appr_res = res_appr.json()["data"]
            assert appr_res["diary_id"] == str(ctx["pending_d1_id"])
            assert appr_res["is_public"] is True
            assert appr_res["is_approved"] is True

            # After approve: immediately visible in community feed
            res_comm_after = await client.get("/api/v1/diaries/community")
            assert res_comm_after.status_code == 200
            assert any(item["id"] == str(ctx["pending_d1_id"]) for item in res_comm_after.json()["data"]["items"])

            # Verify notification sent to author
            async with TestingSessionLocal() as session:
                notif = (await session.execute(
                    select(Notification).where(
                        Notification.recipient_id == ctx["author_user"].id,
                        Notification.title.contains("xuất bản ra cộng đồng"),
                    )
                )).scalar_one_or_none()
                assert notif is not None, "Notification must be sent to author on approval"
                assert "phê duyệt" in notif.body
            print("=> PASSED: 10.2 Approval, community publication, and notification confirmed.\n")

            # -----------------------------------------------------------------
            # Test 4: 10.3 Từ chối phê duyệt công khai bài nhật ký
            # -----------------------------------------------------------------
            print("--- Test 4: 10.3 Reject pending diary ---")
            # Seed another pending diary to reject
            async with TestingSessionLocal() as session:
                rej_diary = Diary(
                    id=uuid.uuid4(),
                    user_id=ctx["author_user"].id,
                    entry_date=date(2026, 10, 25),
                    title="Bài nhật ký chứa thông tin nhạy cảm",
                    mood="anxious",
                    content="Nội dung không phù hợp với chuẩn mực cộng đồng chia sẻ chữa lành...",
                    is_public=True,
                    is_approved=False,
                )
                session.add(rej_diary)
                await session.commit()
                rej_diary_id = rej_diary.id

            res_reject = await client.patch(
                f"/api/v1/admin/diaries/{rej_diary_id}/reject",
                json={
                    "reason": "Bài viết chứa thông tin riêng tư nhạy cảm chưa phù hợp với tính chất không gian chia sẻ."
                },
                headers=admin_headers,
            )
            assert res_reject.status_code == 200, res_reject.text
            rej_res = res_reject.json()["data"]
            assert rej_res["is_public"] is False
            assert rej_res["is_approved"] is False

            # Verify diary disappeared from pending queue
            res_check_pending = await client.get("/api/v1/admin/diaries/pending", headers=admin_headers)
            assert all(item["id"] != str(rej_diary_id) for item in res_check_pending.json()["data"]["items"])

            # Verify notification sent to author with reason
            async with TestingSessionLocal() as session:
                rej_notif = (await session.execute(
                    select(Notification).where(
                        Notification.recipient_id == ctx["author_user"].id,
                        Notification.body.contains("chứa thông tin riêng tư"),
                    )
                )).scalar_one_or_none()
                assert rej_notif is not None, "Rejection notification must be sent to author"
            print("=> PASSED: 10.3 Rejection, status reset to private, and notification confirmed.\n")

            # -----------------------------------------------------------------
            # Test 5: 10.4 Danh sách nhật ký cộng đồng đang hiển thị
            # -----------------------------------------------------------------
            print("--- Test 5: 10.4 Get approved diaries list ---")
            res_approved = await client.get("/api/v1/admin/diaries/approved?page=1&limit=15", headers=admin_headers)
            assert res_approved.status_code == 200, res_approved.text
            appr_data = res_approved.json()["data"]
            assert appr_data["pagination"]["total_items"] >= 1
            # Find the item for approved_d2 (which has the HUG reaction)
            d2_item = next((item for item in appr_data["items"] if item["id"] == str(ctx["approved_d2_id"])), None)
            assert d2_item is not None, "approved_d2 must be in approved items"
            assert d2_item["reactions_total"] >= 1
            assert d2_item["author"]["username"] == "hoanghon_01"

            # Search with filter q
            res_search_title = await client.get("/api/v1/admin/diaries/approved?q=buông+bỏ", headers=admin_headers)
            assert res_search_title.status_code == 200
            assert len(res_search_title.json()["data"]["items"]) >= 1
            print("=> PASSED: 10.4 Approved diaries feed, reactions count, and search query verified.\n")

            # -----------------------------------------------------------------
            # Test 6: 10.5 Thu hồi quyền công khai (Revoke)
            # -----------------------------------------------------------------
            print("--- Test 6: 10.5 Revoke diary from community ---")
            # Currently approved_d2 is visible in community feed
            res_comm_check = await client.get("/api/v1/diaries/community")
            assert any(item["id"] == str(ctx["approved_d2_id"]) for item in res_comm_check.json()["data"]["items"])

            res_revoke = await client.patch(
                f"/api/v1/admin/diaries/{ctx['approved_d2_id']}/revoke",
                json={
                    "admin_reason": "Nội dung nhận được phản ánh không phù hợp với chuẩn mực cộng đồng."
                },
                headers=admin_headers,
            )
            assert res_revoke.status_code == 200, res_revoke.text
            rev_res = res_revoke.json()["data"]
            assert rev_res["is_public"] is False
            assert rev_res["is_approved"] is False

            # Immediately disappears from community feed
            res_comm_after_revoke = await client.get("/api/v1/diaries/community")
            assert all(item["id"] != str(ctx["approved_d2_id"]) for item in res_comm_after_revoke.json()["data"]["items"])

            # Verify notification sent to author
            async with TestingSessionLocal() as session:
                rev_notif = (await session.execute(
                    select(Notification).where(
                        Notification.recipient_id == ctx["author_user"].id,
                        Notification.title.contains("gỡ khỏi Tab Cộng đồng"),
                    )
                )).scalar_one_or_none()
                assert rev_notif is not None, "Revocation notification must be sent to author"
            print("=> PASSED: 10.5 Revocation, immediate disappearance from community feed, and notification verified.\n")

            print("================ ALL PLAN 10 TESTS PASSED 100% ================\n")


if __name__ == "__main__":
    asyncio.run(run_all_tests())

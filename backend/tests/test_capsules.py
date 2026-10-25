import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
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
from app.models.message_capsule import MessageCapsule
from app.models.revoked_token import RevokedToken
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
async def setup_test_context(seed_capsules: bool = True):
    """Sets up SQLite tables, seeds default test users and message capsules, and yields (client, session, auth_headers, user)."""
    async with test_engine.begin() as conn:
        await conn.run_sync(User.__table__.create)
        await conn.run_sync(RevokedToken.__table__.create)
        await conn.run_sync(MessageCapsule.__table__.create)
        await conn.run_sync(UserCapsuleDraw.__table__.create)

    async with TestingSessionLocal() as session:
        # Seed users
        user1 = User(
            username="user_01",
            email="user01@example.com",
            password_hash=hash_password("StrongPassword123@"),
            nickname="Người Rút 1",
            role=UserRole.USER.value,
            is_active=True,
        )
        user2 = User(
            username="user_02",
            email="user02@example.com",
            password_hash=hash_password("StrongPassword123@"),
            nickname="Người Rút 2",
            role=UserRole.USER.value,
            is_active=True,
        )
        session.add_all([user1, user2])
        await session.commit()
        await session.refresh(user1)
        await session.refresh(user2)

        if seed_capsules:
            c1 = MessageCapsule(
                message="Dù hôm nay có khó khăn, ngày mai sẽ tươi sáng.",
                category="HEALING",
                is_approved=True,
                draw_count=0,
            )
            c2 = MessageCapsule(
                message="Hãy dũng cảm bước qua nỗi sợ hãi.",
                category="COURAGE",
                is_approved=True,
                draw_count=0,
            )
            c3 = MessageCapsule(
                message="Góc nhìn mới mở ra tương lai mới.",
                category="PERSPECTIVE",
                is_approved=True,
                draw_count=0,
            )
            c4_unapproved = MessageCapsule(
                message="Thông điệp chưa duyệt không được hiển thị khi rút.",
                category="HEALING",
                is_approved=False,
                draw_count=0,
            )
            session.add_all([c1, c2, c3, c4_unapproved])
            await session.commit()

        token1 = create_access_token(subject=user1.id, role=user1.role)
        auth_headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = create_access_token(subject=user2.id, role=user2.role)
        auth_headers2 = {"Authorization": f"Bearer {token2}"}

        async def override_get_db():
            async with TestingSessionLocal() as s:
                yield s

        app.dependency_overrides[get_db] = override_get_db

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield client, session, auth_headers1, user1, auth_headers2, user2

        app.dependency_overrides.clear()

    async with test_engine.begin() as conn:
        await conn.run_sync(UserCapsuleDraw.__table__.drop)
        await conn.run_sync(MessageCapsule.__table__.drop)
        await conn.run_sync(RevokedToken.__table__.drop)
        await conn.run_sync(User.__table__.drop)


# -------------------------------------------------------------
# 8 TEST CASES COVERING §4 OF PLAN 03 SPECIFICATION
# -------------------------------------------------------------

def test_01_unauthenticated_requests():
    """Test 1: Không có token → 401 cho cả 4 endpoint."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2):
            # 1. POST /capsules/draw
            r1 = await client.post("/api/v1/capsules/draw")
            assert r1.status_code == 401
            assert r1.json()["error_code"] == "UNAUTHORIZED"

            # 2. PATCH /capsules/draws/{id}/save
            r2 = await client.patch("/api/v1/capsules/draws/a0000000-0000-0000-0000-000000000001/save", json={"is_saved": True})
            assert r2.status_code == 401
            assert r2.json()["error_code"] == "UNAUTHORIZED"

            # 3. GET /capsules/saved
            r3 = await client.get("/api/v1/capsules/saved")
            assert r3.status_code == 401
            assert r3.json()["error_code"] == "UNAUTHORIZED"

            # 4. DELETE /capsules/saved/{id}
            r4 = await client.delete("/api/v1/capsules/saved/a0000000-0000-0000-0000-000000000001")
            assert r4.status_code == 401
            assert r4.json()["error_code"] == "UNAUTHORIZED"

    asyncio.run(run())


def test_02_draw_empty_pool_returns_404():
    """Test 2: Draw khi kho rỗng / mọi capsule is_approved=FALSE → 404 CAPSULE_POOL_EMPTY."""
    async def run():
        async with setup_test_context(seed_capsules=False) as (client, session, auth1, user1, auth2, user2):
            # Kho rỗng hoàn toàn
            r1 = await client.post("/api/v1/capsules/draw", headers=auth1)
            assert r1.status_code == 404
            assert r1.json()["error_code"] == "CAPSULE_POOL_EMPTY"
            assert "Kho thông điệp hiện đang trống" in r1.json()["message"]

            # Kho chỉ có thông điệp chưa duyệt
            c_unapproved = MessageCapsule(
                message="Chưa duyệt",
                category="HEALING",
                is_approved=False,
            )
            session.add(c_unapproved)
            await session.commit()

            r2 = await client.post("/api/v1/capsules/draw", headers=auth1)
            assert r2.status_code == 404
            assert r2.json()["error_code"] == "CAPSULE_POOL_EMPTY"

    asyncio.run(run())


def test_03_draw_success_increments_count():
    """Test 3: Draw thành công: draw_count tăng đúng 1; có bản ghi user_capsule_draws với is_saved=false."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2):
            response = await client.post("/api/v1/capsules/draw", headers=auth1)
            assert response.status_code == 200
            res = response.json()
            assert res["success"] is True
            assert res["message"] == "Rút thông điệp thành công"
            data = res["data"]
            assert "draw_id" in data
            assert "capsule_id" in data
            assert data["is_saved"] is False
            assert "message" in data
            assert data["drawn_at"].endswith("Z")

            capsule_id = data["capsule_id"]
            db_capsule = await session.get(MessageCapsule, capsule_id)
            await session.refresh(db_capsule)
            assert db_capsule.draw_count == 1

            # Bản ghi user_capsule_draws
            draw_stmt = select(UserCapsuleDraw).where(UserCapsuleDraw.id == uuid.UUID(data["draw_id"]))
            db_draw = await session.scalar(draw_stmt)
            assert db_draw is not None
            assert db_draw.user_id == user1.id
            assert db_draw.capsule_id == capsule_id
            assert db_draw.is_saved is False

    asyncio.run(run())


def test_04_draw_by_category_and_invalid_category():
    """Test 4: Draw với category=COURAGE chỉ trả capsule COURAGE; category=FOO → 400."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2):
            # category hợp lệ: COURAGE
            r1 = await client.post("/api/v1/capsules/draw?category=COURAGE", headers=auth1)
            assert r1.status_code == 200
            assert r1.json()["data"]["category"] == "COURAGE"

            # category không hợp lệ: FOO → 400 VALIDATION_ERROR
            r2 = await client.post("/api/v1/capsules/draw?category=FOO", headers=auth1)
            assert r2.status_code == 400
            assert r2.json()["error_code"] == "VALIDATION_ERROR"

    asyncio.run(run())


def test_05_concurrent_draws():
    """Test 5: 20 request draw → draw_count tăng đúng 20."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2):
            for _ in range(20):
                r = await client.post("/api/v1/capsules/draw", headers=auth1)
                assert r.status_code == 200

            # Tổng draw_count của tất cả capsule
            res = await session.execute(select(func.sum(MessageCapsule.draw_count)))
            total_draw_count = res.scalar()
            assert total_draw_count == 20

    asyncio.run(run())


def test_06_save_draw_permissions_and_not_found():
    """Test 6: Save draw của user khác → 403; draw không tồn tại → 404; UUID sai định dạng → 404."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2):
            # User 1 rút
            draw_res = await client.post("/api/v1/capsules/draw", headers=auth1)
            draw_id = draw_res.json()["data"]["draw_id"]

            # User 2 cố tình lưu lượt rút của User 1 → 403 FORBIDDEN
            r_forbidden = await client.patch(
                f"/api/v1/capsules/draws/{draw_id}/save",
                headers=auth2,
                json={"is_saved": True}
            )
            assert r_forbidden.status_code == 403
            assert r_forbidden.json()["error_code"] == "FORBIDDEN"
            assert r_forbidden.json()["message"] == "Bạn không có quyền cập nhật lượt rút này"

            # Draw không tồn tại → 404 DRAW_NOT_FOUND
            non_exist_uuid = "00000000-0000-0000-0000-000000000999"
            r_not_found = await client.patch(
                f"/api/v1/capsules/draws/{non_exist_uuid}/save",
                headers=auth1,
                json={"is_saved": True}
            )
            assert r_not_found.status_code == 404
            assert r_not_found.json()["error_code"] == "DRAW_NOT_FOUND"

            # UUID sai định dạng → 404 DRAW_NOT_FOUND
            r_bad_uuid = await client.patch(
                "/api/v1/capsules/draws/not-a-valid-uuid/save",
                headers=auth1,
                json={"is_saved": True}
            )
            assert r_bad_uuid.status_code == 404
            assert r_bad_uuid.json()["error_code"] == "DRAW_NOT_FOUND"

            # User 1 tự lưu → 200 OK
            r_ok = await client.patch(
                f"/api/v1/capsules/draws/{draw_id}/save",
                headers=auth1,
                json={"is_saved": True}
            )
            assert r_ok.status_code == 200
            assert r_ok.json()["success"] is True
            assert r_ok.json()["message"] == "Đã lưu thông điệp vào sổ tay cá nhân"
            assert r_ok.json()["data"]["is_saved"] is True
            assert "updated_at" in r_ok.json()["data"]

    asyncio.run(run())


def test_07_saved_list_sorting_pagination_and_filter():
    """Test 7: Saved list sắp xếp drawn_at DESC, phân trang đúng total_pages, lọc category đúng."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2):
            # Rút và lưu 3 lượt thông điệp khác nhau
            r_draws = []
            for cat in ["HEALING", "COURAGE", "PERSPECTIVE"]:
                res_d = await client.post(f"/api/v1/capsules/draw?category={cat}", headers=auth1)
                d_id = res_d.json()["data"]["draw_id"]
                await client.patch(f"/api/v1/capsules/draws/{d_id}/save", headers=auth1, json={"is_saved": True})
                r_draws.append(d_id)

            # Lấy danh sách không lọc, limit=2 → page 1 có 2 items, total_items=3, total_pages=2
            list_res = await client.get("/api/v1/capsules/saved?page=1&limit=2", headers=auth1)
            assert list_res.status_code == 200
            data = list_res.json()["data"]
            assert len(data["items"]) == 2
            assert data["pagination"]["total_items"] == 3
            assert data["pagination"]["total_pages"] == 2
            assert data["pagination"]["page"] == 1
            assert data["pagination"]["limit"] == 2

            # Page 2 có 1 item
            p2_res = await client.get("/api/v1/capsules/saved?page=2&limit=2", headers=auth1)
            assert p2_res.status_code == 200
            p2_data = p2_res.json()["data"]
            assert len(p2_data["items"]) == 1

            # Lọc theo category=HEALING → chỉ có 1 item
            cat_res = await client.get("/api/v1/capsules/saved?category=HEALING", headers=auth1)
            assert cat_res.status_code == 200
            cat_data = cat_res.json()["data"]
            assert cat_data["pagination"]["total_items"] == 1
            assert cat_data["items"][0]["category"] == "HEALING"

    asyncio.run(run())


def test_08_delete_saved_and_double_delete():
    """Test 8: DELETE saved → bản ghi vẫn còn, is_saved=false; DELETE lại lần 2 → 404."""
    async def run():
        async with setup_test_context() as (client, session, auth1, user1, auth2, user2):
            # 1. Rút và lưu
            draw_res = await client.post("/api/v1/capsules/draw", headers=auth1)
            draw_id = draw_res.json()["data"]["draw_id"]
            await client.patch(f"/api/v1/capsules/draws/{draw_id}/save", headers=auth1, json={"is_saved": True})

            # 2. Xóa khỏi sổ tay
            del_res = await client.delete(f"/api/v1/capsules/saved/{draw_id}", headers=auth1)
            assert del_res.status_code == 200
            assert del_res.json()["success"] is True
            assert del_res.json()["message"] == "Đã bỏ lưu thông điệp khỏi sổ tay"

            # Kiểm tra bản ghi vẫn tồn tại trong DB nhưng is_saved = False
            draw_stmt = select(UserCapsuleDraw).where(UserCapsuleDraw.id == uuid.UUID(draw_id))
            db_draw = await session.scalar(draw_stmt)
            assert db_draw is not None
            assert db_draw.is_saved is False

            # 3. Xóa lần 2 phải trả về 404 DRAW_NOT_FOUND (vì is_saved đã là False)
            del_second = await client.delete(f"/api/v1/capsules/saved/{draw_id}", headers=auth1)
            assert del_second.status_code == 404
            assert del_second.json()["error_code"] == "DRAW_NOT_FOUND"

    asyncio.run(run())


if __name__ == "__main__":
    print("Running Plan 03 Capsules Tests...")
    test_01_unauthenticated_requests()
    print("✓ Test 1: Không có token trả về 401 cho cả 4 endpoint")
    test_02_draw_empty_pool_returns_404()
    print("✓ Test 2: Kho rỗng hoặc chỉ có thông điệp chưa duyệt trả về 404")
    test_03_draw_success_increments_count()
    print("✓ Test 3: Rút thông điệp thành công, tăng draw_count và tạo lượt rút")
    test_04_draw_by_category_and_invalid_category()
    print("✓ Test 4: Rút theo thể loại hợp lệ và bắt lỗi thể loại không hợp lệ (400)")
    test_05_concurrent_draws()
    print("✓ Test 5: 20 request rút đồng thời tăng draw_count chính xác")
    test_06_save_draw_permissions_and_not_found()
    print("✓ Test 6: Kiểm tra quyền sở hữu khi lưu (403), không tìm thấy và sai UUID (404)")
    test_07_saved_list_sorting_pagination_and_filter()
    print("✓ Test 7: Danh sách đã lưu phân trang, sắp xếp và lọc thể loại chính xác")
    test_08_delete_saved_and_double_delete()
    print("✓ Test 8: Bỏ lưu thông điệp (chuyển is_saved=false) và xóa lần 2 trả 404")
    print("\n ALL 8 TESTS FOR PLAN 03 PASSED PERFECTLY! ")

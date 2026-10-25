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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.message_capsule import MessageCapsule
from app.models.notification import Notification
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
async def setup_test_context():
    """Sets up SQLite tables and seeds test users and baseline capsules."""
    async with test_engine.begin() as conn:
        for m in [User, RevokedToken, Notification, MessageCapsule, UserCapsuleDraw]:
            await conn.run_sync(m.__table__.create)

    async with TestingSessionLocal() as session:
        # Users
        admin_user = User(
            username="admin_capsule_mod",
            email="admin.capsule@exhibition.vn",
            password_hash=hash_password("AdminPass123@"),
            nickname="Người Gác Cổng",
            role=UserRole.ADMIN.value,
            is_active=True,
        )
        owner_user = User(
            username="owner_capsule_master",
            email="owner.capsule@exhibition.vn",
            password_hash=hash_password("OwnerPass123@"),
            nickname="Chủ Sở Hữu",
            role=UserRole.OWNER.value,
            is_active=True,
        )
        regular_user = User(
            username="regular_drawer",
            email="drawer@exhibition.vn",
            password_hash=hash_password("UserPass123@"),
            nickname="Người Rút Thẻ",
            role=UserRole.USER.value,
            is_active=True,
        )
        session.add_all([admin_user, owner_user, regular_user])
        await session.flush()

        now = datetime.now(timezone.utc)

        # Baseline Capsules:
        # Capsule 1: HEALING, is_approved=True, draw_count=5
        c1 = MessageCapsule(
            id=101,
            author_id=admin_user.id,
            author_role="ADMIN",
            message="Dù hôm nay có u ám thế nào, mặt trời vẫn sẽ mọc vào sáng mai.",
            category="HEALING",
            is_approved=True,
            draw_count=5,
            created_at=now,
            updated_at=now,
        )
        # Capsule 2: COURAGE, is_approved=False, draw_count=0
        c2 = MessageCapsule(
            id=102,
            author_id=admin_user.id,
            author_role="ADMIN",
            message="Hãy dũng cảm bước qua nỗi sợ hãi ngày hôm qua.",
            category="COURAGE",
            is_approved=False,
            draw_count=0,
            created_at=now,
            updated_at=now,
        )
        session.add_all([c1, c2])
        await session.commit()

        yield {
            "admin_user": admin_user,
            "owner_user": owner_user,
            "regular_user": regular_user,
            "c1_id": c1.id,
            "c2_id": c2.id,
        }

    async with test_engine.begin() as conn:
        for m in reversed([User, RevokedToken, Notification, MessageCapsule, UserCapsuleDraw]):
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

            print("\n========== STARTING PLAN 11 ADMIN CAPSULES TESTS ==========\n")

            # -----------------------------------------------------------------
            # Test 1: User thường gọi bất kỳ endpoint nào trong nhóm 11 -> 403 FORBIDDEN
            # -----------------------------------------------------------------
            print("--- Test 1: Regular user is forbidden (403 FORBIDDEN) ---")
            forbidden_endpoints = [
                ("GET", "/api/v1/admin/capsules", None),
                ("POST", "/api/v1/admin/capsules", {"message": "X", "category": "HEALING"}),
                ("PUT", f"/api/v1/admin/capsules/{ctx['c1_id']}", {"message": "X", "category": "HEALING"}),
                ("PATCH", f"/api/v1/admin/capsules/{ctx['c1_id']}/toggle-status", {"is_approved": False}),
                ("DELETE", f"/api/v1/admin/capsules/{ctx['c1_id']}", None),
            ]
            for method, path, payload in forbidden_endpoints:
                if method == "GET":
                    res = await client.get(path, headers=regular_headers)
                elif method == "POST":
                    res = await client.post(path, json=payload, headers=regular_headers)
                elif method == "PUT":
                    res = await client.put(path, json=payload, headers=regular_headers)
                elif method == "PATCH":
                    res = await client.patch(path, json=payload, headers=regular_headers)
                elif method == "DELETE":
                    res = await client.delete(path, headers=regular_headers)

                assert res.status_code == 403, f"Expected 403 on {method} {path}, got {res.status_code}"
                assert res.json()["error_code"] == "FORBIDDEN"
            print("=> PASSED: All admin capsules endpoints securely block regular users with 403.\n")

            # -----------------------------------------------------------------
            # Test 1b: OWNER có toàn quyền truy cập các endpoint của admin/capsules
            # -----------------------------------------------------------------
            print("--- Test 1b: OWNER has full access to admin capsules endpoints ---")
            res_owner = await client.get("/api/v1/admin/capsules", headers=owner_headers)
            assert res_owner.status_code == 200, f"Expected 200 for OWNER, got {res_owner.status_code}"
            print("=> PASSED: OWNER successfully accesses admin capsules without 403.\n")

            # -----------------------------------------------------------------
            # Test 2: 11.1 Lấy danh sách thông điệp trong kho
            # -----------------------------------------------------------------
            print("--- Test 2: 11.1 List capsules with filters ---")
            # All capsules
            res_all = await client.get("/api/v1/admin/capsules?page=1&limit=20", headers=admin_headers)
            assert res_all.status_code == 200, res_all.text
            all_data = res_all.json()["data"]
            assert all_data["pagination"]["total_items"] >= 2
            assert any(item["id"] == ctx["c1_id"] for item in all_data["items"])

            # Filter category=HEALING
            res_healing = await client.get("/api/v1/admin/capsules?category=HEALING", headers=admin_headers)
            assert res_healing.status_code == 200
            for item in res_healing.json()["data"]["items"]:
                assert item["category"] == "HEALING"

            # Filter is_approved=false
            res_unapproved = await client.get("/api/v1/admin/capsules?is_approved=false", headers=admin_headers)
            assert res_unapproved.status_code == 200
            for item in res_unapproved.json()["data"]["items"]:
                assert item["is_approved"] is False
            print("=> PASSED: 11.1 List capsules query and filters verified.\n")

            # -----------------------------------------------------------------
            # Test 3: 11.2 Thêm mới thông điệp vào kho
            # -----------------------------------------------------------------
            print("--- Test 3: 11.2 Create new capsule ---")
            res_create = await client.post(
                "/api/v1/admin/capsules",
                json={
                    "message": "Bạn không cần phải hoàn hảo để bắt đầu, nhưng bạn phải bắt đầu để trở nên hoàn thiện hơn.",
                    "category": "COURAGE",
                    "is_approved": True,
                },
                headers=admin_headers,
            )
            assert res_create.status_code == 201, res_create.text
            created_data = res_create.json()["data"]
            new_capsule_id = created_data["id"]
            assert created_data["author_role"] == "ADMIN"
            assert created_data["draw_count"] == 0
            assert created_data["is_approved"] is True
            print(f"=> PASSED: 11.2 Created capsule #{new_capsule_id} with author_role=ADMIN.\n")

            # -----------------------------------------------------------------
            # Test 4: 11.3 Cập nhật nội dung thông điệp
            # -----------------------------------------------------------------
            print("--- Test 4: 11.3 Update capsule content ---")
            res_update = await client.put(
                f"/api/v1/admin/capsules/{new_capsule_id}",
                json={
                    "message": "Nội dung thông điệp đã được chỉnh sửa để truyền cảm hứng mạnh mẽ hơn.",
                    "category": "PERSPECTIVE",
                },
                headers=admin_headers,
            )
            assert res_update.status_code == 200, res_update.text
            up_data = res_update.json()["data"]
            assert up_data["id"] == new_capsule_id
            assert "chỉnh sửa" in up_data["message"]
            assert up_data["category"] == "PERSPECTIVE"
            print("=> PASSED: 11.3 Updated capsule message and category successfully.\n")

            # -----------------------------------------------------------------
            # Test 5: 11.4 Bật / Tắt trạng thái thông điệp và xác minh máy nhả không bốc trúng
            # -----------------------------------------------------------------
            print("--- Test 5: 11.4 Toggle status and verify public draw skips unapproved ---")
            # Turn OFF newly created capsule
            res_toggle_off = await client.patch(
                f"/api/v1/admin/capsules/{new_capsule_id}/toggle-status",
                json={"is_approved": False},
                headers=admin_headers,
            )
            assert res_toggle_off.status_code == 200, res_toggle_off.text
            assert res_toggle_off.json()["data"]["is_approved"] is False

            # Verify through public draw endpoint: should NOT draw this unapproved capsule
            # User draws 3 times (free draws)
            for _ in range(3):
                draw_res = await client.post("/api/v1/capsules/draw", headers=regular_headers)
                if draw_res.status_code == 200:
                    drawn_id = draw_res.json()["data"]["capsule_id"]
                    assert drawn_id != new_capsule_id, f"Unapproved capsule #{new_capsule_id} must not be drawn"

            # Turn back ON
            res_toggle_on = await client.patch(
                f"/api/v1/admin/capsules/{new_capsule_id}/toggle-status",
                json={"is_approved": True},
                headers=admin_headers,
            )
            assert res_toggle_on.status_code == 200
            assert res_toggle_on.json()["data"]["is_approved"] is True
            print("=> PASSED: 11.4 Toggle status verified and unapproved capsule skipped in draw.\n")

            # -----------------------------------------------------------------
            # Test 6: 11.5 Xóa thông điệp (Chặn xóa khi draw_count > 0, cho phép khi draw_count == 0)
            # -----------------------------------------------------------------
            print("--- Test 6: 11.5 Delete capsule (protection when drawn vs safe delete) ---")
            # 6a: Capsule 1 has draw_count = 5 -> Expect 400 CAPSULE_CANNOT_BE_DELETED
            res_del_blocked = await client.delete(
                f"/api/v1/admin/capsules/{ctx['c1_id']}",
                headers=admin_headers,
            )
            assert res_del_blocked.status_code == 400, res_del_blocked.text
            assert res_del_blocked.json()["error_code"] == "CAPSULE_CANNOT_BE_DELETED"
            print("=> PASSED: Deleting capsule with draw_count > 0 is safely blocked with 400.")

            # 6b: Newly created capsule has draw_count = 0 -> Delete succeeds
            res_del_ok = await client.delete(
                f"/api/v1/admin/capsules/{new_capsule_id}",
                headers=admin_headers,
            )
            assert res_del_ok.status_code == 200, res_del_ok.text
            assert res_del_ok.json()["message"] == "Đã xóa thông điệp khỏi kho dữ liệu"

            # Verify 404 after deletion
            res_get_deleted = await client.put(
                f"/api/v1/admin/capsules/{new_capsule_id}",
                json={"message": "X", "category": "HEALING"},
                headers=admin_headers,
            )
            assert res_get_deleted.status_code == 404
            assert res_get_deleted.json()["error_code"] == "CAPSULE_NOT_FOUND"
            print("=> PASSED: 11.5 Safe deletion of unused capsule verified.\n")

            print("================ ALL PLAN 11 TESTS PASSED 100% ================\n")


if __name__ == "__main__":
    asyncio.run(run_all_tests())

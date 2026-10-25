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

from sqlalchemy import event
from sqlite3 import Connection as SQLite3Connection

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(test_engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@asynccontextmanager
async def setup_test_context():
    """Sets up SQLite tables and seeds test users for Owner tests."""
    async with test_engine.begin() as conn:
        for m in [User, RevokedToken, Room, Artwork, ArtworkInteraction, Diary, DiaryInteraction, MessageCapsule, UserCapsuleDraw, Notification, AdminAuditLog]:
            await conn.run_sync(m.__table__.create)

    async with TestingSessionLocal() as session:
        # 1. Rooms
        room1 = Room(id=1, room_code="BROKEN", title="Đổ vỡ", description="Phòng tranh đổ vỡ")
        session.add(room1)

        # 2. Users: 2 Owners, 1 Admin, 1 User
        owner1 = User(
            username="master_owner",
            email="owner@exhibition.vn",
            password_hash=hash_password("OwnerPass123@"),
            nickname="Chủ Sở Hữu Tối Cao",
            role=UserRole.OWNER.value,
            is_active=True,
        )
        owner2 = User(
            username="second_owner",
            email="owner2@exhibition.vn",
            password_hash=hash_password("OwnerPass123@"),
            nickname="Chủ Sở Hữu Thứ Hai",
            role=UserRole.OWNER.value,
            is_active=True,
        )
        admin1 = User(
            username="moderator_admin",
            email="admin@exhibition.vn",
            password_hash=hash_password("AdminPass123@"),
            nickname="Quản Trị Viên",
            role=UserRole.ADMIN.value,
            is_active=True,
        )
        user1 = User(
            username="normal_user",
            email="user@exhibition.vn",
            password_hash=hash_password("UserPass123@"),
            nickname="Người Dùng Thường",
            role=UserRole.USER.value,
            is_active=True,
        )
        session.add_all([owner1, owner2, admin1, user1])
        await session.flush()

        # Seed 1 artwork, 1 diary, 1 capsule for user1 & admin1
        now = datetime.now(timezone.utc)
        art = Artwork(
            user_id=user1.id,
            room_id=1,
            title="Tác phẩm của user",
            short_content="Tóm tắt",
            content="Nội dung",
            status="APPROVED",
            created_at=now,
            updated_at=now,
        )
        diary = Diary(
            user_id=user1.id,
            title="Nhật ký của user",
            content="Nội dung nhật ký dài hơn mười lăm ký tự...",
            is_public=True,
            is_approved=True,
            created_at=now,
            updated_at=now,
        )
        cap = MessageCapsule(
            author_id=admin1.id,
            author_role="ADMIN",
            message="Thông điệp chữa lành",
            category="HEALING",
            is_approved=True,
            draw_count=1,
            created_at=now,
            updated_at=now,
        )
        session.add_all([art, diary, cap])
        await session.commit()

        yield {
            "owner1": owner1,
            "owner2": owner2,
            "admin1": admin1,
            "user1": user1,
        }

    async with test_engine.begin() as conn:
        for m in reversed([User, RevokedToken, Room, Artwork, ArtworkInteraction, Diary, DiaryInteraction, MessageCapsule, UserCapsuleDraw, Notification, AdminAuditLog]):
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
            owner_token = create_access_token(ctx["owner1"].id, ctx["owner1"].role)
            admin_token = create_access_token(ctx["admin1"].id, ctx["admin1"].role)
            user_token = create_access_token(ctx["user1"].id, ctx["user1"].role)

            owner_headers = {"Authorization": f"Bearer {owner_token}"}
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            user_headers = {"Authorization": f"Bearer {user_token}"}

            print("\n========== STARTING PLAN 13 OWNER TESTS ==========\n")

            # -----------------------------------------------------------------
            # Test 1: User thường hoặc Admin gọi endpoint của /owner/* -> 403 FORBIDDEN
            # -----------------------------------------------------------------
            print("--- Test 1: User & Admin are forbidden from /owner/* (403 FORBIDDEN) ---")
            forbidden_endpoints = [
                ("GET", "/api/v1/owner/users", None),
                ("GET", f"/api/v1/owner/users/{ctx['user1'].id}", None),
                ("PATCH", f"/api/v1/owner/users/{ctx['user1'].id}/status", {"is_active": False}),
                ("PATCH", f"/api/v1/owner/users/{ctx['user1'].id}/role", {"role": "ADMIN"}),
                ("DELETE", f"/api/v1/owner/users/{ctx['user1'].id}", None),
                ("GET", "/api/v1/owner/system-stats", None),
            ]
            for headers_type, headers in [("USER", user_headers), ("ADMIN", admin_headers)]:
                for method, path, payload in forbidden_endpoints:
                    if method == "GET":
                        res = await client.get(path, headers=headers)
                    elif method == "PATCH":
                        res = await client.patch(path, json=payload, headers=headers)
                    elif method == "DELETE":
                        res = await client.delete(path, headers=headers)

                    assert res.status_code == 403, f"Expected 403 for {headers_type} on {method} {path}, got {res.status_code}"
                    assert res.json()["error_code"] == "FORBIDDEN"
                    assert "Chủ sở hữu" in res.json()["message"]
            print("=> PASSED: Both regular Users and Admins are strictly blocked from /owner endpoints.\n")

            # -----------------------------------------------------------------
            # Test 2: Owner xem danh sách và chi tiết người dùng
            # -----------------------------------------------------------------
            print("--- Test 2: 13.1 List users & 13.2 User detail with activity stats ---")
            res_list = await client.get("/api/v1/owner/users?page=1&limit=20", headers=owner_headers)
            assert res_list.status_code == 200, res_list.text
            list_data = res_list.json()["data"]
            assert list_data["pagination"]["total_items"] >= 4
            assert any(u["username"] == "master_owner" for u in list_data["items"])

            # Detail with activity stats
            res_detail = await client.get(f"/api/v1/owner/users/{ctx['user1'].id}", headers=owner_headers)
            assert res_detail.status_code == 200, res_detail.text
            detail_data = res_detail.json()["data"]
            assert detail_data["username"] == "normal_user"
            assert detail_data["stats"]["artworks_count"] == 1
            assert detail_data["stats"]["diaries_count"] == 1
            print("=> PASSED: 13.1 List users & 13.2 User details with statistics confirmed.\n")

            # -----------------------------------------------------------------
            # Test 3: Safety Guardrails - Owner không thể tự thao tác trên chính mình
            # -----------------------------------------------------------------
            print("--- Test 3: Safety Guardrails - Owner cannot deactivate, demote, or delete themselves ---")
            # 3a: Self deactivate -> 400 INVALID_ACTION
            res_self_status = await client.patch(
                f"/api/v1/owner/users/{ctx['owner1'].id}/status",
                json={"is_active": False},
                headers=owner_headers,
            )
            assert res_self_status.status_code == 400, res_self_status.text
            assert res_self_status.json()["error_code"] == "INVALID_ACTION"

            # 3b: Self change role -> 400 INVALID_ACTION
            res_self_role = await client.patch(
                f"/api/v1/owner/users/{ctx['owner1'].id}/role",
                json={"role": "ADMIN"},
                headers=owner_headers,
            )
            assert res_self_role.status_code == 400, res_self_role.text
            assert res_self_role.json()["error_code"] == "INVALID_ACTION"

            # 3c: Self delete -> 400 INVALID_ACTION
            res_self_del = await client.delete(
                f"/api/v1/owner/users/{ctx['owner1'].id}",
                headers=owner_headers,
            )
            assert res_self_del.status_code == 400, res_self_del.text
            assert res_self_del.json()["error_code"] == "INVALID_ACTION"

            # 3d: Cannot modify or delete another OWNER -> 403 FORBIDDEN
            res_other_owner = await client.delete(
                f"/api/v1/owner/users/{ctx['owner2'].id}",
                headers=owner_headers,
            )
            assert res_other_owner.status_code == 403, res_other_owner.text
            assert res_other_owner.json()["error_code"] == "FORBIDDEN"
            print("=> PASSED: Safety guardrails successfully protect Owners from self-harm or deleting peers.\n")

            # -----------------------------------------------------------------
            # Test 4: 13.3 Khóa tài khoản Admin & Kích hoạt lại
            # -----------------------------------------------------------------
            print("--- Test 4: 13.3 Deactivate Admin account and reactivate ---")
            # Deactivate admin
            res_deact = await client.patch(
                f"/api/v1/owner/users/{ctx['admin1'].id}/status",
                json={"is_active": False, "reason": "Tạm khóa để kiểm tra an ninh"},
                headers=owner_headers,
            )
            assert res_deact.status_code == 200, res_deact.text
            assert res_deact.json()["data"]["is_active"] is False

            # Verify admin's next request is blocked with 403 ACCOUNT_LOCKED (inactive account)
            res_admin_blocked = await client.get("/api/v1/admin/capsules", headers=admin_headers)
            assert res_admin_blocked.status_code == 403
            assert res_admin_blocked.json()["error_code"] == "ACCOUNT_LOCKED"

            # Reactivate admin
            res_react = await client.patch(
                f"/api/v1/owner/users/{ctx['admin1'].id}/status",
                json={"is_active": True, "reason": "Kích hoạt lại sau kiểm tra an ninh"},
                headers=owner_headers,
            )
            assert res_react.status_code == 200
            assert res_react.json()["data"]["is_active"] is True

            # Admin can access again
            res_admin_ok = await client.get("/api/v1/admin/capsules", headers=admin_headers)
            assert res_admin_ok.status_code == 200
            print("=> PASSED: 13.3 Admin deactivation immediately invalidates sessions and reactivation restores access.\n")

            # -----------------------------------------------------------------
            # Test 5: 13.4 Cập nhật vai trò người dùng (USER <-> ADMIN)
            # -----------------------------------------------------------------
            print("--- Test 5: 13.4 Promote USER -> ADMIN and Demote ADMIN -> USER ---")
            # Promote user1 to ADMIN
            res_promote = await client.patch(
                f"/api/v1/owner/users/{ctx['user1'].id}/role",
                json={"role": "ADMIN"},
                headers=owner_headers,
            )
            assert res_promote.status_code == 200, res_promote.text
            prom_data = res_promote.json()["data"]
            assert prom_data["old_role"] == "USER"
            assert prom_data["new_role"] == "ADMIN"

            # Demote back to USER
            res_demote = await client.patch(
                f"/api/v1/owner/users/{ctx['user1'].id}/role",
                json={"role": "USER"},
                headers=owner_headers,
            )
            assert res_demote.status_code == 200, res_demote.text
            assert res_demote.json()["data"]["new_role"] == "USER"
            print("=> PASSED: 13.4 User role promotion and demotion verified.\n")

            # -----------------------------------------------------------------
            # Test 6: 13.5 Xóa vĩnh viễn tài khoản (Cascade clean-up)
            # -----------------------------------------------------------------
            print("--- Test 6: 13.5 Permanently delete user ---")
            res_delete = await client.delete(
                f"/api/v1/owner/users/{ctx['user1'].id}",
                headers=owner_headers,
            )
            assert res_delete.status_code == 200, res_delete.text
            assert res_delete.json()["data"]["username"] == "normal_user"

            # Verify user record is completely gone from DB
            async with TestingSessionLocal() as session:
                del_user = await session.get(User, ctx["user1"].id)
                assert del_user is None, "User must be completely removed from DB"

                # Verify cascade clean-up of user's artworks and diaries
                u_art = (await session.execute(
                    select(Artwork).where(Artwork.user_id == ctx["user1"].id)
                )).scalar_one_or_none()
                assert u_art is None, "User's artworks must be cascaded"

                # Verify audit log recorded
                audit_del = (await session.execute(
                    select(AdminAuditLog).where(
                        AdminAuditLog.admin_id == ctx["owner1"].id,
                        AdminAuditLog.action_type == "DELETE_USER",
                    )
                )).scalar_one_or_none()
                assert audit_del is not None, "DELETE_USER audit log must be recorded"
            print("=> PASSED: 13.5 Permanent user deletion and cascade cleanup confirmed.\n")

            # -----------------------------------------------------------------
            # Test 7: 13.6 Xem thống kê toàn hệ thống
            # -----------------------------------------------------------------
            print("--- Test 7: 13.6 System Stats ---")
            res_stats = await client.get("/api/v1/owner/system-stats", headers=owner_headers)
            assert res_stats.status_code == 200, res_stats.text
            stats_data = res_stats.json()["data"]
            assert "users_summary" in stats_data
            assert "exhibition_summary" in stats_data
            assert "diaries_summary" in stats_data
            assert "capsules_summary" in stats_data
            assert stats_data["users_summary"]["total_users"] >= 3  # owner1, owner2, admin1
            assert stats_data["capsules_summary"]["total_capsules"] >= 1
            print(f"=> PASSED: 13.6 System stats response verified: {stats_data['users_summary']}\n")

            print("================ ALL PLAN 13 OWNER TESTS PASSED 100% ================\n")


if __name__ == "__main__":
    asyncio.run(run_all_tests())

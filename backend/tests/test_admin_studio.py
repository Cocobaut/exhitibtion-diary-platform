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
    """Sets up SQLite tables and seeds test users, rooms, and audit logs."""
    async with test_engine.begin() as conn:
        for m in [User, RevokedToken, Room, Artwork, ArtworkInteraction, Notification, AdminAuditLog]:
            await conn.run_sync(m.__table__.create)

    async with TestingSessionLocal() as session:
        # 1. Rooms
        room1 = Room(id=1, room_code="BROKEN", title="Đổ vỡ", description="Phòng tranh đổ vỡ")
        room2 = Room(id=2, room_code="HOPE", title="Lồng đèn Hy vọng", description="Phòng hy vọng")
        room3 = Room(id=3, room_code="COMMUNITY", title="Cây Thông điệp", description="Phòng cộng đồng")
        session.add_all([room1, room2, room3])

        # 2. Users
        owner_user = User(
            username="owner_boss",
            email="owner.boss@exhibition.vn",
            password_hash=hash_password("OwnerPass123@"),
            nickname="Chủ Sở Hữu Triển Lãm",
            role=UserRole.OWNER.value,
            is_active=True,
        )
        admin_user = User(
            username="admin_studio_mod",
            email="admin.studio@exhibition.vn",
            password_hash=hash_password("AdminPass123@"),
            nickname="Người Gác Cổng",
            role=UserRole.ADMIN.value,
            is_active=True,
        )
        admin_user2 = User(
            username="admin_studio_second",
            email="admin2.studio@exhibition.vn",
            password_hash=hash_password("AdminPass123@"),
            nickname="Người Gác Cổng Thứ Hai",
            role=UserRole.ADMIN.value,
            is_active=True,
        )
        bad_user = User(
            username="spammer_001",
            email="spammer@exhibition.vn",
            password_hash=hash_password("UserPass123@"),
            nickname="Người Dùng Vi Phạm",
            role=UserRole.USER.value,
            is_active=True,
        )
        regular_user = User(
            username="regular_visitor",
            email="visitor@exhibition.vn",
            password_hash=hash_password("UserPass123@"),
            nickname="Khách Tham Quan",
            role=UserRole.USER.value,
            is_active=True,
        )
        session.add_all([owner_user, admin_user, admin_user2, bad_user, regular_user])
        await session.flush()

        now = datetime.now(timezone.utc)

        # 3. Seed an existing artwork & audit log
        art1 = Artwork(
            user_id=admin_user.id,
            room_id=1,
            title="Bức tường im lặng",
            author_display_name="Ban Quản Trị",
            short_content="Tóm tắt bức tường im lặng",
            content="Nội dung bức tường im lặng...",
            media_url="https://cdn.exhibition.com/wall.webp",
            status="APPROVED",
            created_at=now,
            updated_at=now,
        )
        session.add(art1)
        await session.flush()

        log1 = AdminAuditLog(
            artwork_id=art1.id,
            artwork_title=art1.title,
            room_id=1,
            admin_id=admin_user.id,
            action_type="CREATE_DIRECT",
            note="Xuất bản trực tiếp ban đầu",
            performed_at=now,
        )
        session.add(log1)
        await session.commit()

        yield {
            "owner_user": owner_user,
            "admin_user": admin_user,
            "admin_user2": admin_user2,
            "bad_user": bad_user,
            "regular_user": regular_user,
            "art1_id": art1.id,
        }

    async with test_engine.begin() as conn:
        for m in reversed([User, RevokedToken, Room, Artwork, ArtworkInteraction, Notification, AdminAuditLog]):
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

            print("\n========== STARTING PLAN 12 ADMIN STUDIO & AUDIT TESTS ==========\n")

            # -----------------------------------------------------------------
            # Test 1: User thường gọi bất kỳ endpoint nào trong nhóm 12 -> 403 FORBIDDEN
            # -----------------------------------------------------------------
            print("--- Test 1: Regular user is forbidden (403 FORBIDDEN) ---")
            forbidden_endpoints = [
                ("POST", "/api/v1/admin/studio/artworks", {"room_id": 1, "title": "X", "short_content": "Y", "content": "Z"}),
                ("GET", "/api/v1/admin/studio/audit-logs", None),
                ("POST", f"/api/v1/admin/studio/users/{ctx['bad_user'].id}/request-deletion", {"username": "spammer_001", "email": "spammer@exhibition.vn", "reason": "Vi phạm quy chế"}),
            ]
            for method, path, payload in forbidden_endpoints:
                if method == "GET":
                    res = await client.get(path, headers=regular_headers)
                elif method == "POST":
                    res = await client.post(path, json=payload, headers=regular_headers)

                assert res.status_code == 403, f"Expected 403 on {method} {path}, got {res.status_code}"
                assert res.json()["error_code"] == "FORBIDDEN"
            print("=> PASSED: All admin studio endpoints securely block regular users with 403.\n")

            # -----------------------------------------------------------------
            # Test 1b: OWNER có toàn quyền truy cập các endpoint của admin/studio
            # -----------------------------------------------------------------
            print("--- Test 1b: OWNER has full access to admin studio endpoints ---")
            res_owner = await client.get("/api/v1/admin/studio/audit-logs", headers=owner_headers)
            assert res_owner.status_code == 200, f"Expected 200 for OWNER, got {res_owner.status_code}"
            print("=> PASSED: OWNER successfully accesses admin studio endpoints without 403.\n")

            # -----------------------------------------------------------------
            # Test 2: 12.1 Xuất bản trực tiếp tác phẩm Phòng 1 (bắt buộc media_url)
            # -----------------------------------------------------------------
            print("--- Test 2: 12.1 Direct publish Room 1 requires media_url ---")
            # 2a: Missing media_url in Room 1 -> 400 MISSING_MEDIA_URL
            res_p1_fail = await client.post(
                "/api/v1/admin/studio/artworks",
                json={
                    "room_id": 1,
                    "title": "Bức tường im lặng 2",
                    "short_content": "Tóm tắt",
                    "content": "Nội dung đầy đủ",
                    "media_url": None,
                },
                headers=admin_headers,
            )
            assert res_p1_fail.status_code == 400, res_p1_fail.text
            assert res_p1_fail.json()["error_code"] == "MISSING_MEDIA_URL"

            # 2b: With media_url -> Success 201, status='APPROVED', immediately on public gallery
            res_p1_ok = await client.post(
                "/api/v1/admin/studio/artworks",
                json={
                    "room_id": 1,
                    "title": "Bức tường im lặng trực tiếp",
                    "short_content": "Tác phẩm mở màn mùa thu",
                    "content": "Có những im lặng không phải vì không còn điều gì để nói...",
                    "media_url": "https://cdn.exhibition.com/artworks/wall2.webp",
                },
                headers=admin_headers,
            )
            assert res_p1_ok.status_code == 201, res_p1_ok.text
            p1_data = res_p1_ok.json()["data"]
            assert p1_data["status"] == "APPROVED"
            assert p1_data["room_id"] == 1
            new_art_id = p1_data["id"]

            # Immediately visible in Room 1 public gallery
            res_gal = await client.get("/api/v1/rooms/1/artworks")
            assert res_gal.status_code == 200
            assert any(item["id"] == str(new_art_id) for item in res_gal.json()["data"]["items"])
            print("=> PASSED: Direct publish Room 1 creates APPROVED artwork immediately visible in gallery.\n")

            # -----------------------------------------------------------------
            # Test 3: 12.1 Xuất bản trực tiếp Phòng 2 & Phòng 3
            # -----------------------------------------------------------------
            print("--- Test 3: 12.1 Direct publish Room 2 & Room 3 ---")
            # Room 2: Lantern
            res_p2 = await client.post(
                "/api/v1/admin/studio/artworks",
                json={
                    "room_id": 2,
                    "title": "Ngọn đèn thắp sáng hy vọng",
                    "short_content": "Ngọn đèn mùa thu",
                    "content": "Nội dung ngọn đèn thắp sáng...",
                    "visibility": "PUBLIC",
                },
                headers=admin_headers,
            )
            assert res_p2.status_code == 201, res_p2.text
            assert res_p2.json()["data"]["status"] == "APPROVED"

            # Room 3: Community Tree Ribbon
            res_p3 = await client.post(
                "/api/v1/admin/studio/artworks",
                json={
                    "room_id": 3,
                    "title": "Dải ruy băng tri ân",
                    "short_content": "Tri ân cuộc sống",
                    "content": "Nội dung dải ruy băng tri ân...",
                    "tag_category": "gratitude",
                    "color_code": "#FFB6C1",
                },
                headers=admin_headers,
            )
            assert res_p3.status_code == 201, res_p3.text
            assert res_p3.json()["data"]["status"] == "APPROVED"
            print("=> PASSED: Direct publish Room 2 and Room 3 succeeded.\n")

            # -----------------------------------------------------------------
            # Test 4: 12.2 Lấy nhật ký quản trị toàn hệ thống kèm bộ lọc
            # -----------------------------------------------------------------
            print("--- Test 4: 12.2 Get and filter audit logs ---")
            # All audit logs
            res_logs_all = await client.get("/api/v1/admin/studio/audit-logs?page=1&limit=15", headers=admin_headers)
            assert res_logs_all.status_code == 200, res_logs_all.text
            logs_data = res_logs_all.json()["data"]
            assert logs_data["pagination"]["total_items"] >= 4  # log1 + p1 + p2 + p3
            first_log = logs_data["items"][0]
            assert "log_id" in first_log
            assert "action_type" in first_log
            assert "room_code" in first_log

            # Filter by action_type=CREATE_DIRECT
            res_filter_act = await client.get("/api/v1/admin/studio/audit-logs?action_type=CREATE_DIRECT", headers=admin_headers)
            assert res_filter_act.status_code == 200
            for item in res_filter_act.json()["data"]["items"]:
                assert item["action_type"] == "CREATE_DIRECT"

            # Filter by room_id=1
            res_filter_room = await client.get("/api/v1/admin/studio/audit-logs?room_id=1", headers=admin_headers)
            assert res_filter_room.status_code == 200
            for item in res_filter_room.json()["data"]["items"]:
                assert item["room_id"] == 1
            print("=> PASSED: 12.2 Audit logs query and filtering verified.\n")

            # -----------------------------------------------------------------
            # Test 5: 12.3 Admin gửi yêu cầu xóa tài khoản đến Owner
            # -----------------------------------------------------------------
            print("--- Test 5: 12.3 Admin request user deletion to Owner ---")
            # 5a: Mismatched username/email -> 400 USER_IDENTITY_MISMATCH
            res_mismatch = await client.post(
                f"/api/v1/admin/studio/users/{ctx['bad_user'].id}/request-deletion",
                json={
                    "username": "wrong_username",
                    "email": "wrong@exhibition.vn",
                    "reason": "Lý do thử nghiệm sai thông tin",
                },
                headers=admin_headers,
            )
            assert res_mismatch.status_code == 400, res_mismatch.text
            assert res_mismatch.json()["error_code"] == "USER_IDENTITY_MISMATCH"
            print("=> Verified: Mismatched username or email is blocked with 400 USER_IDENTITY_MISMATCH.")

            # 5b: Admin cannot request deletion of themselves -> 400 INVALID_ACTION
            res_self_fail = await client.post(
                f"/api/v1/admin/studio/users/{ctx['admin_user'].id}/request-deletion",
                json={
                    "username": ctx["admin_user"].username,
                    "email": ctx["admin_user"].email,
                    "reason": "Tôi muốn tự xóa tài khoản của mình",
                },
                headers=admin_headers,
            )
            assert res_self_fail.status_code == 400, res_self_fail.text
            assert res_self_fail.json()["error_code"] == "INVALID_ACTION"

            # 5c: Cannot request deletion of an OWNER -> 403 FORBIDDEN
            res_owner_fail = await client.post(
                f"/api/v1/admin/studio/users/{ctx['owner_user'].id}/request-deletion",
                json={
                    "username": ctx["owner_user"].username,
                    "email": ctx["owner_user"].email,
                    "reason": "Tôi muốn xóa tài khoản Chủ sở hữu",
                },
                headers=admin_headers,
            )
            assert res_owner_fail.status_code == 403, res_owner_fail.text
            assert res_owner_fail.json()["error_code"] == "FORBIDDEN"

            # 5d: Valid request deletion on bad_user via /users/{user_id}/request-deletion -> 200 OK
            res_del_req = await client.post(
                f"/api/v1/admin/studio/users/{ctx['bad_user'].id}/request-deletion",
                json={
                    "username": "spammer_001",
                    "email": "spammer@exhibition.vn",
                    "reason": "Tài khoản có hành vi phát tán nội dung độc hại liên tục và quấy rối.",
                },
                headers=admin_headers,
            )
            assert res_del_req.status_code == 200, res_del_req.text
            del_req_data = res_del_req.json()["data"]
            assert del_req_data["target_username"] == "spammer_001"
            assert del_req_data["target_user_id"] == str(ctx["bad_user"].id)

            # 5e: Valid request deletion on regular_user without user_id on URL -> 200 OK
            res_del_req_no_id = await client.post(
                "/api/v1/admin/studio/users/request-deletion",
                json={
                    "username": "regular_visitor",
                    "email": "visitor@exhibition.vn",
                    "reason": "Yêu cầu xóa tài khoản mà Admin không cần biết user_id nội bộ.",
                },
                headers=admin_headers,
            )
            assert res_del_req_no_id.status_code == 200, res_del_req_no_id.text
            assert res_del_req_no_id.json()["data"]["target_username"] == "regular_visitor"
            print("=> Verified: Admin can request deletion without user_id on URL via username and email directly.")

            # Verify OWNER received SYSTEM notification
            async with TestingSessionLocal() as session:
                owner_notifs = (await session.execute(
                    select(Notification).where(
                        Notification.recipient_id == ctx["owner_user"].id,
                        Notification.title.contains("Yêu cầu xóa tài khoản"),
                    )
                )).scalars().all()
                assert len(owner_notifs) >= 1, "Owner must receive SYSTEM notification"
                assert any("spammer_001" in n.body for n in owner_notifs)

                # Verify REQUEST_DELETE_USER in audit logs
                audit_reqs = (await session.execute(
                    select(AdminAuditLog).where(
                        AdminAuditLog.admin_id == ctx["admin_user"].id,
                        AdminAuditLog.action_type == "REQUEST_DELETE_USER",
                    )
                )).scalars().all()
                assert len(audit_reqs) >= 1, "REQUEST_DELETE_USER audit log must be recorded"
            print("=> PASSED: 12.3 User deletion request, guardrails, notification to Owner, and audit log verified.\n")

            # -----------------------------------------------------------------
            # Test 6: 12.4 Admin cập nhật trạng thái người dùng (Chặn / Mở chặn)
            # & Xác nhận chỉ riêng Owner mới có quyền xóa
            # -----------------------------------------------------------------
            print("--- Test 6: 12.4 Admin block/unblock user & only Owner can delete ---")
            bad_user_id = ctx["bad_user"].id

            # 6a: Regular user is forbidden -> 403 FORBIDDEN
            res_reg_block = await client.patch(
                f"/api/v1/admin/studio/users/{bad_user_id}/status",
                json={"is_active": False, "reason": "Thử chặn trái phép"},
                headers=regular_headers,
            )
            assert res_reg_block.status_code == 403, res_reg_block.text
            assert res_reg_block.json()["error_code"] == "FORBIDDEN"

            # 6b: Admin cannot block themselves -> 400 INVALID_ACTION
            res_self_block = await client.patch(
                f"/api/v1/admin/studio/users/{ctx['admin_user'].id}/status",
                json={"is_active": False, "reason": "Tự khóa tài khoản"},
                headers=admin_headers,
            )
            assert res_self_block.status_code == 400, res_self_block.text
            assert res_self_block.json()["error_code"] == "INVALID_ACTION"

            # 6c: Admin cannot block Owner -> 403 FORBIDDEN
            res_owner_block = await client.patch(
                f"/api/v1/admin/studio/users/{ctx['owner_user'].id}/status",
                json={"is_active": False, "reason": "Cố tình khóa Owner"},
                headers=admin_headers,
            )
            assert res_owner_block.status_code == 403, res_owner_block.text
            assert res_owner_block.json()["error_code"] == "FORBIDDEN"

            # 6d: Admin cannot block another Admin -> 403 FORBIDDEN
            res_admin_block = await client.patch(
                f"/api/v1/admin/studio/users/{ctx['admin_user2'].id}/status",
                json={"is_active": False, "reason": "Cố tình khóa Admin đồng cấp"},
                headers=admin_headers,
            )
            assert res_admin_block.status_code == 403, res_admin_block.text
            assert res_admin_block.json()["error_code"] == "FORBIDDEN"

            # 6e: Admin blocks regular user (bad_user) -> 200 OK, is_active=False
            res_block_ok = await client.patch(
                f"/api/v1/admin/studio/users/{bad_user_id}/status",
                json={"is_active": False, "reason": "Spam liên tục và vi phạm tiêu chuẩn cộng đồng"},
                headers=admin_headers,
            )
            assert res_block_ok.status_code == 200, res_block_ok.text
            block_data = res_block_ok.json()["data"]
            assert block_data["is_active"] is False
            assert block_data["username"] == "spammer_001"

            # Verify audit log recorded DEACTIVATE_USER
            async with TestingSessionLocal() as session:
                audit_deact = (await session.execute(
                    select(AdminAuditLog).where(
                        AdminAuditLog.admin_id == ctx["admin_user"].id,
                        AdminAuditLog.action_type == "DEACTIVATE_USER",
                    )
                )).scalar_one_or_none()
                assert audit_deact is not None, "DEACTIVATE_USER audit log must be recorded"

            # 6f: Admin unblocks user -> 200 OK, is_active=True
            res_unblock_ok = await client.patch(
                f"/api/v1/admin/studio/users/{bad_user_id}/status",
                json={"is_active": True, "reason": "Người dùng đã cam kết không tái phạm"},
                headers=admin_headers,
            )
            assert res_unblock_ok.status_code == 200, res_unblock_ok.text
            unblock_data = res_unblock_ok.json()["data"]
            assert unblock_data["is_active"] is True

            # Verify audit log recorded ACTIVATE_USER
            async with TestingSessionLocal() as session:
                audit_act = (await session.execute(
                    select(AdminAuditLog).where(
                        AdminAuditLog.admin_id == ctx["admin_user"].id,
                        AdminAuditLog.action_type == "ACTIVATE_USER",
                    )
                )).scalar_one_or_none()
                assert audit_act is not None, "ACTIVATE_USER audit log must be recorded"

            # 6g: Admin tries to delete user permanently -> 403 FORBIDDEN (Admin CANNOT delete)
            res_admin_delete = await client.delete(
                f"/api/v1/owner/users/{bad_user_id}",
                headers=admin_headers,
            )
            assert res_admin_delete.status_code == 403, res_admin_delete.text
            assert res_admin_delete.json()["error_code"] == "FORBIDDEN"
            print("=> Verified: Admin CANNOT delete user accounts (403 FORBIDDEN).")

            # 6h: Only OWNER can delete user permanently -> 200 OK
            res_owner_delete = await client.delete(
                f"/api/v1/owner/users/{bad_user_id}",
                headers=owner_headers,
            )
            assert res_owner_delete.status_code == 200, res_owner_delete.text
            assert res_owner_delete.json()["data"]["username"] == "spammer_001"
            print("=> Verified: Only OWNER has permission to permanently delete user accounts (200 OK).")

            print("=> PASSED: 12.4 Admin status update (block/unblock) and exclusive Owner deletion rights confirmed.\n")

            print("================ ALL PLAN 12 TESTS PASSED 100% ================\n")


if __name__ == "__main__":
    asyncio.run(run_all_tests())

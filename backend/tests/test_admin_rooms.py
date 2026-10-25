import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import io
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
    """Sets up SQLite tables and seeds test users, rooms, and artworks."""
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
        admin_user = User(
            username="admin_tester",
            email="admin@exhibition.vn",
            password_hash=hash_password("AdminPass123@"),
            nickname="Tổng Quản Trị",
            role=UserRole.ADMIN.value,
            is_active=True,
        )
        regular_user = User(
            username="regular_user",
            email="regular@exhibition.vn",
            password_hash=hash_password("UserPass123@"),
            nickname="Khách Tham Quan",
            role=UserRole.USER.value,
            is_active=True,
        )
        author_user = User(
            username="author_user",
            email="author@exhibition.vn",
            password_hash=hash_password("AuthorPass123@"),
            nickname="Tác Giả Nghệ Thuật",
            role=UserRole.USER.value,
            is_active=True,
        )
        owner_user = User(
            username="owner_tester",
            email="owner@exhibition.vn",
            password_hash=hash_password("OwnerPass123@"),
            nickname="Chủ Sở Hữu",
            role=UserRole.OWNER.value,
            is_active=True,
        )
        session.add_all([admin_user, regular_user, author_user, owner_user])
        await session.flush()

        admin_id = admin_user.id
        regular_id = regular_user.id
        author_id = author_user.id
        owner_id = owner_user.id

        # 3. Seed Artworks for Room 1
        now = datetime.now(timezone.utc)
        # Pending in Room 1 (no media yet)
        pending_art1 = Artwork(
            user_id=author_id,
            room_id=1,
            title="Mảnh vỡ thời gian",
            author_display_name="Kẻ lang thang",
            is_anonymous=False,
            short_content="Tóm tắt mảnh vỡ thời gian",
            content="Nội dung đầy đủ về mảnh vỡ thời gian...",
            media_url=None,
            status="PENDING",
            created_at=now - timedelta(hours=2),
        )
        # Pending in Room 2
        pending_art2 = Artwork(
            user_id=author_id,
            room_id=2,
            title="Nguyện ước bình yên",
            author_display_name="Người hy vọng",
            is_anonymous=False,
            short_content="Nguyện ước bình yên tóm tắt",
            content="Nội dung nguyện ước...",
            media_url=None,
            status="PENDING",
            target_date=now + timedelta(days=30),
            created_at=now - timedelta(hours=1),
        )
        # Approved in Room 1
        approved_art1 = Artwork(
            user_id=author_id,
            room_id=1,
            title="Chiếc bình pha lê",
            author_display_name="Bụi Thời Gian",
            is_anonymous=False,
            short_content="Bình pha lê vỡ vụn",
            content="Nội dung chiếc bình pha lê...",
            media_url="http://cdn.exhibition.vn/vase.webp",
            status="APPROVED",
            view_count=50,
            reviewed_by=admin_id,
            reviewed_at=now - timedelta(days=1),
            created_at=now - timedelta(days=2),
        )
        session.add_all([pending_art1, pending_art2, approved_art1])
        await session.flush()

        # Add interaction for approved_art1
        rx1 = ArtworkInteraction(
            artwork_id=approved_art1.id,
            user_id=regular_id,
            reaction_type="drop_flower",
        )
        session.add(rx1)

        await session.commit()

        yield {
            "admin_id": admin_id,
            "regular_id": regular_id,
            "author_id": author_id,
            "owner_id": owner_id,
            "admin_user": admin_user,
            "regular_user": regular_user,
            "author_user": author_user,
            "owner_user": owner_user,
            "pending_art1_id": pending_art1.id,
            "pending_art2_id": pending_art2.id,
            "approved_art1_id": approved_art1.id,
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
            regular_token = create_access_token(ctx["regular_user"].id, ctx["regular_user"].role)

            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            regular_headers = {"Authorization": f"Bearer {regular_token}"}

            print("\n========== STARTING PLAN 09 ADMIN ROOMS TESTS ==========\n")

            # -----------------------------------------------------------------
            # Test 1: User bình thường gọi bất kỳ endpoint nào -> 403 FORBIDDEN
            # -----------------------------------------------------------------
            print("--- Test 1: Regular user is forbidden (403 FORBIDDEN) ---")
            forbidden_endpoints = [
                ("GET", "/api/v1/admin/rooms/1/artworks/pending", None),
                ("POST", f"/api/v1/admin/rooms/1/artworks/{ctx['pending_art1_id']}/approve", {"title": "X"}),
                ("POST", f"/api/v1/admin/rooms/1/artworks/{ctx['pending_art1_id']}/reject", {"admin_note": "X"}),
                ("GET", "/api/v1/admin/rooms/1/artworks/approved", None),
                ("PUT", f"/api/v1/admin/rooms/1/artworks/{ctx['approved_art1_id']}", {"title": "X"}),
                ("PATCH", f"/api/v1/admin/rooms/1/artworks/{ctx['approved_art1_id']}/archive", {"admin_note": "X"}),
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

                assert res.status_code == 403, f"Expected 403 on {method} {path}, got {res.status_code}"
                assert res.json()["error_code"] == "FORBIDDEN"
            print("=> PASSED: All admin endpoints securely block regular users with 403.\n")

            # -----------------------------------------------------------------
            # Test 1b: OWNER có toàn quyền truy cập các endpoint của Admin
            # -----------------------------------------------------------------
            print("--- Test 1b: OWNER has full access to admin endpoints ---")
            owner_token = create_access_token(ctx["owner_user"].id, ctx["owner_user"].role)
            owner_headers = {"Authorization": f"Bearer {owner_token}"}
            res_owner = await client.get("/api/v1/admin/rooms/1/artworks/pending", headers=owner_headers)
            assert res_owner.status_code == 200, f"Expected 200 for OWNER, got {res_owner.status_code}"
            print("=> PASSED: OWNER successfully accesses admin endpoints without 403.\n")

            # -----------------------------------------------------------------
            # Test 2: 9.1.1 Lấy danh sách tác phẩm chờ duyệt
            # -----------------------------------------------------------------
            print("--- Test 2: 9.1.1 Get pending artworks ---")
            res_pending = await client.get("/api/v1/admin/rooms/1/artworks/pending?page=1&limit=15&sort=oldest", headers=admin_headers)
            assert res_pending.status_code == 200, res_pending.text
            pending_data = res_pending.json()["data"]
            assert pending_data["room_id"] == 1
            assert pending_data["room_code"] == "BROKEN"
            assert pending_data["pagination"]["total_pending"] >= 1
            assert any(item["id"] == str(ctx["pending_art1_id"]) for item in pending_data["items"])
            # Author field included
            first_item = pending_data["items"][0]
            assert "author" in first_item
            assert first_item["author"]["username"] == "author_user"

            # Filter pending by title & author_display_name
            res_p_title = await client.get("/api/v1/admin/rooms/1/artworks/pending?title=Mảnh vỡ", headers=admin_headers)
            assert res_p_title.status_code == 200
            assert res_p_title.json()["data"]["pagination"]["total_pending"] >= 1

            res_p_author = await client.get("/api/v1/admin/rooms/1/artworks/pending?author_display_name=Kẻ lang thang", headers=admin_headers)
            assert res_p_author.status_code == 200
            assert res_p_author.json()["data"]["pagination"]["total_pending"] >= 1

            res_p_none = await client.get("/api/v1/admin/rooms/1/artworks/pending?title=khong_co_gi", headers=admin_headers)
            assert res_p_none.status_code == 200
            assert res_p_none.json()["data"]["pagination"]["total_pending"] == 0

            print("=> PASSED: 9.1.1 Pending artworks query, filtering (title, author_display_name) and author mapping successful.\n")

            # -----------------------------------------------------------------
            # Test 3: 9.1.2 Upload ảnh nghệ thuật minh họa
            # -----------------------------------------------------------------
            print("--- Test 3: 9.1.2 Upload artwork illustration image ---")
            png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
            files = {"image": ("test_artwork.png", io.BytesIO(png_header), "image/png")}
            res_upload = await client.post(
                "/api/v1/admin/rooms/1/artworks/upload-artwork-image",
                files=files,
                headers=admin_headers,
            )
            assert res_upload.status_code == 200, res_upload.text
            upload_data = res_upload.json()["data"]
            assert "media_url" in upload_data
            uploaded_media_url = upload_data["media_url"]
            assert "artworks/1" in uploaded_media_url
            print(f"=> PASSED: 9.1.2 Uploaded artwork image URL: {uploaded_media_url}\n")

            # -----------------------------------------------------------------
            # Test 4: 9.1.3 Phê duyệt tác phẩm Phòng 1 bắt buộc có media_url
            # -----------------------------------------------------------------
            print("--- Test 4: 9.1.3 Approve artwork validation & execution ---")
            # 4a: Room 1 without media_url -> 400 MISSING_MEDIA_URL
            res_approve_fail = await client.post(
                f"/api/v1/admin/rooms/1/artworks/{ctx['pending_art1_id']}/approve",
                json={
                    "title": "Mảnh vỡ biên tập",
                    "short_content": "Tóm tắt",
                    "content": "Nội dung",
                    "media_url": None,
                },
                headers=admin_headers,
            )
            assert res_approve_fail.status_code == 400, res_approve_fail.text
            assert res_approve_fail.json()["error_code"] == "MISSING_MEDIA_URL"
            print("=> PASSED: Room 1 requires media_url correctly returns 400 MISSING_MEDIA_URL.")

            # 4b: Room 1 with media_url -> Success
            res_approve_ok = await client.post(
                f"/api/v1/admin/rooms/1/artworks/{ctx['pending_art1_id']}/approve",
                json={
                    "title": "Mảnh vỡ thời gian (Đã biên tập)",
                    "author_display_name": "Kẻ lang thang",
                    "short_content": "Tóm tắt đã duyệt",
                    "content": "Nội dung đầy đủ đã duyệt",
                    "media_url": uploaded_media_url,
                },
                headers=admin_headers,
            )
            assert res_approve_ok.status_code == 200, res_approve_ok.text
            appr_res_data = res_approve_ok.json()["data"]
            assert appr_res_data["status"] == "APPROVED"
            assert appr_res_data["media_url"] == uploaded_media_url
            assert appr_res_data["notification_sent"] is True

            # Verify Author received notification & Audit log recorded
            async with TestingSessionLocal() as session:
                notif = (await session.execute(
                    select(Notification).where(
                        Notification.recipient_id == ctx["author_id"],
                        Notification.type == "SYSTEM",
                    )
                )).scalar_one_or_none()
                assert notif is not None, "Notification must be sent to author"
                assert "trưng bày" in notif.title

                audit = (await session.execute(
                    select(AdminAuditLog).where(
                        AdminAuditLog.artwork_id == ctx["pending_art1_id"],
                        AdminAuditLog.admin_id == ctx["admin_id"],
                    )
                )).scalar_one_or_none()
                assert audit is not None, "Audit log must be created"
                assert audit.action_type in ("APPROVE", "APPROVE_AND_UPLOAD_MEDIA")
            print("=> PASSED: Room 1 approval, notification dispatch, and audit log confirmed.\n")

            # -----------------------------------------------------------------
            # Test 5: Room 2/3 does not require media_url
            # -----------------------------------------------------------------
            print("--- Test 5: Room 2 approval does not require media_url ---")
            res_appr_room2 = await client.post(
                f"/api/v1/admin/rooms/2/artworks/{ctx['pending_art2_id']}/approve",
                json={
                    "title": "Nguyện ước bình yên đã duyệt",
                    "media_url": None,
                },
                headers=admin_headers,
            )
            assert res_appr_room2.status_code == 200, res_appr_room2.text
            assert res_appr_room2.json()["data"]["status"] == "APPROVED"
            print("=> PASSED: Room 2 approval succeeded without media_url.\n")

            # -----------------------------------------------------------------
            # Test 6: 9.1.4 Từ chối tác phẩm kèm lý do
            # -----------------------------------------------------------------
            print("--- Test 6: 9.1.4 Reject artwork with admin note ---")
            # Seed another pending artwork to reject
            async with TestingSessionLocal() as session:
                to_reject = Artwork(
                    user_id=ctx["author_id"],
                    room_id=3,
                    title="Thông điệp vi phạm",
                    short_content="Vi phạm",
                    content="Nội dung vi phạm tiêu chuẩn",
                    status="PENDING",
                )
                session.add(to_reject)
                await session.commit()
                reject_id = to_reject.id

            res_reject = await client.post(
                f"/api/v1/admin/rooms/3/artworks/{reject_id}/reject",
                json={
                    "admin_note": "Tác phẩm vi phạm tiêu chuẩn cộng đồng về không gian chữa lành."
                },
                headers=admin_headers,
            )
            assert res_reject.status_code == 200, res_reject.text
            rej_data = res_reject.json()["data"]
            assert rej_data["status"] == "REJECTED"
            assert "vi phạm" in rej_data["admin_note"]

            # Verify rejection notification sent to author
            async with TestingSessionLocal() as session:
                rej_notif = (await session.execute(
                    select(Notification).where(
                        Notification.recipient_id == ctx["author_id"],
                        Notification.body.contains("vi phạm tiêu chuẩn"),
                    )
                )).scalar_one_or_none()
                assert rej_notif is not None, "Rejection notification must be sent to author"

                rej_audit = (await session.execute(
                    select(AdminAuditLog).where(
                        AdminAuditLog.artwork_id == reject_id,
                        AdminAuditLog.action_type == "REJECT",
                    )
                )).scalar_one_or_none()
                assert rej_audit is not None, "Rejection audit log must be created"
            print("=> PASSED: Rejection workflow, notification, and audit log confirmed.\n")

            # -----------------------------------------------------------------
            # Test 7: 9.2.1 Danh sách tác phẩm đang trưng bày kèm thống kê
            # -----------------------------------------------------------------
            print("--- Test 7: 9.2.1 Get approved artworks with room summary ---")
            res_approved = await client.get("/api/v1/admin/rooms/1/artworks/approved?page=1&limit=15", headers=admin_headers)
            assert res_approved.status_code == 200, res_approved.text
            approved_data = res_approved.json()["data"]
            summary = approved_data["summary"]
            assert summary["room_id"] == 1
            assert summary["room_code"] == "BROKEN"
            assert summary["total_approved_artworks"] >= 2  # approved_art1 + pending_art1 that was approved
            assert summary["total_views"] >= 50
            assert summary["total_reactions"] >= 1

            # Filter approved by title & author_display_name
            res_a_title = await client.get("/api/v1/admin/rooms/1/artworks/approved?title=bình pha lê", headers=admin_headers)
            assert res_a_title.status_code == 200
            assert len(res_a_title.json()["data"]["items"]) >= 1

            res_a_author = await client.get("/api/v1/admin/rooms/1/artworks/approved?author_display_name=Bụi Thời Gian", headers=admin_headers)
            assert res_a_author.status_code == 200
            assert len(res_a_author.json()["data"]["items"]) >= 1

            res_a_none = await client.get("/api/v1/admin/rooms/1/artworks/approved?title=khong_co_tac_pham_nao", headers=admin_headers)
            assert res_a_none.status_code == 200
            assert len(res_a_none.json()["data"]["items"]) == 0

            print(f"=> PASSED: Approved artworks summary and filtering (title, author_display_name): {summary}\n")

            # -----------------------------------------------------------------
            # Test 8: 9.2.2 Chỉnh sửa tác phẩm đang trưng bày
            # -----------------------------------------------------------------
            print("--- Test 8: 9.2.2 Edit approved artwork ---")
            # 8a: Cố tình truyền author_display_name -> 400 VALIDATION_ERROR
            res_edit_author_fail = await client.put(
                f"/api/v1/admin/rooms/1/artworks/{ctx['approved_art1_id']}",
                json={
                    "author_display_name": "Bụi Thời Gian Đã Đổi",
                },
                headers=admin_headers,
            )
            assert res_edit_author_fail.status_code == 400, res_edit_author_fail.text
            assert res_edit_author_fail.json()["error_code"] == "VALIDATION_ERROR"
            print("=> Verified: Modifying author_display_name is strictly forbidden (400 VALIDATION_ERROR).")

            # 8b: Chỉnh sửa các trường cho phép (title, short_content, content, media_url) không bắt buộc có đủ
            res_edit = await client.put(
                f"/api/v1/admin/rooms/1/artworks/{ctx['approved_art1_id']}",
                json={
                    "title": "Chiếc bình pha lê tái sinh",
                    "short_content": "Tóm tắt đã hiệu đính",
                    "content": "Nội dung đầy đủ mới...",
                    "media_url": "https://cdn.exhibition.com/artworks/updated.webp",
                },
                headers=admin_headers,
            )
            assert res_edit.status_code == 200, res_edit.text
            assert res_edit.json()["data"]["id"] == str(ctx["approved_art1_id"])

            async with TestingSessionLocal() as session:
                updated_art = await session.get(Artwork, ctx["approved_art1_id"])
                assert updated_art.title == "Chiếc bình pha lê tái sinh"
                assert updated_art.short_content == "Tóm tắt đã hiệu đính"
                assert updated_art.content == "Nội dung đầy đủ mới..."
                assert updated_art.media_url == "https://cdn.exhibition.com/artworks/updated.webp"
                # Tuyệt đối author_display_name không thay đổi
                assert updated_art.author_display_name == "Bụi Thời Gian"

                edit_audit = (await session.execute(
                    select(AdminAuditLog).where(
                        AdminAuditLog.artwork_id == ctx["approved_art1_id"],
                        AdminAuditLog.action_type == "UPDATE",
                    )
                )).scalar_one_or_none()
                assert edit_audit is not None, "Update audit log must exist"
            print("=> PASSED: Edit approved artwork (preserving author_display_name) confirmed.\n")

            # -----------------------------------------------------------------
            # Test 9: 9.2.3 Archive tác phẩm biến mất khỏi gallery
            # -----------------------------------------------------------------
            print("--- Test 9: 9.2.3 Archive artwork ---")
            res_archive = await client.patch(
                f"/api/v1/admin/rooms/1/artworks/{ctx['approved_art1_id']}/archive",
                json={
                    "admin_note": "Tạm thời gỡ bỏ khỏi triển lãm theo yêu cầu giải quyết khiếu nại."
                },
                headers=admin_headers,
            )
            assert res_archive.status_code == 200, res_archive.text
            assert res_archive.json()["data"]["status"] == "ARCHIVED"

            # Check public gallery for Room 1: approved_art1 should NO LONGER appear
            res_public_room1 = await client.get("/api/v1/rooms/1/artworks")
            assert res_public_room1.status_code == 200
            public_items = res_public_room1.json()["data"]["items"]
            assert all(item["id"] != str(ctx["approved_art1_id"]) for item in public_items), "Archived artwork must not be in public gallery"

            async with TestingSessionLocal() as session:
                arch_audit = (await session.execute(
                    select(AdminAuditLog).where(
                        AdminAuditLog.artwork_id == ctx["approved_art1_id"],
                        AdminAuditLog.action_type == "ARCHIVE",
                    )
                )).scalar_one_or_none()
                assert arch_audit is not None, "Archive audit log must exist"
            print("=> PASSED: Artwork archived and verified removed from public gallery.\n")

            # -----------------------------------------------------------------
            # Test 10: 9.2.4 Lấy tất cả các loại lá và số lượng từng loại (Phòng 3)
            # -----------------------------------------------------------------
            print("--- Test 10: 9.2.4 Get leaf categories & stats (Room 3) ---")
            # 10a: Regular user is forbidden -> 403
            res_reg_leaf = await client.get("/api/v1/admin/rooms/3/artworks/leaf-categories", headers=regular_headers)
            assert res_reg_leaf.status_code == 403, res_reg_leaf.text

            # 10b: Room 1 is invalid room type -> 400 INVALID_ROOM_TYPE
            res_r1_leaf = await client.get("/api/v1/admin/rooms/1/artworks/leaf-categories", headers=admin_headers)
            assert res_r1_leaf.status_code == 400, res_r1_leaf.text
            assert res_r1_leaf.json()["error_code"] == "INVALID_ROOM_TYPE"

            # 10c: Room 3 -> 200 OK
            res_r3_leaf = await client.get("/api/v1/admin/rooms/3/artworks/leaf-categories", headers=admin_headers)
            assert res_r3_leaf.status_code == 200, res_r3_leaf.text
            leaf_data = res_r3_leaf.json()["data"]
            assert leaf_data["room_id"] == 3
            assert leaf_data["room_code"] == "COMMUNITY"
            assert "total_leaves" in leaf_data
            assert len(leaf_data["categories"]) == 4

            leaf_cats = [c["category"] for c in leaf_data["categories"]]
            assert "ENCOURAGEMENT" in leaf_cats
            assert "HEALING" in leaf_cats
            assert "GRATITUDE" in leaf_cats
            assert "PERSPECTIVE" in leaf_cats

            for c in leaf_data["categories"]:
                assert "label" in c
                assert "color_code" in c
                assert "total_count" in c
                assert "approved_count" in c
                assert "pending_count" in c

            # Test alias /categories
            res_r3_alias = await client.get("/api/v1/admin/rooms/3/artworks/categories", headers=admin_headers)
            assert res_r3_alias.status_code == 200, res_r3_alias.text

            print(f"=> PASSED: 9.2.4 Leaf categories and counts verified: {leaf_data['categories']}\n")

            print("================ ALL PLAN 09 TESTS PASSED 100% ================\n")


if __name__ == "__main__":
    asyncio.run(run_all_tests())

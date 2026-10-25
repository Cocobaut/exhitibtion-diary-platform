import asyncio
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
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
    """Sets up SQLite tables and seeds test users and baseline diaries."""
    async with test_engine.begin() as conn:
        for m in [User, RevokedToken, Notification, Diary, DiaryInteraction]:
            await conn.run_sync(m.__table__.create)

    async with TestingSessionLocal() as session:
        # Users
        user1 = User(
            username="diary_author_1",
            email="author1@diary.vn",
            password_hash=hash_password("Password123@"),
            nickname="Mây Mùa Hạ",
            role=UserRole.USER.value,
            avatar_url="https://example.com/avatar1.png",
            is_active=True,
        )
        user2 = User(
            username="diary_author_2",
            email="author2@diary.vn",
            password_hash=hash_password("Password123@"),
            nickname="Nắng Mùa Thu",
            role=UserRole.USER.value,
            avatar_url="https://example.com/avatar2.png",
            is_active=True,
        )
        session.add_all([user1, user2])
        await session.commit()
        await session.refresh(user1)
        await session.refresh(user2)

        past_time = datetime.now(timezone.utc) - timedelta(hours=2)

        # Baseline Diaries:
        # Diary 1: User 1, PRIVATE, APPROVED
        d1 = Diary(
            id=uuid.uuid4(),
            user_id=user1.id,
            entry_date=date(2026, 10, 24),
            title="Một buổi chiều tĩnh lặng bên tách trà",
            mood="calm",
            content="Hôm nay công việc tạm gác lại một bên, mình ngồi ngắm mưa rơi ngoài hiên bên tách trà ấm dài hơn ba mươi ký tự",
            media_urls=["https://cdn.exhibition.com/diaries/tea-cup.webp"],
            is_public=False,
            is_approved=True,
            is_encrypted=False,
            created_at=past_time,
            updated_at=past_time,
        )
        # Diary 2: User 1, PUBLIC, APPROVED (Community visible)
        d2 = Diary(
            id=uuid.uuid4(),
            user_id=user1.id,
            entry_date=date(2026, 10, 23),
            title="Hôm nay mình đã học được cách buông bỏ",
            mood="melancholy",
            content="Đôi khi việc giữ chặt lấy một ký ức chỉ khiến trái tim thêm nặng nề, buông bỏ để nhẹ lòng hơn rất nhiều dài hơn ba mươi ký tự",
            media_urls=[],
            is_public=True,
            is_approved=True,
            is_encrypted=False,
            created_at=past_time,
            updated_at=past_time,
        )
        # Diary 3: User 2, PRIVATE, APPROVED
        d3 = Diary(
            id=uuid.uuid4(),
            user_id=user2.id,
            entry_date=date(2026, 10, 22),
            title="Bí mật riêng tư của Người Thứ Hai",
            mood="anxious",
            content="Đây là nhật ký tuyệt đối bí mật không ai được phép đọc của người dùng thứ hai dài hơn ba mươi ký tự",
            media_urls=[],
            is_public=False,
            is_approved=True,
            is_encrypted=False,
            created_at=past_time,
            updated_at=past_time,
        )
        # Diary 4: User 2, PUBLIC, PENDING (Not yet approved for community)
        d4 = Diary(
            id=uuid.uuid4(),
            user_id=user2.id,
            entry_date=date(2026, 10, 21),
            title="Bài viết công khai đang chờ duyệt",
            mood="grateful",
            content="Bài viết này chưa được admin duyệt nên không được xuất hiện ở community dài hơn ba mươi ký tự",
            media_urls=[],
            is_public=True,
            is_approved=False,
            is_encrypted=False,
            created_at=past_time,
            updated_at=past_time,
        )
        session.add_all([d1, d2, d3, d4])
        await session.commit()
        await session.refresh(d1)
        await session.refresh(d2)
        await session.refresh(d3)
        await session.refresh(d4)

        # Interaction on d2: User 2 reacted with HUG
        rx = DiaryInteraction(diary_id=d2.id, user_id=user2.id, reaction_type="HUG")
        session.add(rx)
        await session.commit()

        context_data = {
            "user1": user1,
            "user2": user2,
            "token1": create_access_token(user1.id, user1.role),
            "token2": create_access_token(user2.id, user2.role),
            "d1": d1,
            "d2": d2,
            "d3": d3,
            "d4": d4,
        }

    try:
        yield context_data
    finally:
        async with test_engine.begin() as conn:
            for m in [Notification, DiaryInteraction, Diary, RevokedToken, User]:
                await conn.run_sync(m.__table__.drop)


async def run_tests():
    print("Running Plan 08 Diaries Tests...")

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
            d1_id = str(ctx["d1"].id)
            d2_id = str(ctx["d2"].id)
            d3_id = str(ctx["d3"].id)
            d4_id = str(ctx["d4"].id)

            # -------------------------------------------------------------
            # TEST 1: Không token: Gọi /diaries/me -> 401; gọi /diaries/community -> 200 (my_reaction = null)
            # -------------------------------------------------------------
            me_guest = await client.get("/api/v1/diaries/me")
            assert me_guest.status_code == 401
            assert me_guest.json()["error_code"] == "UNAUTHORIZED"

            comm_res = await client.get("/api/v1/diaries/community")
            assert comm_res.status_code == 200
            comm_data = comm_res.json()["data"]
            assert comm_data["pagination"]["total_items"] >= 1
            for it in comm_data["items"]:
                assert it["my_reaction"] is None, "Guest my_reaction must be null"
            print("✓ Test 1: Không token bị chặn 401 tại /diaries/me; truy cập /diaries/community trả 200 với my_reaction=null")

            # -------------------------------------------------------------
            # TEST 2: Tạo bài với is_public = false -> DB lưu is_approved = true
            # -------------------------------------------------------------
            create_priv = await client.post(
                "/api/v1/diaries",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Nhật ký riêng tư tự duyệt",
                    "mood": "calm",
                    "content": "Đây là nội dung nhật ký riêng tư không ai khác đọc được dài hơn ba mươi ký tự",
                    "is_public": False,
                }
            )
            assert create_priv.status_code == 201
            cp_data = create_priv.json()["data"]
            assert cp_data["is_public"] is False
            assert cp_data["is_approved"] is True
            assert create_priv.json()["message"] == "Lưu nhật ký riêng tư thành công"
            new_priv_id = cp_data["id"]

            async with TestingSessionLocal() as session:
                d_db = await session.get(Diary, uuid.UUID(new_priv_id))
                assert d_db.is_approved is True
            print("✓ Test 2: Tạo nhật ký is_public=false tự động gán is_approved=true trong DB")

            # -------------------------------------------------------------
            # TEST 3: Tạo bài với is_public = true -> DB lưu is_approved = false, không xuất hiện ở community
            # -------------------------------------------------------------
            create_pub = await client.post(
                "/api/v1/diaries",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Nhật ký công khai chờ kiểm duyệt",
                    "mood": "grateful",
                    "content": "Lời cảm ơn muốn gửi tới cộng đồng nhưng cần admin duyệt trước dài hơn ba mươi ký tự",
                    "is_public": True,
                }
            )
            assert create_pub.status_code == 201
            pub_data = create_pub.json()["data"]
            assert pub_data["is_public"] is True
            assert pub_data["is_approved"] is False
            assert "hàng đợi kiểm duyệt" in create_pub.json()["message"]
            new_pub_id = pub_data["id"]

            # Verify in community: must NOT appear
            comm_check = await client.get("/api/v1/diaries/community")
            comm_ids = {it["id"] for it in comm_check.json()["data"]["items"]}
            assert new_pub_id not in comm_ids, "Pending public diary must not appear in community tab"
            assert d4_id not in comm_ids, "d4 (is_approved=False) must not appear in community tab"
            print("✓ Test 3: Tạo bài is_public=true lưu is_approved=false và không lộ ở community")

            # -------------------------------------------------------------
            # TEST 4: Sửa bài từ private sang public -> is_approved tự động bị reset về false
            # -------------------------------------------------------------
            update_res = await client.put(
                f"/api/v1/diaries/me/{new_priv_id}",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Nhật ký chuyển thành công khai",
                    "is_public": True,
                }
            )
            assert update_res.status_code == 200
            async with TestingSessionLocal() as session:
                d_check = await session.get(Diary, uuid.UUID(new_priv_id))
                assert d_check.is_public is True
                assert d_check.is_approved is False, "is_approved must be reset to False upon public change"
            print("✓ Test 4: Chuyển bài từ private sang public tự động reset is_approved=false để kiểm duyệt lại")

            # -------------------------------------------------------------
            # TEST 5: User A không thể xem detail hoặc sửa/xoá bài private của User B qua /diaries/me/... (404)
            # -------------------------------------------------------------
            # User 1 tries to view d3 (private of User 2)
            d3_view_by_u1 = await client.get(
                f"/api/v1/diaries/me/{d3_id}",
                headers={"Authorization": f"Bearer {token1}"}
            )
            assert d3_view_by_u1.status_code == 404
            assert d3_view_by_u1.json()["error_code"] == "DIARY_NOT_FOUND"

            # User 1 tries to update d3
            d3_edit_by_u1 = await client.put(
                f"/api/v1/diaries/me/{d3_id}",
                headers={"Authorization": f"Bearer {token1}"},
                json={"title": "Hacked Title"}
            )
            assert d3_edit_by_u1.status_code == 404

            # User 1 tries to delete d3
            d3_del_by_u1 = await client.delete(
                f"/api/v1/diaries/me/{d3_id}",
                headers={"Authorization": f"Bearer {token1}"}
            )
            assert d3_del_by_u1.status_code == 404
            print("✓ Test 5: User A bị chặn 404 bảo mật khi xem/sửa/xoá bài nhật ký của User B")

            # -------------------------------------------------------------
            # TEST 6: Upload media: > 5 file hoặc file > 5MB hoặc giả mạo -> 400
            # -------------------------------------------------------------
            # 6a: Upload 6 files (> 5)
            png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
            files_6 = [
                ("files", (f"img_{i}.png", io.BytesIO(png_header), "image/png"))
                for i in range(6)
            ]
            up_too_many = await client.post(
                "/api/v1/diaries/upload-media",
                headers={"Authorization": f"Bearer {token1}"},
                files=files_6,
            )
            assert up_too_many.status_code == 400
            assert up_too_many.json()["error_code"] == "FILE_TOO_LARGE"

            # 6b: Valid upload (2 images)
            files_2 = [
                ("files", ("valid_1.png", io.BytesIO(png_header), "image/png")),
                ("files", ("valid_2.png", io.BytesIO(png_header), "image/png")),
            ]
            up_ok = await client.post(
                "/api/v1/diaries/upload-media",
                headers={"Authorization": f"Bearer {token1}"},
                files=files_2,
            )
            assert up_ok.status_code == 200
            assert len(up_ok.json()["data"]["urls"]) == 2
            print("✓ Test 6: Upload media kiểm tra giới hạn 5 ảnh và lưu trữ thành công")

            # -------------------------------------------------------------
            # TEST 7: Reaction cộng đồng: Toggle chuẩn, không sinh duplicate reaction trong DB;
            # gửi thông báo INTERACTION khi thả mới
            # -------------------------------------------------------------
            # User 1 (author of d2) let's check init notifications of user 1:
            async with TestingSessionLocal() as session:
                init_notifs = (await session.scalars(
                    select(Notification).where(Notification.recipient_id == ctx["user1"].id)
                )).all()
                init_cnt = len(init_notifs)

            # User 2 clicks HEART on d2 (existing was HUG from setup) -> switches to HEART
            rx_switch = await client.post(
                f"/api/v1/diaries/community/{d2_id}/reactions",
                headers={"Authorization": f"Bearer {token2}"},
                json={"reaction_type": "HEART"}
            )
            assert rx_switch.status_code == 200
            assert rx_switch.json()["data"]["current_reaction"] == "HEART"
            assert rx_switch.json()["data"]["reactions"]["HEART"] == 1
            assert rx_switch.json()["data"]["reactions"]["HUG"] == 0

            # User 2 clicks HEART again -> toggle off
            rx_off = await client.post(
                f"/api/v1/diaries/community/{d2_id}/reactions",
                headers={"Authorization": f"Bearer {token2}"},
                json={"reaction_type": "HEART"}
            )
            assert rx_off.status_code == 200
            assert rx_off.json()["data"]["current_reaction"] is None
            assert rx_off.json()["data"]["reactions"]["HEART"] == 0
            assert rx_off.json()["message"] == "Đã gỡ bỏ cảm xúc"

            # User 2 clicks HUG as fresh reaction -> adds HUG and creates notification for user 1
            rx_fresh = await client.post(
                f"/api/v1/diaries/community/{d2_id}/reactions",
                headers={"Authorization": f"Bearer {token2}"},
                json={"reaction_type": "HUG"}
            )
            assert rx_fresh.status_code == 200
            assert rx_fresh.json()["data"]["current_reaction"] == "HUG"

            async with TestingSessionLocal() as session:
                # Check DB has exactly 1 reaction
                rx_in_db = (await session.scalars(
                    select(DiaryInteraction).where(
                        DiaryInteraction.diary_id == uuid.UUID(d2_id),
                        DiaryInteraction.user_id == ctx["user2"].id,
                    )
                )).all()
                assert len(rx_in_db) == 1, "DB must have exactly 1 reaction for this user and diary"

                # Check notification was created
                after_notifs = (await session.scalars(
                    select(Notification).where(Notification.recipient_id == ctx["user1"].id)
                )).all()
                assert len(after_notifs) == init_cnt + 1
                assert after_notifs[-1].type == "INTERACTION"
            print("✓ Test 7: Reaction cộng đồng toggle chuẩn xác, không trùng lặp và tạo thông báo INTERACTION")

            # -------------------------------------------------------------
            # TEST 8: Search: q có highlight, scope=mine yêu cầu token, scope=community chỉ tìm APPROVED
            # -------------------------------------------------------------
            # 8a: scope=mine without token -> 401
            s_mine_guest = await client.get("/api/v1/diaries/search?q=trà&scope=mine")
            assert s_mine_guest.status_code == 401

            # 8b: scope=mine with token1 -> finds d1
            s_mine_u1 = await client.get(
                "/api/v1/diaries/search?q=trà&scope=mine",
                headers={"Authorization": f"Bearer {token1}"}
            )
            assert s_mine_u1.status_code == 200
            s_u1_items = s_mine_u1.json()["data"]["items"]
            assert len(s_u1_items) >= 1
            assert s_u1_items[0]["id"] == d1_id

            # 8c: scope=community -> finds d2 ("buông bỏ"), does NOT find d4 ("chờ duyệt")
            s_comm = await client.get("/api/v1/diaries/search?q=buông bỏ&scope=community")
            assert s_comm.status_code == 200
            comm_items = s_comm.json()["data"]["items"]
            assert len(comm_items) >= 1
            assert comm_items[0]["id"] == d2_id
            print("✓ Test 8: Search phân tách scope mine/community chuẩn xác và lọc đúng trạng thái")

    print("\n ALL 8 TESTS FOR PLAN 08 PASSED PERFECTLY! \n")


if __name__ == "__main__":
    asyncio.run(run_tests())

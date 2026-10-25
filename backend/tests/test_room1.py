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
    """Sets up SQLite tables and seeds test users, rooms, and baseline artworks."""
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
            username="author_user",
            email="author@example.com",
            password_hash=hash_password("AuthorPassword@123"),
            nickname="Tác Giả Chính",
            role=UserRole.USER.value,
            avatar_url="https://example.com/author.png",
            is_active=True,
        )
        user2 = User(
            username="react_user",
            email="react@example.com",
            password_hash=hash_password("ReactPassword@123"),
            nickname="Người Đồng Cảm",
            role=UserRole.USER.value,
            avatar_url="https://example.com/react.png",
            is_active=True,
        )
        user3 = User(
            username="third_user",
            email="third@example.com",
            password_hash=hash_password("ThirdPassword@123"),
            nickname="Người Thứ Ba",
            role=UserRole.USER.value,
            avatar_url="https://example.com/third.png",
            is_active=True,
        )
        session.add_all([user1, user2, user3])
        await session.commit()
        await session.refresh(user1)
        await session.refresh(user2)
        await session.refresh(user3)

        past_time = datetime.now(timezone.utc) - timedelta(hours=1)

        # 3. Seed Artworks:
        # Art 1: Room 1, APPROVED, user1 (Named author)
        art1 = Artwork(
            id=uuid.uuid4(),
            user_id=user1.id,
            room_id=1,
            title="Mảnh vỡ thời gian mùa thu",
            title_en="Autumn Broken Pieces",
            author_display_name="Kẻ Độc Hành",
            is_anonymous=False,
            short_content="Tóm tắt về những mảnh vỡ thời gian",
            content="Nội dung chi tiết về những mảnh vỡ đổ vỡ thời gian mùa thu dài hơn 30 ký tự",
            content_en="Detailed story about autumn broken fragments",
            media_url="https://example.com/art1.jpg",
            status="APPROVED",
            view_count=10,
            created_at=past_time,
        )
        # Art 2: Room 1, APPROVED, user1 (Anonymous)
        art2 = Artwork(
            id=uuid.uuid4(),
            user_id=user1.id,
            room_id=1,
            title="Nỗi buồn không tên giấu kín",
            author_display_name="Có Tên Nhưng Ẩn",
            is_anonymous=True,
            short_content="Tóm tắt nỗi buồn giấu kín tâm hồn",
            content="Nội dung bài viết về nỗi buồn giấu kín sâu thẳm tâm can dài hơn 30 ký tự",
            media_url=None,
            status="APPROVED",
            view_count=5,
            created_at=past_time,
        )
        # Art 3: Room 1, PENDING (Should not appear in gallery)
        art3 = Artwork(
            id=uuid.uuid4(),
            user_id=user1.id,
            room_id=1,
            title="Tác phẩm đang chờ kiểm duyệt",
            author_display_name=None,
            is_anonymous=False,
            short_content="Tóm tắt tác phẩm chờ duyệt bài",
            content="Nội dung tác phẩm đang chờ duyệt bài viết dài hơn 30 ký tự",
            media_url=None,
            status="PENDING",
            created_at=past_time,
        )
        # Art 4: Room 2, APPROVED (Room 2 artwork should not appear in Room 1)
        art4 = Artwork(
            id=uuid.uuid4(),
            user_id=user1.id,
            room_id=2,
            title="Tia nắng hy vọng sớm mai",
            author_display_name=None,
            is_anonymous=False,
            short_content="Tóm tắt hy vọng phòng hai",
            content="Nội dung hy vọng thuộc phòng số hai dài hơn 30 ký tự",
            media_url=None,
            status="APPROVED",
            created_at=past_time,
        )
        session.add_all([art1, art2, art3, art4])
        await session.commit()
        await session.refresh(art1)
        await session.refresh(art2)

        # 4. Interactions: Art1 gets 2 reactions (HEART from user2, HUG from user3)
        rx1 = ArtworkInteraction(artwork_id=art1.id, user_id=user2.id, reaction_type="HEART")
        rx2 = ArtworkInteraction(artwork_id=art1.id, user_id=user3.id, reaction_type="HUG")
        session.add_all([rx1, rx2])
        await session.commit()

        context_data = {
            "user1": user1,
            "user2": user2,
            "user3": user3,
            "token1": create_access_token(user1.id, user1.role),
            "token2": create_access_token(user2.id, user2.role),
            "token3": create_access_token(user3.id, user3.role),
            "art1": art1,
            "art2": art2,
            "art3": art3,
            "art4": art4,
        }

    try:
        yield context_data
    finally:
        async with test_engine.begin() as conn:
            for m in [Notification, ArtworkInteraction, Artwork, Room, RevokedToken, User]:
                await conn.run_sync(m.__table__.drop)


async def run_tests():
    print("Running Plan 05 Room 1 (Broken) Tests...")

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

            # -------------------------------------------------------------
            # TEST 1: List chỉ chứa tác phẩm room_id=1, APPROVED
            # -------------------------------------------------------------
            res = await client.get("/api/v1/rooms/1/artworks")
            assert res.status_code == 200, f"Expected 200, got {res.status_code}"
            body = res.json()
            assert body["success"] is True
            items = body["data"]["items"]
            assert len(items) == 2, f"Expected 2 approved items in room 1, got {len(items)}"
            item_ids = {it["id"] for it in items}
            assert art1_id in item_ids
            assert art2_id in item_ids
            assert art3_id not in item_ids, "Pending art must not appear"
            assert art4_id not in item_ids, "Room 2 art must not appear in room 1"
            assert "content" not in items[0], "List item must not expose 'content'"
            assert "user_id" not in items[0], "List item must not expose 'user_id'"
            print("✓ Test 1: List chỉ chứa tác phẩm room_id=1 APPROVED, không lộ PENDING hay phòng khác")

            # -------------------------------------------------------------
            # TEST 2: Khách không token (my_reaction=null); filter=my_artworks -> 401
            # -------------------------------------------------------------
            guest_res = await client.get("/api/v1/rooms/1/artworks")
            for it in guest_res.json()["data"]["items"]:
                assert it["my_reaction"] is None, "Guest my_reaction must be null"

            my_artworks_guest = await client.get("/api/v1/rooms/1/artworks?filter=my_artworks")
            assert my_artworks_guest.status_code == 401, "filter=my_artworks without token must return 401"
            assert my_artworks_guest.json()["error_code"] == "UNAUTHORIZED"
            print("✓ Test 2: Khách truy cập my_reaction là null, filter=my_artworks trả về 401 khi thiếu token")

            # -------------------------------------------------------------
            # TEST 3: Token hết hạn trên endpoint public -> vẫn 200, như khách
            # -------------------------------------------------------------
            expired_token = create_access_token(
                ctx["user1"].id,
                ctx["user1"].role,
                expires_delta=timedelta(seconds=-10),
            )
            exp_res = await client.get(
                "/api/v1/rooms/1/artworks",
                headers={"Authorization": f"Bearer {expired_token}"}
            )
            assert exp_res.status_code == 200, f"Expired token on public endpoint must return 200, got {exp_res.status_code}"
            assert exp_res.json()["data"]["items"][0]["my_reaction"] is None
            print("✓ Test 3: Token hết hạn trên endpoint public vẫn trả về 200 và coi như khách")

            # -------------------------------------------------------------
            # TEST 4: most_sympathetic sắp xếp đúng theo tổng reaction
            # -------------------------------------------------------------
            sym_res = await client.get("/api/v1/rooms/1/artworks?filter=most_sympathetic")
            assert sym_res.status_code == 200
            sym_items = sym_res.json()["data"]["items"]
            # art1 has 2 reactions, art2 has 0 reactions -> art1 must be first
            assert sym_items[0]["id"] == art1_id
            assert sym_items[0]["reactions"]["total"] == 2
            assert sym_items[1]["id"] == art2_id
            assert sym_items[1]["reactions"]["total"] == 0
            print("✓ Test 4: Lọc most_sympathetic sắp xếp chính xác theo tổng reaction")

            # -------------------------------------------------------------
            # TEST 4b: Lọc danh sách tác phẩm theo title và author_display_name
            # -------------------------------------------------------------
            filter_title_res = await client.get("/api/v1/rooms/1/artworks?title=mùa thu")
            assert filter_title_res.status_code == 200
            f_title_items = filter_title_res.json()["data"]["items"]
            assert len(f_title_items) == 1
            assert f_title_items[0]["id"] == art1_id

            filter_author_res = await client.get("/api/v1/rooms/1/artworks?author_display_name=Kẻ Độc Hành")
            assert filter_author_res.status_code == 200
            f_auth_items = filter_author_res.json()["data"]["items"]
            assert len(f_auth_items) == 1
            assert f_auth_items[0]["id"] == art1_id

            filter_none_res = await client.get("/api/v1/rooms/1/artworks?title=khong_co_tac_pham_nao")
            assert filter_none_res.status_code == 200
            assert len(filter_none_res.json()["data"]["items"]) == 0
            print("✓ Test 4b: Lọc danh sách tác phẩm theo title và author_display_name chính xác")

            # -------------------------------------------------------------
            # TEST 5: is_anonymous=true -> author_display_name == "Người Bạn Ẩn Danh"
            # -------------------------------------------------------------
            # art1 is_anonymous=False with author_display_name="Kẻ Độc Hành"
            art1_item = next(it for it in items if it["id"] == art1_id)
            assert art1_item["author_display_name"] == "Kẻ Độc Hành"
            # art2 is_anonymous=True -> must be "Người Bạn Ẩn Danh"
            art2_item = next(it for it in items if it["id"] == art2_id)
            assert art2_item["author_display_name"] == "Người Bạn Ẩn Danh"
            assert art2_item["is_anonymous"] is True
            print("✓ Test 5: is_anonymous=true ánh xạ tên thành 'Người Bạn Ẩn Danh' và ẩn user_id")

            # -------------------------------------------------------------
            # TEST 6: Detail tăng view_count đúng 1; detail PENDING -> 404; phòng 2 -> 404
            # -------------------------------------------------------------
            detail1_before = await client.get(f"/api/v1/rooms/1/artworks/{art1_id}")
            assert detail1_before.status_code == 200
            count1 = detail1_before.json()["data"]["view_count"]
            assert count1 == 11, f"Expected view_count 11, got {count1}"

            detail1_after = await client.get(f"/api/v1/rooms/1/artworks/{art1_id}")
            assert detail1_after.status_code == 200
            count2 = detail1_after.json()["data"]["view_count"]
            assert count2 == 12, f"Expected view_count 12, got {count2}"

            # Detail PENDING art -> 404
            pending_res = await client.get(f"/api/v1/rooms/1/artworks/{art3_id}")
            assert pending_res.status_code == 404
            assert pending_res.json()["error_code"] == "ARTWORK_NOT_FOUND"

            # Detail Room 2 art -> 404
            room2_res = await client.get(f"/api/v1/rooms/1/artworks/{art4_id}")
            assert room2_res.status_code == 404
            assert room2_res.json()["error_code"] == "ARTWORK_NOT_FOUND"
            print("✓ Test 6: Detail tăng view_count nguyên tử đúng 1; bài PENDING và bài phòng 2 trả 404")

            # -------------------------------------------------------------
            # TEST 7: Reaction quy trình: thêm -> đổi loại -> bấm lại cùng loại (toggle off)
            # -------------------------------------------------------------
            # User1 (author) reacts on art2 with SYMPATHY
            rx_step1 = await client.post(
                f"/api/v1/rooms/1/artworks/{art2_id}/reactions",
                headers={"Authorization": f"Bearer {token1}"},
                json={"reaction_type": "SYMPATHY"}
            )
            assert rx_step1.status_code == 200
            assert rx_step1.json()["data"]["current_reaction"] == "SYMPATHY"
            assert rx_step1.json()["data"]["reactions_summary"]["SYMPATHY"] == 1
            assert rx_step1.json()["message"] == "Cảm ơn bạn đã gửi sự đồng cảm đến tác phẩm"

            # User1 switches to HUG
            rx_step2 = await client.post(
                f"/api/v1/rooms/1/artworks/{art2_id}/reactions",
                headers={"Authorization": f"Bearer {token1}"},
                json={"reaction_type": "HUG"}
            )
            assert rx_step2.status_code == 200
            assert rx_step2.json()["data"]["current_reaction"] == "HUG"
            assert rx_step2.json()["data"]["reactions_summary"]["SYMPATHY"] == 0
            assert rx_step2.json()["data"]["reactions_summary"]["HUG"] == 1
            assert rx_step2.json()["message"] == "Cảm ơn bạn đã gửi sự đồng cảm đến tác phẩm"

            # User1 clicks HUG again -> toggle off
            rx_step3 = await client.post(
                f"/api/v1/rooms/1/artworks/{art2_id}/reactions",
                headers={"Authorization": f"Bearer {token1}"},
                json={"reaction_type": "HUG"}
            )
            assert rx_step3.status_code == 200
            assert rx_step3.json()["data"]["current_reaction"] is None
            assert rx_step3.json()["data"]["reactions_summary"]["HUG"] == 0
            assert rx_step3.json()["data"]["reactions_summary"]["total"] == 0
            assert rx_step3.json()["message"] == "Đã gỡ bỏ cảm xúc"
            print("✓ Test 7: Thả cảm xúc -> đổi loại -> gỡ bỏ (toggle off) thành công và đảm bảo tối đa 1 reaction")

            # -------------------------------------------------------------
            # TEST 8: Reaction INSPIRED -> 400; không token -> 401
            # -------------------------------------------------------------
            bad_rx = await client.post(
                f"/api/v1/rooms/1/artworks/{art1_id}/reactions",
                headers={"Authorization": f"Bearer {token1}"},
                json={"reaction_type": "INSPIRED"}
            )
            assert bad_rx.status_code == 400
            assert bad_rx.json()["error_code"] == "VALIDATION_ERROR"

            no_token_rx = await client.post(
                f"/api/v1/rooms/1/artworks/{art1_id}/reactions",
                json={"reaction_type": "HEART"}
            )
            assert no_token_rx.status_code == 401
            print("✓ Test 8: Reaction INSPIRED bị chặn 400 và không có token bị chặn 401")

            # -------------------------------------------------------------
            # TEST 9: Reaction lần đầu tạo Notification INTERACTION (sender_id=None)
            # Tác giả tự react không tạo; đổi loại không tạo thêm
            # -------------------------------------------------------------
            # User1 is author of art1. Let's see current notifications of user1:
            async with TestingSessionLocal() as session:
                init_notifs = (await session.scalars(
                    select(Notification).where(Notification.recipient_id == ctx["user1"].id)
                )).all()
                init_count = len(init_notifs)

            # 9a. User1 (author) reacts on art1 -> should NOT create notification
            await client.post(
                f"/api/v1/rooms/1/artworks/{art1_id}/reactions",
                headers={"Authorization": f"Bearer {token1}"},
                json={"reaction_type": "HEART"}
            )
            async with TestingSessionLocal() as session:
                notifs_after_self = (await session.scalars(
                    select(Notification).where(Notification.recipient_id == ctx["user1"].id)
                )).all()
                assert len(notifs_after_self) == init_count, "Author self-reaction must not create notification"

            # 9b. User2 (other user) reacts on art2 for the first time -> creates 1 notification
            await client.post(
                f"/api/v1/rooms/1/artworks/{art2_id}/reactions",
                headers={"Authorization": f"Bearer {token2}"},
                json={"reaction_type": "HUG"}
            )
            async with TestingSessionLocal() as session:
                notifs_after_other = (await session.scalars(
                    select(Notification).where(Notification.recipient_id == ctx["user1"].id)
                )).all()
                assert len(notifs_after_other) == init_count + 1, "First time reaction from other user must create 1 notification"
                new_notif = notifs_after_other[-1]
                assert new_notif.type == "INTERACTION"
                assert new_notif.sender_id is None, "sender_id must be NULL for anonymous interaction notification"
                assert "Ôm ấm áp" in new_notif.body

            # 9c. User2 switches reaction to HEART -> should NOT create an additional notification
            await client.post(
                f"/api/v1/rooms/1/artworks/{art2_id}/reactions",
                headers={"Authorization": f"Bearer {token2}"},
                json={"reaction_type": "HEART"}
            )
            async with TestingSessionLocal() as session:
                notifs_after_switch = (await session.scalars(
                    select(Notification).where(Notification.recipient_id == ctx["user1"].id)
                )).all()
                assert len(notifs_after_switch) == init_count + 1, "Switching reaction must not create additional notification"
            print("✓ Test 9: Reaction lần đầu tạo thông báo INTERACTION sender_id=NULL; tự react hoặc đổi loại không sinh thêm")

            # -------------------------------------------------------------
            # TEST 10: Search q rỗng -> 400; scope=mine không token -> 401; kết quả có <em>
            # -------------------------------------------------------------
            empty_q = await client.get("/api/v1/rooms/1/search?q=")
            assert empty_q.status_code == 400
            assert empty_q.json()["error_code"] == "VALIDATION_ERROR"

            mine_guest = await client.get("/api/v1/rooms/1/search?q=mùa&scope=mine")
            assert mine_guest.status_code == 401

            search_ok = await client.get("/api/v1/rooms/1/search?q=mùa")
            assert search_ok.status_code == 200
            s_data = search_ok.json()["data"]
            assert s_data["pagination"]["total_hits"] >= 1
            assert "total_pages" not in s_data["pagination"], "Search pagination must not contain total_pages"
            # Title should have <em>
            first_hit = s_data["items"][0]
            assert "<em>" in first_hit["title"] or "<em>" in str(first_hit.get("highlight", {}))
            assert "reactions_total" in first_hit

            # Test 10-field search across title_en, content_en, author_display_name
            search_en_title = await client.get("/api/v1/rooms/1/search?q=Autumn")
            assert search_en_title.status_code == 200
            assert search_en_title.json()["data"]["pagination"]["total_hits"] >= 1
            assert search_en_title.json()["data"]["items"][0]["id"] == art1_id

            search_en_content = await client.get("/api/v1/rooms/1/search?q=fragments")
            assert search_en_content.status_code == 200
            assert search_en_content.json()["data"]["pagination"]["total_hits"] >= 1
            assert search_en_content.json()["data"]["items"][0]["id"] == art1_id
            assert "content" in search_en_content.json()["data"]["items"][0]
            assert "short_content" in search_en_content.json()["data"]["items"][0]

            # Search keyword only in short_content
            search_short = await client.get("/api/v1/rooms/1/search?q=Tóm tắt")
            assert search_short.status_code == 200
            assert search_short.json()["data"]["pagination"]["total_hits"] >= 1
            hit_short = search_short.json()["data"]["items"][0]
            assert hit_short["id"] == art1_id
            assert "short_content" in hit_short["highlight"]
            assert "<em>Tóm tắt</em>" in hit_short["highlight"]["short_content"][0]

            # Search keyword only in content
            search_content = await client.get("/api/v1/rooms/1/search?q=đổ vỡ")
            assert search_content.status_code == 200
            assert search_content.json()["data"]["pagination"]["total_hits"] >= 1
            hit_content = search_content.json()["data"]["items"][0]
            assert hit_content["id"] == art1_id
            assert "content" in hit_content["highlight"]
            assert "<em>đổ vỡ</em>" in hit_content["highlight"]["content"][0]

            search_author = await client.get("/api/v1/rooms/1/search?q=Kẻ Độc Hành")
            assert search_author.status_code == 200
            assert search_author.json()["data"]["pagination"]["total_hits"] >= 1
            assert search_author.json()["data"]["items"][0]["id"] == art1_id

            print("✓ Test 10: Search validation chuẩn xác, hỗ trợ 10 trường song ngữ (title, short_content, content, author) và highlight <em>")

            # -------------------------------------------------------------
            # TEST 11: Create -> 201, DB status='PENDING', media_url=None;
            # gửi status='APPROVED' vẫn PENDING; content quá ngắn -> 400;
            # bài thứ 4 trong 10 phút -> 429
            # -------------------------------------------------------------
            # 11a: Content too short -> 400
            short_res = await client.post(
                "/api/v1/rooms/1/artworks",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Tiêu đề hợp lệ",
                    "short_content": "Tóm tắt ngắn hợp lệ",
                    "content": "Quá ngắn",
                }
            )
            assert short_res.status_code == 400
            assert short_res.json()["error_code"] == "VALIDATION_ERROR"

            # 11b: Create artwork 1 (attempt to inject status="APPROVED" and media_url)
            create_res1 = await client.post(
                "/api/v1/rooms/1/artworks",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Tác phẩm thử nghiệm bài một",
                    "short_content": "Tóm tắt nội dung bài viết thử nghiệm một",
                    "content": "Nội dung bài viết thử nghiệm một hoàn toàn đầy đủ và dài hơn ba mươi ký tự",
                    "author_display_name": "Bụi Thời Gian",
                    "status": "APPROVED",
                    "media_url": "https://malicious.com/fake.jpg",
                }
            )
            assert create_res1.status_code == 201
            c1_data = create_res1.json()["data"]
            assert c1_data["status"] == "PENDING", "Status must remain PENDING"
            assert c1_data["author_display_name"] == ctx["user1"].nickname, "Client-injected author_display_name must be ignored and forced to user nickname"
            assert create_res1.json()["message"] == "Tác phẩm của bạn đang được chuẩn bị, chúng mình sẽ thông báo trong hộp tin nhắn cho bạn sau khi tác phẩm hoàn thành"

            # Verify in DB: media_url is NULL
            async with TestingSessionLocal() as session:
                art_db = await session.get(Artwork, uuid.UUID(c1_data["id"]))
                assert art_db.media_url is None, "Injected media_url must be ignored and set to NULL"
                assert art_db.status == "PENDING"

            # 11c: Create artwork 2
            create_res2 = await client.post(
                "/api/v1/rooms/1/artworks",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Tác phẩm thử nghiệm bài hai",
                    "short_content": "Tóm tắt nội dung bài viết thử nghiệm hai",
                    "content": "Nội dung bài viết thử nghiệm hai hoàn toàn đầy đủ và dài hơn ba mươi ký tự",
                }
            )
            assert create_res2.status_code == 201

            # 11d: Create artwork 3
            create_res3 = await client.post(
                "/api/v1/rooms/1/artworks",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Tác phẩm thử nghiệm bài ba",
                    "short_content": "Tóm tắt nội dung bài viết thử nghiệm ba",
                    "content": "Nội dung bài viết thử nghiệm ba hoàn toàn đầy đủ và dài hơn ba mươi ký tự",
                }
            )
            assert create_res3.status_code == 201

            # 11e: Create artwork 4 within 10 minutes -> 429 RATE_LIMITED
            create_res4 = await client.post(
                "/api/v1/rooms/1/artworks",
                headers={"Authorization": f"Bearer {token1}"},
                json={
                    "title": "Tác phẩm thử nghiệm bài bốn",
                    "short_content": "Tóm tắt nội dung bài viết thử nghiệm bốn",
                    "content": "Nội dung bài viết thử nghiệm bốn hoàn toàn đầy đủ và dài hơn ba mươi ký tự",
                }
            )
            assert create_res4.status_code == 429, f"Expected 429, got {create_res4.status_code}"
            assert create_res4.json()["error_code"] == "RATE_LIMITED"
            assert create_res4.json()["message"] == "Bạn gửi bài quá nhanh, vui lòng thử lại sau ít phút"
            print("✓ Test 11: Tạo tác phẩm 201, bảo vệ trường cấm, validate độ dài 400, rate limit bài thứ tư 429")

    print("\n ALL 11 TESTS FOR PLAN 05 PASSED PERFECTLY! \n")


if __name__ == "__main__":
    asyncio.run(run_tests())

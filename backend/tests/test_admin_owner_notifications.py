import asyncio
import uuid
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import hash_password
from app.models.artwork import Artwork
from app.models.admin_audit_log import AdminAuditLog
from app.models.notification import Notification
from app.models.room import Room
from app.models.user import User
from app.schemas.admin_rooms import ApproveArtworkRequest
from app.schemas.room1 import Room1CreateArtworkRequest
from app.schemas.room2 import Room2CreateLanternRequest
from app.schemas.room3 import Room3CreateRibbonRequest
from app.services.admin_room_service import AdminRoomService
from app.services.room1_service import Room1Service
from app.services.room2_service import Room2Service
from app.services.room3_service import Room3Service


@pytest.fixture(scope="function")
async def db_session():
    test_engine = create_async_engine(
        f"sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    TestingSession = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with test_engine.begin() as conn:
        await conn.run_sync(User.__table__.create)
        await conn.run_sync(Room.__table__.create)
        await conn.run_sync(Artwork.__table__.create)
        await conn.run_sync(Notification.__table__.create)
        await conn.run_sync(AdminAuditLog.__table__.create)

    async with TestingSession() as session:
        # Seed Rooms
        r1 = Room(id=1, room_code="ROOM_BROKEN", title="Phòng 1: Đổ vỡ")
        r2 = Room(id=2, room_code="ROOM_HOPE", title="Phòng 2: Hy vọng")
        r3 = Room(id=3, room_code="ROOM_COMMUNITY", title="Phòng 3: Cây nguyện ước")
        session.add_all([r1, r2, r3])

        # Seed Users: 1 Normal User, 2 Admins, 1 Owner
        user_pw = hash_password("Password123!")
        normal_user = User(
            id=uuid.uuid4(),
            username=f"user_{uuid.uuid4().hex[:6]}",
            email=f"user_{uuid.uuid4().hex[:6]}@test.com",
            nickname="Normal User",
            password_hash=user_pw,
            role="USER",
            is_active=True,
        )
        admin1 = User(
            id=uuid.uuid4(),
            username=f"admin1_{uuid.uuid4().hex[:6]}",
            email=f"admin1_{uuid.uuid4().hex[:6]}@test.com",
            nickname="Admin One",
            password_hash=user_pw,
            role="ADMIN",
            is_active=True,
        )
        admin2 = User(
            id=uuid.uuid4(),
            username=f"admin2_{uuid.uuid4().hex[:6]}",
            email=f"admin2_{uuid.uuid4().hex[:6]}@test.com",
            nickname="Admin Two",
            password_hash=user_pw,
            role="ADMIN",
            is_active=True,
        )
        owner = User(
            id=uuid.uuid4(),
            username=f"owner_{uuid.uuid4().hex[:6]}",
            email=f"owner_{uuid.uuid4().hex[:6]}@test.com",
            nickname="Owner Boss",
            password_hash=user_pw,
            role="OWNER",
            is_active=True,
        )
        session.add_all([normal_user, admin1, admin2, owner])
        await session.commit()

        yield session, normal_user, admin1, admin2, owner

    await test_engine.dispose()


@pytest.mark.asyncio
async def test_user_room1_submit_notifies_admins_and_owners(db_session):
    session, normal_user, admin1, admin2, owner = db_session

    req = Room1CreateArtworkRequest(
        title="Nỗi buồn ngày mưa",
        short_content="Tóm tắt ngắn về nỗi buồn",
        content="Nội dung chi tiết câu chuyện về một ngày mưa nhiều kỷ niệm đẹp và buồn.",
        is_anonymous=False,
    )
    result = await Room1Service.create_artwork(session, request=req, current_user=normal_user)
    await session.commit()

    assert result["title"] == "Nỗi buồn ngày mưa"

    # Verify notifications for Admin 1, Admin 2, and Owner
    stmt = select(Notification).where(Notification.title.like("%[Phòng 1]%"))
    notifs = (await session.execute(stmt)).scalars().all()

    recipient_ids = {n.recipient_id for n in notifs}
    assert admin1.id in recipient_ids
    assert admin2.id in recipient_ids
    assert owner.id in recipient_ids
    assert normal_user.id not in recipient_ids
    assert len(notifs) == 3


@pytest.mark.asyncio
async def test_user_room2_submit_notifies_admins_and_owners(db_session):
    session, normal_user, admin1, admin2, owner = db_session

    req = Room2CreateLanternRequest(
        title="Lồng đèn ước vọng",
        short_content="Tóm tắt",
        content="Ước nguyện hòa bình và hạnh phúc cho tương lai tốt đẹp hơn",
        target_date="2026-12-31",
        visibility="PUBLIC",
        is_anonymous=False,
    )
    msg, data = await Room2Service.create_lantern(session, request=req, current_user=normal_user)
    await session.commit()

    assert data["title"] == "Lồng đèn ước vọng"

    stmt = select(Notification).where(Notification.title.like("%[Phòng 2]%"))
    notifs = (await session.execute(stmt)).scalars().all()

    recipient_ids = {n.recipient_id for n in notifs}
    assert admin1.id in recipient_ids
    assert admin2.id in recipient_ids
    assert owner.id in recipient_ids
    assert normal_user.id not in recipient_ids
    assert len(notifs) == 3


@pytest.mark.asyncio
async def test_user_room3_submit_notifies_admins_and_owners(db_session):
    session, normal_user, admin1, admin2, owner = db_session

    req = Room3CreateRibbonRequest(
        title="Thông điệp bình an",
        short_content="Bình an",
        content="Gửi ngàn lời chúc bình an đến tất cả mọi người",
        tag_category="HEALING",
        color_code="#98FB98",
        is_anonymous=False,
    )
    msg, data = await Room3Service.create_ribbon(session, request=req, current_user=normal_user)
    await session.commit()

    assert data["title"] == "Thông điệp bình an"

    stmt = select(Notification).where(Notification.title.like("%[Phòng 3]%"))
    notifs = (await session.execute(stmt)).scalars().all()

    recipient_ids = {n.recipient_id for n in notifs}
    assert admin1.id in recipient_ids
    assert admin2.id in recipient_ids
    assert owner.id in recipient_ids
    assert len(notifs) == 3


@pytest.mark.asyncio
async def test_admin_approval_notifies_author_and_other_admins_owners(db_session):
    session, normal_user, admin1, admin2, owner = db_session

    # 1. Create a pending artwork in Room 1
    req = Room1CreateArtworkRequest(
        title="Bài viết cần duyệt",
        short_content="Tóm tắt",
        content="Nội dung câu chuyện cần duyệt phải đủ ba mươi ký tự trở lên.",
        is_anonymous=False,
    )
    created = await Room1Service.create_artwork(session, request=req, current_user=normal_user)
    await session.commit()

    # Clear previous creation notifications to isolate approval test
    notifs_before = (await session.execute(select(Notification))).scalars().all()
    for n in notifs_before:
        await session.delete(n)
    await session.commit()

    # 2. Admin 1 approves the artwork
    approve_payload = ApproveArtworkRequest(
        title="Bài viết cần duyệt",
        media_url="https://example.com/art.png",
    )
    await AdminRoomService.approve_artwork(
        session,
        admin=admin1,
        room_id=1,
        artwork_id_raw=str(created["id"]),
        payload=approve_payload,
    )
    await session.commit()

    # Verify notifications generated by approval:
    # a. Author (normal_user) gets "Tác phẩm của bạn đã được trưng bày!"
    stmt_author = select(Notification).where(Notification.recipient_id == normal_user.id)
    author_notif = (await session.execute(stmt_author)).scalar_one_or_none()
    assert author_notif is not None
    assert "trưng bày" in author_notif.title

    # b. Admin 2 and Owner get "[Ban Quản Trị] Admin One đã duyệt tác phẩm"
    stmt_others = select(Notification).where(
        Notification.recipient_id.in_([admin2.id, owner.id])
    )
    other_notifs = (await session.execute(stmt_others)).scalars().all()
    assert len(other_notifs) == 2
    for n in other_notifs:
        assert "Ban Quản Trị" in n.title
        assert "Admin One" in n.body

    # c. Admin 1 (approver) does NOT get notified
    stmt_admin1 = select(Notification).where(Notification.recipient_id == admin1.id)
    admin1_notif = (await session.execute(stmt_admin1)).scalar_one_or_none()
    assert admin1_notif is None

"""Ai được thấy gì: bài bị gỡ, lồng đèn riêng tư của người khác, và việc duyệt lại nhật ký công khai."""

from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
import uuid

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (đăng ký mọi bảng vào Base.metadata)
from app.api.deps import get_db
from app.core.database import Base
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.artwork import Artwork
from app.models.diary import Diary
from app.models.room import Room
from app.models.user import User, UserRole
from app.models.user_saved_artwork import UserSavedArtwork

test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


def _user(name: str, role: str = UserRole.USER.value) -> User:
    return User(
        id=uuid.uuid4(), username=name, email=f"{name}@example.com",
        password_hash=hash_password("Pass123@"), nickname=name, role=role, is_active=True,
    )


def _artwork(owner: User, room_id: int, visibility: str = "PUBLIC", status: str = "APPROVED") -> Artwork:
    return Artwork(
        id=uuid.uuid4(), user_id=owner.id, room_id=room_id, title="Tiêu đề", short_content="Tóm tắt",
        content="Nội dung đủ dài để hợp lệ cho bài kiểm thử.", visibility=visibility, status=status,
        target_date=datetime.now(timezone.utc) - timedelta(days=1),
    )


@asynccontextmanager
async def context():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with TestingSessionLocal() as session:
        session.add_all([Room(id=i, room_code=f"R{i}", title=f"Phòng {i}") for i in (1, 2, 3)])
        author, reader, admin = _user("author"), _user("reader"), _user("admin", UserRole.ADMIN.value)
        session.add_all([author, reader, admin])
        await session.commit()

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                yield {
                    "client": client,
                    "session": session,
                    "author": author,
                    "auth": {"Authorization": f"Bearer {create_access_token(author.id, author.role)}"},
                    "reader": {"Authorization": f"Bearer {create_access_token(reader.id, reader.role)}"},
                    "reader_user": reader,
                    "admin": {"Authorization": f"Bearer {create_access_token(admin.id, admin.role)}"},
                }
        finally:
            app.dependency_overrides.clear()
            async with test_engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)


async def test_rejected_artwork_disappears_from_notebook():
    async with context() as ctx:
        client, session = ctx["client"], ctx["session"]
        art = _artwork(ctx["author"], room_id=1)
        session.add(art)
        await session.commit()

        saved = await client.post(f"/api/v1/rooms/1/artworks/{art.id}/save", headers=ctx["reader"])
        assert saved.status_code == 200
        items = (await client.get("/api/v1/notebook", headers=ctx["reader"])).json()["data"]["items"]
        assert [i["source_id"] for i in items] == [str(art.id)]

        # Admin gỡ bài đã duyệt: người đã lưu không còn đọc được nữa
        rejected = await client.post(
            f"/api/v1/admin/rooms/1/artworks/{art.id}/reject",
            json={"admin_note": "Vi phạm"}, headers=ctx["admin"],
        )
        assert rejected.status_code == 200
        items = (await client.get("/api/v1/notebook", headers=ctx["reader"])).json()["data"]["items"]
        assert items == []

        # Tác giả vẫn thấy bài của mình trong Sổ tay nếu đã lưu
        session.add(UserSavedArtwork(user_id=ctx["author"].id, artwork_id=art.id))
        await session.commit()
        own = (await client.get("/api/v1/notebook", headers=ctx["auth"])).json()["data"]["items"]
        assert [i["source_id"] for i in own] == [str(art.id)]


async def test_cannot_save_or_react_to_unapproved_or_private_posts_of_others():
    async with context() as ctx:
        client, session = ctx["client"], ctx["session"]
        pending = _artwork(ctx["author"], room_id=1, status="PENDING")
        private_lantern = _artwork(ctx["author"], room_id=2, visibility="PRIVATE")
        session.add_all([pending, private_lantern])
        await session.commit()

        r = await client.post(f"/api/v1/rooms/1/artworks/{pending.id}/save", headers=ctx["reader"])
        assert r.status_code == 404

        r = await client.post(
            f"/api/v1/rooms/2/artworks/{private_lantern.id}/reactions",
            json={"reaction_type": "HEART"}, headers=ctx["reader"],
        )
        assert r.status_code == 404

        # Tác giả vẫn thả cảm xúc được trên lồng đèn riêng của mình
        r = await client.post(
            f"/api/v1/rooms/2/artworks/{private_lantern.id}/reactions",
            json={"reaction_type": "HEART"}, headers=ctx["auth"],
        )
        assert r.status_code == 200


async def test_public_diary_needs_reapproval_only_when_text_or_images_change():
    async with context() as ctx:
        client, session = ctx["client"], ctx["session"]
        diary = Diary(
            id=uuid.uuid4(), user_id=ctx["author"].id, title="Một ngày", content="Hôm nay trời rất đẹp và yên bình.",
            mood="calm", media_urls=[], is_public=True, is_approved=True, entry_date=date(2026, 11, 1),
        )
        session.add(diary)
        await session.commit()

        async def edit(**changes):
            # Giao diện gửi lại đủ mọi trường mỗi lần sửa
            body = {
                "title": diary.title, "content": diary.content, "mood": diary.mood,
                "entry_date": str(diary.entry_date), "media_urls": diary.media_urls, "is_public": True,
            } | changes
            r = await client.put(f"/api/v1/diaries/me/{diary.id}", json=body, headers=ctx["auth"])
            assert r.status_code == 200, r.text
            await session.refresh(diary)

        await edit(mood="grateful", entry_date="2026-11-02")
        assert diary.is_approved is True, "Đổi tâm trạng/ngày không được kéo bài về hàng chờ duyệt"

        await edit(content="Nội dung mới hoàn toàn khác, cần duyệt lại.")
        assert diary.is_approved is False

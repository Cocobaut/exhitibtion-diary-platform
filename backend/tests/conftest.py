import asyncio
from typing import AsyncGenerator
import pytest
import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.core.security import hash_password
from app.main import app
from app.models.revoked_token import RevokedToken
from app.models.user import User, UserRole

# Use in-memory SQLite with StaticPool for async test isolation
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


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(User.__table__.create)
        await conn.run_sync(RevokedToken.__table__.create)

    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(RevokedToken.__table__.drop)
        await conn.run_sync(User.__table__.drop)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[httpx.AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_users(db_session: AsyncSession):
    """Seed test users into the database."""
    # 1. Admin
    admin = User(
        username="admin_user",
        email="admin@exhibition.edu.vn",
        password_hash=hash_password("AdminPassword@2026"),
        nickname="Admin Test",
        role=UserRole.ADMIN.value,
        is_active=True,
    )
    # 2. Regular user
    user = User(
        username="hoanghon_01",
        email="hoanghon@example.com",
        password_hash=hash_password("StrongPassword123@"),
        nickname="Người Lữ Khách",
        role=UserRole.USER.value,
        is_active=True,
    )
    # 3. Locked user
    locked = User(
        username="locked_user",
        email="locked@example.com",
        password_hash=hash_password("LockedPassword123@"),
        nickname="Người Bị Khóa",
        role=UserRole.USER.value,
        is_active=False,
    )

    db_session.add_all([admin, user, locked])
    await db_session.commit()
    return {"admin": admin, "user": user, "locked": locked}

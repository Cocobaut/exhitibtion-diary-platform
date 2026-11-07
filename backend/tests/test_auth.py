import asyncio
import re
from contextlib import asynccontextmanager
from pathlib import Path
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import hash_password, verify_password
from app.core.rate_limit import (
    login_account_limiter,
    login_ip_limiter,
    reset_email_limiter,
    reset_ip_limiter,
)
from app.main import app
from app.models.password_reset_token import PasswordResetToken
from app.models.revoked_token import RevokedToken
import app.services.auth_service as auth_service_module
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
    """Sets up SQLite tables, seeds default test users, and yields (client, session)."""
    for limiter in (login_account_limiter, login_ip_limiter, reset_email_limiter, reset_ip_limiter):
        limiter.clear()

    async with test_engine.begin() as conn:
        await conn.run_sync(User.__table__.create)
        await conn.run_sync(RevokedToken.__table__.create)
        await conn.run_sync(PasswordResetToken.__table__.create)

    async with TestingSessionLocal() as session:
        # Seed users
        admin = User(
            username="admin_user",
            email="admin@exhibition.edu.vn",
            password_hash=hash_password("AdminPassword@2026"),
            nickname="Admin Test",
            role=UserRole.ADMIN.value,
            is_active=True,
        )
        user = User(
            username="hoanghon_01",
            email="hoanghon@example.com",
            password_hash=hash_password("StrongPassword123@"),
            nickname="Người Lữ Khách",
            role=UserRole.USER.value,
            is_active=True,
        )
        locked = User(
            username="locked_user",
            email="locked@example.com",
            password_hash=hash_password("LockedPassword123@"),
            nickname="Người Bị Khóa",
            role=UserRole.USER.value,
            is_active=False,
        )
        session.add_all([admin, user, locked])
        await session.commit()

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield client, session

        app.dependency_overrides.clear()

    async with test_engine.begin() as conn:
        await conn.run_sync(PasswordResetToken.__table__.drop)
        await conn.run_sync(RevokedToken.__table__.drop)
        await conn.run_sync(User.__table__.drop)


# -------------------------------------------------------------
# 13 TEST CASES COVERING §5 OF PLAN 01 SPECIFICATION
# -------------------------------------------------------------

def test_01_register_success():
    """Test 1: Register thành công → 201, body.role == 'USER', DB lưu bcrypt hash (không lưu plaintext)."""
    async def run():
        async with setup_test_context() as (client, session):
            payload = {
                "username": "new_user_1",
                "email": "newuser1@example.com",
                "password": "StrongPassword123@",
                "nickname": "Người Lữ Khách"
            }
            response = await client.post("/api/v1/auth/register", json=payload)
            assert response.status_code == 201, response.text
            data = response.json()
            assert data["success"] is True
            assert data["message"] == "Tài khoản tạo thành công"
            assert "body" in data
            assert data["body"]["username"] == "new_user_1"
            assert data["body"]["email"] == "newuser1@example.com"
            assert data["body"]["nickname"] == "Người Lữ Khách"
            assert data["body"]["role"] == "USER"
            assert "id" in data["body"]

            # DB check
            db_user = await session.scalar(select(User).where(User.username == "new_user_1"))
            assert db_user is not None
            assert db_user.password_hash != "StrongPassword123@"
            assert verify_password("StrongPassword123@", db_user.password_hash)

    asyncio.run(run())


def test_02_register_duplicate_username_and_email():
    """Test 2: Register trùng username (khác hoa thường) → 409 USERNAME_TAKEN; trùng email → 409 EMAIL_TAKEN."""
    async def run():
        async with setup_test_context() as (client, session):
            # Trùng username khác hoa thường: HOANGHON_01 vs hoanghon_01
            res1 = await client.post("/api/v1/auth/register", json={
                "username": "HOANGHON_01",
                "email": "distinct@example.com",
                "password": "StrongPassword123@",
                "nickname": "Trùng User"
            })
            assert res1.status_code == 409
            err1 = res1.json()
            assert err1["success"] is False
            assert err1["error_code"] == "USERNAME_TAKEN"
            assert err1["message"] == "Tên đăng nhập đã tồn tại trên hệ thống"

            # Trùng email khác hoa thường: HOANGHON@EXAMPLE.COM vs hoanghon@example.com
            res2 = await client.post("/api/v1/auth/register", json={
                "username": "distinct_user_99",
                "email": "HOANGHON@EXAMPLE.COM",
                "password": "StrongPassword123@",
                "nickname": "Trùng Email"
            })
            assert res2.status_code == 409
            err2 = res2.json()
            assert err2["success"] is False
            assert err2["error_code"] == "EMAIL_TAKEN"
            assert err2["message"] == "Email đã tồn tại trên hệ thống"

    asyncio.run(run())


def test_03_register_weak_password_and_invalid_email():
    """Test 3: Register mật khẩu abc → 400 WEAK_PASSWORD; email sai → 400 VALIDATION_ERROR."""
    async def run():
        async with setup_test_context() as (client, session):
            # Mật khẩu yếu
            res1 = await client.post("/api/v1/auth/register", json={
                "username": "test_weak_pwd",
                "email": "weak@example.com",
                "password": "abc",
                "nickname": "Yếu"
            })
            assert res1.status_code == 400
            err1 = res1.json()
            assert err1["success"] is False
            assert err1["error_code"] == "WEAK_PASSWORD"
            assert "Mật khẩu quá yếu" in err1["message"]

            # Email sai định dạng
            res2 = await client.post("/api/v1/auth/register", json={
                "username": "test_email_err",
                "email": "not-an-email",
                "password": "StrongPassword123@",
                "nickname": "Email Sai"
            })
            assert res2.status_code == 400
            err2 = res2.json()
            assert err2["success"] is False
            assert err2["error_code"] == "VALIDATION_ERROR"

    asyncio.run(run())


def test_04_register_ignore_role_admin():
    """Test 4: Gửi 'role': 'ADMIN' khi register → user vẫn là USER."""
    async def run():
        async with setup_test_context() as (client, session):
            res = await client.post("/api/v1/auth/register", json={
                "username": "hacker_trying_admin",
                "email": "hacker@example.com",
                "password": "StrongPassword123@",
                "nickname": "Hacker",
                "role": "ADMIN"
            })
            assert res.status_code == 201
            assert res.json()["body"]["role"] == "USER"

            db_user = await session.scalar(select(User).where(User.username == "hacker_trying_admin"))
            assert db_user.role == "USER"

    asyncio.run(run())


def test_05_login_by_username_and_email():
    """Test 5: Login bằng username và bằng email đều thành công; expires_in == 86400; token_type == 'Bearer'."""
    async def run():
        async with setup_test_context() as (client, session):
            # Username
            res1 = await client.post("/api/v1/auth/login", json={
                "account": "hoanghon_01",
                "password": "StrongPassword123@"
            })
            assert res1.status_code == 200
            d1 = res1.json()
            assert d1["success"] is True
            assert d1["message"] == "Đăng nhập thành công"
            assert d1["body"]["token_type"] == "Bearer"
            assert d1["body"]["expires_in"] == 86400
            assert d1["body"]["user"]["username"] == "hoanghon_01"
            assert d1["body"]["user"]["role"] == "USER"
            assert len(d1["body"]["access_token"]) > 20

            # Email
            res2 = await client.post("/api/v1/auth/login", json={
                "account": "hoanghon@example.com",
                "password": "StrongPassword123@"
            })
            assert res2.status_code == 200
            d2 = res2.json()
            assert d2["success"] is True
            assert d2["body"]["token_type"] == "Bearer"
            assert d2["body"]["expires_in"] == 86400

    asyncio.run(run())


def test_06_login_admin():
    """Test 6: Login admin → message 'Đăng nhập quyền quản trị viên thành công'."""
    async def run():
        async with setup_test_context() as (client, session):
            res = await client.post("/api/v1/auth/login", json={
                "account": "admin@exhibition.edu.vn",
                "password": "AdminPassword@2026"
            })
            assert res.status_code == 200
            d = res.json()
            assert d["success"] is True
            assert d["message"] == "Đăng nhập quyền quản trị viên thành công"
            assert d["body"]["user"]["role"] == "ADMIN"

    asyncio.run(run())


def test_07_login_wrong_credentials():
    """Test 7: Login sai mật khẩu / user không tồn tại → 401 cùng message."""
    async def run():
        async with setup_test_context() as (client, session):
            # User không tồn tại
            res1 = await client.post("/api/v1/auth/login", json={
                "account": "ghost_user",
                "password": "WrongPassword123@"
            })
            assert res1.status_code == 401
            err1 = res1.json()
            assert err1["success"] is False
            assert err1["error_code"] == "INVALID_CREDENTIALS"
            assert err1["message"] == "Tài khoản hoặc mật khẩu không chính xác"

            # Sai mật khẩu
            res2 = await client.post("/api/v1/auth/login", json={
                "account": "hoanghon_01",
                "password": "WrongPassword123@"
            })
            assert res2.status_code == 401
            err2 = res2.json()
            assert err2["success"] is False
            assert err2["error_code"] == "INVALID_CREDENTIALS"
            assert err2["message"] == "Tài khoản hoặc mật khẩu không chính xác"

    asyncio.run(run())


def test_08_login_locked_user():
    """Test 8: Login user bị khoá → 403 ACCOUNT_LOCKED."""
    async def run():
        async with setup_test_context() as (client, session):
            res = await client.post("/api/v1/auth/login", json={
                "account": "locked_user",
                "password": "LockedPassword123@"
            })
            assert res.status_code == 403
            err = res.json()
            assert err["success"] is False
            assert err["error_code"] == "ACCOUNT_LOCKED"
            assert err["message"] == "Tài khoản của bạn đang bị khóa"

    asyncio.run(run())


GENERIC_FORGOT_MESSAGE = (
    "Nếu thông tin khớp với một tài khoản, chúng tôi đã gửi link đặt lại mật khẩu tới email đó. "
    "Link hết hạn sau ít phút."
)


async def _forgot(client, username, email):
    """Gọi /forgot-password và bắt email gửi đi; trả về (response, reset_token hoặc None)."""
    sent = []

    async def fake_send_email(to, subject, body):
        sent.append((to, body))

    original = auth_service_module.send_email
    auth_service_module.send_email = fake_send_email
    try:
        res = await client.post("/api/v1/auth/forgot-password", json={"username": username, "email": email})
    finally:
        auth_service_module.send_email = original
    token = None
    if sent:
        match = re.search(r"reset_token=([A-Za-z0-9_-]+)", sent[-1][1])
        token = match.group(1) if match else None
    return res, token, sent


def test_09_forgot_password_does_not_leak_token_or_account():
    """Test 9: Sai hay đúng thông tin đều trả cùng một thông báo 200, không có reset_token trong response;
    chỉ khi đúng cả username + email thì email chứa link mới được gửi."""
    async def run():
        async with setup_test_context() as (client, session):
            for username, email in [
                ("unknown_user", "nobody@example.com"),
                ("wrong_user", "hoanghon@example.com"),
                ("hoanghon_01", "wrong_mail@example.com"),
            ]:
                res, token, sent = await _forgot(client, username, email)
                assert res.status_code == 200
                assert res.json()["message"] == GENERIC_FORGOT_MESSAGE
                assert "reset_token" not in res.json()
                assert sent == [] and token is None

            # Đúng cả username và email (không phân biệt hoa thường) -> email chứa link được gửi
            res, token, sent = await _forgot(client, "HoangHon_01", "HoangHon@example.com")
            assert res.status_code == 200
            assert res.json()["message"] == GENERIC_FORGOT_MESSAGE
            assert "reset_token" not in res.json()
            assert sent[0][0] == "hoanghon@example.com"
            assert token and len(token) > 20

    asyncio.run(run())


def test_10_reset_password_weak_and_invalid_token():
    """Test 10: Token sai → 400 INVALID_RESET_TOKEN; mật khẩu yếu → 400 WEAK_PASSWORD."""
    async def run():
        async with setup_test_context() as (client, session):
            bad = await client.post("/api/v1/auth/reset-password", json={
                "token": "x" * 43, "new_password": "BrandNewPassword2026@",
            })
            assert bad.status_code == 400
            assert bad.json()["error_code"] == "INVALID_RESET_TOKEN"

            _, token, _ = await _forgot(client, "hoanghon_01", "hoanghon@example.com")

            weak = await client.post("/api/v1/auth/reset-password", json={
                "token": token, "new_password": "short",
            })
            assert weak.status_code == 400
            assert weak.json()["error_code"] == "WEAK_PASSWORD"

    asyncio.run(run())


def test_11_reset_password_success_once_and_relogin():
    """Test 11: Token trong email đổi được mật khẩu (User, Admin); dùng 1 lần; token đăng nhập cũ hết hiệu lực."""
    async def run():
        async with setup_test_context() as (client, session):
            login_before = await client.post("/api/v1/auth/login", json={
                "account": "hoanghon_01", "password": "StrongPassword123@",
            })
            old_headers = {"Authorization": f"Bearer {login_before.json()['body']['access_token']}"}
            assert (await client.get("/api/v1/users/me", headers=old_headers)).status_code == 200

            _, token, _ = await _forgot(client, "hoanghon_01", "hoanghon@example.com")

            res = await client.post("/api/v1/auth/reset-password", json={
                "token": token, "new_password": "BrandNewPassword2026@",
            })
            assert res.status_code == 200, res.text

            # Phiên đăng nhập trước khi đặt lại mật khẩu (có thể là của kẻ gian) bị vô hiệu
            stale = await client.get("/api/v1/users/me", headers=old_headers)
            assert stale.status_code == 401

            reuse = await client.post("/api/v1/auth/reset-password", json={
                "token": token, "new_password": "AnotherPassword2026@",
            })
            assert reuse.status_code == 400
            assert reuse.json()["error_code"] == "INVALID_RESET_TOKEN"

            res_old = await client.post("/api/v1/auth/login", json={
                "account": "hoanghon_01", "password": "StrongPassword123@",
            })
            assert res_old.status_code == 401
            res_new = await client.post("/api/v1/auth/login", json={
                "account": "hoanghon_01", "password": "BrandNewPassword2026@",
            })
            assert res_new.status_code == 200

            # Tương tự cho ADMIN
            admin_res, admin_token, _ = await _forgot(client, "admin_user", "admin@exhibition.edu.vn")
            assert admin_res.status_code == 200
            admin_reset = await client.post("/api/v1/auth/reset-password", json={
                "token": admin_token, "new_password": "NewAdminPass2026@"
            })
            assert admin_reset.status_code == 200

            admin_login = await client.post("/api/v1/auth/login", json={
                "account": "admin_user", "password": "NewAdminPass2026@"
            })
            assert admin_login.status_code == 200

    asyncio.run(run())


def test_12_forgot_password_locked_user():
    """Test 12: Tài khoản bị khoá nhận cùng thông báo chung và không có email nào được gửi."""
    async def run():
        async with setup_test_context() as (client, session):
            res, token, sent = await _forgot(client, "locked_user", "locked@example.com")
            assert res.status_code == 200
            assert res.json()["message"] == GENERIC_FORGOT_MESSAGE
            assert sent == [] and token is None

    asyncio.run(run())


def test_13_logout_revokes_token():
    """Test 13: Logout → 200; gọi endpoint cần auth bằng token cũ → 401."""
    async def run():
        async with setup_test_context() as (client, session):
            # 1. Đăng nhập lấy access_token
            login_res = await client.post("/api/v1/auth/login", json={
                "account": "hoanghon_01",
                "password": "StrongPassword123@"
            })
            assert login_res.status_code == 200
            token = login_res.json()["body"]["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 2. Đăng xuất
            logout_res = await client.post("/api/v1/auth/logout", headers=headers)
            assert logout_res.status_code == 200
            assert logout_res.json()["success"] is True
            assert logout_res.json()["message"] == "Đăng xuất thành công"

            # 3. Thử dùng lại token đã thu hồi → 401
            second_res = await client.post("/api/v1/auth/logout", headers=headers)
            assert second_res.status_code == 401
            assert second_res.json()["error_code"] == "UNAUTHORIZED"

    asyncio.run(run())



def test_14_register_rate_limited_per_ip():
    """Test 14: Một IP tạo quá 10 tài khoản trong 1 giờ thì bị chặn 429."""
    from app.core.rate_limit import register_ip_limiter

    async def run():
        register_ip_limiter.clear()
        async with setup_test_context() as (client, session):
            for n in range(10):
                res = await client.post("/api/v1/auth/register", json={
                    "username": f"spam_user_{n}", "email": f"spam{n}@example.com",
                    "password": "StrongPassword123@", "nickname": f"Spam {n}",
                })
                assert res.status_code == 201, res.text
            blocked = await client.post("/api/v1/auth/register", json={
                "username": "spam_user_x", "email": "spamx@example.com",
                "password": "StrongPassword123@", "nickname": "Spam X",
            })
            assert blocked.status_code == 429
            assert blocked.json()["error_code"] == "TOO_MANY_ATTEMPTS"
        register_ip_limiter.clear()

    asyncio.run(run())


if __name__ == "__main__":
    print("Running Plan 01 Auth Tests...")
    test_01_register_success()
    print("✓ Test 1: Register thành công")
    test_02_register_duplicate_username_and_email()
    print("✓ Test 2: Register trùng username & email (409)")
    test_03_register_weak_password_and_invalid_email()
    print("✓ Test 3: Register mật khẩu yếu (400 WEAK_PASSWORD) & email sai (400)")
    test_04_register_ignore_role_admin()
    print("✓ Test 4: Gửi role ADMIN khi register bị bỏ qua")
    test_05_login_by_username_and_email()
    print("✓ Test 5: Login username & email thành công")
    test_06_login_admin()
    print("✓ Test 6: Login admin thông báo quyền admin")
    test_07_login_wrong_credentials()
    print("✓ Test 7: Login sai thông tin (401)")
    test_08_login_locked_user()
    print("✓ Test 8: Login tài khoản bị khóa (403)")
    test_09_forgot_password_does_not_leak_token_or_account()
    print("✓ Test 9: Quên mật khẩu không trả token, không lộ tài khoản")
    test_10_reset_password_weak_and_invalid_token()
    print("✓ Test 10: Đổi mật khẩu token sai (400) hoặc mật khẩu mới quá yếu (400)")
    test_11_reset_password_success_once_and_relogin()
    print("✓ Test 11: Đổi mật khẩu thành công cho cả User & Admin & đăng nhập lại")
    test_12_forgot_password_locked_user()
    print("✓ Test 12: Đổi mật khẩu tài khoản bị khóa (403)")
    test_13_logout_revokes_token()
    print("✓ Test 13: Đăng xuất và thu hồi token (401 khi tái sử dụng)")
    print("\n ALL 13 TESTS PASSED PERFECTLY! ")

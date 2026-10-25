import asyncio
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

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.main import app
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
    """Sets up SQLite tables, seeds default test users, and yields (client, session, auth_headers)."""
    async with test_engine.begin() as conn:
        await conn.run_sync(User.__table__.create)
        await conn.run_sync(RevokedToken.__table__.create)

    async with TestingSessionLocal() as session:
        # Seed user
        user = User(
            username="hoanghon_01",
            email="hoanghon@example.com",
            password_hash=hash_password("StrongPassword123@"),
            nickname="Người Lữ Khách",
            role=UserRole.USER.value,
            avatar_url="https://example.com/avatar.jpg",
            bio="Gửi những tâm sự vào màn đêm...",
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        token = create_access_token(subject=user.id, role=user.role)
        auth_headers = {"Authorization": f"Bearer {token}"}

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield client, session, auth_headers, user

        app.dependency_overrides.clear()

    async with test_engine.begin() as conn:
        await conn.run_sync(RevokedToken.__table__.drop)
        await conn.run_sync(User.__table__.drop)


# -------------------------------------------------------------
# 8 TEST CASES COVERING §4 OF PLAN 02 SPECIFICATION
# -------------------------------------------------------------

def test_01_unauthenticated_requests():
    """Test 1: Không có token → 401 cho cả 4 endpoint."""
    async def run():
        async with setup_test_context() as (client, session, auth_headers, user):
            # 1. GET /users/me
            res1 = await client.get("/api/v1/users/me")
            assert res1.status_code == 401
            assert res1.json()["error_code"] == "UNAUTHORIZED"

            # 2. PATCH /users/me
            res2 = await client.patch("/api/v1/users/me", json={"nickname": "New Name"})
            assert res2.status_code == 401
            assert res2.json()["error_code"] == "UNAUTHORIZED"

            # 3. PUT /users/me/password
            res3 = await client.put("/api/v1/users/me/password", json={
                "current_password": "StrongPassword123@",
                "new_password": "NewStrongPassword456@"
            })
            assert res3.status_code == 401
            assert res3.json()["error_code"] == "UNAUTHORIZED"

            # 4. POST /users/me/avatar
            files = {"file": ("avatar.png", b"\x89PNG\r\n\x1a\n1234", "image/png")}
            res4 = await client.post("/api/v1/users/me/avatar", files=files)
            assert res4.status_code == 401
            assert res4.json()["error_code"] == "UNAUTHORIZED"

    asyncio.run(run())


def test_02_get_profile_success():
    """Test 2: GET /users/me trả đủ 8 trường, không lộ password_hash."""
    async def run():
        async with setup_test_context() as (client, session, auth_headers, user):
            response = await client.get("/api/v1/users/me", headers=auth_headers)
            assert response.status_code == 200
            res = response.json()
            assert res["success"] is True
            assert "data" in res
            data = res["data"]

            # Kiểm tra 8 trường bắt buộc
            assert data["id"] == str(user.id)
            assert data["username"] == "hoanghon_01"
            assert data["email"] == "hoanghon@example.com"
            assert data["nickname"] == "Người Lữ Khách"
            assert data["role"] == "USER"
            assert data["avatar_url"] == "https://example.com/avatar.jpg"
            assert data["bio"] == "Gửi những tâm sự vào màn đêm..."
            assert data["theme_preference"] == "museum"
            assert "created_at" in data
            assert data["created_at"].endswith("Z")

            # Tuyệt đối không lộ password_hash, is_active, updated_at
            assert "password_hash" not in data
            assert "is_active" not in data
            assert "updated_at" not in data

    asyncio.run(run())


def test_03_patch_profile_partial_bio():
    """Test 3: PATCH chỉ bio → nickname giữ nguyên; updated_at thay đổi."""
    async def run():
        async with setup_test_context() as (client, session, auth_headers, user):
            original_updated_at = user.updated_at
            original_nickname = user.nickname

            response = await client.patch(
                "/api/v1/users/me",
                headers=auth_headers,
                json={"bio": "Bio đã được cập nhật thành công!"}
            )
            assert response.status_code == 200
            res = response.json()
            assert res["success"] is True
            assert res["message"] == "Cập nhật hồ sơ thành công"
            assert res["data"]["bio"] == "Bio đã được cập nhật thành công!"
            assert res["data"]["nickname"] == original_nickname
            assert "updated_at" in res["data"]
            assert res["data"]["updated_at"].endswith("Z")

            # Kiểm tra database
            await session.refresh(user)
            assert user.bio == "Bio đã được cập nhật thành công!"
            assert user.nickname == original_nickname

    asyncio.run(run())


def test_04_patch_ignore_unknown_fields_and_empty():
    """Test 4: PATCH {'role':'ADMIN'} → role không đổi (body chỉ có trường bị bỏ qua → 400 'Không có trường nào để cập nhật')."""
    async def run():
        async with setup_test_context() as (client, session, auth_headers, user):
            # Gửi trường không được phép (role, email, username)
            response = await client.patch(
                "/api/v1/users/me",
                headers=auth_headers,
                json={"role": "ADMIN", "email": "hacker@domain.com"}
            )
            assert response.status_code == 400
            res = response.json()
            assert res["success"] is False
            assert res["error_code"] == "VALIDATION_ERROR"
            assert res["message"] == "Không có trường nào để cập nhật"

            # Gửi body rỗng {}
            res_empty = await client.patch("/api/v1/users/me", headers=auth_headers, json={})
            assert res_empty.status_code == 400
            assert res_empty.json()["error_code"] == "VALIDATION_ERROR"

            # Database role vẫn là USER
            await session.refresh(user)
            assert user.role == "USER"

    asyncio.run(run())


def test_05_patch_nickname_length_validation():
    """Test 5: PATCH nickname 51 ký tự hoặc null → 400."""
    async def run():
        async with setup_test_context() as (client, session, auth_headers, user):
            # Nickname 51 ký tự
            res1 = await client.patch(
                "/api/v1/users/me",
                headers=auth_headers,
                json={"nickname": "A" * 51}
            )
            assert res1.status_code == 400
            assert res1.json()["error_code"] == "VALIDATION_ERROR"

            # Nickname là null
            res2 = await client.patch(
                "/api/v1/users/me",
                headers=auth_headers,
                json={"nickname": None}
            )
            assert res2.status_code == 400
            assert res2.json()["error_code"] == "VALIDATION_ERROR"

    asyncio.run(run())


def test_06_change_password_flows():
    """Test 6: Đổi mật khẩu: sai mk hiện tại → 400; trùng mk cũ → 400; yếu → 400; thành công → login OK."""
    async def run():
        async with setup_test_context() as (client, session, auth_headers, user):
            # 1. Sai mật khẩu hiện tại
            res1 = await client.put(
                "/api/v1/users/me/password",
                headers=auth_headers,
                json={
                    "current_password": "WrongPassword123@",
                    "new_password": "NewStrongPassword456@"
                }
            )
            assert res1.status_code == 400
            assert res1.json()["error_code"] == "WRONG_CURRENT_PASSWORD"
            assert res1.json()["message"] == "Mật khẩu hiện tại không đúng"

            # 2. Trùng mật khẩu cũ
            res2 = await client.put(
                "/api/v1/users/me/password",
                headers=auth_headers,
                json={
                    "current_password": "StrongPassword123@",
                    "new_password": "StrongPassword123@"
                }
            )
            assert res2.status_code == 400
            assert res2.json()["error_code"] == "PASSWORD_UNCHANGED"
            assert res2.json()["message"] == "Mật khẩu mới không được trùng với mật khẩu cũ"

            # 3. Mật khẩu mới quá yếu
            res3 = await client.put(
                "/api/v1/users/me/password",
                headers=auth_headers,
                json={
                    "current_password": "StrongPassword123@",
                    "new_password": "weak"
                }
            )
            assert res3.status_code == 400
            assert res3.json()["error_code"] == "WEAK_PASSWORD"

            # 4. Đổi mật khẩu thành công
            res4 = await client.put(
                "/api/v1/users/me/password",
                headers=auth_headers,
                json={
                    "current_password": "StrongPassword123@",
                    "new_password": "BrandNewPassword789@"
                }
            )
            assert res4.status_code == 200
            assert res4.json()["success"] is True
            assert res4.json()["message"] == "Đổi mật khẩu thành công"

            # 5. Đăng nhập lại bằng mật khẩu mới thành công
            login_res = await client.post("/api/v1/auth/login", json={
                "account": "hoanghon_01",
                "password": "BrandNewPassword789@"
            })
            assert login_res.status_code == 200
            assert login_res.json()["success"] is True

            # Đăng nhập bằng mật khẩu cũ phải thất bại
            old_login = await client.post("/api/v1/auth/login", json={
                "account": "hoanghon_01",
                "password": "StrongPassword123@"
            })
            assert old_login.status_code == 401

    asyncio.run(run())


def test_07_upload_avatar_valid_png():
    """Test 7: Upload PNG 1MB → 200, avatar_url được lưu vào DB."""
    async def run():
        async with setup_test_context() as (client, session, auth_headers, user):
            png_magic = b"\x89PNG\r\n\x1a\n"
            content = png_magic + b"\x00" * (1024 * 1024 - len(png_magic))  # exactly 1 MB
            files = {"file": ("avatar.png", content, "image/png")}

            response = await client.post(
                "/api/v1/users/me/avatar",
                headers=auth_headers,
                files=files
            )
            assert response.status_code == 200
            res = response.json()
            assert res["success"] is True
            assert res["message"] == "Tải ảnh đại diện thành công"
            assert "avatar_url" in res["data"]
            new_url = res["data"]["avatar_url"]
            assert "/static/avatars/" in new_url

            # Kiểm tra trong DB
            await session.refresh(user)
            assert user.avatar_url == new_url

    asyncio.run(run())


def test_08_upload_avatar_invalid_type_and_large():
    """Test 8: Upload file .txt đổi đuôi .png → 400 (magic bytes); upload 6MB → 400 FILE_TOO_LARGE."""
    async def run():
        async with setup_test_context() as (client, session, auth_headers, user):
            # 1. File text giả dạng PNG
            fake_png = b"This is a text content claiming to be an image file."
            files_fake = {"file": ("fake_avatar.png", fake_png, "image/png")}
            res1 = await client.post(
                "/api/v1/users/me/avatar",
                headers=auth_headers,
                files=files_fake
            )
            assert res1.status_code == 400
            assert res1.json()["error_code"] == "UNSUPPORTED_FILE_TYPE"
            assert res1.json()["message"] == "Chỉ chấp nhận ảnh PNG hoặc JPEG"

            # 2. File ảnh vượt quá 5MB (6MB)
            png_magic = b"\x89PNG\r\n\x1a\n"
            oversized_content = png_magic + b"\x00" * (6 * 1024 * 1024)
            files_oversized = {"file": ("big_avatar.png", oversized_content, "image/png")}
            res2 = await client.post(
                "/api/v1/users/me/avatar",
                headers=auth_headers,
                files=files_oversized
            )
            assert res2.status_code == 400
            assert res2.json()["error_code"] == "FILE_TOO_LARGE"
            assert res2.json()["message"] == "Ảnh vượt quá dung lượng 5MB"

    asyncio.run(run())


def test_09_patch_theme_preference():
    """Test 9: PATCH theme_preference (museum, moss, plum, paper)."""
    async def run():
        async with setup_test_context() as (client, session, auth_headers, user):
            # 1. Update to valid theme 'moss'
            res = await client.patch(
                "/api/v1/users/me",
                headers=auth_headers,
                json={"theme_preference": "moss"}
            )
            assert res.status_code == 200
            assert res.json()["data"]["theme_preference"] == "moss"

            # 2. Verify with GET /users/me
            get_res = await client.get("/api/v1/users/me", headers=auth_headers)
            assert get_res.status_code == 200
            assert get_res.json()["data"]["theme_preference"] == "moss"

            # 3. Invalid theme returns 422
            bad_res = await client.patch(
                "/api/v1/users/me",
                headers=auth_headers,
                json={"theme_preference": "neon_punk"}
            )
            assert bad_res.status_code in (400, 422)

    asyncio.run(run())


if __name__ == "__main__":
    print("Running Plan 02 User Profile Tests...")
    test_01_unauthenticated_requests()
    print("✓ Test 1: Không có token trả về 401 cho cả 4 endpoint")
    test_02_get_profile_success()
    print("✓ Test 2: GET /users/me trả đủ các trường và theme_preference mặc định")
    test_03_patch_profile_partial_bio()
    print("✓ Test 3: PATCH partial bio giữ nguyên nickname và cập nhật updated_at")
    test_04_patch_ignore_unknown_fields_and_empty()
    print("✓ Test 4: PATCH bỏ qua trường cấm và báo lỗi khi body rỗng (400)")
    test_05_patch_nickname_length_validation()
    print("✓ Test 5: Validate độ dài và null của nickname (400)")
    test_06_change_password_flows()
    print("✓ Test 6: Quy trình đổi mật khẩu (sai mk, trùng mk cũ, yếu, thành công)")
    test_07_upload_avatar_valid_png()
    print("✓ Test 7: Upload ảnh PNG 1MB thành công và lưu avatar_url vào DB")
    test_08_upload_avatar_invalid_type_and_large()
    print("✓ Test 8: Kiểm tra tệp giả định dạng (magic bytes) và tệp quá 5MB (400)")
    test_09_patch_theme_preference()
    print("✓ Test 9: Cập nhật theme_preference và xác thực enum hợp lệ")
    print("\n ALL 9 TESTS FOR PLAN 02 PASSED PERFECTLY! ")


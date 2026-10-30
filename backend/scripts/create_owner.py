"""Tạo tài khoản OWNER đầu tiên trên production (seed production không có tài khoản nào).

Chạy trong container:
    docker compose -f docker-compose.prod.yml exec backend python -m scripts.create_owner
"""

import asyncio
import getpass
import sys

from sqlalchemy import func, or_, select

from app.core.database import AsyncSessionLocal
from app.core.exceptions import AppException
from app.core.security import hash_password, validate_password_strength
from app.models.user import User, UserRole


def ask(prompt: str) -> str:
    value = input(prompt).strip()
    if not value:
        sys.exit("Không được để trống.")
    return value


async def main() -> None:
    username = ask("Tên đăng nhập OWNER: ")
    email = ask("Email OWNER (dùng để nhận link quên mật khẩu): ").lower()
    nickname = input("Tên hiển thị [Chủ bảo tàng]: ").strip() or "Chủ bảo tàng"
    password = getpass.getpass("Mật khẩu: ")
    if password != getpass.getpass("Nhập lại mật khẩu: "):
        sys.exit("Hai mật khẩu không khớp.")
    try:
        validate_password_strength(password)
    except AppException as exc:
        sys.exit(exc.message)

    async with AsyncSessionLocal() as db:
        exists = await db.scalar(select(User.id).where(or_(
            func.lower(User.username) == username.lower(),
            func.lower(User.email) == email,
        )))
        if exists:
            sys.exit("Tên đăng nhập hoặc email đã tồn tại.")
        db.add(User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            nickname=nickname,
            role=UserRole.OWNER.value,
            is_active=True,
        ))
        await db.commit()
    print(f"Đã tạo OWNER '{username}'. Đăng nhập rồi vào Owner để tạo thêm tài khoản Admin.")


if __name__ == "__main__":
    asyncio.run(main())

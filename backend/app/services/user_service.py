import uuid
from typing import Optional
from fastapi import UploadFile
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.core.security import (
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.models.user import User
from app.schemas.user import ChangePasswordIn, UserProfilePatch
from app.services.storage_service import StorageService


class UserService:
    @staticmethod
    async def update_profile(
        db: AsyncSession,
        user: User,
        patch_data: UserProfilePatch,
    ) -> User:
        """Cập nhật một phần thông tin cá nhân (nickname, bio, avatar_url)."""
        fields = patch_data.model_dump(exclude_unset=True)
        # Filter allowed fields
        allowed_keys = {"nickname", "bio", "avatar_url"}
        update_dict = {k: v for k, v in fields.items() if k in allowed_keys}

        if not update_dict:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Không có trường nào để cập nhật"
            )

        for key, val in update_dict.items():
            setattr(user, key, val)

        user.updated_at = func.now()
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def change_password(
        db: AsyncSession,
        user: User,
        data: ChangePasswordIn,
    ) -> None:
        """Đổi mật khẩu chủ động khi đã đăng nhập."""
        # 1. verify_password(current_password, user.password_hash)
        if not verify_password(data.current_password, user.password_hash):
            raise AppException(
                status_code=400,
                error_code="WRONG_CURRENT_PASSWORD",
                message="Mật khẩu hiện tại không đúng"
            )

        # 2. new_password trùng mật khẩu cũ
        if data.new_password == data.current_password or verify_password(data.new_password, user.password_hash):
            raise AppException(
                status_code=400,
                error_code="PASSWORD_UNCHANGED",
                message="Mật khẩu mới không được trùng với mật khẩu cũ"
            )

        # 3. validate_password_strength(new_password)
        validate_password_strength(data.new_password)

        # 4. update password_hash
        user.password_hash = hash_password(data.new_password)
        user.updated_at = func.now()
        db.add(user)
        await db.commit()

    @staticmethod
    async def upload_avatar(
        db: AsyncSession,
        user: User,
        file: UploadFile,
    ) -> str:
        """Tải lên avatar, xác thực định dạng PNG/JPEG, dung lượng tối đa 5MB và lưu trực tiếp vào user."""
        if not file or not file.filename:
            raise AppException(
                status_code=400,
                error_code="VALIDATION_ERROR",
                message="Vui lòng cung cấp tệp ảnh"
            )

        old_avatar_url = user.avatar_url
        filename_stem = f"{user.id}-{uuid.uuid4().hex[:8]}"

        new_url = await StorageService.save(
            file=file,
            folder="avatars",
            filename_stem=filename_stem,
            max_bytes=5 * 1024 * 1024,
            allowed_mimes=["image/png", "image/jpeg"],
            file_too_large_msg="Ảnh vượt quá dung lượng 5MB",
            unsupported_type_msg="Chỉ chấp nhận ảnh PNG hoặc JPEG",
        )

        # Xóa file avatar cũ nếu nằm trong uploads nội bộ
        if old_avatar_url:
            StorageService.delete(old_avatar_url)

        user.avatar_url = new_url
        user.updated_at = func.now()
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return new_url

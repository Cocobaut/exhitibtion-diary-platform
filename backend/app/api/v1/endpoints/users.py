from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.rate_limit import enforce_limit, upload_limiter
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.user import (
    AvatarOut,
    AvatarResponse,
    ChangePasswordData,
    ChangePasswordIn,
    ChangePasswordResponse,
    UserMeOut,
    UserMeResponse,
    UserProfilePatch,
    UserProfilePatchOut,
    UserProfilePatchResponse,
)
from app.services.user_service import UserService

router = APIRouter()


@router.get(
    "/me",
    response_model=UserMeResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy thông tin cá nhân của người dùng hiện tại"
)
async def get_my_profile(
    current_user: User = Depends(deps.get_current_user),
) -> UserMeResponse:
    """2.1 Lấy thông tin cá nhân của tài khoản đang đăng nhập."""
    return UserMeResponse(
        success=True,
        data=UserMeOut.model_validate(current_user)
    )


@router.patch(
    "/me",
    response_model=UserProfilePatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Cập nhật một phần thông tin cá nhân"
)
async def patch_my_profile(
    patch_data: UserProfilePatch,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> UserProfilePatchResponse:
    """2.2 Cập nhật linh hoạt thông tin cá nhân (nickname, bio, avatar_url)."""
    updated_user = await UserService.update_profile(
        db=db,
        user=current_user,
        patch_data=patch_data
    )
    return UserProfilePatchResponse(
        success=True,
        message="Cập nhật hồ sơ thành công",
        data=UserProfilePatchOut.model_validate(updated_user)
    )


@router.put(
    "/me/password",
    response_model=ChangePasswordResponse,
    status_code=status.HTTP_200_OK,
    summary="Đổi mật khẩu chủ động"
)
async def change_password(
    data: ChangePasswordIn,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> ChangePasswordResponse:
    """2.3 Đổi mật khẩu tài khoản người dùng đã đăng nhập."""
    await UserService.change_password(
        db=db,
        user=current_user,
        data=data
    )
    # Token đang dùng hết hiệu lực vì mật khẩu đã đổi (mọi thiết bị khác cũng bị đăng xuất);
    # cấp token mới để phiên hiện tại tiếp tục
    new_token = create_access_token(
        subject=current_user.id,
        role=current_user.role,
        password_hash=current_user.password_hash,
    )
    return ChangePasswordResponse(
        success=True,
        message="Đổi mật khẩu thành công",
        data=ChangePasswordData(access_token=new_token),
    )


@router.post(
    "/me/avatar",
    response_model=AvatarResponse,
    status_code=status.HTTP_200_OK,
    summary="Tải lên ảnh đại diện Avatar"
)
async def upload_avatar(
    file: UploadFile = File(..., description="Tệp ảnh PNG hoặc JPEG (tối đa 5MB)"),
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db),
) -> AvatarResponse:
    """2.4 Tải lên ảnh đại diện và lưu trực tiếp URL vào tài khoản."""
    enforce_limit(upload_limiter, str(current_user.id), "Bạn tải ảnh quá nhiều. Hãy thử lại sau ít phút.")
    avatar_url = await UserService.upload_avatar(
        db=db,
        user=current_user,
        file=file
    )
    return AvatarResponse(
        success=True,
        message="Tải ảnh đại diện thành công",
        data=AvatarOut(avatar_url=avatar_url)
    )

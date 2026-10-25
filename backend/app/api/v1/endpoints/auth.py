from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    LoginResponseData,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    RegisterResponseData,
    UserAuthProfile,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản mới"
)
async def register(
    req: RegisterRequest,
    db: AsyncSession = Depends(deps.get_db),
) -> RegisterResponse:
    """1.1 Đăng ký tài khoản người dùng mới (vai trò mặc định: USER).
    Trả về payload trong khóa `body`.
    """
    user = await AuthService.register(db, req=req)
    return RegisterResponse(
        success=True,
        message="Tài khoản tạo thành công",
        body=RegisterResponseData.model_validate(user)
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Đăng nhập tài khoản"
)
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(deps.get_db),
) -> LoginResponse:
    """1.2 Đăng nhập bằng tài khoản (username hoặc email) và mật khẩu.
    Trả về access token JWT (thời hạn 24h = 86400s) và thông tin cơ bản người dùng trong khóa `body`.
    """
    user, access_token, message = await AuthService.login(db, req=req)
    return LoginResponse(
        success=True,
        message=message,
        body=LoginResponseData(
            access_token=access_token,
            token_type="Bearer",
            expires_in=settings.JWT_EXPIRE_SECONDS,
            user=UserAuthProfile.model_validate(user)
        )
    )


@router.post(
    "/change-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Đổi / Khôi phục mật khẩu trực tiếp"
)
async def change_password(
    req: ChangePasswordRequest,
    db: AsyncSession = Depends(deps.get_db),
) -> MessageResponse:
    """1.3 Đổi / Khôi phục mật khẩu trực tiếp bằng cách xác thực cặp username và email."""
    await AuthService.change_password(db, req=req)
    return MessageResponse(
        success=True,
        message="Đổi mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới."
    )


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False
)
async def forgot_password_alias(
    req: ChangePasswordRequest,
    db: AsyncSession = Depends(deps.get_db),
) -> MessageResponse:
    """Alias cho /change-password để tương thích ngược."""
    return await change_password(req=req, db=db)


@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Đăng xuất và thu hồi access token"
)
async def logout(
    current_user: User = Depends(deps.get_current_user),
    auth_header: HTTPAuthorizationCredentials = Depends(deps.http_bearer),
    db: AsyncSession = Depends(deps.get_db),
) -> MessageResponse:
    """1.4 Đăng xuất: Đưa access token hiện tại vào danh sách thu hồi (revoked_tokens)."""
    token = auth_header.credentials
    await AuthService.logout(db, token=token)
    return MessageResponse(
        success=True,
        message="Đăng xuất thành công"
    )

from fastapi import APIRouter, Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.core.exceptions import AppException
from app.core.rate_limit import (
    login_account_limiter,
    login_ip_limiter,
    reset_email_limiter,
    reset_ip_limiter,
)
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    LoginResponseData,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    RegisterResponseData,
    ResetPasswordRequest,
    UserAuthProfile,
)
from app.services.auth_service import AuthService

router = APIRouter()


def _client_ip(request: Request) -> str:
    # uvicorn --proxy-headers đã thay client bằng IP thật từ X-Forwarded-For của nginx
    return request.client.host if request.client else "unknown"


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
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
) -> LoginResponse:
    """1.2 Đăng nhập bằng tài khoản (username hoặc email) và mật khẩu.
    Trả về access token JWT (thời hạn 24h = 86400s) và thông tin cơ bản người dùng trong khóa `body`.
    """
    ip = _client_ip(request)
    account_key = f"{ip}|{req.account.lower()}"
    if login_ip_limiter.is_blocked(ip) or login_account_limiter.is_blocked(account_key):
        raise AppException(
            status_code=429,
            error_code="TOO_MANY_ATTEMPTS",
            message="Bạn đã thử sai quá nhiều lần. Hãy đợi 15 phút rồi thử lại."
        )
    try:
        user, access_token, message = await AuthService.login(db, req=req)
    except AppException as exc:
        if exc.error_code == "INVALID_CREDENTIALS":
            login_ip_limiter.hit(ip)
            login_account_limiter.hit(account_key)
        raise
    login_account_limiter.reset(account_key)
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
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Gửi email chứa link đặt lại mật khẩu"
)
async def forgot_password(
    req: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
) -> MessageResponse:
    """1.3 Gửi link đặt lại mật khẩu. Phản hồi giống nhau dù email có tồn tại hay không."""
    ip = _client_ip(request)
    if reset_ip_limiter.is_blocked(ip) or reset_email_limiter.is_blocked(req.email):
        raise AppException(
            status_code=429,
            error_code="TOO_MANY_ATTEMPTS",
            message="Bạn đã yêu cầu quá nhiều lần. Hãy thử lại sau ít phút."
        )
    reset_ip_limiter.hit(ip)
    reset_email_limiter.hit(req.email)
    await AuthService.request_password_reset(db, req.email)
    return MessageResponse(
        success=True,
        message="Nếu email này đã đăng ký, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút."
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Đặt mật khẩu mới bằng link trong email"
)
async def reset_password(
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(deps.get_db),
) -> MessageResponse:
    """1.4 Đặt mật khẩu mới bằng token một lần dùng."""
    await AuthService.reset_password(db, req=req)
    return MessageResponse(
        success=True,
        message="Đổi mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới."
    )


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

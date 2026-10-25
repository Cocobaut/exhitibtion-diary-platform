from typing import Any, Optional
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppException(Exception):
    """Base application exception returning structured JSON error."""
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        data: Optional[Any] = None
    ):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.data = data
        super().__init__(message)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    content = {
        "success": False,
        "error_code": exc.error_code,
        "message": exc.message,
        "data": exc.data,
    }
    return JSONResponse(status_code=exc.status_code, content=content)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Override default 422 to 400 Bad Request as required by the specification."""
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err["loc"] if loc != "body")
        errors.append({
            "field": field or "body",
            "message": err["msg"]
        })
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error_code": "VALIDATION_ERROR",
            "message": "Dữ liệu gửi lên không hợp lệ",
            "data": {"errors": errors}
        }
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    error_code = f"HTTP_{exc.status_code}"
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        error_code = "UNAUTHORIZED"
    elif exc.status_code == status.HTTP_403_FORBIDDEN:
        error_code = "FORBIDDEN"
    elif exc.status_code == status.HTTP_404_NOT_FOUND:
        error_code = "NOT_FOUND"

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error_code": error_code,
            "message": str(exc.detail),
            "data": None
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Do not leak internal stack trace in production
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "Đã xảy ra lỗi hệ thống nội bộ, vui lòng thử lại sau.",
            "data": None
        }
    )

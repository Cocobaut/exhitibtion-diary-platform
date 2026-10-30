from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    general_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.services.auth_service import AuthService


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure upload directories exist
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    for sub in ["artworks", "diaries", "avatars"]:
        (upload_path / sub).mkdir(parents=True, exist_ok=True)

    # Clean up expired revoked tokens
    try:
        async with AsyncSessionLocal() as session:
            await AuthService.cleanup_expired_tokens(session)
    except Exception:
        pass

    yield

    # Shutdown: Dispose engine connection pool
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Nền tảng Triển lãm & Nhật ký Dự án (Project Exhibition & Diary Platform)\n\n"
        "Được xây dựng theo đặc tả kỹ thuật API_Specification.pdf & Database_Specification.pdf."
    ),
    version="1.0.0",
    # Trang tài liệu API chỉ mở ở môi trường dev
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Configure CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Static files for uploaded media (images, files)
upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.UPLOAD_DIR), name="static")

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health Check"])
async def root():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "docs_url": "/docs" if settings.DEBUG else None,
        "api_v1": settings.API_V1_STR,
    }


@app.get("/health", tags=["Health Check"])
async def health_check():
    return {"status": "ok"}

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings
from app.core.middleware import RequestAuthMiddleware
from app.exceptions.handlers import register_exception_handlers


def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )
    application.add_middleware(RequestAuthMiddleware)
    register_exception_handlers(application)
    application.include_router(api_router, prefix=settings.api_v1_prefix)
    return application

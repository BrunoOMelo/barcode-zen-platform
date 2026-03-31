import logging
from time import perf_counter
from uuid import UUID, uuid4

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.auth import AuthenticatedUser
from app.core.config import settings
from app.core.logging import log_structured
from app.core.tenant import TenantContext
from app.db.session import SessionLocal
from app.services.tenant_context_service import TenantContextService


PUBLIC_PATHS = {
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/health",
    "/api/v1/health/live",
    "/api/v1/health/ready",
    "/api/v1/auth/login",
}
TENANT_OPTIONAL_PATHS = {
    "/api/v1/me/tenants",
}

request_logger = logging.getLogger("app.request")


class RequestAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        started_at = perf_counter()
        request.state.request_id = self._resolve_request_id(request)

        if request.method.upper() == "OPTIONS":
            return await self._forward_request(request, call_next, started_at)

        if not settings.auth_required or self._is_public_path(request.url.path):
            return await self._forward_request(request, call_next, started_at)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return self._reject_request(
                request,
                started_at=started_at,
                status_code=401,
                message="Token de autenticacao ausente.",
                code="auth.token_missing",
            )

        token = auth_header.removeprefix("Bearer ").strip()
        if not token:
            return self._reject_request(
                request,
                started_at=started_at,
                status_code=401,
                message="Token de autenticacao ausente.",
                code="auth.token_missing",
            )

        try:
            claims = jwt.decode(
                token,
                settings.auth_jwt_secret,
                algorithms=[settings.auth_jwt_algorithm],
                options={"verify_aud": False},
            )
            subject = claims.get("sub")
            if not subject:
                return self._reject_request(
                    request,
                    started_at=started_at,
                    status_code=401,
                    message="Token de autenticacao invalido.",
                    code="auth.token_invalid",
                )

            request.state.current_user = AuthenticatedUser(
                user_id=UUID(str(subject)),
                email=claims.get("email"),  # type: ignore[arg-type]
                claims=claims,
            )
        except ExpiredSignatureError:
            return self._reject_request(
                request,
                started_at=started_at,
                status_code=401,
                message="Token de autenticacao expirado.",
                code="auth.token_expired",
            )
        except (InvalidTokenError, ValueError):
            return self._reject_request(
                request,
                started_at=started_at,
                status_code=401,
                message="Token de autenticacao invalido.",
                code="auth.token_invalid",
            )

        if self._is_tenant_optional_path(request.url.path):
            return await self._forward_request(request, call_next, started_at)

        tenant_header = request.headers.get("X-Tenant-Id")
        if not tenant_header:
            return self._reject_request(
                request,
                started_at=started_at,
                status_code=403,
                message="Tenant ativo nao informado.",
                code="tenant.context_required",
            )

        try:
            requested_tenant_id = UUID(tenant_header.strip())
        except ValueError:
            return self._reject_request(
                request,
                started_at=started_at,
                status_code=400,
                message="Tenant ativo invalido.",
                code="tenant.context_invalid",
            )

        tenant_context = resolve_tenant_context(request.state.current_user.user_id, requested_tenant_id)
        if tenant_context is None:
            return self._reject_request(
                request,
                started_at=started_at,
                status_code=403,
                message="Usuario sem vinculacao ativa com o tenant informado.",
                code="tenant.membership_required",
            )

        request.state.current_tenant = tenant_context
        request.state.current_tenant_id = tenant_context.tenant_id

        return await self._forward_request(request, call_next, started_at)

    @staticmethod
    def _is_public_path(path: str) -> bool:
        if path in PUBLIC_PATHS:
            return True
        return path.startswith("/docs/") or path.startswith("/redoc/")

    @staticmethod
    def _is_tenant_optional_path(path: str) -> bool:
        return path in TENANT_OPTIONAL_PATHS

    @staticmethod
    def _resolve_request_id(request: Request) -> str:
        incoming_request_id = request.headers.get("X-Request-Id")
        if incoming_request_id and incoming_request_id.strip():
            return incoming_request_id.strip()[:120]
        return str(uuid4())

    async def _forward_request(self, request: Request, call_next, started_at: float) -> Response:
        try:
            response = await call_next(request)
        except Exception:
            self._log_request(
                request=request,
                status_code=500,
                started_at=started_at,
                outcome="unhandled_exception",
                error_code="http.unhandled_exception",
            )
            raise
        return self._finalize_response(request, response, started_at=started_at, outcome="success")

    def _reject_request(
        self,
        request: Request,
        *,
        started_at: float,
        status_code: int,
        message: str,
        code: str,
    ) -> Response:
        response = _error_response(status_code, message, code)
        return self._finalize_response(
            request,
            response,
            started_at=started_at,
            outcome="rejected",
            error_code=code,
        )

    def _finalize_response(
        self,
        request: Request,
        response: Response,
        *,
        started_at: float,
        outcome: str,
        error_code: str | None = None,
    ) -> Response:
        request_id = getattr(request.state, "request_id", None)
        if request_id:
            response.headers["X-Request-Id"] = str(request_id)
        self._log_request(
            request=request,
            status_code=response.status_code,
            started_at=started_at,
            outcome=outcome,
            error_code=error_code,
        )
        return response

    def _log_request(
        self,
        *,
        request: Request,
        status_code: int,
        started_at: float,
        outcome: str,
        error_code: str | None = None,
    ) -> None:
        current_user = getattr(request.state, "current_user", None)
        user_id = getattr(current_user, "user_id", None)
        tenant_id = getattr(request.state, "current_tenant_id", None)
        duration_ms = round((perf_counter() - started_at) * 1000, 2)

        log_structured(
            request_logger,
            level=logging.INFO,
            fields={
                "event": "http_request",
                "request_id": getattr(request.state, "request_id", None),
                "method": request.method.upper(),
                "path": request.url.path,
                "status_code": status_code,
                "duration_ms": duration_ms,
                "user_id": str(user_id) if user_id is not None else None,
                "tenant_id": str(tenant_id) if tenant_id is not None else None,
                "outcome": outcome,
                "error_code": error_code,
            },
        )


def resolve_tenant_context(user_id: UUID, tenant_id: UUID) -> TenantContext | None:
    db = SessionLocal()
    try:
        service = TenantContextService(db)
        return service.resolve_active_tenant_context(user_id=user_id, tenant_id=tenant_id)
    finally:
        db.close()


def _error_response(status_code: int, message: str, code: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "message": message,
            "code": code,
        },
    )

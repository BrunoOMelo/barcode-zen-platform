from uuid import UUID

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.auth import AuthenticatedUser
from app.core.config import settings


PUBLIC_PATHS = {
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/health",
}


class RequestAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if not settings.auth_required or self._is_public_path(request.url.path):
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"message": "Token de autenticacao ausente."},
            )

        token = auth_header.removeprefix("Bearer ").strip()
        if not token:
            return JSONResponse(
                status_code=401,
                content={"message": "Token de autenticacao ausente."},
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
                return JSONResponse(
                    status_code=401,
                    content={"message": "Token de autenticacao invalido."},
                )

            request.state.current_user = AuthenticatedUser(
                user_id=UUID(str(subject)),
                email=claims.get("email"),  # type: ignore[arg-type]
                claims=claims,
            )
        except ExpiredSignatureError:
            return JSONResponse(
                status_code=401,
                content={"message": "Token de autenticacao expirado."},
            )
        except (InvalidTokenError, ValueError):
            return JSONResponse(
                status_code=401,
                content={"message": "Token de autenticacao invalido."},
            )

        return await call_next(request)

    @staticmethod
    def _is_public_path(path: str) -> bool:
        if path in PUBLIC_PATHS:
            return True
        return path.startswith("/docs/") or path.startswith("/redoc/")

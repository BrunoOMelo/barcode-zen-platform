from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from passlib.context import CryptContext

from app.core.config import settings

password_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def create_access_token(*, user_id: UUID, email: str, expires_minutes: int | None = None) -> tuple[str, int]:
    lifetime_minutes = expires_minutes or settings.auth_access_token_ttl_minutes
    now = datetime.now(tz=UTC)
    expires_at = now + timedelta(minutes=lifetime_minutes)
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.auth_jwt_secret, algorithm=settings.auth_jwt_algorithm)
    expires_in_seconds = int((expires_at - now).total_seconds())
    return token, expires_in_seconds

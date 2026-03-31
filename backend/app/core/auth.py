from dataclasses import dataclass
from uuid import UUID

from fastapi import Request

from app.exceptions.auth_exceptions import AuthenticationRequiredException


@dataclass(slots=True)
class AuthenticatedUser:
    user_id: UUID
    email: str | None
    claims: dict[str, object]


def get_current_user(request: Request) -> AuthenticatedUser:
    user = getattr(request.state, "current_user", None)
    if user is None:
        raise AuthenticationRequiredException()
    return user

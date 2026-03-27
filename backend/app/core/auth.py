from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, Request, status


@dataclass(slots=True)
class AuthenticatedUser:
    user_id: UUID
    email: str | None
    claims: dict[str, object]


def get_current_user(request: Request) -> AuthenticatedUser:
    user = getattr(request.state, "current_user", None)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticacao ausente ou invalido.",
        )
    return user

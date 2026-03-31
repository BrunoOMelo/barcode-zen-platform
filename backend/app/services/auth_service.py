import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.exceptions.auth_exceptions import (
    InactiveUserException,
    InvalidCredentialsException,
    NoActiveTenantAccessException,
)
from app.models.platform_user import PlatformUser
from app.repositories.platform_user_repository import PlatformUserRepository
from app.services.tenant_context_service import AvailableTenant, TenantContextService


@dataclass(slots=True)
class AuthLoginResult:
    access_token: str
    token_type: str
    expires_in: int
    user_id: uuid.UUID
    email: str
    available_tenants: list[AvailableTenant]
    default_tenant_id: uuid.UUID


class AuthService:
    def __init__(self, db: Session) -> None:
        self.user_repository = PlatformUserRepository(db)
        self.tenant_context_service = TenantContextService(db)

    def login(self, *, email: str, password: str) -> AuthLoginResult:
        user = self._validate_credentials(email=email, password=password)
        available_tenants = self.tenant_context_service.list_available_tenants(user.id)
        if not available_tenants:
            raise NoActiveTenantAccessException()

        default_tenant_id = self._resolve_default_tenant_id(available_tenants)
        access_token, expires_in = create_access_token(user_id=user.id, email=user.email)
        return AuthLoginResult(
            access_token=access_token,
            token_type="bearer",
            expires_in=expires_in,
            user_id=user.id,
            email=user.email,
            available_tenants=available_tenants,
            default_tenant_id=default_tenant_id,
        )

    def _validate_credentials(self, *, email: str, password: str) -> PlatformUser:
        normalized_email = email.strip().lower()
        user = self.user_repository.get_by_email(normalized_email)
        if user is None:
            raise InvalidCredentialsException()
        if not user.is_active:
            raise InactiveUserException()
        if not verify_password(password, user.password_hash):
            raise InvalidCredentialsException()
        return user

    @staticmethod
    def _resolve_default_tenant_id(tenants: list[AvailableTenant]) -> uuid.UUID:
        preferred = next((tenant for tenant in tenants if tenant.is_default), None)
        if preferred is not None:
            return preferred.tenant_id
        return tenants[0].tenant_id

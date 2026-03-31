from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth_schema import (
    AuthLoginRequest,
    AuthLoginResponse,
    AuthTenantOptionResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post(
    "/login",
    response_model=AuthLoginResponse,
    summary="Authenticate user with email and password",
)
def login(
    payload: AuthLoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> AuthLoginResponse:
    result = service.login(email=payload.email, password=payload.password)
    return AuthLoginResponse(
        access_token=result.access_token,
        token_type=result.token_type,
        expires_in=result.expires_in,
        user_id=result.user_id,
        email=result.email,
        available_tenants=[
            AuthTenantOptionResponse(
                tenant_id=tenant.tenant_id,
                membership_id=tenant.membership_id,
                tenant_name=tenant.tenant_name,
                tenant_slug=tenant.tenant_slug,
                role=tenant.role,
                is_default=tenant.is_default,
            )
            for tenant in result.available_tenants
        ],
        default_tenant_id=result.default_tenant_id,
    )

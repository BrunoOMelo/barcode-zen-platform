from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.policy import Permission, get_permissions_for_role, require_permission
from app.core.tenant import TenantContext, get_current_tenant_context
from app.db.session import get_db
from app.schemas.me_schema import (
    AvailableTenantResponse,
    MeContextResponse,
    SwitchTenantRequest,
    SwitchTenantResponse,
)
from app.services.me_service import MeService
from app.services.tenant_context_service import TenantContextService

router = APIRouter(prefix="/me", tags=["me"])


def get_me_service(db: Session = Depends(get_db)) -> MeService:
    return MeService(db)


def _build_context_response(current_user: AuthenticatedUser, current_tenant: TenantContext) -> MeContextResponse:
    permissions = sorted(get_permissions_for_role(current_tenant.role))
    return MeContextResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        tenant_id=current_tenant.tenant_id,
        membership_id=current_tenant.membership_id,
        role=current_tenant.role,
        permissions=permissions,
    )


def get_tenant_context_service(db: Session = Depends(get_db)) -> TenantContextService:
    return TenantContextService(db)


@router.get("/context", response_model=MeContextResponse)
def get_me_context(
    _: None = Depends(require_permission(Permission.TENANT_CONTEXT_READ)),
    current_user: AuthenticatedUser = Depends(get_current_user),
    current_tenant: TenantContext = Depends(get_current_tenant_context),
) -> MeContextResponse:
    return _build_context_response(
        current_user=current_user,
        current_tenant=current_tenant,
    )


@router.get("/tenants", response_model=list[AvailableTenantResponse])
def list_available_tenants(
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: TenantContextService = Depends(get_tenant_context_service),
) -> list[AvailableTenantResponse]:
    rows = service.list_available_tenants(user_id=current_user.user_id)
    return [
        AvailableTenantResponse(
            tenant_id=row.tenant_id,
            membership_id=row.membership_id,
            tenant_name=row.tenant_name,
            tenant_slug=row.tenant_slug,
            role=row.role,
            is_default=row.is_default,
        )
        for row in rows
    ]


@router.post("/switch-tenant", response_model=SwitchTenantResponse)
def switch_tenant(
    payload: SwitchTenantRequest,
    _: None = Depends(require_permission(Permission.TENANT_SWITCH)),
    current_user: AuthenticatedUser = Depends(get_current_user),
    current_tenant: TenantContext = Depends(get_current_tenant_context),
    service: MeService = Depends(get_me_service),
) -> SwitchTenantResponse:
    next_tenant_context = service.switch_tenant(
        user_id=current_user.user_id,
        previous_tenant_id=current_tenant.tenant_id,
        target_tenant_id=payload.tenant_id,
    )
    return SwitchTenantResponse(
        previous_tenant_id=current_tenant.tenant_id,
        current_tenant_id=next_tenant_context.tenant_id,
        role=next_tenant_context.role,
        permissions=sorted(get_permissions_for_role(next_tenant_context.role)),
    )

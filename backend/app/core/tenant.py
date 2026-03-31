import uuid
from dataclasses import dataclass

from fastapi import Request

from app.exceptions.tenant_exceptions import TenantContextRequiredException


@dataclass(slots=True)
class TenantContext:
    tenant_id: uuid.UUID
    membership_id: uuid.UUID
    role: str


def get_current_tenant_context(request: Request) -> TenantContext:
    tenant_context = getattr(request.state, "current_tenant", None)
    if isinstance(tenant_context, TenantContext):
        return tenant_context
    raise TenantContextRequiredException()


def get_current_tenant_id(request: Request) -> uuid.UUID:
    tenant_context = get_current_tenant_context(request)
    if not isinstance(tenant_context.tenant_id, uuid.UUID):
        raise TenantContextRequiredException()
    return tenant_context.tenant_id

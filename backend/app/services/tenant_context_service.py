import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.repositories.tenant_context_repository import TenantContextRepository


@dataclass(slots=True)
class AvailableTenant:
    tenant_id: uuid.UUID
    membership_id: uuid.UUID
    tenant_name: str
    tenant_slug: str
    role: str
    is_default: bool


class TenantContextService:
    def __init__(self, db: Session) -> None:
        self.repository = TenantContextRepository(db)

    def resolve_active_tenant_context(self, user_id: uuid.UUID, tenant_id: uuid.UUID) -> TenantContext | None:
        membership = self.repository.get_active_membership(user_id=user_id, tenant_id=tenant_id)
        if membership is None:
            return None
        return TenantContext(
            tenant_id=membership.tenant_id,
            membership_id=membership.id,
            role=membership.role,
        )

    def list_available_tenants(self, user_id: uuid.UUID) -> list[AvailableTenant]:
        rows = self.repository.list_active_memberships(user_id=user_id)
        return [
            AvailableTenant(
                tenant_id=membership.tenant_id,
                membership_id=membership.id,
                tenant_name=tenant.name,
                tenant_slug=tenant.slug,
                role=membership.role,
                is_default=membership.is_default,
            )
            for membership, tenant in rows
        ]

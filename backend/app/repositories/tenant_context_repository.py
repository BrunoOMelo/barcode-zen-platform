import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.models.user_tenant_membership import UserTenantMembership


class TenantContextRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_active_membership(self, user_id: uuid.UUID, tenant_id: uuid.UUID) -> UserTenantMembership | None:
        stmt = (
            select(UserTenantMembership)
            .join(Tenant, Tenant.id == UserTenantMembership.tenant_id)
            .where(
                UserTenantMembership.user_id == user_id,
                UserTenantMembership.tenant_id == tenant_id,
                UserTenantMembership.status == "active",
                Tenant.is_active.is_(True),
            )
        )
        return self.db.scalar(stmt)

    def list_active_memberships(self, user_id: uuid.UUID) -> list[tuple[UserTenantMembership, Tenant]]:
        stmt = (
            select(UserTenantMembership, Tenant)
            .join(Tenant, Tenant.id == UserTenantMembership.tenant_id)
            .where(
                UserTenantMembership.user_id == user_id,
                UserTenantMembership.status == "active",
                Tenant.is_active.is_(True),
            )
            .order_by(UserTenantMembership.is_default.desc(), Tenant.name.asc())
        )
        rows = self.db.execute(stmt).all()
        return [(membership, tenant) for membership, tenant in rows]

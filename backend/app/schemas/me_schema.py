import uuid

from pydantic import BaseModel


class MeContextResponse(BaseModel):
    user_id: uuid.UUID
    email: str | None
    tenant_id: uuid.UUID
    membership_id: uuid.UUID
    role: str
    permissions: list[str]


class AvailableTenantResponse(BaseModel):
    tenant_id: uuid.UUID
    membership_id: uuid.UUID
    tenant_name: str
    tenant_slug: str
    role: str
    is_default: bool


class SwitchTenantRequest(BaseModel):
    tenant_id: uuid.UUID


class SwitchTenantResponse(BaseModel):
    previous_tenant_id: uuid.UUID
    current_tenant_id: uuid.UUID
    role: str
    permissions: list[str]

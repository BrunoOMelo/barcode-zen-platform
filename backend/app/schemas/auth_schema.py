import uuid

from pydantic import BaseModel, Field


class AuthLoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class AuthTenantOptionResponse(BaseModel):
    tenant_id: uuid.UUID
    membership_id: uuid.UUID
    tenant_name: str
    tenant_slug: str
    role: str
    is_default: bool


class AuthLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: uuid.UUID
    email: str
    available_tenants: list[AuthTenantOptionResponse]
    default_tenant_id: uuid.UUID

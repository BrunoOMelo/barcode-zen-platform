import uuid

import jwt
from fastapi.testclient import TestClient

from app.core import middleware as auth_middleware
from app.core.config import settings
from app.core.tenant import TenantContext
from app.services import me_service
from app.services.tenant_context_service import AvailableTenant, TenantContextService
from main import app

client = TestClient(app)


def _create_token(user_id: uuid.UUID) -> str:
    return jwt.encode(
        {"sub": str(user_id), "email": "policy-test@barcodezen.com"},
        settings.auth_jwt_secret,
        algorithm=settings.auth_jwt_algorithm,
    )


def test_policy_default_deny_unknown_role(monkeypatch) -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()

    def _fake_resolver(_: uuid.UUID, __: uuid.UUID) -> TenantContext:
        return TenantContext(
            tenant_id=tenant_id,
            membership_id=uuid.uuid4(),
            role="unknown_role",
        )

    monkeypatch.setattr(auth_middleware, "resolve_tenant_context", _fake_resolver)

    response = client.get(
        "/api/v1/me/context",
        headers={
            "Authorization": f"Bearer {_create_token(user_id)}",
            "X-Tenant-Id": str(tenant_id),
        },
    )

    assert response.status_code == 403
    assert response.json()["message"] == "Voce nao tem permissao para executar esta acao."


def test_policy_blocks_viewer_from_product_write(monkeypatch) -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()

    def _fake_resolver(_: uuid.UUID, __: uuid.UUID) -> TenantContext:
        return TenantContext(
            tenant_id=tenant_id,
            membership_id=uuid.uuid4(),
            role="viewer",
        )

    monkeypatch.setattr(auth_middleware, "resolve_tenant_context", _fake_resolver)

    response = client.post(
        "/api/v1/products/",
        headers={
            "Authorization": f"Bearer {_create_token(user_id)}",
            "X-Tenant-Id": str(tenant_id),
        },
        json={
            "name": "Produto Teste",
            "barcode": "123456789012",
            "quantity": 1,
        },
    )

    assert response.status_code == 403
    assert response.json()["message"] == "Voce nao tem permissao para executar esta acao."


def test_me_context_returns_user_tenant_role_and_permissions(monkeypatch) -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    membership_id = uuid.uuid4()

    def _fake_resolver(_: uuid.UUID, __: uuid.UUID) -> TenantContext:
        return TenantContext(
            tenant_id=tenant_id,
            membership_id=membership_id,
            role="admin",
        )

    monkeypatch.setattr(auth_middleware, "resolve_tenant_context", _fake_resolver)

    response = client.get(
        "/api/v1/me/context",
        headers={
            "Authorization": f"Bearer {_create_token(user_id)}",
            "X-Tenant-Id": str(tenant_id),
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(user_id)
    assert data["tenant_id"] == str(tenant_id)
    assert data["membership_id"] == str(membership_id)
    assert data["role"] == "admin"
    assert "products:read" in data["permissions"]
    assert "products:write" in data["permissions"]
    assert "products:delete" in data["permissions"]
    assert "tenant:context:read" in data["permissions"]


def test_switch_tenant_returns_next_context(monkeypatch) -> None:
    user_id = uuid.uuid4()
    current_tenant_id = uuid.uuid4()
    target_tenant_id = uuid.uuid4()
    target_membership_id = uuid.uuid4()

    def _fake_middleware_resolver(_: uuid.UUID, __: uuid.UUID) -> TenantContext:
        return TenantContext(
            tenant_id=current_tenant_id,
            membership_id=uuid.uuid4(),
            role="member",
        )

    def _fake_switch(
        self,  # noqa: ARG001
        user_id: uuid.UUID,  # noqa: ARG001
        previous_tenant_id: uuid.UUID,  # noqa: ARG001
        target_tenant_id: uuid.UUID,  # noqa: ARG001
    ) -> TenantContext:
        return TenantContext(
            tenant_id=target_tenant_id,
            membership_id=target_membership_id,
            role="admin",
        )

    monkeypatch.setattr(auth_middleware, "resolve_tenant_context", _fake_middleware_resolver)
    monkeypatch.setattr(me_service.MeService, "switch_tenant", _fake_switch)

    response = client.post(
        "/api/v1/me/switch-tenant",
        headers={
            "Authorization": f"Bearer {_create_token(user_id)}",
            "X-Tenant-Id": str(current_tenant_id),
        },
        json={"tenant_id": str(target_tenant_id)},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["previous_tenant_id"] == str(current_tenant_id)
    assert data["current_tenant_id"] == str(target_tenant_id)
    assert data["role"] == "admin"
    assert "products:write" in data["permissions"]


def test_me_tenants_allows_request_without_tenant_header(monkeypatch) -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    membership_id = uuid.uuid4()

    def _fake_list_available_tenants(self, user_id: uuid.UUID) -> list[AvailableTenant]:  # noqa: ARG001
        return [
            AvailableTenant(
                tenant_id=tenant_id,
                membership_id=membership_id,
                tenant_name="Empreendimento Teste",
                tenant_slug="empreendimento-teste",
                role="admin",
                is_default=True,
            )
        ]

    monkeypatch.setattr(TenantContextService, "list_available_tenants", _fake_list_available_tenants)

    response = client.get(
        "/api/v1/me/tenants",
        headers={"Authorization": f"Bearer {_create_token(user_id)}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["tenant_id"] == str(tenant_id)
    assert body[0]["role"] == "admin"

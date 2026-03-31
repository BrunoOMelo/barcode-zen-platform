import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.security import hash_password
from app.db.session import engine
from main import app

client = TestClient(app)


def _insert_tenant(tenant_id: uuid.UUID, name: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO tenants (id, name, slug, legal_name, tax_id, is_active, created_at, updated_at)
                VALUES (:id, :name, :slug, :legal_name, :tax_id, true, NOW(), NOW())
                """
            ),
            {
                "id": tenant_id,
                "name": name,
                "slug": f"auth-login-{tenant_id.hex[:12]}",
                "legal_name": name,
                "tax_id": None,
            },
        )


def _insert_user(user_id: uuid.UUID, email: str, password: str, is_active: bool = True) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO platform_users (id, email, password_hash, full_name, is_active, created_at, updated_at)
                VALUES (:id, :email, :password_hash, :full_name, :is_active, NOW(), NOW())
                """
            ),
            {
                "id": user_id,
                "email": email.lower(),
                "password_hash": hash_password(password),
                "full_name": "Usuário Teste Login",
                "is_active": is_active,
            },
        )


def _insert_membership(
    membership_id: uuid.UUID,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    *,
    role: str = "admin",
    is_default: bool = True,
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO user_tenant_memberships (id, user_id, tenant_id, role, status, is_default, created_at, updated_at)
                VALUES (:id, :user_id, :tenant_id, :role, 'active', :is_default, NOW(), NOW())
                """
            ),
            {
                "id": membership_id,
                "user_id": user_id,
                "tenant_id": tenant_id,
                "role": role,
                "is_default": is_default,
            },
        )


def _cleanup(*, user_id: uuid.UUID, tenant_id: uuid.UUID, membership_id: uuid.UUID | None = None) -> None:
    with engine.begin() as conn:
        if membership_id is not None:
            conn.execute(text("DELETE FROM user_tenant_memberships WHERE id = :id"), {"id": membership_id})
        conn.execute(text("DELETE FROM platform_users WHERE id = :id"), {"id": user_id})
        conn.execute(text("DELETE FROM tenants WHERE id = :id"), {"id": tenant_id})


@pytest.fixture(scope="module", autouse=True)
def _require_database() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover
        pytest.skip(f"PostgreSQL indisponivel para testes de auth login: {exc}")


def test_login_returns_token_and_available_tenants() -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    membership_id = uuid.uuid4()
    email = "admin-login-test@barcodezen.local"
    password = "AdminLogin@123"

    _insert_tenant(tenant_id, "Tenant Auth Login")
    _insert_user(user_id, email, password)
    _insert_membership(membership_id, user_id, tenant_id)

    try:
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": email.upper(), "password": password},
        )
        assert login_response.status_code == 200
        body = login_response.json()
        assert body["token_type"] == "bearer"
        assert body["access_token"]
        assert body["user_id"] == str(user_id)
        assert body["email"] == email
        assert body["default_tenant_id"] == str(tenant_id)
        assert len(body["available_tenants"]) == 1
        assert body["available_tenants"][0]["tenant_id"] == str(tenant_id)

        tenants_response = client.get(
            "/api/v1/me/tenants",
            headers={"Authorization": f"Bearer {body['access_token']}"},
        )
        assert tenants_response.status_code == 200
        assert len(tenants_response.json()) == 1
    finally:
        _cleanup(user_id=user_id, tenant_id=tenant_id, membership_id=membership_id)


def test_login_rejects_invalid_password() -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    membership_id = uuid.uuid4()
    email = "invalid-password-test@barcodezen.local"
    password = "ValidPass@123"

    _insert_tenant(tenant_id, "Tenant Invalid Password")
    _insert_user(user_id, email, password)
    _insert_membership(membership_id, user_id, tenant_id)

    try:
        response = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "WrongPass@123"},
        )
        assert response.status_code == 401
        assert response.json()["code"] == "auth.invalid_credentials"
    finally:
        _cleanup(user_id=user_id, tenant_id=tenant_id, membership_id=membership_id)


def test_login_rejects_user_without_tenant_membership() -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    email = "no-tenant-user@barcodezen.local"
    password = "NoTenant@123"

    _insert_tenant(tenant_id, "Tenant No Access")
    _insert_user(user_id, email, password)

    try:
        response = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert response.status_code == 403
        assert response.json()["code"] == "auth.no_active_tenant_access"
    finally:
        _cleanup(user_id=user_id, tenant_id=tenant_id, membership_id=None)

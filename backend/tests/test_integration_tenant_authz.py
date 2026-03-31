import uuid
from collections.abc import Iterable

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from main import app

client = TestClient(app)


def _token_for_user(user_id: uuid.UUID, email: str = "integration-test@barcodezen.local") -> str:
    return jwt.encode(
        {"sub": str(user_id), "email": email},
        settings.auth_jwt_secret,
        algorithm=settings.auth_jwt_algorithm,
    )


def _headers(token: str, tenant_id: uuid.UUID | None = None) -> dict[str, str]:
    headers: dict[str, str] = {"Authorization": f"Bearer {token}"}
    if tenant_id is not None:
        headers["X-Tenant-Id"] = str(tenant_id)
    return headers


def _insert_tenant(tenant_id: uuid.UUID, name: str) -> str:
    slug = f"it-{tenant_id.hex[:10]}"
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
                "slug": slug,
                "legal_name": name,
                "tax_id": None,
            },
        )
    return slug


def _insert_membership(
    membership_id: uuid.UUID,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    role: str,
    is_default: bool,
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


def _insert_product(product_id: uuid.UUID, tenant_id: uuid.UUID, name: str, barcode: str, quantity: int = 1) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO products (
                    id, tenant_id, name, sku, barcode, description, category, active, cost, price, quantity, created_at, updated_at
                ) VALUES (
                    :id, :tenant_id, :name, :sku, :barcode, :description, :category, :active, :cost, :price, :quantity, NOW(), NOW()
                )
                """
            ),
            {
                "id": product_id,
                "tenant_id": tenant_id,
                "name": name,
                "sku": barcode,
                "barcode": barcode,
                "description": None,
                "category": None,
                "active": True,
                "cost": None,
                "price": None,
                "quantity": quantity,
            },
        )


def _cleanup(
    *,
    product_ids: Iterable[uuid.UUID] = (),
    membership_ids: Iterable[uuid.UUID] = (),
    tenant_ids: Iterable[uuid.UUID] = (),
) -> None:
    with engine.begin() as conn:
        for product_id in product_ids:
            conn.execute(text("DELETE FROM products WHERE id = :id"), {"id": product_id})
        for membership_id in membership_ids:
            conn.execute(text("DELETE FROM user_tenant_memberships WHERE id = :id"), {"id": membership_id})
        for tenant_id in tenant_ids:
            conn.execute(text("DELETE FROM tenants WHERE id = :id"), {"id": tenant_id})


@pytest.fixture(scope="module", autouse=True)
def _require_database() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - safety fallback for environments sem DB
        pytest.skip(f"PostgreSQL indisponivel para testes de integracao: {exc}")


def test_cross_tenant_product_isolation_and_tenant_aware_uniqueness() -> None:
    user_id = uuid.uuid4()
    tenant_a_id = uuid.uuid4()
    tenant_b_id = uuid.uuid4()
    membership_a_id = uuid.uuid4()
    membership_b_id = uuid.uuid4()
    created_product_ids: list[uuid.UUID] = []

    _insert_tenant(tenant_a_id, "IT Tenant A")
    _insert_tenant(tenant_b_id, "IT Tenant B")
    _insert_membership(membership_a_id, user_id, tenant_a_id, role="admin", is_default=True)
    _insert_membership(membership_b_id, user_id, tenant_b_id, role="admin", is_default=False)

    token = _token_for_user(user_id)
    barcode = f"IT-{uuid.uuid4().hex[:16]}"

    try:
        create_a = client.post(
            "/api/v1/products/",
            headers=_headers(token, tenant_a_id),
            json={"name": "Produto A", "barcode": barcode, "quantity": 1},
        )
        assert create_a.status_code == 201
        product_a_id = uuid.UUID(create_a.json()["id"])
        created_product_ids.append(product_a_id)

        create_b = client.post(
            "/api/v1/products/",
            headers=_headers(token, tenant_b_id),
            json={"name": "Produto B", "barcode": barcode, "quantity": 2},
        )
        assert create_b.status_code == 201
        product_b_id = uuid.UUID(create_b.json()["id"])
        created_product_ids.append(product_b_id)

        list_a = client.get("/api/v1/products/", headers=_headers(token, tenant_a_id))
        assert list_a.status_code == 200
        assert list_a.json()["total"] == 1
        assert list_a.json()["items"][0]["id"] == str(product_a_id)

        list_b = client.get("/api/v1/products/", headers=_headers(token, tenant_b_id))
        assert list_b.status_code == 200
        assert list_b.json()["total"] == 1
        assert list_b.json()["items"][0]["id"] == str(product_b_id)

        cross_tenant_read = client.get(f"/api/v1/products/{product_a_id}", headers=_headers(token, tenant_b_id))
        assert cross_tenant_read.status_code == 404
        assert cross_tenant_read.json()["code"] == "product.not_found"
    finally:
        _cleanup(
            product_ids=created_product_ids,
            membership_ids=[membership_a_id, membership_b_id],
            tenant_ids=[tenant_a_id, tenant_b_id],
        )


def test_authz_blocks_viewer_write_and_member_delete() -> None:
    viewer_user_id = uuid.uuid4()
    member_user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    viewer_membership_id = uuid.uuid4()
    member_membership_id = uuid.uuid4()
    seeded_product_id = uuid.uuid4()

    _insert_tenant(tenant_id, "IT Tenant Roles")
    _insert_membership(viewer_membership_id, viewer_user_id, tenant_id, role="viewer", is_default=True)
    _insert_membership(member_membership_id, member_user_id, tenant_id, role="member", is_default=False)
    _insert_product(seeded_product_id, tenant_id, "Produto Seed", f"IT-SEED-{uuid.uuid4().hex[:10]}")

    viewer_token = _token_for_user(viewer_user_id)
    member_token = _token_for_user(member_user_id)

    try:
        viewer_create = client.post(
            "/api/v1/products/",
            headers=_headers(viewer_token, tenant_id),
            json={"name": "Sem Permissao", "barcode": f"IT-{uuid.uuid4().hex[:12]}", "quantity": 1},
        )
        assert viewer_create.status_code == 403
        assert viewer_create.json()["code"] == "auth.permission_denied"

        member_delete = client.delete(f"/api/v1/products/{seeded_product_id}", headers=_headers(member_token, tenant_id))
        assert member_delete.status_code == 403
        assert member_delete.json()["code"] == "auth.permission_denied"
    finally:
        _cleanup(
            product_ids=[seeded_product_id],
            membership_ids=[viewer_membership_id, member_membership_id],
            tenant_ids=[tenant_id],
        )


def test_me_endpoints_enforce_membership_scope_and_visibility() -> None:
    user_id = uuid.uuid4()
    other_user_id = uuid.uuid4()
    tenant_a_id = uuid.uuid4()
    tenant_b_id = uuid.uuid4()
    tenant_c_id = uuid.uuid4()
    membership_a_id = uuid.uuid4()
    membership_b_id = uuid.uuid4()
    other_membership_id = uuid.uuid4()

    _insert_tenant(tenant_a_id, "IT Tenant Membership A")
    _insert_tenant(tenant_b_id, "IT Tenant Membership B")
    _insert_tenant(tenant_c_id, "IT Tenant Membership C")
    _insert_membership(membership_a_id, user_id, tenant_a_id, role="admin", is_default=True)
    _insert_membership(membership_b_id, user_id, tenant_b_id, role="member", is_default=False)
    _insert_membership(other_membership_id, other_user_id, tenant_c_id, role="admin", is_default=True)

    token = _token_for_user(user_id)

    try:
        tenants_response = client.get("/api/v1/me/tenants", headers=_headers(token))
        assert tenants_response.status_code == 200
        visible_tenants = {item["tenant_id"] for item in tenants_response.json()}
        assert visible_tenants == {str(tenant_a_id), str(tenant_b_id)}

        blocked_context = client.get("/api/v1/me/context", headers=_headers(token, tenant_c_id))
        assert blocked_context.status_code == 403
        assert blocked_context.json()["code"] == "tenant.membership_required"

        blocked_switch = client.post(
            "/api/v1/me/switch-tenant",
            headers=_headers(token, tenant_a_id),
            json={"tenant_id": str(tenant_c_id)},
        )
        assert blocked_switch.status_code == 403
        assert blocked_switch.json()["code"] == "tenant.membership_required"
    finally:
        _cleanup(
            membership_ids=[membership_a_id, membership_b_id, other_membership_id],
            tenant_ids=[tenant_a_id, tenant_b_id, tenant_c_id],
        )

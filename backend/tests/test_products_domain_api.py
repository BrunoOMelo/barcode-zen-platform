import uuid

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from main import app

client = TestClient(app)


def _token_for_user(user_id: uuid.UUID, email: str = "products-domain@barcodezen.local") -> str:
    return jwt.encode(
        {"sub": str(user_id), "email": email},
        settings.auth_jwt_secret,
        algorithm=settings.auth_jwt_algorithm,
    )


def _headers(token: str, tenant_id: uuid.UUID) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Id": str(tenant_id),
    }


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
                "slug": f"it-products-{tenant_id.hex[:10]}",
                "legal_name": name,
                "tax_id": None,
            },
        )


def _insert_membership(
    membership_id: uuid.UUID,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
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


def _cleanup(tenant_id: uuid.UUID, membership_id: uuid.UUID) -> None:
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM products WHERE tenant_id = :tenant_id"), {"tenant_id": tenant_id})
        conn.execute(text("DELETE FROM user_tenant_memberships WHERE id = :id"), {"id": membership_id})
        conn.execute(text("DELETE FROM tenants WHERE id = :id"), {"id": tenant_id})


@pytest.fixture(scope="module", autouse=True)
def _require_database() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover
        pytest.skip(f"PostgreSQL indisponivel para testes de produto: {exc}")


def test_products_list_supports_filters_search_and_pagination() -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    membership_id = uuid.uuid4()

    _insert_tenant(tenant_id, "IT Products Listing")
    _insert_membership(membership_id, user_id, tenant_id)
    token = _token_for_user(user_id)

    try:
        create_payloads = [
            {
                "name": "Camera Pro",
                "sku": "CAM-001",
                "barcode": f"BC-{uuid.uuid4().hex[:10]}",
                "description": "Camera digital para auditoria",
                "category": "ELETRONICOS",
                "active": True,
                "quantity": 5,
            },
            {
                "name": "Detergente",
                "sku": "LIMP-001",
                "barcode": f"BC-{uuid.uuid4().hex[:10]}",
                "description": "Produto de limpeza industrial",
                "category": "LIMPEZA",
                "active": False,
                "quantity": 10,
            },
            {
                "name": "Leitor Portatil",
                "sku": "ELE-002",
                "barcode": f"BC-{uuid.uuid4().hex[:10]}",
                "description": "Leitor de codigo de barras",
                "category": "ELETRONICOS",
                "active": True,
                "quantity": 2,
            },
        ]
        for payload in create_payloads:
            response = client.post("/api/v1/products/", headers=_headers(token, tenant_id), json=payload)
            assert response.status_code == 201

        filtered_page = client.get(
            "/api/v1/products/",
            headers=_headers(token, tenant_id),
            params={"page": 1, "page_size": 1, "category": "ELETRONICOS", "active": "true"},
        )
        assert filtered_page.status_code == 200
        body = filtered_page.json()
        assert body["page"] == 1
        assert body["page_size"] == 1
        assert body["total"] == 2
        assert body["total_pages"] == 2
        assert len(body["items"]) == 1

        search_camera = client.get(
            "/api/v1/products/",
            headers=_headers(token, tenant_id),
            params={"search": "camera"},
        )
        assert search_camera.status_code == 200
        search_body = search_camera.json()
        assert search_body["total"] == 1
        assert search_body["items"][0]["sku"] == "CAM-001"

        barcode_lookup = client.get(
            "/api/v1/products/",
            headers=_headers(token, tenant_id),
            params={"search": "LIMP-001", "active": "false"},
        )
        assert barcode_lookup.status_code == 200
        barcode_body = barcode_lookup.json()
        assert barcode_body["total"] == 1
        assert barcode_body["items"][0]["category"] == "LIMPEZA"
        assert barcode_body["items"][0]["active"] is False
    finally:
        _cleanup(tenant_id, membership_id)


def test_products_business_rules_for_pricing_and_sku_uniqueness() -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    membership_id = uuid.uuid4()

    _insert_tenant(tenant_id, "IT Products Business Rules")
    _insert_membership(membership_id, user_id, tenant_id)
    token = _token_for_user(user_id)

    try:
        create_valid = client.post(
            "/api/v1/products/",
            headers=_headers(token, tenant_id),
            json={
                "name": "Produto Custeado",
                "sku": "SKU-BASE",
                "barcode": f"BC-{uuid.uuid4().hex[:10]}",
                "cost": 10.00,
                "price": 12.00,
                "quantity": 1,
            },
        )
        assert create_valid.status_code == 201
        created_product_id = create_valid.json()["id"]

        duplicate_sku = client.post(
            "/api/v1/products/",
            headers=_headers(token, tenant_id),
            json={
                "name": "Produto SKU Duplicado",
                "sku": "SKU-BASE",
                "barcode": f"BC-{uuid.uuid4().hex[:10]}",
                "cost": 8.00,
                "price": 9.00,
                "quantity": 1,
            },
        )
        assert duplicate_sku.status_code == 409
        assert duplicate_sku.json()["code"] == "product.duplicate_sku"

        invalid_pricing_create = client.post(
            "/api/v1/products/",
            headers=_headers(token, tenant_id),
            json={
                "name": "Preco Invalido",
                "sku": "SKU-INVALID",
                "barcode": f"BC-{uuid.uuid4().hex[:10]}",
                "cost": 20.00,
                "price": 10.00,
                "quantity": 1,
            },
        )
        assert invalid_pricing_create.status_code == 400
        assert invalid_pricing_create.json()["code"] == "product.invalid_pricing"

        invalid_pricing_update = client.put(
            f"/api/v1/products/{created_product_id}",
            headers=_headers(token, tenant_id),
            json={"cost": 50.00, "price": 10.00},
        )
        assert invalid_pricing_update.status_code == 400
        assert invalid_pricing_update.json()["code"] == "product.invalid_pricing"
    finally:
        _cleanup(tenant_id, membership_id)

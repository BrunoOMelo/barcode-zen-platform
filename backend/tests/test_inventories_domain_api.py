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


def _token_for_user(user_id: uuid.UUID, email: str = "inventories-domain@barcodezen.local") -> str:
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
                "slug": f"it-inventory-{tenant_id.hex[:10]}",
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


def _insert_product(
    product_id: uuid.UUID,
    tenant_id: uuid.UUID,
    *,
    name: str,
    sku: str,
    barcode: str,
    quantity: int,
) -> None:
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
                "sku": sku,
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
    tenant_ids: Iterable[uuid.UUID] = (),
    membership_ids: Iterable[uuid.UUID] = (),
    product_ids: Iterable[uuid.UUID] = (),
) -> None:
    with engine.begin() as conn:
        for tenant_id in tenant_ids:
            conn.execute(text("DELETE FROM inventory_counts WHERE tenant_id = :tenant_id"), {"tenant_id": tenant_id})
            conn.execute(text("DELETE FROM inventory_items WHERE tenant_id = :tenant_id"), {"tenant_id": tenant_id})
            conn.execute(text("DELETE FROM inventories WHERE tenant_id = :tenant_id"), {"tenant_id": tenant_id})
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
    except Exception as exc:  # pragma: no cover
        pytest.skip(f"PostgreSQL indisponivel para testes de inventario: {exc}")


def test_inventory_full_flow_create_items_count_recount_and_finish() -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    membership_id = uuid.uuid4()
    product_a_id = uuid.uuid4()
    product_b_id = uuid.uuid4()

    _insert_tenant(tenant_id, "IT Inventory Full Flow")
    _insert_membership(membership_id, user_id, tenant_id, role="admin")
    _insert_product(
        product_a_id,
        tenant_id,
        name="Produto A",
        sku=f"SKU-{uuid.uuid4().hex[:10]}",
        barcode=f"BC-{uuid.uuid4().hex[:10]}",
        quantity=10,
    )
    _insert_product(
        product_b_id,
        tenant_id,
        name="Produto B",
        sku=f"SKU-{uuid.uuid4().hex[:10]}",
        barcode=f"BC-{uuid.uuid4().hex[:10]}",
        quantity=5,
    )

    token = _token_for_user(user_id)
    headers = _headers(token, tenant_id)

    try:
        create_inventory = client.post(
            "/api/v1/inventories/",
            headers=headers,
            json={"name": "Inventario Abril"},
        )
        assert create_inventory.status_code == 201
        inventory_id = create_inventory.json()["id"]
        assert create_inventory.json()["status"] == "created"

        add_items = client.post(
            f"/api/v1/inventories/{inventory_id}/items",
            headers=headers,
            json={"product_ids": [str(product_a_id), str(product_b_id)]},
        )
        assert add_items.status_code == 200
        assert add_items.json()["total"] == 2

        set_counting = client.patch(
            f"/api/v1/inventories/{inventory_id}/status",
            headers=headers,
            json={"status": "counting"},
        )
        assert set_counting.status_code == 200
        assert set_counting.json()["status"] == "counting"

        first_count = client.post(
            f"/api/v1/inventories/{inventory_id}/counts",
            headers=headers,
            json={"product_id": str(product_a_id), "quantity": 10},
        )
        assert first_count.status_code == 201
        assert first_count.json()["count_type"] == "first"

        move_recounting = client.patch(
            f"/api/v1/inventories/{inventory_id}/status",
            headers=headers,
            json={"status": "recounting"},
        )
        assert move_recounting.status_code == 200
        assert move_recounting.json()["status"] == "recounting"

        recount = client.post(
            f"/api/v1/inventories/{inventory_id}/counts",
            headers=headers,
            json={"product_id": str(product_a_id), "quantity": 12},
        )
        assert recount.status_code == 201
        assert recount.json()["count_type"] == "recount"

        items_after_recount = client.get(f"/api/v1/inventories/{inventory_id}/items", headers=headers)
        assert items_after_recount.status_code == 200
        product_a_item = next(
            item for item in items_after_recount.json()["items"] if item["product_id"] == str(product_a_id)
        )
        assert product_a_item["difference"] == 2
        assert product_a_item["status"] == "divergent"

        move_review = client.patch(
            f"/api/v1/inventories/{inventory_id}/status",
            headers=headers,
            json={"status": "review"},
        )
        assert move_review.status_code == 200

        finish_inventory = client.patch(
            f"/api/v1/inventories/{inventory_id}/status",
            headers=headers,
            json={"status": "finished"},
        )
        assert finish_inventory.status_code == 200
        assert finish_inventory.json()["status"] == "finished"
        assert finish_inventory.json()["finished_at"] is not None
    finally:
        _cleanup(
            tenant_ids=[tenant_id],
            membership_ids=[membership_id],
            product_ids=[product_a_id, product_b_id],
        )


def test_inventory_add_items_supports_system_and_counted_quantities() -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    membership_id = uuid.uuid4()
    product_id = uuid.uuid4()

    _insert_tenant(tenant_id, "IT Inventory Item Quantities")
    _insert_membership(membership_id, user_id, tenant_id, role="admin")
    _insert_product(
        product_id,
        tenant_id,
        name="Produto Quantidades",
        sku=f"SKU-{uuid.uuid4().hex[:10]}",
        barcode=f"BC-{uuid.uuid4().hex[:10]}",
        quantity=5,
    )
    token = _token_for_user(user_id)
    headers = _headers(token, tenant_id)

    try:
        create_inventory = client.post(
            "/api/v1/inventories/",
            headers=headers,
            json={"name": "Inventario com Quantidades"},
        )
        assert create_inventory.status_code == 201
        inventory_id = create_inventory.json()["id"]

        add_items = client.post(
            f"/api/v1/inventories/{inventory_id}/items",
            headers=headers,
            json={
                "items": [
                    {
                        "product_id": str(product_id),
                        "system_quantity": 20,
                        "counted_quantity": 18,
                    }
                ]
            },
        )
        assert add_items.status_code == 200
        body = add_items.json()
        assert body["total"] == 1
        assert body["items"][0]["system_quantity"] == 20
        assert body["items"][0]["counted_quantity"] == 18
        assert body["items"][0]["difference"] == -2
        assert body["items"][0]["status"] == "divergent"

        list_items = client.get(f"/api/v1/inventories/{inventory_id}/items", headers=headers)
        assert list_items.status_code == 200
        assert list_items.json()["items"][0]["system_quantity"] == 20
        assert list_items.json()["items"][0]["counted_quantity"] == 18
    finally:
        _cleanup(
            tenant_ids=[tenant_id],
            membership_ids=[membership_id],
            product_ids=[product_id],
        )


def test_inventory_enforces_transitions_and_role_permissions() -> None:
    admin_user_id = uuid.uuid4()
    member_user_id = uuid.uuid4()
    viewer_user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    admin_membership_id = uuid.uuid4()
    member_membership_id = uuid.uuid4()
    viewer_membership_id = uuid.uuid4()
    product_id = uuid.uuid4()

    _insert_tenant(tenant_id, "IT Inventory Roles")
    _insert_membership(admin_membership_id, admin_user_id, tenant_id, role="admin")
    _insert_membership(member_membership_id, member_user_id, tenant_id, role="member", is_default=False)
    _insert_membership(viewer_membership_id, viewer_user_id, tenant_id, role="viewer", is_default=False)
    _insert_product(
        product_id,
        tenant_id,
        name="Produto Role",
        sku=f"SKU-{uuid.uuid4().hex[:10]}",
        barcode=f"BC-{uuid.uuid4().hex[:10]}",
        quantity=7,
    )

    admin_headers = _headers(_token_for_user(admin_user_id), tenant_id)
    member_headers = _headers(_token_for_user(member_user_id), tenant_id)
    viewer_headers = _headers(_token_for_user(viewer_user_id), tenant_id)

    try:
        viewer_create = client.post("/api/v1/inventories/", headers=viewer_headers, json={"name": "Nao pode"})
        assert viewer_create.status_code == 403
        assert viewer_create.json()["code"] == "auth.permission_denied"

        create_inventory = client.post(
            "/api/v1/inventories/",
            headers=admin_headers,
            json={"name": "Inventario de Regras"},
        )
        assert create_inventory.status_code == 201
        inventory_id = create_inventory.json()["id"]

        invalid_transition = client.patch(
            f"/api/v1/inventories/{inventory_id}/status",
            headers=admin_headers,
            json={"status": "finished"},
        )
        assert invalid_transition.status_code == 400
        assert invalid_transition.json()["code"] == "inventory.invalid_status_transition"

        add_item = client.post(
            f"/api/v1/inventories/{inventory_id}/items",
            headers=admin_headers,
            json={"product_ids": [str(product_id)]},
        )
        assert add_item.status_code == 200

        blocked_count_on_created = client.post(
            f"/api/v1/inventories/{inventory_id}/counts",
            headers=admin_headers,
            json={"product_id": str(product_id), "quantity": 5},
        )
        assert blocked_count_on_created.status_code == 400
        assert blocked_count_on_created.json()["code"] == "inventory_count.not_allowed"

        set_counting = client.patch(
            f"/api/v1/inventories/{inventory_id}/status",
            headers=admin_headers,
            json={"status": "counting"},
        )
        assert set_counting.status_code == 200

        member_count = client.post(
            f"/api/v1/inventories/{inventory_id}/counts",
            headers=member_headers,
            json={"product_id": str(product_id), "quantity": 7},
        )
        assert member_count.status_code == 201

        member_change_status = client.patch(
            f"/api/v1/inventories/{inventory_id}/status",
            headers=member_headers,
            json={"status": "review"},
        )
        assert member_change_status.status_code == 403
        assert member_change_status.json()["code"] == "auth.permission_denied"
    finally:
        _cleanup(
            tenant_ids=[tenant_id],
            membership_ids=[admin_membership_id, member_membership_id, viewer_membership_id],
            product_ids=[product_id],
        )


def test_inventory_blocks_cross_tenant_reads_and_product_binding() -> None:
    user_id = uuid.uuid4()
    tenant_a_id = uuid.uuid4()
    tenant_b_id = uuid.uuid4()
    membership_a_id = uuid.uuid4()
    membership_b_id = uuid.uuid4()
    product_b_id = uuid.uuid4()

    _insert_tenant(tenant_a_id, "IT Inventory Tenant A")
    _insert_tenant(tenant_b_id, "IT Inventory Tenant B")
    _insert_membership(membership_a_id, user_id, tenant_a_id, role="admin")
    _insert_membership(membership_b_id, user_id, tenant_b_id, role="admin", is_default=False)
    _insert_product(
        product_b_id,
        tenant_b_id,
        name="Produto Tenant B",
        sku=f"SKU-{uuid.uuid4().hex[:10]}",
        barcode=f"BC-{uuid.uuid4().hex[:10]}",
        quantity=9,
    )

    token = _token_for_user(user_id)

    try:
        create_inventory = client.post(
            "/api/v1/inventories/",
            headers=_headers(token, tenant_a_id),
            json={"name": "Inventario Tenant A"},
        )
        assert create_inventory.status_code == 201
        inventory_id = create_inventory.json()["id"]

        bind_cross_tenant_product = client.post(
            f"/api/v1/inventories/{inventory_id}/items",
            headers=_headers(token, tenant_a_id),
            json={"product_ids": [str(product_b_id)]},
        )
        assert bind_cross_tenant_product.status_code == 404
        assert bind_cross_tenant_product.json()["code"] == "inventory.product_not_in_tenant"

        cross_tenant_read = client.get(
            f"/api/v1/inventories/{inventory_id}",
            headers=_headers(token, tenant_b_id),
        )
        assert cross_tenant_read.status_code == 404
        assert cross_tenant_read.json()["code"] == "inventory.not_found"
    finally:
        _cleanup(
            tenant_ids=[tenant_a_id, tenant_b_id],
            membership_ids=[membership_a_id, membership_b_id],
            product_ids=[product_b_id],
        )

import uuid
from collections.abc import Iterable
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from main import app

client = TestClient(app)


def _token_for_user(user_id: uuid.UUID, email: str = "dashboard-domain@barcodezen.local") -> str:
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
                "slug": f"it-dashboard-{tenant_id.hex[:10]}",
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
    category: str | None,
    active: bool = True,
    quantity: int = 0,
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
                "category": category,
                "active": active,
                "cost": None,
                "price": None,
                "quantity": quantity,
            },
        )


def _insert_inventory(
    inventory_id: uuid.UUID,
    tenant_id: uuid.UUID,
    *,
    name: str,
    status: str,
    created_by: uuid.UUID,
    created_at: datetime,
    started_at: datetime | None = None,
    finished_at: datetime | None = None,
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO inventories (
                    id, tenant_id, name, status, created_by, started_at, finished_at, created_at, updated_at
                ) VALUES (
                    :id, :tenant_id, :name, :status, :created_by, :started_at, :finished_at, :created_at, NOW()
                )
                """
            ),
            {
                "id": inventory_id,
                "tenant_id": tenant_id,
                "name": name,
                "status": status,
                "created_by": created_by,
                "started_at": started_at,
                "finished_at": finished_at,
                "created_at": created_at,
            },
        )


def _insert_inventory_item(
    item_id: uuid.UUID,
    inventory_id: uuid.UUID,
    tenant_id: uuid.UUID,
    product_id: uuid.UUID,
    *,
    system_quantity: int,
    counted_quantity: int | None,
    difference: int | None,
    status: str,
    counted_by: uuid.UUID | None,
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO inventory_items (
                    id, inventory_id, tenant_id, product_id, system_quantity, counted_quantity, difference,
                    status, counted_by, counted_at, created_at, updated_at
                ) VALUES (
                    :id, :inventory_id, :tenant_id, :product_id, :system_quantity, :counted_quantity, :difference,
                    :status, :counted_by, :counted_at, NOW(), NOW()
                )
                """
            ),
            {
                "id": item_id,
                "inventory_id": inventory_id,
                "tenant_id": tenant_id,
                "product_id": product_id,
                "system_quantity": system_quantity,
                "counted_quantity": counted_quantity,
                "difference": difference,
                "status": status,
                "counted_by": counted_by,
                "counted_at": datetime.now(UTC) if counted_quantity is not None else None,
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
        pytest.skip(f"PostgreSQL indisponivel para testes de dashboard: {exc}")


def test_dashboard_summary_returns_aggregated_metrics() -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    membership_id = uuid.uuid4()
    now = datetime.now(UTC)

    product_a = uuid.uuid4()
    product_b = uuid.uuid4()
    product_c = uuid.uuid4()
    product_d_inactive = uuid.uuid4()
    inventory_open = uuid.uuid4()
    inventory_finished = uuid.uuid4()

    _insert_tenant(tenant_id, "IT Dashboard Metrics")
    _insert_membership(membership_id, user_id, tenant_id)

    _insert_product(
        product_a,
        tenant_id,
        name="Agua sem gas",
        sku=f"SKU-{uuid.uuid4().hex[:10]}",
        barcode=f"BC-{uuid.uuid4().hex[:10]}",
        category="Bebidas",
        quantity=10,
    )
    _insert_product(
        product_b,
        tenant_id,
        name="Refrigerante lata",
        sku=f"SKU-{uuid.uuid4().hex[:10]}",
        barcode=f"BC-{uuid.uuid4().hex[:10]}",
        category="Bebidas",
        quantity=5,
    )
    _insert_product(
        product_c,
        tenant_id,
        name="Produto sem categoria",
        sku=f"SKU-{uuid.uuid4().hex[:10]}",
        barcode=f"BC-{uuid.uuid4().hex[:10]}",
        category=None,
        quantity=1,
    )
    _insert_product(
        product_d_inactive,
        tenant_id,
        name="Produto inativo",
        sku=f"SKU-{uuid.uuid4().hex[:10]}",
        barcode=f"BC-{uuid.uuid4().hex[:10]}",
        category="Inativo",
        active=False,
        quantity=0,
    )

    _insert_inventory(
        inventory_open,
        tenant_id,
        name="Inventario Operacional",
        status="counting",
        created_by=user_id,
        created_at=now,
        started_at=now,
    )
    _insert_inventory(
        inventory_finished,
        tenant_id,
        name="Inventario Encerrado",
        status="finished",
        created_by=user_id,
        created_at=now - timedelta(days=1),
        started_at=now - timedelta(days=1),
        finished_at=now - timedelta(hours=12),
    )

    _insert_inventory_item(
        uuid.uuid4(),
        inventory_open,
        tenant_id,
        product_a,
        system_quantity=10,
        counted_quantity=10,
        difference=0,
        status="counted",
        counted_by=user_id,
    )
    _insert_inventory_item(
        uuid.uuid4(),
        inventory_open,
        tenant_id,
        product_b,
        system_quantity=10,
        counted_quantity=8,
        difference=-2,
        status="divergent",
        counted_by=user_id,
    )
    _insert_inventory_item(
        uuid.uuid4(),
        inventory_open,
        tenant_id,
        product_c,
        system_quantity=2,
        counted_quantity=None,
        difference=None,
        status="pending",
        counted_by=None,
    )
    _insert_inventory_item(
        uuid.uuid4(),
        inventory_finished,
        tenant_id,
        product_a,
        system_quantity=10,
        counted_quantity=9,
        difference=-1,
        status="divergent",
        counted_by=user_id,
    )

    token = _token_for_user(user_id)
    try:
        response = client.get("/api/v1/dashboard/summary", headers=_headers(token, tenant_id))
        assert response.status_code == 200
        body = response.json()

        assert body["active_inventories"] == 1
        assert body["finished_inventories"] == 1
        assert body["total_products"] == 3
        assert body["counted_products"] == 2
        assert body["divergent_items"] == 1

        assert len(body["recent_inventories"]) == 2
        assert body["recent_inventories"][0]["id"] == str(inventory_open)

        open_progress = next(
            row for row in body["progress_by_inventory"] if row["inventory_id"] == str(inventory_open)
        )
        assert open_progress["total"] == 3
        assert open_progress["counted"] == 2
        assert open_progress["pending"] == 1
        assert open_progress["percentage"] == 67

        open_divergence = next(
            row for row in body["divergence_by_inventory"] if row["inventory_id"] == str(inventory_open)
        )
        assert open_divergence["ok"] == 1
        assert open_divergence["divergent"] == 1

        categories = {row["category"]: row["quantity"] for row in body["categories_distribution"]}
        assert categories["Bebidas"] == 2
        assert categories["Sem categoria"] == 1
        assert "Inativo" not in categories
    finally:
        _cleanup(
            tenant_ids=[tenant_id],
            membership_ids=[membership_id],
            product_ids=[product_a, product_b, product_c, product_d_inactive],
        )


def test_dashboard_summary_keeps_tenant_isolation() -> None:
    user_id = uuid.uuid4()
    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()
    membership_a = uuid.uuid4()
    membership_b = uuid.uuid4()
    product_a = uuid.uuid4()

    _insert_tenant(tenant_a, "IT Dashboard Tenant A")
    _insert_tenant(tenant_b, "IT Dashboard Tenant B")
    _insert_membership(membership_a, user_id, tenant_a, role="admin", is_default=True)
    _insert_membership(membership_b, user_id, tenant_b, role="admin", is_default=False)
    _insert_product(
        product_a,
        tenant_a,
        name="Produto isolado",
        sku=f"SKU-{uuid.uuid4().hex[:10]}",
        barcode=f"BC-{uuid.uuid4().hex[:10]}",
        category="Categoria A",
        quantity=3,
    )

    token = _token_for_user(user_id)
    try:
        response = client.get("/api/v1/dashboard/summary", headers=_headers(token, tenant_b))
        assert response.status_code == 200
        body = response.json()
        assert body["total_products"] == 0
        assert body["active_inventories"] == 0
        assert body["finished_inventories"] == 0
        assert body["counted_products"] == 0
        assert body["divergent_items"] == 0
        assert body["recent_inventories"] == []
        assert body["categories_distribution"] == []
    finally:
        _cleanup(
            tenant_ids=[tenant_a, tenant_b],
            membership_ids=[membership_a, membership_b],
            product_ids=[product_a],
        )

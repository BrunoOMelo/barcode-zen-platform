import json
import sys
import uuid
from pathlib import Path

import jwt
from sqlalchemy import text

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import engine

ADMIN_USER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
VIEWER_USER_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")

ADMIN_EMAIL = "admin-e2e@barcodezen.local"
VIEWER_EMAIL = "viewer-e2e@barcodezen.local"
ADMIN_PASSWORD = "AdminE2E@123"
VIEWER_PASSWORD = "ViewerE2E@123"

TENANT_ALPHA_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1")
TENANT_BETA_ID = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2")
TENANT_GAMMA_ID = uuid.UUID("cccccccc-cccc-cccc-cccc-ccccccccccc3")

MEMBERSHIP_ADMIN_ALPHA = uuid.UUID("aaaa1111-1111-1111-1111-111111111111")
MEMBERSHIP_ADMIN_BETA = uuid.UUID("bbbb2222-2222-2222-2222-222222222222")
MEMBERSHIP_VIEWER_ALPHA = uuid.UUID("cccc3333-3333-3333-3333-333333333333")

PRODUCT_ALPHA_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
PRODUCT_BETA_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")

INVENTORY_ALPHA_ID = uuid.UUID("dddddddd-0000-0000-0000-000000000001")
INVENTORY_ITEM_ALPHA_ID = uuid.UUID("eeeeeeee-0000-0000-0000-000000000001")
INVENTORY_COUNT_ALPHA_ID = uuid.UUID("ffffffff-0000-0000-0000-000000000001")


def _token_for_user(user_id: uuid.UUID, email: str) -> str:
    return jwt.encode(
        {"sub": str(user_id), "email": email},
        settings.auth_jwt_secret,
        algorithm=settings.auth_jwt_algorithm,
    )


def run_seed() -> dict[str, object]:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO tenants (id, name, slug, legal_name, tax_id, is_active, created_at, updated_at)
                VALUES
                  (:tenant_alpha_id, 'Tenant Alpha E2E', 'tenant-alpha-e2e', 'Tenant Alpha E2E', NULL, true, NOW(), NOW()),
                  (:tenant_beta_id,  'Tenant Beta E2E',  'tenant-beta-e2e',  'Tenant Beta E2E',  NULL, true, NOW(), NOW()),
                  (:tenant_gamma_id, 'Tenant Gamma E2E', 'tenant-gamma-e2e', 'Tenant Gamma E2E', NULL, true, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                  name = EXCLUDED.name,
                  slug = EXCLUDED.slug,
                  legal_name = EXCLUDED.legal_name,
                  is_active = EXCLUDED.is_active,
                  updated_at = NOW()
                """
            ),
            {
                "tenant_alpha_id": TENANT_ALPHA_ID,
                "tenant_beta_id": TENANT_BETA_ID,
                "tenant_gamma_id": TENANT_GAMMA_ID,
            },
        )

        conn.execute(
            text(
                """
                INSERT INTO platform_users (id, email, password_hash, full_name, is_active, created_at, updated_at)
                VALUES
                  (:admin_user_id, :admin_email, :admin_password_hash, 'Administrador E2E', true, NOW(), NOW()),
                  (:viewer_user_id, :viewer_email, :viewer_password_hash, 'Visualizador E2E', true, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                  email = EXCLUDED.email,
                  password_hash = EXCLUDED.password_hash,
                  full_name = EXCLUDED.full_name,
                  is_active = EXCLUDED.is_active,
                  updated_at = NOW()
                """
            ),
            {
                "admin_user_id": ADMIN_USER_ID,
                "viewer_user_id": VIEWER_USER_ID,
                "admin_email": ADMIN_EMAIL,
                "viewer_email": VIEWER_EMAIL,
                "admin_password_hash": hash_password(ADMIN_PASSWORD),
                "viewer_password_hash": hash_password(VIEWER_PASSWORD),
            },
        )

        conn.execute(
            text(
                """
                DELETE FROM user_tenant_memberships
                WHERE (user_id = :admin_user_id AND tenant_id = :tenant_alpha_id)
                   OR (user_id = :admin_user_id AND tenant_id = :tenant_beta_id)
                   OR (user_id = :viewer_user_id AND tenant_id = :tenant_alpha_id)
                """
            ),
            {
                "admin_user_id": ADMIN_USER_ID,
                "viewer_user_id": VIEWER_USER_ID,
                "tenant_alpha_id": TENANT_ALPHA_ID,
                "tenant_beta_id": TENANT_BETA_ID,
            },
        )

        conn.execute(
            text(
                """
                INSERT INTO user_tenant_memberships (id, user_id, tenant_id, role, status, is_default, created_at, updated_at)
                VALUES
                  (:membership_admin_alpha, :admin_user_id, :tenant_alpha_id, 'admin',  'active', true,  NOW(), NOW()),
                  (:membership_admin_beta,  :admin_user_id, :tenant_beta_id,  'admin',  'active', false, NOW(), NOW()),
                  (:membership_viewer_alpha,:viewer_user_id,:tenant_alpha_id, 'viewer', 'active', true,  NOW(), NOW())
                """
            ),
            {
                "membership_admin_alpha": MEMBERSHIP_ADMIN_ALPHA,
                "membership_admin_beta": MEMBERSHIP_ADMIN_BETA,
                "membership_viewer_alpha": MEMBERSHIP_VIEWER_ALPHA,
                "admin_user_id": ADMIN_USER_ID,
                "viewer_user_id": VIEWER_USER_ID,
                "tenant_alpha_id": TENANT_ALPHA_ID,
                "tenant_beta_id": TENANT_BETA_ID,
            },
        )

        conn.execute(
            text(
                """
                INSERT INTO products (
                  id, tenant_id, name, sku, barcode, description, category, active, cost, price, quantity, created_at, updated_at
                )
                VALUES
                  (:product_alpha_id, :tenant_alpha_id, 'Produto E2E Alpha', 'E2E-ALPHA-001', '7890000000001', 'Produto do tenant alpha', 'E2E', true, 10.00, 20.00, 15, NOW(), NOW()),
                  (:product_beta_id,  :tenant_beta_id,  'Produto E2E Beta',  'E2E-BETA-001',  '7890000000002', 'Produto do tenant beta',  'E2E', true, 12.00, 24.00, 30, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                  tenant_id = EXCLUDED.tenant_id,
                  name = EXCLUDED.name,
                  sku = EXCLUDED.sku,
                  barcode = EXCLUDED.barcode,
                  category = EXCLUDED.category,
                  active = EXCLUDED.active,
                  cost = EXCLUDED.cost,
                  price = EXCLUDED.price,
                  quantity = EXCLUDED.quantity,
                  updated_at = NOW()
                """
            ),
            {
                "product_alpha_id": PRODUCT_ALPHA_ID,
                "product_beta_id": PRODUCT_BETA_ID,
                "tenant_alpha_id": TENANT_ALPHA_ID,
                "tenant_beta_id": TENANT_BETA_ID,
            },
        )

        conn.execute(
            text(
                """
                INSERT INTO inventories (
                  id, tenant_id, name, status, created_by, started_at, finished_at, created_at, updated_at
                )
                VALUES (
                  :inventory_alpha_id, :tenant_alpha_id, 'Inventario E2E Alpha', 'counting', :admin_user_id, NOW(), NULL, NOW(), NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                  tenant_id = EXCLUDED.tenant_id,
                  name = EXCLUDED.name,
                  status = EXCLUDED.status,
                  created_by = EXCLUDED.created_by,
                  started_at = EXCLUDED.started_at,
                  finished_at = EXCLUDED.finished_at,
                  updated_at = NOW()
                """
            ),
            {
                "inventory_alpha_id": INVENTORY_ALPHA_ID,
                "tenant_alpha_id": TENANT_ALPHA_ID,
                "admin_user_id": ADMIN_USER_ID,
            },
        )

        conn.execute(
            text(
                """
                INSERT INTO inventory_items (
                  id, inventory_id, tenant_id, product_id, system_quantity, counted_quantity, difference, status, counted_by, counted_at, created_at, updated_at
                )
                VALUES (
                  :inventory_item_alpha_id, :inventory_alpha_id, :tenant_alpha_id, :product_alpha_id, 15, 15, 0, 'counted', :admin_user_id, NOW(), NOW(), NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                  inventory_id = EXCLUDED.inventory_id,
                  tenant_id = EXCLUDED.tenant_id,
                  product_id = EXCLUDED.product_id,
                  system_quantity = EXCLUDED.system_quantity,
                  counted_quantity = EXCLUDED.counted_quantity,
                  difference = EXCLUDED.difference,
                  status = EXCLUDED.status,
                  counted_by = EXCLUDED.counted_by,
                  counted_at = EXCLUDED.counted_at,
                  updated_at = NOW()
                """
            ),
            {
                "inventory_item_alpha_id": INVENTORY_ITEM_ALPHA_ID,
                "inventory_alpha_id": INVENTORY_ALPHA_ID,
                "tenant_alpha_id": TENANT_ALPHA_ID,
                "product_alpha_id": PRODUCT_ALPHA_ID,
                "admin_user_id": ADMIN_USER_ID,
            },
        )

        conn.execute(
            text(
                """
                INSERT INTO inventory_counts (
                  id, inventory_id, inventory_item_id, tenant_id, product_id, counted_by, count_type, quantity, created_at
                )
                VALUES (
                  :inventory_count_alpha_id, :inventory_alpha_id, :inventory_item_alpha_id, :tenant_alpha_id, :product_alpha_id, :admin_user_id, 'first', 15, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                  inventory_id = EXCLUDED.inventory_id,
                  inventory_item_id = EXCLUDED.inventory_item_id,
                  tenant_id = EXCLUDED.tenant_id,
                  product_id = EXCLUDED.product_id,
                  counted_by = EXCLUDED.counted_by,
                  count_type = EXCLUDED.count_type,
                  quantity = EXCLUDED.quantity
                """
            ),
            {
                "inventory_count_alpha_id": INVENTORY_COUNT_ALPHA_ID,
                "inventory_alpha_id": INVENTORY_ALPHA_ID,
                "inventory_item_alpha_id": INVENTORY_ITEM_ALPHA_ID,
                "tenant_alpha_id": TENANT_ALPHA_ID,
                "product_alpha_id": PRODUCT_ALPHA_ID,
                "admin_user_id": ADMIN_USER_ID,
            },
        )

    return {
        "apiBaseUrl": "http://127.0.0.1:8000",
        "admin": {
            "userId": str(ADMIN_USER_ID),
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "token": _token_for_user(ADMIN_USER_ID, ADMIN_EMAIL),
            "tenantAlphaId": str(TENANT_ALPHA_ID),
            "tenantBetaId": str(TENANT_BETA_ID),
        },
        "viewer": {
            "userId": str(VIEWER_USER_ID),
            "email": VIEWER_EMAIL,
            "password": VIEWER_PASSWORD,
            "token": _token_for_user(VIEWER_USER_ID, VIEWER_EMAIL),
            "tenantAlphaId": str(TENANT_ALPHA_ID),
        },
    }


def main() -> None:
    payload = run_seed()
    target = Path(__file__).resolve().parents[2] / "frontend" / ".e2e-seed.json"
    target.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Seed written to: {target}")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()

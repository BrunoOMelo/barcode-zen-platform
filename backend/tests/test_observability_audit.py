import uuid

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from main import app

client = TestClient(app)


def _token_for_user(user_id: uuid.UUID, email: str = "observability-test@barcodezen.local") -> str:
    return jwt.encode(
        {"sub": str(user_id), "email": email},
        settings.auth_jwt_secret,
        algorithm=settings.auth_jwt_algorithm,
    )


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
                "slug": f"it-observability-{tenant_id.hex[:10]}",
                "legal_name": name,
                "tax_id": None,
            },
        )


def _insert_membership(membership_id: uuid.UUID, user_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO user_tenant_memberships (id, user_id, tenant_id, role, status, is_default, created_at, updated_at)
                VALUES (:id, :user_id, :tenant_id, 'admin', 'active', true, NOW(), NOW())
                """
            ),
            {
                "id": membership_id,
                "user_id": user_id,
                "tenant_id": tenant_id,
            },
        )


def _cleanup(*, tenant_id: uuid.UUID | None = None, membership_id: uuid.UUID | None = None, request_id: str | None = None) -> None:
    with engine.begin() as conn:
        if request_id:
            conn.execute(text("DELETE FROM audit_logs WHERE request_id = :request_id"), {"request_id": request_id})
        if tenant_id:
            conn.execute(text("DELETE FROM products WHERE tenant_id = :tenant_id"), {"tenant_id": tenant_id})
        if membership_id:
            conn.execute(text("DELETE FROM user_tenant_memberships WHERE id = :id"), {"id": membership_id})
        if tenant_id:
            conn.execute(text("DELETE FROM tenants WHERE id = :id"), {"id": tenant_id})


@pytest.fixture(scope="module", autouse=True)
def _require_database_and_audit_table() -> None:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        has_audit_logs = conn.execute(text("SELECT to_regclass('public.audit_logs')")).scalar()
        if has_audit_logs is None:
            pytest.fail("Tabela audit_logs nao encontrada. Execute 'alembic upgrade head' antes dos testes.")


def test_metrics_endpoint_exposes_prometheus_metrics() -> None:
    client.get("/api/v1/health")
    response = client.get("/api/v1/metrics")

    assert response.status_code == 200
    body = response.text
    assert "barcodezen_http_requests_total" in body
    assert "barcodezen_http_request_duration_ms" in body
    assert "barcodezen_auth_rejections_total" in body
    assert "barcodezen_db_ready_checks_total" in body


def test_rejected_request_is_persisted_in_audit_logs() -> None:
    request_id = f"req-audit-rejected-{uuid.uuid4().hex[:10]}"
    try:
        response = client.get("/api/v1/products/", headers={"X-Request-Id": request_id})
        assert response.status_code == 401

        with engine.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT event_type, action, method, path, status_code, outcome, error_code
                    FROM audit_logs
                    WHERE request_id = :request_id
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                ),
                {"request_id": request_id},
            ).mappings().first()

        assert row is not None
        assert row["event_type"] == "security.request_rejected"
        assert row["action"] == "rejected"
        assert row["method"] == "GET"
        assert row["path"] == "/api/v1/products/"
        assert row["status_code"] == 401
        assert row["outcome"] == "rejected"
        assert row["error_code"] == "auth.token_missing"
    finally:
        _cleanup(request_id=request_id)


def test_mutation_request_is_persisted_in_audit_logs() -> None:
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    membership_id = uuid.uuid4()
    request_id = f"req-audit-mutation-{uuid.uuid4().hex[:10]}"

    _insert_tenant(tenant_id, "IT Audit Mutation Tenant")
    _insert_membership(membership_id, user_id, tenant_id)
    token = _token_for_user(user_id)

    try:
        response = client.post(
            "/api/v1/products/",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Tenant-Id": str(tenant_id),
                "X-Request-Id": request_id,
            },
            json={
                "name": f"Produto Audit {uuid.uuid4().hex[:6]}",
                "sku": f"AUD-{uuid.uuid4().hex[:10]}",
                "barcode": f"789{uuid.uuid4().hex[:10]}",
                "quantity": 5,
            },
        )
        assert response.status_code == 201

        with engine.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT event_type, action, method, path, status_code, outcome, tenant_id, user_id
                    FROM audit_logs
                    WHERE request_id = :request_id
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                ),
                {"request_id": request_id},
            ).mappings().first()

        assert row is not None
        assert row["event_type"] == "domain.mutation"
        assert row["action"] == "post"
        assert row["method"] == "POST"
        assert row["path"] == "/api/v1/products/"
        assert row["status_code"] == 201
        assert row["outcome"] == "success"
        assert str(row["tenant_id"]) == str(tenant_id)
        assert str(row["user_id"]) == str(user_id)
    finally:
        _cleanup(
            tenant_id=tenant_id,
            membership_id=membership_id,
            request_id=request_id,
        )

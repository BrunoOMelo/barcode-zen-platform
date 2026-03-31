import uuid

import jwt
from fastapi.testclient import TestClient

from app.core import middleware as auth_middleware
from app.core.config import settings
from main import app

client = TestClient(app)


def _create_token() -> str:
    return jwt.encode(
        {"sub": str(uuid.uuid4()), "email": "tenant-test@barcodezen.com"},
        settings.auth_jwt_secret,
        algorithm=settings.auth_jwt_algorithm,
    )


def test_public_health_route_does_not_require_auth() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers.get("x-request-id")


def test_public_live_and_ready_routes_do_not_require_auth() -> None:
    live_response = client.get("/api/v1/health/live")
    ready_response = client.get("/api/v1/health/ready")

    assert live_response.status_code == 200
    assert live_response.json() == {"status": "alive"}

    assert ready_response.status_code in {200, 503}
    assert ready_response.headers.get("x-request-id")


def test_auth_login_route_is_public() -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "invalid@example.com", "password": "12345678"},
    )
    assert response.status_code in {401, 403}
    assert response.json().get("code") != "auth.token_missing"


def test_protected_route_requires_bearer_token() -> None:
    response = client.get("/api/v1/products/")

    assert response.status_code == 401
    assert response.json()["message"] == "Token de autenticacao ausente."
    assert response.headers.get("x-request-id")


def test_protected_route_rejects_invalid_token() -> None:
    response = client.get(
        "/api/v1/products/",
        headers={"Authorization": "Bearer invalid.token.value"},
    )

    assert response.status_code == 401
    assert response.json()["message"] == "Token de autenticacao invalido."


def test_protected_route_requires_tenant_context() -> None:
    token = _create_token()
    response = client.get(
        "/api/v1/products/",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["message"] == "Tenant ativo nao informado."


def test_protected_route_rejects_invalid_tenant_header() -> None:
    token = _create_token()
    response = client.get(
        "/api/v1/products/",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-Id": "invalid-tenant-id",
        },
    )

    assert response.status_code == 400
    assert response.json()["message"] == "Tenant ativo invalido."


def test_protected_route_requires_active_membership(monkeypatch) -> None:
    token = _create_token()
    tenant_id = uuid.uuid4()

    def _fake_resolver(_: uuid.UUID, __: uuid.UUID) -> None:
        return None

    monkeypatch.setattr(auth_middleware, "resolve_tenant_context", _fake_resolver)

    response = client.get(
        "/api/v1/products/",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-Id": str(tenant_id),
        },
    )

    assert response.status_code == 403
    assert response.json()["message"] == "Usuario sem vinculacao ativa com o tenant informado."


def test_cors_preflight_is_not_blocked_by_auth() -> None:
    response = client.options(
        "/api/v1/me/tenants",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code in {200, 204}
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_request_id_is_propagated_when_sent_by_client() -> None:
    request_id = "req-test-fixed-id"
    response = client.get("/api/v1/health", headers={"X-Request-Id": request_id})

    assert response.status_code == 200
    assert response.headers.get("x-request-id") == request_id

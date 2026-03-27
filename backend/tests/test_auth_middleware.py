from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_public_health_route_does_not_require_auth() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_protected_route_requires_bearer_token() -> None:
    response = client.get("/api/v1/products/")

    assert response.status_code == 401
    assert response.json()["message"] == "Token de autenticacao ausente."


def test_protected_route_rejects_invalid_token() -> None:
    response = client.get(
        "/api/v1/products/",
        headers={"Authorization": "Bearer invalid.token.value"},
    )

    assert response.status_code == 401
    assert response.json()["message"] == "Token de autenticacao invalido."

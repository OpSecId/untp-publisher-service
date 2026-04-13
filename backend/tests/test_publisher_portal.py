import time
from typing import Any

import jwt
import pytest
from fastapi.testclient import TestClient

from app import build_app
from config import Settings


@pytest.fixture()
def portal_client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    s = Settings(
        TEST_SUITE=False,
        JWT_SECRET="portal-test-jwt-secret",
        JWT_ALGORITHM="HS256",
        PROJECT_TITLE="Test Publisher",
        PROJECT_VERSION="v-test",
        DOMAIN="https://pub.example",
        TRACTION_TENANT_ID="tenant-1",
        TRACTION_API_URL="https://traction.example",
        REGISTRY_URL="https://registry.example",
        DID_WEB_SERVER_URL="https://did.example",
        ISSUER_REGISTRY_URL="https://registry.example",
    )
    monkeypatch.setattr("app.security.settings", s, raising=False)
    monkeypatch.setattr("app.routers.publisher_portal.settings", s, raising=False)
    app = build_app(s)
    return TestClient(app)


def test_publisher_session_requires_auth(portal_client: TestClient) -> None:
    r = portal_client.get("/publisher/session")
    assert r.status_code == 403


def test_publisher_session_rejects_bad_signature(portal_client: TestClient) -> None:
    bad = jwt.encode({"client_id": "x", "expires": int(time.time()) + 3600}, "wrong", algorithm="HS256")
    r = portal_client.get("/publisher/session", headers={"Authorization": f"Bearer {bad}"})
    assert r.status_code == 403


def test_publisher_session_returns_environment(portal_client: TestClient) -> None:
    token = jwt.encode(
        {"client_id": "did:web:issuer", "expires": int(time.time()) + 3600},
        "portal-test-jwt-secret",
        algorithm="HS256",
    )
    r = portal_client.get("/publisher/session", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data: dict[str, Any] = r.json()
    assert data["claims"]["client_id"] == "did:web:issuer"
    assert data["environment"]["project_title"] == "Test Publisher"
    assert data["environment"]["traction_tenant_id"] == "tenant-1"
    assert data["environment"]["registry_url"] == "https://registry.example"


def test_publisher_session_accepts_traction_wallet_via_introspection(monkeypatch: pytest.MonkeyPatch) -> None:
    """Wallet JWT accepted when GET TRACTION_API_URL/status with same Bearer returns 200."""

    def fake_get(url: str, **kwargs: Any) -> Any:
        assert url == "https://traction.example/status"
        assert kwargs.get("headers", {}).get("Authorization", "").startswith("Bearer ")
        return type("R", (), {"status_code": 200})()

    monkeypatch.setattr("app.security.httpx.get", fake_get)

    s = Settings(
        TEST_SUITE=False,
        JWT_SECRET="portal-test-jwt-secret",
        JWT_ALGORITHM="HS256",
        PROJECT_TITLE="Test Publisher",
        PROJECT_VERSION="v-test",
        DOMAIN="https://pub.example",
        TRACTION_TENANT_ID="tenant-1",
        TRACTION_API_URL="https://traction.example",
        REGISTRY_URL="https://registry.example",
        DID_WEB_SERVER_URL="https://did.example",
        ISSUER_REGISTRY_URL="https://registry.example",
    )
    monkeypatch.setattr("app.security.settings", s, raising=False)
    monkeypatch.setattr("app.routers.publisher_portal.settings", s, raising=False)
    app = build_app(s)
    client = TestClient(app)

    wid = "42c05cf1-2195-4050-84fd-4921f2599289"
    now = int(time.time())
    token = jwt.encode({"wallet_id": wid, "iat": now, "exp": now + 3600}, "any-secret", algorithm="HS256")
    r = client.get("/publisher/session", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["claims"]["client_id"] == wid
    assert data["claims"]["expires"] == now + 3600

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
    assert data["environment"]["traction_wallet_introspection_paths"] == [
        "/tenant",
        "/tenant/config",
        "/tenant/wallet",
        "/tenant/server/status/config",
        "/status",
    ]
    assert data["environment"]["registry_url"] == "https://registry.example"


def test_publisher_session_accepts_traction_wallet_via_introspection(monkeypatch: pytest.MonkeyPatch) -> None:
    """Wallet JWT accepted when GET TRACTION_API_URL/tenant with same Bearer returns 200."""

    def fake_get(url: str, **kwargs: Any) -> Any:
        assert url == "https://traction.example/tenant"
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


def test_publisher_session_accepts_traction_wallet_when_tenant_fails_but_tenant_wallet_ok(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Fallback: /tenant and /tenant/config non-200, then /tenant/wallet returns 200."""

    def fake_get(url: str, **kwargs: Any) -> Any:
        assert kwargs.get("headers", {}).get("Authorization", "").startswith("Bearer ")
        if url == "https://traction.example/tenant":
            return type("R", (), {"status_code": 404})()
        if url == "https://traction.example/tenant/config":
            return type("R", (), {"status_code": 404})()
        if url == "https://traction.example/tenant/wallet":
            return type("R", (), {"status_code": 200})()
        raise AssertionError(f"unexpected url {url!r}")

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
    assert r.json()["claims"]["client_id"] == wid


def test_publisher_session_accepts_traction_wallet_when_only_server_status_config_ok(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET …/tenant/server/status/config can be the first probe that returns 200."""

    def fake_get(url: str, **kwargs: Any) -> Any:
        assert kwargs.get("headers", {}).get("Authorization", "").startswith("Bearer ")
        if url in (
            "https://traction.example/tenant",
            "https://traction.example/tenant/config",
            "https://traction.example/tenant/wallet",
        ):
            return type("R", (), {"status_code": 404})()
        if url == "https://traction.example/tenant/server/status/config":
            return type("R", (), {"status_code": 200})()
        raise AssertionError(f"unexpected url {url!r}")

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
    assert r.json()["claims"]["client_id"] == wid


def test_publisher_session_accepts_traction_wallet_when_tenant_paths_fail_but_status_ok(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Fallback: lighter /tenant* probes non-200, then /status returns 200."""

    def fake_get(url: str, **kwargs: Any) -> Any:
        assert kwargs.get("headers", {}).get("Authorization", "").startswith("Bearer ")
        if url in (
            "https://traction.example/tenant",
            "https://traction.example/tenant/config",
            "https://traction.example/tenant/wallet",
            "https://traction.example/tenant/server/status/config",
        ):
            return type("R", (), {"status_code": 404})()
        if url == "https://traction.example/status":
            return type("R", (), {"status_code": 200})()
        raise AssertionError(f"unexpected url {url!r}")

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
    assert r.json()["claims"]["client_id"] == wid


def test_publisher_traction_wallet_probes_requires_auth(portal_client: TestClient) -> None:
    r = portal_client.get("/publisher/traction-wallet-probes")
    assert r.status_code == 403


def test_publisher_traction_wallet_probes_returns_per_path(portal_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_get(url: str, headers: Any = None, timeout: Any = None) -> Any:
        assert headers and str(headers.get("Authorization", "")).startswith("Bearer ")

        class Resp:
            status_code = 200
            text = "{}"
            headers = {"content-type": "application/json"}

        r = Resp()
        if url.endswith("/tenant"):
            r.text = '{"tenant_mode":"multi"}'
        elif url.endswith("/tenant/config"):
            r.text = '{"label":"cfg"}'
        elif url.endswith("/tenant/wallet"):
            r.text = '{"settings":{}}'
        elif url.endswith("/tenant/server/status/config"):
            r.text = '{"config":{"version":"9.9.9","external_plugins":["webvh"]}}'
        elif url.endswith("/status"):
            r.status_code = 403
            r.text = "<html>nginx forbidden</html>"
        return r

    monkeypatch.setattr("app.security.httpx.get", fake_get)
    token = jwt.encode(
        {"client_id": "did:web:x", "expires": int(time.time()) + 3600},
        "portal-test-jwt-secret",
        algorithm="HS256",
    )
    r = portal_client.get("/publisher/traction-wallet-probes", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data: dict[str, Any] = r.json()
    assert data["traction_api_url"] == "https://traction.example"
    assert len(data["probes"]) == 5
    assert data["probes"][0]["path"] == "/tenant"
    assert data["probes"][0]["status_code"] == 200
    assert data["probes"][0]["body"] == {"tenant_mode": "multi"}
    assert data["probes"][3]["path"] == "/tenant/server/status/config"
    assert data["probes"][3]["body"]["version"] == "9.9.9"
    assert data["probes"][4]["status_code"] == 403
    assert data["probes"][4]["body"] and "html" in str(data["probes"][4]["body"]).lower()


def test_publisher_traction_wallet_probes_empty_when_no_traction_url(monkeypatch: pytest.MonkeyPatch) -> None:
    s = Settings(
        TEST_SUITE=False,
        JWT_SECRET="portal-test-jwt-secret",
        JWT_ALGORITHM="HS256",
        PROJECT_TITLE="Test Publisher",
        PROJECT_VERSION="v-test",
        DOMAIN="https://pub.example",
        TRACTION_TENANT_ID="tenant-1",
        TRACTION_API_URL="",
        REGISTRY_URL="https://registry.example",
        DID_WEB_SERVER_URL="https://did.example",
        ISSUER_REGISTRY_URL="https://registry.example",
    )
    monkeypatch.setattr("app.security.settings", s, raising=False)
    monkeypatch.setattr("app.routers.publisher_portal.settings", s, raising=False)
    app = build_app(s)
    client = TestClient(app)
    token = jwt.encode(
        {"client_id": "did:web:x", "expires": int(time.time()) + 3600},
        "portal-test-jwt-secret",
        algorithm="HS256",
    )
    r = client.get("/publisher/traction-wallet-probes", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["probes"] == []
    assert "TRACTION_API_URL" in body.get("detail", "")

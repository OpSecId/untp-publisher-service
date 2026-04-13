import json
import time
from typing import Any

import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pymongo.errors import PyMongoError

from app import build_app
from app.plugins import MongoClientError
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
    ]
    assert data["environment"]["did_web_server_url"] == "https://did.example"
    assert data["environment"]["issuer_registry_url"] == "https://registry.example"


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
    assert len(data["probes"]) == 4
    assert data["probes"][0]["path"] == "/tenant"
    assert data["probes"][0]["status_code"] == 200
    assert data["probes"][0]["body"] == {"tenant_mode": "multi"}
    assert data["probes"][3]["path"] == "/tenant/server/status/config"
    assert data["probes"][3]["body"]["version"] == "9.9.9"


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


def test_publisher_issuers_requires_auth(portal_client: TestClient) -> None:
    r = portal_client.get("/publisher/issuers")
    assert r.status_code == 403


def test_publisher_issuers_returns_redacted_rows(portal_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeMongo:
        def find(self, collection: str, query: dict[str, Any]) -> Any:
            assert collection == "IssuerRecord"
            return iter(
                [
                    {"id": "did:web:issuer.example", "name": "Demo Issuer", "authorized_key": "z6MkSECRET"},
                    {"id": "did:web:other.example", "name": "Other", "secret_hash": "h"},
                ]
            )

    monkeypatch.setattr("app.routers.publisher_portal.MongoClient", FakeMongo)

    token = jwt.encode(
        {"client_id": "did:web:x", "expires": int(time.time()) + 3600},
        "portal-test-jwt-secret",
        algorithm="HS256",
    )
    r = portal_client.get("/publisher/issuers", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["issuers"] == [
        {"id": "did:web:issuer.example", "name": "Demo Issuer"},
        {"id": "did:web:other.example", "name": "Other"},
    ]
    raw = str(r.json())
    assert "z6MkSECRET" not in raw
    assert "secret_hash" not in raw


def test_publisher_issuers_503_on_mongo_error(portal_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    class BoomMongo:
        def find(self, collection: str, query: dict[str, Any]) -> Any:
            raise PyMongoError("unavailable")

    monkeypatch.setattr("app.routers.publisher_portal.MongoClient", BoomMongo)

    token = jwt.encode(
        {"client_id": "did:web:x", "expires": int(time.time()) + 3600},
        "portal-test-jwt-secret",
        algorithm="HS256",
    )
    r = portal_client.get("/publisher/issuers", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 503


def test_publisher_credential_types_requires_auth(portal_client: TestClient) -> None:
    r = portal_client.get("/publisher/credential-types")
    assert r.status_code == 403


def test_publisher_credential_types_returns_summaries(
    portal_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fat_doc: dict[str, Any] = {
        "type": "MyCred",
        "version": "1.0",
        "issuer": "did:web:x.example",
        "subject_type": "SubT",
        "additional_type": "DigitalConformityCredential",
        "core_paths": {"entityId": "$.a"},
        "subject_paths": {"x": "$.b"},
        "additional_paths": {"y": "$.c"},
        "status_lists": ["uuid-1"],
        "template": {"huge": True},
        "context": {"x": 1},
        "oca_bundle": {"big": "data"},
        "json_schema": {},
    }

    class FakeMongo:
        def find(self, collection: str, query: dict[str, Any]) -> Any:
            if collection == "CredentialTypeRecord":
                return iter([fat_doc])
            return iter([])

    monkeypatch.setattr("app.routers.publisher_portal.MongoClient", FakeMongo)

    token = jwt.encode(
        {"client_id": "did:web:x", "expires": int(time.time()) + 3600},
        "portal-test-jwt-secret",
        algorithm="HS256",
    )
    r = portal_client.get("/publisher/credential-types", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert len(data["credential_types"]) == 1
    row = data["credential_types"][0]
    assert row["type"] == "MyCred"
    assert row["version"] == "1.0"
    assert row["issuer"] == "did:web:x.example"
    assert row["subject_type"] == "SubT"
    assert row["additional_type"] == "DigitalConformityCredential"
    assert row["core_paths"] == {"entityId": "$.a"}
    assert row["subject_paths"] == {"x": "$.b"}
    assert row["additional_paths"] == {"y": "$.c"}
    assert row["status_lists"] == ["uuid-1"]
    raw = json.dumps(data)
    assert "template" not in raw
    assert "oca_bundle" not in raw
    assert "context" not in raw


def test_publisher_credential_types_503_on_mongo_error(
    portal_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    class BoomMongo:
        def find(self, collection: str, query: dict[str, Any]) -> Any:
            raise PyMongoError("unavailable")

    monkeypatch.setattr("app.routers.publisher_portal.MongoClient", BoomMongo)

    token = jwt.encode(
        {"client_id": "did:web:x", "expires": int(time.time()) + 3600},
        "portal-test-jwt-secret",
        algorithm="HS256",
    )
    r = portal_client.get("/publisher/credential-types", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 503


def test_publisher_register_credential_type_requires_auth(portal_client: TestClient) -> None:
    r = portal_client.post(
        "/publisher/credential-types",
        json={
            "type": "T",
            "version": "1",
            "issuer": "did:web:x",
            "corePaths": {"entityId": "$.a", "cardinalityId": "$.b"},
            "subjectType": "St",
            "subjectPaths": {},
            "relatedResources": {"context": "https://example.com/c.jsonld"},
        },
    )
    assert r.status_code == 403


def test_publisher_register_credential_type_success(portal_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    called: dict[str, Any] = {}

    async def fake_core(reg: dict[str, Any]) -> dict[str, Any]:
        called["reg"] = reg
        return {"type": ["VerifiableCredential"]}

    monkeypatch.setattr("app.routers.publisher_portal.register_credential_type_core", fake_core)

    token = jwt.encode(
        {"client_id": "did:web:x", "expires": int(time.time()) + 3600},
        "portal-test-jwt-secret",
        algorithm="HS256",
    )
    body: dict[str, Any] = {
        "type": "MyCt",
        "version": "2.0",
        "issuer": "did:web:issuer",
        "corePaths": {"entityId": "$.cid", "cardinalityId": "$.cn"},
        "subjectType": "MySubject",
        "subjectPaths": {"k": "$.p"},
        "relatedResources": {"context": "https://ctx.example/foo.jsonld"},
    }
    r = portal_client.post(
        "/publisher/credential-types",
        headers={"Authorization": f"Bearer {token}"},
        json=body,
    )
    assert r.status_code == 201
    data = r.json()
    assert data == {"type": "MyCt", "version": "2.0", "issuer": "did:web:issuer"}
    assert called["reg"]["type"] == "MyCt"
    assert called["reg"]["corePaths"]["entityId"] == "$.cid"


def test_publisher_register_credential_type_duplicate(portal_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_core(_reg: dict[str, Any]) -> dict[str, Any]:
        raise HTTPException(status_code=409, detail="Duplicate entry")

    monkeypatch.setattr("app.routers.publisher_portal.register_credential_type_core", fake_core)

    token = jwt.encode(
        {"client_id": "did:web:x", "expires": int(time.time()) + 3600},
        "portal-test-jwt-secret",
        algorithm="HS256",
    )
    r = portal_client.post(
        "/publisher/credential-types",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "type": "T",
            "version": "1",
            "issuer": "did:web:x",
            "corePaths": {"entityId": "$.a", "cardinalityId": "$.b"},
            "subjectType": "St",
            "subjectPaths": {},
            "relatedResources": {"context": "https://example.com/c.jsonld"},
        },
    )
    assert r.status_code == 409


def test_publisher_register_issuer_requires_auth(portal_client: TestClient) -> None:
    r = portal_client.post(
        "/publisher/issuers",
        json={"name": "A", "scope": "B Act", "description": "C"},
    )
    assert r.status_code == 403


def test_publisher_register_issuer_success(portal_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    class _Registrar:
        async def register_issuer(self, registration: dict[str, Any]) -> tuple[dict[str, Any], str]:
            assert registration["name"] == "Director"
            assert registration["scope"] == "Test Act"
            assert "multikey" not in registration
            return {"id": "did:web:namespace%3Aidentifier"}, "z6MkxAuthorized"

    monkeypatch.setattr("app.routers.publisher_portal.PublisherRegistrar", _Registrar)

    class FakeMongo:
        def insert(self, collection: str, item: dict[str, Any]) -> None:
            assert collection == "IssuerRecord"
            assert item["id"] == "did:web:namespace%3Aidentifier"
            assert item["name"] == "Director"
            assert item["authorized_key"] == "z6MkxAuthorized"

    monkeypatch.setattr("app.routers.publisher_portal.MongoClient", FakeMongo)

    token = jwt.encode(
        {"client_id": "did:web:x", "expires": int(time.time()) + 3600},
        "portal-test-jwt-secret",
        algorithm="HS256",
    )
    r = portal_client.post(
        "/publisher/issuers",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Director", "scope": "Test Act", "description": "Officer role"},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["id"] == "did:web:namespace%3Aidentifier"
    assert data["name"] == "Director"
    assert "z6Mkx" not in str(data)


def test_publisher_register_issuer_strips_blank_multikey(
    portal_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: dict[str, Any] = {}

    class _Registrar:
        async def register_issuer(self, registration: dict[str, Any]) -> tuple[dict[str, Any], str]:
            seen["registration"] = registration
            return {"id": "did:web:x"}, "k"

    monkeypatch.setattr("app.routers.publisher_portal.PublisherRegistrar", _Registrar)

    class FakeMongo:
        def insert(self, collection: str, item: dict[str, Any]) -> None:
            pass

    monkeypatch.setattr("app.routers.publisher_portal.MongoClient", FakeMongo)

    token = jwt.encode(
        {"client_id": "did:web:x", "expires": int(time.time()) + 3600},
        "portal-test-jwt-secret",
        algorithm="HS256",
    )
    r = portal_client.post(
        "/publisher/issuers",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "N", "scope": "S Act", "description": "D", "multikey": "  \t  "},
    )
    assert r.status_code == 201
    assert "multikey" not in seen["registration"]


def test_publisher_register_issuer_409_on_duplicate(portal_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    class _Registrar:
        async def register_issuer(self, registration: dict[str, Any]) -> tuple[dict[str, Any], str]:
            return {"id": "did:web:dup"}, "k"

    monkeypatch.setattr("app.routers.publisher_portal.PublisherRegistrar", _Registrar)

    class FakeMongo:
        def insert(self, collection: str, item: dict[str, Any]) -> None:
            raise MongoClientError()

    monkeypatch.setattr("app.routers.publisher_portal.MongoClient", FakeMongo)

    token = jwt.encode(
        {"client_id": "did:web:x", "expires": int(time.time()) + 3600},
        "portal-test-jwt-secret",
        algorithm="HS256",
    )
    r = portal_client.post(
        "/publisher/issuers",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "N", "scope": "S Act", "description": "D"},
    )
    assert r.status_code == 409

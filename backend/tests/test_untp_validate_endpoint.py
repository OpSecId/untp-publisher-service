"""HTTP tests for ``POST /test-suite/validate-credential``."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import app

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "untp_samples" / "v0.7.0"


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _load_sample(name: str, *, subdir: str = "dcc") -> dict:
    path = FIXTURES / subdir / name
    data = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(data, dict)
    return data


def test_validate_credential_happy_path(client: TestClient) -> None:
    credential = _load_sample("ConformityCredential_battery_instance.json")
    resp = client.post("/test-suite/validate-credential", json={"credential": credential})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["valid"] is True
    assert body["untp_version"] == "0.7.0"
    assert "type" not in body
    assert body["untp_type"] == "DigitalConformityCredential"
    vcdm = "https://www.w3.org/ns/credentials/v2"
    untp_ctx = "https://vocabulary.uncefact.org/untp/0.7.0/context/"
    jld = body["validation_checks"]["json_ld"]
    assert jld["context_digests"][vcdm].startswith("sha256:")
    assert jld["context_digests"][untp_ctx].startswith("sha256:")
    vs = body["validation_checks"]
    assert "type" not in vs
    jss = vs["json_schema"]
    assert isinstance(jss, list) and len(jss) == 2
    assert jss[0]["pass"] is True and jss[0]["schema_id"].startswith("https://")
    assert "ConformityCredential" in jss[0]["schema_id"]
    assert jss[1]["pass"] is True and "ConformityAttestation" in jss[1]["schema_id"]
    assert jld["pass"] is True
    assert jld["rdf_nquads_length"] > 0
    assert vs["data_model"]["pass"] is True
    assert vs["data_model"]["type"] == "DigitalConformityCredential"


def test_validate_credential_dia_subject_schema(client: TestClient) -> None:
    credential = _load_sample(
        "DigitalIdentityAnchor_battery_instance.json", subdir="dia"
    )
    resp = client.post("/test-suite/validate-credential", json={"credential": credential})
    assert resp.status_code == 200, resp.text
    jss = resp.json()["validation_checks"]["json_schema"]
    assert len(jss) == 2
    assert jss[1]["pass"] is True and "RegisteredIdentity" in jss[1]["schema_id"]


def test_validate_credential_empty_returns_422(client: TestClient) -> None:
    resp = client.post("/test-suite/validate-credential", json={"credential": {}})
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert isinstance(detail, dict)
    assert "message" in detail
    assert "validation_checks" in detail
    vs = detail["validation_checks"]
    assert vs == {}

"""HTTP surface for ``TEST_SUITE`` mode (``/test-suite/validate``)."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app import build_app
from config import Settings

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "untp_samples" / "v0.7.0" / "dcc"


def test_default_app_openapi_includes_test_suite_validate() -> None:
    from app import app as full_app

    paths = TestClient(full_app).get("/openapi.json").json().get("paths", {})
    assert "/test-suite/validate" in paths


def test_test_suite_app_exposes_only_test_routes() -> None:
    application = build_app(Settings(TEST_SUITE=True))
    paths = TestClient(application).get("/openapi.json").json().get("paths", {})
    assert "/test-suite/validate" in paths
    assert "/credentials/publish" not in paths
    assert "/auth/token" not in paths


def test_test_suite_validate_on_full_app_fixture() -> None:
    """Full publisher app also mounts ``/test-suite/validate`` (not only ``TEST_SUITE`` mode)."""
    from app import app as full_app

    samples = sorted(FIXTURES.glob("*.json"))
    doc = json.loads(samples[0].read_text(encoding="utf-8"))
    r = TestClient(full_app).post("/test-suite/validate", json=doc)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["success"] is True
    assert data.get("artefact_kind") == "dcc_credential"


def test_test_suite_validate_dcc_fixture() -> None:
    samples = sorted(FIXTURES.glob("*.json"))
    assert samples, f"missing fixtures under {FIXTURES}"
    doc = json.loads(samples[0].read_text(encoding="utf-8"))
    assert isinstance(doc, dict)

    application = build_app(Settings(TEST_SUITE=True))
    r = TestClient(application).post("/test-suite/validate", json=doc)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["success"] is True
    assert "validation_checks" in data
    assert data.get("artefact_kind") == "dcc_credential"
    assert "json_schema" in data["validation_checks"]

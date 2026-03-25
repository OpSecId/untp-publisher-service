"""Pytest configuration: minimal env so importing ``app`` does not require a real ``.env``."""

from __future__ import annotations

import os

import pytest


def _ensure_minimal_test_env() -> None:
    """``import app`` (e.g. ``app.validators``) loads ``config.settings``; set placeholders early."""
    defaults = {
        "DOMAIN": "http://localhost",
        "TRACTION_API_URL": "http://localhost",
        "TRACTION_API_KEY": "test",
        "TRACTION_TENANT_ID": "test",
        "ORGBOOK_URL": "http://localhost",
        "DID_WEB_SERVER_URL": "http://localhost",
        "PUBLISHER_MULTIKEY": "test",
        "ISSUER_REGISTRY_URL": "http://localhost",
        "MONGO_HOST": "localhost",
        "MONGO_PORT": "27017",
        "MONGO_USER": "test",
        "MONGO_PASSWORD": "test",
        "MONGO_DB": "test",
    }
    for key, value in defaults.items():
        os.environ.setdefault(key, value)


# Run at conftest import so test collection can ``from app.validators import …`` safely.
_ensure_minimal_test_env()


@pytest.fixture(scope="session", autouse=True)
def _minimal_settings_env() -> None:
    """Idempotent with module-level bootstrap; keeps env stable if tests mutate it."""
    _ensure_minimal_test_env()

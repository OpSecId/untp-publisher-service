"""Env alias behaviour for Settings (see config.py)."""

from config import Settings


def test_did_web_server_url_accepts_webh_server_url_alias() -> None:
    s = Settings.model_validate(
        {
            "WEBH_SERVER_URL": "https://sandbox.bcvh.vonx.io",
        }
    )
    assert s.DID_WEB_SERVER_URL == "https://sandbox.bcvh.vonx.io"


def test_did_web_server_url_prefers_explicit_did_key_when_both_provided() -> None:
    s = Settings.model_validate(
        {
            "DID_WEB_SERVER_URL": "https://explicit.example",
            "WEBH_SERVER_URL": "https://webh.example",
        }
    )
    assert s.DID_WEB_SERVER_URL == "https://explicit.example"

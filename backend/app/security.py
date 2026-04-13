from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any

import httpx
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

from config import settings

logger = logging.getLogger(__name__)

# HS256 keys should be >= 256 bits (RFC 7518). PyJWT warns on short strings; we derive a 32-byte key when needed.
_JWT_HS256_MIN_BYTES = 32


def jwt_hs256_signing_key(secret: str) -> str | bytes:
    """
    Return the key material PyJWT uses for HS256.

    If ``secret`` is shorter than 32 UTF-8 bytes, returns ``SHA256(secret_utf8)``
    (32 bytes) so HMAC is well-sized and ``InsecureKeyLengthWarning`` is avoided.
    Longer secrets are passed through unchanged (existing deployments keep behaviour).
    """
    raw = secret.encode("utf-8")
    if len(raw) >= _JWT_HS256_MIN_BYTES:
        return secret
    return hashlib.sha256(raw).digest()


X_API_KEY = APIKeyHeader(name="X-API-Key")

def check_api_key_header(x_api_key: str = Depends(X_API_KEY)):
    """Check api key"""

    if x_api_key == settings.TRACTION_API_KEY:
        return True
    raise HTTPException(
        status_code=401,
        detail="Invalid API Key",
    )


def decodeJWT(token: str) -> dict | None:
    try:
        decoded_token = jwt.decode(
            token,
            jwt_hs256_signing_key(settings.JWT_SECRET),
            algorithms=[settings.JWT_ALGORITHM],
        )
        if decoded_token.get("expires", 0) < int(time.time()):
            return None
        return decoded_token
    except Exception:
        return None


# BC Traction tenant proxy: /tenant* paths accept the wallet Bearer. Root GET /status is often nginx 403
# behind the tenant proxy, so it is not probed here.
# Lighter probes first; /tenant/server/status/config can return a large JSON body.
TRACTION_WALLET_INTROSPECTION_PATHS: tuple[str, ...] = (
    "/tenant",
    "/tenant/config",
    "/tenant/wallet",
    "/tenant/server/status/config",
)

_SMALL_JSON_MAX_CHARS = 10_000
_NON200_BODY_MAX = 4_000
_TEXT_NONJSON_MAX = 4_000


def _trim_str(s: str, max_len: int) -> str:
    if len(s) <= max_len:
        return s
    return s[: max(0, max_len - 24)] + "\n…[truncated]"


def _json_shape_truncated(obj: Any, max_depth: int, max_keys: int, depth: int = 0) -> Any:
    if depth >= max_depth:
        return "…"
    if isinstance(obj, dict):
        out: dict[str, Any] = {}
        for i, (k, v) in enumerate(obj.items()):
            if i >= max_keys:
                out["_truncated_key_count"] = len(obj) - max_keys
                break
            out[str(k)] = _json_shape_truncated(v, max_depth, max_keys, depth + 1)
        return out
    if isinstance(obj, list):
        if not obj:
            return []
        if len(obj) <= 6:
            return [_json_shape_truncated(x, max_depth, max_keys, depth + 1) for x in obj]
        return [
            _json_shape_truncated(obj[0], max_depth, max_keys, depth + 1),
            {"_omitted_list_items": len(obj) - 1},
        ]
    return obj


def _summarize_acapy_config_response(data: Any) -> dict[str, Any]:
    """Strip huge fields (e.g. genesis) from /tenant/server/status/config style payloads."""
    if not isinstance(data, dict):
        return {
            "_note": "Unexpected JSON root; truncated string form.",
            "preview": _trim_str(json.dumps(data, default=str), 6_000),
        }
    cfg = data.get("config")
    if not isinstance(cfg, dict):
        return {
            "_note": "No top-level `config` object.",
            "top_level_keys": list(data.keys())[:40],
        }
    ledgers = cfg.get("ledger.ledger_config_list")
    ledger_brief: list[Any] | None = None
    if isinstance(ledgers, list):
        ledger_brief = []
        for item in ledgers[:12]:
            if isinstance(item, dict):
                ledger_brief.append(
                    {k: item.get(k) for k in ("id", "pool_name", "is_write", "is_production", "read_only") if k in item}
                )
        if len(ledgers) > 12:
            ledger_brief.append({"_more_ledger_entries": len(ledgers) - 12})
    pc = cfg.get("plugin_config")
    plugin_keys = sorted(pc.keys())[:50] if isinstance(pc, dict) else None
    ext = cfg.get("external_plugins")
    ext_plugins = ext[:40] if isinstance(ext, list) else ext
    return {
        "_note": "Large ACA-Py `config` summarized (genesis / full plugin_config omitted).",
        "version": cfg.get("version"),
        "default_endpoint": cfg.get("default_endpoint"),
        "tails_server_base_url": cfg.get("tails_server_base_url"),
        "external_plugins": ext_plugins,
        "plugin_config_keys": plugin_keys,
        "ledger_config_brief": ledger_brief,
    }


def _preview_probe_body(path: str, status: int, raw_text: str) -> Any:
    if status != 200:
        t = (raw_text or "").strip()
        return _trim_str(t, _NON200_BODY_MAX) if t else None
    if not (raw_text or "").strip():
        return None
    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        return _trim_str(raw_text, _TEXT_NONJSON_MAX)
    compact = json.dumps(data, default=str)
    if path == "/tenant/server/status/config":
        return _summarize_acapy_config_response(data)
    if len(compact) > _SMALL_JSON_MAX_CHARS:
        return _json_shape_truncated(data, max_depth=4, max_keys=24)
    return data


def traction_wallet_probe_report(token: str) -> dict[str, Any]:
    """
    GET each known wallet-introspection URL with the same Bearer; return status and a small JSON-safe preview.
    Used by the portal Settings UI (not used for auth decisions).
    """
    base = (settings.TRACTION_API_URL or "").strip().rstrip("/")
    if not base:
        return {
            "traction_api_url": "",
            "probes": [],
            "detail": "TRACTION_API_URL is not set on this API.",
        }
    headers = {"Authorization": f"Bearer {token}"}
    probes: list[dict[str, Any]] = []
    for path in TRACTION_WALLET_INTROSPECTION_PATHS:
        url = f"{base}{path}"
        try:
            r = httpx.get(url, headers=headers, timeout=20.0)
        except httpx.RequestError as e:
            probes.append(
                {
                    "path": path,
                    "url": url,
                    "status_code": None,
                    "error": str(e),
                    "content_type": None,
                    "body": None,
                }
            )
            continue
        ct = (r.headers.get("content-type") or "").split(";")[0].strip() or None
        preview = _preview_probe_body(path, r.status_code, r.text or "")
        probes.append(
            {
                "path": path,
                "url": url,
                "status_code": r.status_code,
                "error": None,
                "content_type": ct,
                "body": preview,
            }
        )
    return {"traction_api_url": base, "probes": probes}


def _decode_traction_wallet_via_introspection(token: str) -> dict | None:
    """If Traction accepts the Bearer on a known probe URL, map wallet_id to portal client_id."""
    base = (settings.TRACTION_API_URL or "").strip().rstrip("/")
    if not base:
        return None
    headers = {"Authorization": f"Bearer {token}"}
    ok = False
    for path in TRACTION_WALLET_INTROSPECTION_PATHS:
        try:
            r = httpx.get(f"{base}{path}", headers=headers, timeout=15.0)
        except httpx.RequestError as e:
            logger.debug("Traction introspection GET %s failed: %s", path, e)
            continue
        if r.status_code == 200:
            ok = True
            break
        logger.debug("Traction introspection GET %s returned %s", path, r.status_code)
    if not ok:
        return None
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
    except Exception:
        return None
    wallet_id = payload.get("wallet_id")
    if not wallet_id:
        return None
    exp = payload.get("exp")
    if exp is not None and int(exp) < int(time.time()):
        return None
    return {
        "client_id": str(wallet_id),
        "expires": int(exp) if exp is not None else int(time.time()) + 3600,
    }


def portal_token_rejected_http_detail() -> str:
    base = (settings.TRACTION_API_URL or "").strip().rstrip("/")
    wallet_probe = (
        f"GET {base}/tenant, …/tenant/config, …/tenant/wallet, or …/tenant/server/status/config"
        if base
        else "GET (TRACTION_API_URL)/tenant, …/tenant/config, …/tenant/wallet, or …/tenant/server/status/config"
    )
    return (
        "Token not accepted. Publisher: use POST /auth/token from this deployment (JWT_SECRET must match). "
        f"Wallet: this backend must receive HTTP 200 from GET {wallet_probe} with the same Bearer."
    )


def decode_portal_token(token: str) -> dict | None:
    """
    Publisher portal session: issuer JWT from ``POST /auth/token``, or Traction wallet JWT
    accepted only after one of ``GET {TRACTION_API_URL}/tenant``, ``…/tenant/config``, ``…/tenant/wallet``,
    or ``…/tenant/server/status/config``
    with the same Bearer returns 200 (Traction verifies the token; no wallet jwt-secret on this service).
    """
    pub = decodeJWT(token)
    if pub and pub.get("client_id"):
        return pub
    return _decode_traction_wallet_via_introspection(token)


_portal_http_bearer = HTTPBearer(auto_error=False)


async def verify_portal_jwt_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_portal_http_bearer),
) -> str:
    """Bearer JWT: publisher ``/auth/token`` or Traction wallet token (see ``decode_portal_token``)."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=403, detail="Missing or non-Bearer Authorization header.")
    raw = credentials.credentials
    if decode_portal_token(raw) is None:
        raise HTTPException(status_code=403, detail=portal_token_rejected_http_detail())
    return raw
from __future__ import annotations

import logging
import time

import httpx
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

from config import settings

logger = logging.getLogger(__name__)


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
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        if decoded_token.get("expires", 0) < int(time.time()):
            return None
        return decoded_token
    except Exception:
        return None


# BC Traction tenant proxy: several /tenant* paths accept the wallet Bearer; /status is often nginx 403.
# Lighter probes first; /tenant/server/status/config can return a large JSON body.
# ACA-Py-only stacks may answer on /status last.
TRACTION_WALLET_INTROSPECTION_PATHS: tuple[str, ...] = (
    "/tenant",
    "/tenant/config",
    "/tenant/wallet",
    "/tenant/server/status/config",
    "/status",
)


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
        f"GET {base}/tenant, …/tenant/config, …/tenant/wallet, …/tenant/server/status/config, or …/status"
        if base
        else "GET (TRACTION_API_URL)/tenant, …/tenant/* probes, or …/status"
    )
    return (
        "Token not accepted. Publisher: use POST /auth/token from this deployment (JWT_SECRET must match). "
        f"Wallet: this backend must receive HTTP 200 from GET {wallet_probe} with the same Bearer."
    )


def decode_portal_token(token: str) -> dict | None:
    """
    Publisher portal session: issuer JWT from ``POST /auth/token``, or Traction wallet JWT
    accepted only after one of ``GET {TRACTION_API_URL}/tenant``, ``…/tenant/config``, ``…/tenant/wallet``,
    ``…/tenant/server/status/config``, or ``…/status``
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
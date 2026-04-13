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


def _decode_traction_wallet_via_introspection(token: str) -> dict | None:
    """If Traction accepts the Bearer, treat unverified payload wallet_id as the portal identity."""
    base = (settings.TRACTION_API_URL or "").strip().rstrip("/")
    if not base:
        return None
    try:
        r = httpx.get(
            f"{base}/status",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15.0,
        )
    except httpx.RequestError as e:
        logger.debug("Traction introspection request failed: %s", e)
        return None
    if r.status_code != 200:
        logger.debug("Traction introspection GET /status returned %s", r.status_code)
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
    status_target = f"{base}/status" if base else "(TRACTION_API_URL not set)/status"
    return (
        "Invalid or expired token. A publisher JWT from POST /auth/token must be signed with "
        "this deployment's JWT_SECRET. A Traction wallet JWT is accepted only after this backend "
        f"receives HTTP 200 from GET {status_target} with the same Authorization Bearer."
    )


def decode_portal_token(token: str) -> dict | None:
    """
    Publisher portal session: issuer JWT from ``POST /auth/token``, or Traction wallet JWT
    accepted only after ``GET {TRACTION_API_URL}/status`` with the same Bearer returns 200
    (Traction verifies the token; no wallet jwt-secret on this service).
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
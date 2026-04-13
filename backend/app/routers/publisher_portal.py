"""Read-only portal metadata for the SPA (JWT-authenticated)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.plugins.mongodb import MongoClient
from app.security import (
    TRACTION_WALLET_INTROSPECTION_PATHS,
    decode_portal_token,
    portal_token_rejected_http_detail,
    traction_wallet_probe_report,
    verify_portal_jwt_token,
)
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/publisher")


@router.get("/traction-wallet-probes", tags=["Client"])
async def publisher_traction_wallet_probes(token: str = Depends(verify_portal_jwt_token)):
    """GET each wallet-introspection URL with the session Bearer; JSON previews for the SPA Settings page."""
    return JSONResponse(status_code=200, content=traction_wallet_probe_report(token))


@router.get("/issuers", tags=["Client"])
async def publisher_list_issuers(_token: str = Depends(verify_portal_jwt_token)):
    """List registered issuers (id and name only; no keys or secrets)."""
    try:
        mongo = MongoClient()
        out: list[dict[str, str]] = []
        for doc in mongo.find("IssuerRecord", {}):
            iid = doc.get("id")
            name = doc.get("name")
            if iid is None and name is None:
                continue
            out.append(
                {
                    "id": str(iid) if iid is not None else "",
                    "name": str(name) if name is not None else "",
                }
            )
    except PyMongoError as e:
        logger.warning("publisher_list_issuers: MongoDB error: %s", e)
        raise HTTPException(status_code=503, detail="Issuer store is temporarily unavailable.") from e

    return JSONResponse(status_code=200, content={"issuers": out})


@router.get("/session", tags=["Client"])
async def publisher_session(token: str = Depends(verify_portal_jwt_token)):
    payload = decode_portal_token(token)
    if not payload or not payload.get("client_id"):
        raise HTTPException(status_code=403, detail=portal_token_rejected_http_detail())

    return JSONResponse(
        status_code=200,
        content={
            "claims": {
                "client_id": payload.get("client_id"),
                "expires": payload.get("expires"),
            },
            "environment": {
                "project_title": settings.PROJECT_TITLE,
                "project_version": settings.PROJECT_VERSION,
                "domain": settings.DOMAIN,
                "traction_tenant_id": settings.TRACTION_TENANT_ID,
                "traction_api_url": settings.TRACTION_API_URL,
                "traction_wallet_introspection_paths": list(TRACTION_WALLET_INTROSPECTION_PATHS),
                "registry_url": settings.REGISTRY_URL,
                "did_web_server_url": settings.DID_WEB_SERVER_URL,
                "issuer_registry_url": settings.ISSUER_REGISTRY_URL,
            },
        },
    )

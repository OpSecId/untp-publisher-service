"""Read-only portal metadata for the SPA (JWT-authenticated)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.security import (
    TRACTION_WALLET_INTROSPECTION_PATHS,
    decode_portal_token,
    portal_token_rejected_http_detail,
    verify_portal_jwt_token,
)
from config import settings

router = APIRouter(prefix="/publisher")


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

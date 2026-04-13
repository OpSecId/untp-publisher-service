"""Portal metadata and limited write APIs for the SPA (JWT-authenticated)."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.models.mongodb import IssuerRecord
from app.models.registrations import IssuerRegistration
from app.plugins import MongoClient, MongoClientError, PublisherRegistrar
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


def _issuer_registration_dict(body: IssuerRegistration) -> dict[str, Any]:
    # IssuerRegistration.model_dump() already applies exclude_none=True (see app.models.registrations.BaseModel).
    registration = dict(body.model_dump())
    mk = registration.get("multikey")
    if isinstance(mk, str):
        s = mk.strip()
        if not s:
            registration.pop("multikey", None)
        else:
            registration["multikey"] = s
    return registration


@router.post("/issuers", tags=["Client"])
async def publisher_register_issuer(
    body: IssuerRegistration,
    _token: str = Depends(verify_portal_jwt_token),
):
    """
    Register an issuer (DID Web + Traction keys + Mongo), same behaviour as
    ``POST /registrations/issuers`` but authenticated with the portal Bearer instead of ``X-API-Key``.
    """
    registration = _issuer_registration_dict(body)
    registrar = PublisherRegistrar()
    try:
        did_document, authorized_key = await registrar.register_issuer(registration)
    except HTTPException:
        raise
    mongo = MongoClient()
    try:
        mongo.insert(
            "IssuerRecord",
            IssuerRecord(
                id=did_document.get("id"),
                name=registration.get("name"),
                authorized_key=authorized_key,
            ).model_dump(),
        )
    except MongoClientError as e:
        raise HTTPException(
            status_code=409,
            detail="An issuer with this identifier already exists.",
        ) from e

    iid = did_document.get("id")
    return JSONResponse(
        status_code=201,
        content={
            "id": str(iid) if iid is not None else "",
            "name": str(registration.get("name") or ""),
        },
    )


def _credential_type_portal_summary(doc: dict[str, Any]) -> dict[str, Any]:
    """Strip large blobs (context, template, OCA, json_schema) for portal listing."""
    sl = doc.get("status_lists")
    status_lists: list[Any] = list(sl) if isinstance(sl, list) else []

    def _paths(key: str) -> dict[str, Any] | None:
        v = doc.get(key)
        return dict(v) if isinstance(v, dict) else None

    return {
        "type": str(doc.get("type") or ""),
        "version": str(doc.get("version") or ""),
        "issuer": str(doc.get("issuer") or ""),
        "subject_type": str(doc["subject_type"]) if doc.get("subject_type") is not None else "",
        "additional_type": str(doc["additional_type"]) if doc.get("additional_type") is not None else "",
        "core_paths": _paths("core_paths") or {},
        "subject_paths": _paths("subject_paths") or {},
        "additional_paths": _paths("additional_paths"),
        "status_lists": status_lists,
    }


@router.get("/credential-types", tags=["Client"])
async def publisher_list_credential_types(_token: str = Depends(verify_portal_jwt_token)):
    """List registered credential types (summary only; no full template/context/OCA/schema)."""
    try:
        mongo = MongoClient()
        out: list[dict[str, Any]] = []
        for doc in mongo.find("CredentialTypeRecord", {}):
            if not isinstance(doc, dict):
                continue
            out.append(_credential_type_portal_summary(doc))
    except PyMongoError as e:
        logger.warning("publisher_list_credential_types: MongoDB error: %s", e)
        raise HTTPException(
            status_code=503, detail="Credential type store is temporarily unavailable."
        ) from e

    return JSONResponse(status_code=200, content={"credential_types": out})


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
                "did_web_server_url": settings.DID_WEB_SERVER_URL,
                "issuer_registry_url": settings.ISSUER_REGISTRY_URL,
            },
        },
    )

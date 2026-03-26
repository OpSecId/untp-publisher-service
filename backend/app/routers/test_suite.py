"""Non-production helpers for exercising validators and payloads (Swagger: **Test suite**)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from app.validators.untp import (
    UntpArtefactKind,
    first_failed_validation_check,
    validate_untp_document_with_checks,
)
from untp.releases import BUNDLE_VERSION

_EXAMPLE_CREDENTIAL_PATH = (
    Path(__file__).resolve().parent.parent
    / "examples"
    / "untp_v0_7_0_dcc_battery_instance.json"
)
_UNTP_VALIDATE_CREDENTIAL_BODY_EXAMPLE: dict[str, Any] = {
    "credential": json.loads(_EXAMPLE_CREDENTIAL_PATH.read_text(encoding="utf-8")),
}

router = APIRouter(prefix="/test-suite", tags=["Test suite"])


class UntpValidateCredentialRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"example": _UNTP_VALIDATE_CREDENTIAL_BODY_EXAMPLE},
    )

    credential: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "UNTP Verifiable Credential as a JSON object. Swagger preloads the official "
            "v0.7.0 DCC battery sample from ``app/examples/untp_v0_7_0_dcc_battery_instance.json``."
        ),
    )


class UntpValidateCredentialResponse(BaseModel):
    valid: bool = True
    untp_version: str = Field(
        description="Bundled UNTP artefact release (schemas/contexts under ``untp/bundled/``).",
    )
    untp_type: str = Field(
        description=(
            "UNTP credential type as the v0.7.0 Pydantic model class name "
            "(e.g. ``DigitalConformityCredential``)."
        ),
    )
    validation_checks: dict[str, Any] = Field(
        description=(
            "Per-check outcomes: ``document_root``, ``json_ld``, and ``data_model`` are objects "
            "with ``pass`` (and check-specific fields). On success, ``json_ld`` includes "
            "``context_digests`` for bundled ``@context`` URLs. "
            "``data_model`` uses ``type`` for the Python model class name on success. "
            "``json_schema`` is an array of "
            "``{schema_id, pass}`` (add ``error`` when ``pass`` is false): envelope first, "
            "then ``credentialSubject`` schema for DCC/DIA credentials. Artefact kind is "
            "inferred internally."
        ),
    )


@router.post(
    "/validate-credential",
    response_model=UntpValidateCredentialResponse,
    summary="Validate UNTP credential (JSON Schema, JSON-LD, Pydantic)",
    description=(
        "Runs the same pipeline as ``validate_untp_document``: bundled JSON Schema, "
        "offline JSON-LD → RDF, then Pydantic. Does not issue or store credentials."
    ),
)
def validate_credential(
    body: UntpValidateCredentialRequest,
    kind: Annotated[
        UntpArtefactKind | None,
        Query(
            description=(
                "Artefact kind. Leave unset to infer from ``credential.type`` "
                "(DigitalConformityCredential → dcc_credential, etc.)."
            ),
        ),
    ] = None,
) -> UntpValidateCredentialResponse:
    run = validate_untp_document_with_checks(body.credential, kind=kind)
    validation_checks_payload = dict(run.checks)
    if not run.success or run.document is None:
        failed = first_failed_validation_check(validation_checks_payload)
        payload = failed[1] if failed else None
        detail: dict[str, Any] = {
            "message": (
                (payload.get("error") if payload else None)
                or (str(run.raising) if run.raising else None)
                or "UNTP validation failed"
            ),
            "validation_checks": validation_checks_payload,
        }
        if run.raising is not None and run.raising.__cause__ is not None:
            detail["cause"] = str(run.raising.__cause__)
        raise HTTPException(status_code=422, detail=detail)

    result = run.document
    return UntpValidateCredentialResponse(
        untp_version=BUNDLE_VERSION,
        untp_type=result.model.__class__.__name__,
        validation_checks=validation_checks_payload,
    )

"""UNTP validation HTTP surface (``POST /test-suite/validate``); registered on full app and minimal ``TEST_SUITE`` app."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Query

from app.validators.untp import UntpArtefactKind, validate_untp_document_with_checks

router = APIRouter(prefix="/test-suite", tags=["Test suite"])


@router.post("/validate")
async def post_validate(
    body: dict[str, Any] = Body(...),
    kind: UntpArtefactKind | None = Query(
        None,
        description="Optional artefact kind; when omitted, inferred from the document `type`.",
    ),
) -> dict[str, Any]:
    """
    Run the full UNTP pipeline (JSON Schema, JSON-LD, Pydantic) and return structured checks.

    Same logic as :func:`app.validators.untp.validate_untp_document_with_checks`.
    """
    run = validate_untp_document_with_checks(body, kind=kind)
    out: dict[str, Any] = {
        "success": run.success,
        "validation_checks": run.checks,
        "artefact_kind": run.document.kind.value if run.document else None,
    }
    if run.raising is not None:
        out["error"] = str(run.raising)
    return out

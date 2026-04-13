from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from app.utils import generate_digest_multibase
from app.models.registrations import (
    CredentialRegistration,
    IssuerRegistration,
    issuer_registration_for_registrar,
)
from app.models.mongodb import (
    IssuerRecord,
    CredentialTypeRecord,
    StatusListRecord,
)
from config import settings
from app.plugins import (
    MongoClient,
    MongoClientError,
    BitstringStatusList,
    PublisherRegistrar,
    OCAProcessor,
)
import uuid
import random
import json
import httpx
from app.security import check_api_key_header


router = APIRouter(prefix="/registrations")


async def register_credential_type_core(credential_registration: dict[str, Any]) -> dict[str, Any]:
    """
    Create status list, VC template, fetch JSON-LD context, OCA bundle, and persist ``CredentialTypeRecord``.

    ``credential_registration`` must be a ``CredentialRegistration.model_dump()``-style dict
    (camelCase keys, nested ``relatedResources``, ``corePaths``, etc.).
    """
    dn = credential_registration.get("description")
    if isinstance(dn, str):
        s = dn.strip()
        if not s:
            credential_registration.pop("description", None)
        else:
            credential_registration["description"] = s

    credential_type = credential_registration.get("type")
    credential_version = credential_registration.get("version")

    mongo = MongoClient()

    indexes = list(range(500000))
    random.shuffle(indexes)

    status_list_id = str(uuid.uuid4())
    status_list_credential = await BitstringStatusList().create(
        issuer=credential_registration["issuer"],
        purpose=["revocation", "suspension", "refresh"],
        length=len(indexes),
    )
    mongo.insert(
        "StatusListRecord",
        StatusListRecord(
            id=status_list_id,
            indexes=indexes,
            endpoint=f"https://{settings.DOMAIN}/credentials/status/{status_list_id}",
            credential=status_list_credential,
        ).model_dump(),
    )

    credential_template = await PublisherRegistrar().template_credential(
        credential_registration
    )

    context = httpx.get(credential_registration["relatedResources"]["context"]).json()

    context["@context"]["SimpleRefreshQuery"] = "https://schema.org/WebAPI"
    context["@context"]["OCABundle"] = "https://oca.colossi.network/specification/#bundle"
    settings.LOGGER.info(context)

    json_schema: dict[str, Any] = {}

    oca_bundle = OCAProcessor().create_bundle(credential_registration, credential_template)
    credential_template["renderMethod"] = [
        {
            "type": "OCABundle",
            "id": f"https://{settings.DOMAIN}/bundles/{credential_type}/{credential_version}",
            "name": "Overlay Capture Architecture Bundle",
            "digestMultibase": generate_digest_multibase(oca_bundle),
        }
    ]

    try:
        mongo.insert(
            "CredentialTypeRecord",
            CredentialTypeRecord(
                type=credential_registration.get("type"),
                version=credential_registration.get("version"),
                issuer=credential_registration.get("issuer"),
                context=context,
                template=credential_template,
                oca_bundle=oca_bundle,
                json_schema=json_schema,
                core_paths=credential_registration.get("corePaths"),
                subject_type=credential_registration.get("subjectType"),
                subject_paths=credential_registration.get("subjectPaths"),
                additional_type=credential_registration.get("additionalType"),
                additional_paths=credential_registration.get("additionalPaths"),
                status_lists=[status_list_id],
            ).model_dump(),
        )
    except MongoClientError:
        raise HTTPException(status_code=409, detail="Duplicate entry") from None

    return credential_template


@router.get("/issuers", tags=["Admin"], dependencies=[Depends(check_api_key_header)])
async def list_issuer_registrations():
    mongo = MongoClient()
    issuer_records = mongo.find(
        "IssuerRecord",
        {}
    )
    issuer_records = [json.loads(json.dumps(issuer_record, default=str)) for issuer_record in issuer_records]
    return JSONResponse(status_code=200, content=issuer_records)


@router.post("/issuers", tags=["Admin"], dependencies=[Depends(check_api_key_header)])
async def register_issuer(request_body: IssuerRegistration):
    registration = issuer_registration_for_registrar(request_body)

    # Register issuer on DID Web server and create DID document
    did_document, authorized_key = await PublisherRegistrar().register_issuer(
        registration
    )

    stored_name = registration.get("display_name") or registration.get("name") or ""
    mongo = MongoClient()
    mongo.insert(
        "IssuerRecord",
        IssuerRecord(
            id=did_document.get("id"),
            name=str(stored_name),
            authorized_key=authorized_key,
        ).model_dump(),
    )

    return JSONResponse(status_code=201, content=did_document)


@router.post(
    "/credentials", tags=["Admin"], dependencies=[Depends(check_api_key_header)]
)
async def register_credential_type(request_body: CredentialRegistration):
    credential_registration = request_body.model_dump()
    credential_template = await register_credential_type_core(credential_registration)
    return JSONResponse(status_code=201, content=credential_template)

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from app.models.publications import (
    Publication,
    Forwarding
)
from app.models.mongodb import CredentialRecord
from app.plugins.mongodb import MongoClient
from config import settings
from app.utils import timestamp
from app.plugins.orgbook import OrgbookPublisher
from app.plugins import (
    TractionController,
    PublisherRegistrar,
)
from app.security import JWTBearer
import uuid
import segno
import copy

router = APIRouter(prefix="/credentials")


@router.post("/forward", tags=["Client"])
async def forward_credential(request_body: Forwarding):
    settings.LOGGER.info("Forwarding request")
    credential_input = request_body.model_dump()["verifiableCredential"]
    proof = credential_input.pop('proof')
    options = request_body.model_dump()["options"]
    mongo = MongoClient()
    
    # Check if credential type has a registration
    credential_type = credential_input.get("type")
    credential_registration = mongo.find_one(
        'CredentialTypeRecord',
        {'type': credential_type}
    )
    if not credential_registration:
        raise HTTPException(
            status_code=404,
            detail="Unregistered credential type",
        )
    
    # Check if entity id provided exists in orgbook
    entity_id = options.get("entityId")
    # try:
    #     OrgbookPublisher().fetch_buisness_info(entity_id)
    # except:
    #     raise HTTPException(
    #         status_code=404,
    #         detail=f"No orgbook registration found for {entity_id}",
    #     )
        
    cardinality_hash = await PublisherRegistrar().check_cardinality(
        credential_input=copy.deepcopy(credential_input), options=options
    )
    if cardinality_hash:
        credential = await PublisherRegistrar().format_credential(
            credential_input=copy.deepcopy(credential_input), options=options
        )

        traction = TractionController()
        traction.authorize()
        vc = traction.issue_vc(credential)
        vc_jwt = traction.sign_vc_jwt(vc)
        mongo.insert(
            "CredentialRecord",
            CredentialRecord(
                id=options.get("credentialId"),
                type=credential_type,
                entity_id=entity_id,
                cardinality_id=options.get("cardinalityId"),
                cardinality_hash=cardinality_hash,
                refresh=False,
                revocation=False,
                suspension=False,
                vc=vc,
                vc_jwt=vc_jwt,
            ).model_dump(),
        )
        return JSONResponse(status_code=201, content={"credentialId": vc["id"]})


@router.post("/publish", tags=["Client"], dependencies=[Depends(JWTBearer())])
async def publish_credential(request_body: Publication):
    settings.LOGGER.info("Publication request")
    credential_input = request_body.model_dump()["credential"]

    options = request_body.model_dump()["options"]
    if not options.get("credentialId"):
        options["credentialId"] = str(uuid.uuid4())
        settings.LOGGER.info("No credential id provided, new id generated.")
        
    settings.LOGGER.info('Credential Id: ' + options["credentialId"])
    
    mongo = MongoClient()
    
    # Check if credential type has a registration
    credential_type = credential_input.get("type")
    credential_registration = mongo.find_one(
        'CredentialTypeRecord',
        {'type': credential_type}
    )
    if not credential_registration:
        raise HTTPException(
            status_code=404,
            detail="Unregistered credential type",
        )
    
    # Check if entity id provided exists in orgbook
    entity_id = options.get("entityId")
    try:
        OrgbookPublisher().fetch_buisness_info(entity_id)
    except:
        raise HTTPException(
            status_code=404,
            detail=f"No orgbook registration found for {entity_id}",
        )
        
    # Check cardinality, returns hash if new issuance is required
    cardinality_hash = await PublisherRegistrar().check_cardinality(
        credential_input=copy.deepcopy(credential_input), options=options
    )
        
    if cardinality_hash:
        # Format credential
        credential = await PublisherRegistrar().format_credential(
            credential_input=copy.deepcopy(credential_input), options=options
        )

        traction = TractionController()
        traction.authorize()
        vc = traction.issue_vc(credential)
        if not vc:
            raise HTTPException(
                status_code=500,
                detail="Unexpected error occured while trying to issue the credential.",
            )
        vc_jwt = traction.sign_vc_jwt(vc)
        if not vc_jwt:
            raise HTTPException(
                status_code=500,
                detail="Unexpected error occured while trying to issue the credential.",
            )
        
        # Forward credential to Orgbook unless set in service only mode
        if settings.ORGBOOK_SYNC:
            await OrgbookPublisher().forward_credential(vc, credential_registration)
        
        mongo.insert(
            "CredentialRecord",
            CredentialRecord(
                id=options.get("credentialId"),
                type=credential_type,
                entity_id=entity_id,
                cardinality_id=options.get("cardinalityId"),
                cardinality_hash=cardinality_hash,
                refresh=False,
                revocation=False,
                suspension=False,
                vc=vc,
                vc_jwt=vc_jwt,
            ).model_dump(),
        )
        return JSONResponse(status_code=201, content={"credentialId": vc["id"]})

    else:
        credential_records = mongo.find_one(
            "CredentialRecord",
            {
                "type": credential_input.get("type"),
                "entity_id": options.get("entityId"),
                "cardinality_id": options.get("cardinalityId"),
                "refresh": False,
            },
        )
        vc = credential_records['vc']
        return JSONResponse(status_code=200, content={"credentialId": vc['id']})



@router.get("/refresh", tags=["Public"])
async def refresh_credential(type: str, entity: str, cardinality: str, request: Request):
    entity_id = entity
    cardinality_id = cardinality
    credential_type = type
    mongo = MongoClient()
    credential_record = mongo.find_one(
        "CredentialRecord", 
        {
            "type": credential_type,
            "entity_id": entity_id,
            "cardinality_id": cardinality_id,
            "refresh": False
        }
    )
    vc = credential_record['vc']
    vc_jwt = credential_record['vc_jwt']
    if "application/vc+jwt" in request.headers["accept"]:
        return Response(content=vc_jwt, media_type="application/vc+jwt")
    elif "application/vc" in request.headers["accept"]:
        return JSONResponse(headers={"Content-Type": "application/vc"}, content=vc)
    return JSONResponse(headers={"Content-Type": "application/vc"}, content=vc)


@router.get("/{credential_id}", tags=["Public"])
async def get_credential(credential_id: str, request: Request):
    mongo = MongoClient()
    credential_record = mongo.find_one("CredentialRecord", {"id": credential_id})
    if not credential_record:
        raise HTTPException(
            status_code=404,
            detail="No record found.",
        )
    vc = credential_record["vc"]
    vc_jwt = credential_record["vc_jwt"]
    if "application/vc+jwt" in request.headers["accept"]:
        return Response(content=vc_jwt, media_type="application/vc+jwt")
    elif "application/vc" in request.headers["accept"]:
        return JSONResponse(headers={"Content-Type": "application/vc"}, content=vc)
    else:
        branding = {"logo": "https://avatars.githubusercontent.com/u/916280"}
        meta = {
            "name": vc["name"],
            "issuer": vc["issuer"]["name"],
        }
        values = {
            "cardinalityId": credential_record["cardinality_id"],
            "entityId": vc["credentialSubject"]["issuedToParty"]["registeredId"],
            "entityName": vc["credentialSubject"]["issuedToParty"]["name"],
        }
        context = {
            "title": credential_record["type"],
            "branding": branding,
            "meta": meta,
            "values": values,
            "qrcode": segno.make(vc["id"]),
            "vc": vc,
            "jwt": vc_jwt,
        }
        return Jinja2Templates(directory="app/templates").TemplateResponse(
            request=request, name="minimal.jinja", context=context
        )


@router.get("/status/{status_credential_id}", tags=["Public"])
async def get_status_list_credential(status_credential_id: str, request: Request):
    mongo = MongoClient()
    status_list_record = mongo.find_one(
        "StatusListRecord", {"id": status_credential_id}
    )
    if not status_list_record:
        raise HTTPException(
            status_code=404,
            detail="No record found.",
        )
    status_list_credential = status_list_record["credential"]
    status_list_credential["validFrom"] = timestamp()
    status_list_credential["validUntil"] = timestamp(5)
    traction = TractionController()
    traction.authorize()
    if "application/vc+jwt" in request.headers["accept"]:
        vc_jwt = traction.sign_vc_jwt(status_list_credential)
        return Response(content=vc_jwt, media_type="application/vc+jwt")
    elif "application/vc" in request.headers["accept"]:
        vc = traction.issue_vc(status_list_credential)
        return JSONResponse(headers={"Content-Type": "application/vc"}, content=vc)
    else:
        vc = traction.issue_vc(status_list_credential)
        return JSONResponse(content=vc)

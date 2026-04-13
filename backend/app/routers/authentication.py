from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import Field, BaseModel
from config import settings
from app.plugins import MongoClient, MongoClientError
import time
import jwt
import secrets
import hashlib
from app.security import check_api_key_header, jwt_hs256_signing_key

router = APIRouter(prefix="/auth")


class RequestSecret(BaseModel):
    client_id: str = Field()


class RequestToken(BaseModel):
    client_id: str = Field()
    client_secret: str = Field()


class RequestDelegatedCredential(BaseModel):
    issuer: str = Field()
    email: str = Field()


@router.post("/secret", tags=["Admin"], dependencies=[Depends(check_api_key_header)])
async def update_client_secret(request_body: RequestSecret):
    client_id = vars(request_body)["client_id"]
    client_secret = secrets.token_urlsafe(64)
    client_hash = hashlib.sha256(client_secret.encode()).hexdigest()

    mongo = MongoClient()
    issuer_record = mongo.find_one("IssuerRecord", {"id": client_id})
    issuer_record["secret_hash"] = client_hash
    mongo.replace("IssuerRecord", {"id": client_id}, issuer_record)

    return JSONResponse(status_code=200, content={"client_secret": client_secret})


@router.post("/token", tags=["Client"])
async def request_client_token(request_body: RequestToken):
    client_id = vars(request_body)["client_id"]
    client_secret = vars(request_body)["client_secret"]
    client_hash = hashlib.sha256(client_secret.encode()).hexdigest()

    mongo = MongoClient()
    issuer_record = mongo.find_one("IssuerRecord", {"id": client_id})

    if client_hash != issuer_record["secret_hash"]:
        raise HTTPException(
            status_code=403,
            detail="Invalid credentials",
        )

    payload = {"client_id": client_id, "expires": int(time.time()) + 3600}
    token = jwt.encode(
        payload,
        jwt_hs256_signing_key(settings.JWT_SECRET),
        algorithm=settings.JWT_ALGORITHM,
    )

    return JSONResponse(status_code=200, content={"access_token": token})

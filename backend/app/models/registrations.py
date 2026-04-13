from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
from pydantic.json_schema import SkipJsonSchema
from config import settings


def issuer_registration_for_registrar(body: "IssuerRegistration") -> Dict[str, Any]:
    """Normalize issuer registration for ``PublisherRegistrar.register_issuer`` (strip blanks)."""
    registration = dict(body.model_dump())
    mk = registration.get("multikey")
    if isinstance(mk, str):
        s = mk.strip()
        if not s:
            registration.pop("multikey", None)
        else:
            registration["multikey"] = s
    dn = registration.get("display_name")
    if isinstance(dn, str):
        s = dn.strip()
        if not s:
            registration.pop("display_name", None)
        else:
            registration["display_name"] = s
    return registration


class BaseModel(BaseModel):
    def model_dump(self, **kwargs) -> Dict[str, Any]:
        return super().model_dump(by_alias=True, exclude_none=True, **kwargs)


class IssuerRegistration(BaseModel):
    name: str = Field(
        example="director-of-petroleum-lands",
        description="Short identifier for the DID path (slug-style; spaces become hyphens).",
    )
    display_name: Optional[str] = Field(
        default=None,
        example="Director of Petroleum Lands",
        description="Optional human-readable name for lists and the DID document; defaults to name.",
    )
    scope: str = Field(example="Petroleum and Natural Gas Act")
    description: str = Field(
        example="An officer or employee of the ministry who is designated as the Director of Petroleum Lands by the minister."
    )
    multikey: SkipJsonSchema[str] = Field(
        None, example="z6MkkuJkRuYpHkycUYUnBmUzN5cerBjdhDFC3tEBXfSD6Zr8"
    )


class RelatedResources(BaseModel):
    context: str = Field(
        example="https://bcgov.github.io/digital-trust-toolkit/contexts/BCPetroleumAndNaturalGasTitle/v1.jsonld"
    )
    legalAct: str = Field(
        None,
        example="https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/00_96361_01",
    )
    governance: str = Field(
        None,
        example="https://bcgov.github.io/digital-trust-toolkit/docs/governance/pilots/bc-petroleum-and-natural-gas-title",
    )


class CorePaths(BaseModel):
    entityId: str = Field(example="$.credentialSubject.issuedToParty.registeredId")
    cardinalityId: str = Field(example="$.credentialSubject.titleNumber")


class CredentialRegistration(BaseModel):
    type: str = Field("BCPetroleumAndNaturalGasTitleCredential")
    version: str = Field(example="1.0")
    issuer: str = Field(example="did:web:")
    corePaths: CorePaths = Field()
    subjectType: str = Field(None, example="PetroleumAndNaturalGasTitle")
    subjectPaths: Dict[str, str] = Field(
        example={
            "titleType": "$.credentialSubject.titleType",
            "titleNumber": "$.credentialSubject.titleNumber",
            "originType": "$.credentialSubject.originType",
            "originNumber": "$.credentialSubject.originNumber",
            "caveats": "$.credentialSubject.caveats",
        }
    )
    additionalType: str = Field(None, example="DigitalConformityCredential")
    additionalPaths: Dict[str, str] = Field(
        None,
        example={
            "wells": "$.credentialSubject.assessment[0].assessedFacility",
            "tracts": "$.credentialSubject.assessment[0].assessedProduct",
        },
    )
    relatedResources: RelatedResources = Field()

    @field_validator("additionalType")
    @classmethod
    def validate_untp_type(cls, value):
        if value not in ["DigitalConformityCredential"]:
            raise ValueError(f"Unsupported UNTP type {value}.")
        return value

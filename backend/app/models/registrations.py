from typing import Any, Dict
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.json_schema import SkipJsonSchema


class AppBaseModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    def model_dump(self, **kwargs) -> Dict[str, Any]:
        return super().model_dump(by_alias=True, exclude_none=True, **kwargs)


class IssuerRegistration(AppBaseModel):
    name: str = Field(json_schema_extra={"example": "Director of Petroleum Lands"})
    scope: str = Field(json_schema_extra={"example": "Petroleum and Natural Gas Act"})
    description: str = Field(
        json_schema_extra={
            "example": (
                "An officer or employee of the ministry who is designated as the "
                "Director of Petroleum Lands by the minister."
            )
        }
    )
    multikey: SkipJsonSchema[str] = Field(
        None,
        json_schema_extra={
            "example": "z6MkkuJkRuYpHkycUYUnBmUzN5cerBjdhDFC3tEBXfSD6Zr8"
        },
    )


class RelatedResources(AppBaseModel):
    context: str = Field(
        json_schema_extra={
            "example": (
                "https://bcgov.github.io/digital-trust-toolkit/contexts/"
                "BCPetroleumAndNaturalGasTitle/v1.jsonld"
            )
        }
    )
    legalAct: str = Field(
        None,
        json_schema_extra={
            "example": (
                "https://www.bclaws.gov.bc.ca/civix/document/id/complete/"
                "statreg/00_96361_01"
            )
        },
    )
    governance: str = Field(
        None,
        json_schema_extra={
            "example": (
                "https://bcgov.github.io/digital-trust-toolkit/docs/governance/"
                "pilots/bc-petroleum-and-natural-gas-title"
            )
        },
    )


class CorePaths(AppBaseModel):
    entityId: str = Field(
        json_schema_extra={"example": "$.credentialSubject.issuedToParty.registeredId"}
    )
    cardinalityId: str = Field(
        json_schema_extra={"example": "$.credentialSubject.titleNumber"}
    )


class CredentialRegistration(AppBaseModel):
    type: str = Field("BCPetroleumAndNaturalGasTitleCredential")
    version: str = Field(json_schema_extra={"example": "1.0"})
    issuer: str = Field(json_schema_extra={"example": "did:web:"})
    corePaths: CorePaths = Field()
    subjectType: str = Field(
        None, json_schema_extra={"example": "PetroleumAndNaturalGasTitle"}
    )
    subjectPaths: Dict[str, str] = Field(
        json_schema_extra={
            "example": {
                "titleType": "$.credentialSubject.titleType",
                "titleNumber": "$.credentialSubject.titleNumber",
                "originType": "$.credentialSubject.originType",
                "originNumber": "$.credentialSubject.originNumber",
                "caveats": "$.credentialSubject.caveats",
            }
        }
    )
    additionalType: str = Field(
        None, json_schema_extra={"example": "DigitalConformityCredential"}
    )
    additionalPaths: Dict[str, str] = Field(
        None,
        json_schema_extra={
            "example": {
                "wells": "$.credentialSubject.assessment[0].assessedFacility",
                "tracts": "$.credentialSubject.assessment[0].assessedProduct",
            }
        },
    )
    relatedResources: RelatedResources = Field()

    @field_validator("additionalType")
    @classmethod
    def validate_untp_type(cls, value):
        if value not in ["DigitalConformityCredential"]:
            raise ValueError(f"Unsupported UNTP type {value}.")
        return value

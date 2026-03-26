from typing import Dict, Any

from pydantic import BaseModel, ConfigDict, Field


class PublicationBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    def model_dump(self, **kwargs) -> Dict[str, Any]:
        return super().model_dump(by_alias=True, exclude_none=True, **kwargs)


class PublicationCredential(PublicationBase):
    type: str = Field(
        json_schema_extra={"example": "BCPetroleumAndNaturalGasTitleCredential"}
    )
    validFrom: str = Field(
        None, json_schema_extra={"example": "2024-11-11T00:00:00Z"}
    )
    validUntil: str = Field(
        None, json_schema_extra={"example": "2025-11-11T00:00:00Z"}
    )
    credentialSubject: dict = Field(
        json_schema_extra={
            "example": {
                "titleType": "NaturalGasLease",
                "titleNumber": "65338",
                "originType": "DrillingLicense",
                "originNumber": "42566",
            }
        }
    )


class PublicationOptions(PublicationBase):
    entityId: str = Field(json_schema_extra={"example": "A0131571"})
    credentialId: str = Field(
        None,
        json_schema_extra={"example": "550e8400-e29b-41d4-a716-446655440000"},
    )
    cardinalityId: str = Field(json_schema_extra={"example": "65338"})
    additionalData: dict = Field(
        None,
        json_schema_extra={
            "example": {
                "wells": [
                    {"type": ["Facility", "Well"], "id": "urn:code:uwi:", "name": ""}
                ],
                "tracts": [
                    {
                        "type": ["Product", "Tract"],
                        "id": "urn:code:hs:",
                        "name": "",
                        "zones": [],
                        "notes": [],
                        "rights": [],
                    }
                ],
            }
        },
    )


class Publication(PublicationBase):
    credential: PublicationCredential = Field()
    options: PublicationOptions = Field()

"""Loose Pydantic shapes for DCC issuance in the UNTP plugin (not JSON-Schema-derived).

For schema-aligned UNTP v0.7.0 models, see :mod:`app.models.untp.v0_7_0`.
"""

from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, AnyUrl
# from .codes import EncryptionMethod, HashMethod


class BaseModel(BaseModel):
    type: List[str] = None
    id: str = None
    name: str = None
    description: str = None

    def model_dump(self, **kwargs) -> Dict[str, Any]:
        return super().model_dump(by_alias=True, exclude_none=True, **kwargs)


class IdentifierScheme(BaseModel):
    type: List[str] = ["IdentifierScheme"]


class Identifier(BaseModel):
    type: List[str] = ["Identifier"]

    registeredId: str
    idScheme: IdentifierScheme


class Party(BaseModel):
    type: List[str] = ["Party"]

    registeredId: Optional[str] = None
    idScheme: Optional[IdentifierScheme] = None
    registrationCountry: Optional[IdentifierScheme] = None
    organisationWebsite: Optional[IdentifierScheme] = None
    industryCategory: Optional[IdentifierScheme] = None
    otherIdentifier: Optional[Identifier] = None


class BinaryFile(BaseModel):
    type: List[str] = ["BinaryFile"]

    fileName: str
    fileType: str  # https://mimetype.io/all-types
    file: str  # Base64


class Link(BaseModel):
    type: List[str] = ["Link"]

    linkURL: AnyUrl
    linkName: str
    linkType: str  # drawn from a controlled vocabulary


class SecureLink(BaseModel):
    type: List[str] = ["SecureLink"]

    linkUrl: AnyUrl
    linkName: str
    linkType: str
    hashDigest: str
    # hashMethod: HashMethod
    # encryptionMethod: EncryptionMethod


class Measure(BaseModel):
    type: List[str] = ["Measure"]

    value: float
    unit: str = Field(
        max_length=3
    )  # from https://vocabulary.uncefact.org/UnitMeasureCode


class Endorsement(BaseModel):
    type: str = "Endorsement"

    id: AnyUrl
    name: str
    trustmark: Optional[BinaryFile] = None
    issuingAuthority: Party
    accreditationCertification: Optional[Link] = None


class Standard(BaseModel):
    type: str = "Standard"

    id: AnyUrl
    name: str
    issuingParty: Party
    issueDate: str  # iso8601 datetime string


class Regulation(BaseModel):
    type: List[str] = ["Regulation"]

    id: str = None
    name: str = None
    jurisdictionCountry: (
        str  # countryCode from https://vocabulary.uncefact.org/CountryId
    )
    administeredBy: Party
    effectiveDate: str = None  # iso8601 datetime string


class Metric(BaseModel):
    type: str = "Metric"

    metricName: str
    metricValue: Measure
    accuracy: float


class Criterion(BaseModel):
    type: str = "Criterion"

    id: AnyUrl
    name: str
    thresholdValues: Metric


class Facility(BaseModel):
    type: List[str] = ["Facility"]

    # this looks wrongs
    id: AnyUrl  # The globally unique ID of the Party as a resolvable URL according to ISO 18975.
    name: str
    registeredId: Optional[str] = None
    idScheme: Optional[IdentifierScheme] = None
    IDverifiedByCAB: bool


class Product(BaseModel):
    type: List[str] = ["Product"]

    id: AnyUrl = None  # The globally unique ID of the Party as a resolvable URL according to ISO 18975.
    name: str = None
    registeredId: Optional[str] = None
    idScheme: Optional[IdentifierScheme] = None
    IDverifiedByCAB: bool = None


class ConformityAssessment(BaseModel):
    type: List[str] = ["ConformityAssessment"]

    id: str = None
    referenceStandard: Optional[Standard] = None  # defines the specification
    referenceRegulation: Optional[Regulation] = None  # defines the regulation
    assessmentCriterion: Optional[Criterion] = None  # defines the criteria
    declaredValues: Optional[List[Metric]] = None

    conformityTopic: str = None

    assessedProduct: Optional[List[Product]] = []
    assessedFacility: Optional[List[Facility]] = []


class ConformityAssessmentScheme(BaseModel):
    type: str = "ConformityAssessmentScheme"

    id: str
    name: str
    issuingParty: Optional[Party] = None
    issueDate: Optional[str] = None  # ISO8601 datetime string
    trustmark: Optional[BinaryFile] = None


class ConformityAttestation(BaseModel):
    type: List[str] = ["ConformityAttestation"]
    id: str = None
    assessorLevel: Optional[str] = None
    assessmentLevel: str = None
    attestationType: str = None
    issuedToParty: Party = None
    authorisations: Optional[Endorsement] = None
    conformityCertificate: Optional[SecureLink] = None
    auditableEvidence: Optional[SecureLink] = None
    scope: ConformityAssessmentScheme = None
    assessment: List[ConformityAssessment] = None


class AssessorLevelCode(str, Enum):
    Self = "Self"
    Commercial = "Commercial"
    Buyer = "Buyer"
    Membership = "Membership"
    Unspecified = "Unspecified"
    ThirdParty = "3rdParty"


class AssessmentLevelCode(str, Enum):
    GovtApproval = "GovtApproval"
    GlobalMLA = "GlobalMLA"
    Accredited = "Accredited"
    Verified = "Verified"
    Validated = "Validated"
    Unspecified = "Unspecified"


class AttestationType(str, Enum):
    Certification = "Certification"
    Declaration = "Declaration"
    Inspection = "Inspection"
    Testing = "Testing"
    Verification = "Verification"
    Validation = "Validation"
    Calibration = "Calibration"


class HashMethod(str, Enum):
    SHA256 = "SHA-256"
    SHA1 = "SHA-1"


class EncryptionMethod(str, Enum):
    NONE = "None"
    AES = "AES"


class ConformityTopicCode(str, Enum):
    Environment_Energy = "Environment.Energy"
    Environment_Emissions = "Environment.Emissions"
    Environment_Water = "Environment.Water"
    Environment_Waste = "Environment.Waste"
    Environment_Deforestation = "Environment.Deforestation"
    Environment_Biodiversity = "Environment.Biodiversity"
    Cirularity_Content = "Circularity.Content"
    Cirularity_Design = "Circularity.Design"
    Social_Labour = "Social.Labour"
    Social_Rights = "Social.Rights"
    Social_Safety = "Social.Safety"
    Social_Community = "Social.Community"
    Governance_Ethics = "Governance.Ethics"
    Governance_Compliance = "Governance.Compliance"
    Governance_Transparency = "Governance.Transparency"

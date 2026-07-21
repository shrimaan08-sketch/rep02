from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.eco import ECOClass, ECOStatus
from app.models.approval import ApprovalStepStatus
from app.models.user import UserRole
from app.schemas.user import UserRead


class ECOAffectedPartCreate(BaseModel):
    part_id: int
    from_revision_id: int | None = None
    to_revision_id: int | None = None
    change_description: str | None = None


class ECOAffectedPartRead(ECOAffectedPartCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    eco_id: int


class ECOCreate(BaseModel):
    title: str
    description: str
    eco_class: ECOClass = ECOClass.MAJOR
    source_ecr_id: int | None = None
    disposition_notes: str | None = None
    effectivity_date: str | None = None
    estimated_cost_impact: float | None = None
    affected_parts: list[ECOAffectedPartCreate] = []


class ECOUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    disposition_notes: str | None = None
    effectivity_date: str | None = None
    estimated_cost_impact: float | None = None


class ApprovalStepRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    eco_id: int
    sequence: int
    required_role: UserRole
    approver_id: int | None = None
    approver: UserRead | None = None
    status: ApprovalStepStatus
    comments: str | None = None
    signed_at: datetime | None = None
    signature_hash: str | None = None


class ApprovalDecision(BaseModel):
    approve: bool
    comments: str | None = None
    signature_pin: str  # re-authentication PIN/password confirmation for the e-signature


class ECORead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    eco_number: str
    title: str
    description: str
    eco_class: ECOClass
    status: ECOStatus
    source_ecr_id: int | None = None
    initiated_by_id: int
    initiated_by: UserRead | None = None
    disposition_notes: str | None = None
    effectivity_date: str | None = None
    estimated_cost_impact: float | None = None
    ai_summary: str | None = None
    qr_code_path: str | None = None
    barcode_path: str | None = None
    affected_parts: list[ECOAffectedPartRead] = []
    approval_chain: list[ApprovalStepRead] = []
    created_at: datetime
    updated_at: datetime


class ECOSummary(BaseModel):
    """Lighter-weight projection used for list views. Deliberately omits
    affected_parts / approval_chain so the list endpoint doesn't need to
    eager-load full nested approval chains (with approvers) for every row
    just to render a table."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    eco_number: str
    title: str
    eco_class: ECOClass
    status: ECOStatus
    initiated_by_id: int
    initiated_by: UserRead | None = None
    effectivity_date: str | None = None
    estimated_cost_impact: float | None = None
    created_at: datetime
    updated_at: datetime


class ImpactAnalysisResult(BaseModel):
    eco_id: int
    directly_affected_parts: list[int]
    upstream_assemblies: list[int]  # parent assemblies that consume an affected part anywhere in their BOM tree
    affected_boms: list[int]
    total_impacted_part_count: int
    estimated_total_cost_impact: float | None = None
    notes: list[str] = []

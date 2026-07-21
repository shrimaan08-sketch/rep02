from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.ecr import ECRPriority, ECRReasonCode, ECRStatus
from app.schemas.user import UserRead


class ECRBase(BaseModel):
    title: str
    description: str
    reason_code: ECRReasonCode
    priority: ECRPriority = ECRPriority.MEDIUM
    affected_part_id: int | None = None
    justification: str | None = None
    proposed_solution: str | None = None
    estimated_cost_impact: float | None = None


class ECRCreate(ECRBase):
    pass


class ECRUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    reason_code: ECRReasonCode | None = None
    priority: ECRPriority | None = None
    justification: str | None = None
    proposed_solution: str | None = None
    estimated_cost_impact: float | None = None


class ECRStatusChange(BaseModel):
    status: ECRStatus
    comments: str | None = None


class ECRRead(ECRBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ecr_number: str
    status: ECRStatus
    requested_by_id: int
    requested_by: UserRead | None = None
    ai_summary: str | None = None
    created_at: datetime
    updated_at: datetime

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.part import PartStatus, PartType


class PartRevisionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    part_id: int
    revision_code: str
    is_released: bool
    change_summary: str | None = None
    specification: str | None = None
    eco_id: int | None = None
    effective_date: str | None = None
    created_at: datetime


class PartBase(BaseModel):
    part_number: str = Field(min_length=1, max_length=50)
    name: str
    description: str | None = None
    part_type: PartType = PartType.COMPONENT
    unit_of_measure: str = "EA"
    standard_cost: float | None = None


class PartCreate(PartBase):
    initial_specification: str | None = None


class PartUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    part_type: PartType | None = None
    status: PartStatus | None = None
    unit_of_measure: str | None = None
    standard_cost: float | None = None


class PartRead(PartBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: PartStatus
    current_revision_id: int | None = None
    created_at: datetime
    updated_at: datetime


class PartWithRevisions(PartRead):
    revisions: list[PartRevisionRead] = []


class BOMItemBase(BaseModel):
    child_part_id: int
    child_revision_id: int | None = None
    quantity_per: float = 1.0
    reference_designator: str | None = None
    find_number: str | None = None
    notes: str | None = None


class BOMItemCreate(BOMItemBase):
    line_number: int | None = None  # auto-assigned if omitted


class BOMItemRead(BOMItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bom_id: int
    line_number: int
    child_part: PartRead | None = None


class BOMCreate(BaseModel):
    parent_part_id: int
    parent_revision_id: int
    name: str
    notes: str | None = None
    items: list[BOMItemCreate] = []


class BOMRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    parent_part_id: int
    parent_revision_id: int
    name: str
    notes: str | None = None
    is_active: bool
    items: list[BOMItemRead] = []
    created_at: datetime

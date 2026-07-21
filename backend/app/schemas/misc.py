from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.document import DocumentType, SupplierNotificationStatus

ItemT = TypeVar("ItemT")


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    document_group: str
    version: int
    file_name: str
    content_type: str | None = None
    size_bytes: int | None = None
    document_type: DocumentType
    checksum_sha256: str | None = None
    eco_id: int | None = None
    uploaded_by_id: int | None = None
    created_at: datetime


class SupplierCreate(BaseModel):
    name: str
    contact_email: EmailStr
    contact_name: str | None = None
    phone: str | None = None
    notes: str | None = None


class SupplierRead(SupplierCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class SupplierNotificationCreate(BaseModel):
    eco_id: int
    supplier_id: int
    message: str | None = None


class SupplierNotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    eco_id: int
    supplier_id: int
    supplier: SupplierRead | None = None
    status: SupplierNotificationStatus
    message: str | None = None
    acknowledgement_notes: str | None = None
    created_at: datetime


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: datetime
    actor_id: int | None = None
    actor_email: str | None = None
    action: str
    entity_type: str
    entity_id: str
    before_state: dict | None = None
    after_state: dict | None = None
    metadata_json: dict | None = None


class PaginatedResponse(BaseModel, Generic[ItemT]):
    total: int
    page: int
    page_size: int
    items: list[ItemT]

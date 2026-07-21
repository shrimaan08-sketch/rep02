import enum

from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, pg_enum


class DocumentType(str, enum.Enum):
    DRAWING = "drawing"
    SPECIFICATION = "specification"
    ECO_ATTACHMENT = "eco_attachment"
    TEST_REPORT = "test_report"
    OTHER = "other"


class Document(TimestampMixin, Base):
    """Versioned document/attachment. Each upload of the same logical
    document creates a new row sharing `document_group` and increments
    `version`, so full history is retained and nothing is overwritten."""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_group: Mapped[str] = mapped_column(String(64), index=True)  # stable id shared across versions
    version: Mapped[int] = mapped_column(Integer, default=1)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    document_type: Mapped[DocumentType] = mapped_column(pg_enum(DocumentType, "document_type"))
    checksum_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)

    eco_id: Mapped[int | None] = mapped_column(ForeignKey("ecos.id"), nullable=True)
    uploaded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    eco = relationship("ECO", back_populates="documents", foreign_keys=[eco_id])
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


class Supplier(TimestampMixin, Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    notifications = relationship("SupplierNotification", back_populates="supplier")


class SupplierNotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    ACKNOWLEDGED = "acknowledged"
    FAILED = "failed"


class SupplierNotification(TimestampMixin, Base):
    """Tracks the outbound notification of an ECO to an affected supplier,
    and their acknowledgement of the change."""

    __tablename__ = "supplier_notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    eco_id: Mapped[int] = mapped_column(ForeignKey("ecos.id"), nullable=False)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    status: Mapped[SupplierNotificationStatus] = mapped_column(
        pg_enum(SupplierNotificationStatus, "supplier_notification_status"),
        default=SupplierNotificationStatus.PENDING,
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    acknowledgement_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    eco = relationship("ECO", back_populates="supplier_notifications")
    supplier = relationship("Supplier", back_populates="notifications")

import enum

from sqlalchemy import Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class ECOStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    IMPLEMENTED = "implemented"   # engineering work complete, revisions released
    CLOSED = "closed"             # fully rolled out incl. supplier/production cutover
    CANCELLED = "cancelled"


class ECOClass(str, enum.Enum):
    """Change classification drives which approval workflow template is used."""
    MINOR = "minor"          # e.g. documentation clarification, no form/fit/function impact
    MAJOR = "major"          # form/fit/function impact, requires full cross-functional approval
    EMERGENCY = "emergency"  # expedited, e.g. safety stop-ship


class ECO(TimestampMixin, Base):
    """Engineering Change Order: the authorized, trackable unit of work that
    implements one or more part/BOM changes through a formal approval chain."""

    __tablename__ = "ecos"

    id: Mapped[int] = mapped_column(primary_key=True)
    eco_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    eco_class: Mapped[ECOClass] = mapped_column(Enum(ECOClass, name="eco_class"), default=ECOClass.MAJOR)
    status: Mapped[ECOStatus] = mapped_column(Enum(ECOStatus, name="eco_status"), default=ECOStatus.DRAFT, index=True)

    source_ecr_id: Mapped[int | None] = mapped_column(ForeignKey("ecrs.id"), nullable=True)
    initiated_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    disposition_notes: Mapped[str | None] = mapped_column(Text, nullable=True)  # what to do w/ existing stock/WIP
    effectivity_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    estimated_cost_impact: Mapped[float | None] = mapped_column(Float, nullable=True)

    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    qr_code_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    barcode_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    initiated_by = relationship("User", foreign_keys=[initiated_by_id])
    source_ecr = relationship("ECR", back_populates="eco", foreign_keys=[source_ecr_id])
    affected_parts = relationship("ECOAffectedPart", back_populates="eco", cascade="all, delete-orphan")
    approval_chain = relationship(
        "ApprovalStep", back_populates="eco", order_by="ApprovalStep.sequence", cascade="all, delete-orphan"
    )
    documents = relationship("Document", back_populates="eco")
    supplier_notifications = relationship("SupplierNotification", back_populates="eco", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<ECO {self.eco_number} status={self.status}>"


class ECOAffectedPart(Base):
    """Association of a part to an ECO, describing the nature of the change
    (e.g. new revision, obsoleted, new BOM) — this is what impact analysis
    is computed from."""

    __tablename__ = "eco_affected_parts"

    id: Mapped[int] = mapped_column(primary_key=True)
    eco_id: Mapped[int] = mapped_column(ForeignKey("ecos.id"), nullable=False)
    part_id: Mapped[int] = mapped_column(ForeignKey("parts.id"), nullable=False)
    from_revision_id: Mapped[int | None] = mapped_column(ForeignKey("part_revisions.id"), nullable=True)
    to_revision_id: Mapped[int | None] = mapped_column(ForeignKey("part_revisions.id"), nullable=True)
    change_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    eco = relationship("ECO", back_populates="affected_parts")
    part = relationship("Part", foreign_keys=[part_id])
    from_revision = relationship("PartRevision", foreign_keys=[from_revision_id])
    to_revision = relationship("PartRevision", foreign_keys=[to_revision_id])

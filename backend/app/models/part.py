import enum

from sqlalchemy import (
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class PartType(str, enum.Enum):
    RAW_MATERIAL = "raw_material"
    COMPONENT = "component"
    SUBASSEMBLY = "subassembly"
    ASSEMBLY = "assembly"
    FINISHED_GOOD = "finished_good"


class PartStatus(str, enum.Enum):
    IN_DESIGN = "in_design"
    ACTIVE = "active"
    OBSOLETE = "obsolete"
    PENDING_CHANGE = "pending_change"  # an ECO is currently affecting this part


class Part(TimestampMixin, Base):
    """A part/item master record. Revisions are tracked separately in
    PartRevision so full history of every released change is preserved."""

    __tablename__ = "parts"

    id: Mapped[int] = mapped_column(primary_key=True)
    part_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    part_type: Mapped[PartType] = mapped_column(Enum(PartType, name="part_type"), default=PartType.COMPONENT)
    status: Mapped[PartStatus] = mapped_column(Enum(PartStatus, name="part_status"), default=PartStatus.IN_DESIGN)
    # Intentionally NOT a schema-level ForeignKey: Part -> PartRevision and
    # PartRevision -> Part would form a circular FK dependency. Postgres can
    # resolve that via a deferred ALTER TABLE (use_alter=True), but SQLite
    # cannot add FK constraints post-creation, which breaks lightweight
    # SQLite-backed test/dev setups. The relationship below still gives us
    # ORM-level joins and eager loading; referential integrity for this
    # pointer is enforced in the service layer (part_service) instead.
    current_revision_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unit_of_measure: Mapped[str] = mapped_column(String(20), default="EA")
    standard_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    lifecycle_owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    revisions = relationship(
        "PartRevision", back_populates="part", foreign_keys="PartRevision.part_id",
        order_by="PartRevision.id", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_parts_status_type", "status", "part_type"),)

    def __repr__(self) -> str:
        return f"<Part {self.part_number} current_revision_id={self.current_revision_id}>"


class PartRevision(TimestampMixin, Base):
    """An immutable, released (or in-work) snapshot of a part's engineering
    definition. Every ECO that changes a part creates a new PartRevision."""

    __tablename__ = "part_revisions"

    id: Mapped[int] = mapped_column(primary_key=True)
    part_id: Mapped[int] = mapped_column(ForeignKey("parts.id"), nullable=False)
    revision_code: Mapped[str] = mapped_column(String(10), nullable=False)  # A, B, C... or 01, 02
    is_released: Mapped[bool] = mapped_column(default=False)
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    specification: Mapped[str | None] = mapped_column(Text, nullable=True)  # material, tolerance, drawing notes
    drawing_document_id: Mapped[int | None] = mapped_column(ForeignKey("documents.id"), nullable=True)
    eco_id: Mapped[int | None] = mapped_column(ForeignKey("ecos.id"), nullable=True)
    effective_date: Mapped[str | None] = mapped_column(String(20), nullable=True)

    part = relationship("Part", back_populates="revisions", foreign_keys=[part_id])

    __table_args__ = (UniqueConstraint("part_id", "revision_code", name="uq_part_revision_code"),)

    def __repr__(self) -> str:
        return f"<PartRevision {self.revision_code} part_id={self.part_id}>"


class BOM(TimestampMixin, Base):
    """Bill of Materials header, tied to a specific parent part revision."""

    __tablename__ = "boms"

    id: Mapped[int] = mapped_column(primary_key=True)
    parent_part_id: Mapped[int] = mapped_column(ForeignKey("parts.id"), nullable=False)
    parent_revision_id: Mapped[int] = mapped_column(ForeignKey("part_revisions.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)

    parent_part = relationship("Part", foreign_keys=[parent_part_id])
    parent_revision = relationship("PartRevision", foreign_keys=[parent_revision_id])
    items = relationship("BOMItem", back_populates="bom", cascade="all, delete-orphan", order_by="BOMItem.line_number")


class BOMItem(TimestampMixin, Base):
    """A single line in a BOM: a child part/revision consumed by the parent,
    at a given quantity-per and reference designator."""

    __tablename__ = "bom_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    bom_id: Mapped[int] = mapped_column(ForeignKey("boms.id"), nullable=False)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    child_part_id: Mapped[int] = mapped_column(ForeignKey("parts.id"), nullable=False)
    child_revision_id: Mapped[int | None] = mapped_column(ForeignKey("part_revisions.id"), nullable=True)
    quantity_per: Mapped[float] = mapped_column(Float, default=1.0)
    reference_designator: Mapped[str | None] = mapped_column(String(120), nullable=True)
    find_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    bom = relationship("BOM", back_populates="items")
    child_part = relationship("Part", foreign_keys=[child_part_id])
    child_revision = relationship("PartRevision", foreign_keys=[child_revision_id])

    __table_args__ = (UniqueConstraint("bom_id", "line_number", name="uq_bom_line_number"),)

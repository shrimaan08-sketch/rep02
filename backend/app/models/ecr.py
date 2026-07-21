import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class ECRStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"        # approved for conversion into an ECO
    REJECTED = "rejected"
    CONVERTED = "converted"      # an ECO has been created from this ECR
    CANCELLED = "cancelled"


class ECRPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"  # e.g. safety issue, line-down


class ECRReasonCode(str, enum.Enum):
    DESIGN_IMPROVEMENT = "design_improvement"
    COST_REDUCTION = "cost_reduction"
    QUALITY_ISSUE = "quality_issue"
    SUPPLIER_CHANGE = "supplier_change"
    REGULATORY_COMPLIANCE = "regulatory_compliance"
    CUSTOMER_REQUEST = "customer_request"
    OBSOLESCENCE = "obsolescence"
    SAFETY = "safety"
    OTHER = "other"


class ECR(TimestampMixin, Base):
    """Engineering Change Request: the initial proposal for a change, before
    it is authorized and converted into a formal ECO."""

    __tablename__ = "ecrs"

    id: Mapped[int] = mapped_column(primary_key=True)
    ecr_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reason_code: Mapped[ECRReasonCode] = mapped_column(Enum(ECRReasonCode, name="ecr_reason_code"))
    priority: Mapped[ECRPriority] = mapped_column(Enum(ECRPriority, name="ecr_priority"), default=ECRPriority.MEDIUM)
    status: Mapped[ECRStatus] = mapped_column(Enum(ECRStatus, name="ecr_status"), default=ECRStatus.DRAFT, index=True)

    requested_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    affected_part_id: Mapped[int | None] = mapped_column(ForeignKey("parts.id"), nullable=True)

    justification: Mapped[str | None] = mapped_column(Text, nullable=True)
    proposed_solution: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_cost_impact: Mapped[float | None] = mapped_column(Integer, nullable=True)

    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)  # AI-generated plain-English summary

    requested_by = relationship("User", foreign_keys=[requested_by_id])
    affected_part = relationship("Part", foreign_keys=[affected_part_id])
    eco = relationship("ECO", back_populates="source_ecr", uselist=False)

    def __repr__(self) -> str:
        return f"<ECR {self.ecr_number} status={self.status}>"

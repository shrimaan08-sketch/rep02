import enum

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, pg_enum
from app.models.user import UserRole


class ApprovalStepStatus(str, enum.Enum):
    PENDING = "pending"       # waiting for prior steps to complete
    ACTIVE = "active"         # currently awaiting this approver's action
    APPROVED = "approved"
    REJECTED = "rejected"
    SKIPPED = "skipped"       # e.g. not applicable, bypassed by admin override


class ApprovalStep(TimestampMixin, Base):
    """One node in an ECO's sequential (or parallel, via matching `sequence`)
    approval chain. Each role (Engineering, Quality, Manufacturing,
    Procurement, Management) signs off in turn; a rejection halts the chain.
    """

    __tablename__ = "approval_steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    eco_id: Mapped[int] = mapped_column(ForeignKey("ecos.id"), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)  # steps with same seq = parallel approval
    required_role: Mapped[UserRole] = mapped_column(pg_enum(UserRole, "approval_required_role"))
    approver_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)  # assigned once active
    status: Mapped[ApprovalStepStatus] = mapped_column(
        pg_enum(ApprovalStepStatus, "approval_step_status"), default=ApprovalStepStatus.PENDING
    )
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Digital signature capture ---
    signed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    signature_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)  # SHA-256 of signed payload
    signed_ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)

    eco = relationship("ECO", back_populates="approval_chain")
    approver = relationship("User", back_populates="approval_steps", foreign_keys=[approver_id])

    def __repr__(self) -> str:
        return f"<ApprovalStep eco={self.eco_id} seq={self.sequence} role={self.required_role} status={self.status}>"

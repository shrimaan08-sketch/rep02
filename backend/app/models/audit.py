from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AuditLog(Base):
    """Append-only audit trail. Rows are never updated or deleted from the
    application layer — every state-changing action across the platform
    (ECR/ECO transitions, approvals, part/BOM edits, logins) writes exactly
    one row here, satisfying traceability requirements common in regulated
    manufacturing environments (e.g. ISO 9001, AS9100, FDA 21 CFR Part 11)."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)  # denormalized, survives user delete
    action: Mapped[str] = mapped_column(String(120), index=True)  # e.g. "eco.status_changed"
    entity_type: Mapped[str] = mapped_column(String(60), index=True)  # e.g. "ECO", "Part", "ECR"
    entity_id: Mapped[str] = mapped_column(String(60), index=True)
    before_state: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after_state: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)

    actor = relationship("User", foreign_keys=[actor_id])

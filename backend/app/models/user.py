import enum

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, pg_enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"                 # full system access
    ENGINEER = "engineer"           # creates ECRs/ECOs, edits parts/BOMs
    QUALITY = "quality"             # quality approval authority
    MANUFACTURING = "manufacturing" # manufacturing/ops approval authority
    PROCUREMENT = "procurement"     # supplier notification & sourcing approval
    APPROVER = "approver"           # generic cross-functional approver / management
    VIEWER = "viewer"               # read-only


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(pg_enum(UserRole, "user_role"), default=UserRole.VIEWER)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True)
    title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    signature_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    approval_steps = relationship("ApprovalStep", back_populates="approver", foreign_keys="ApprovalStep.approver_id")

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"

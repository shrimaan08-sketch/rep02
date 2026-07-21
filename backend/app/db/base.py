import enum
from datetime import datetime
from typing import Type

from sqlalchemy import DateTime, Enum, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def pg_enum(enum_cls: Type[enum.Enum], name: str) -> Enum:
    """Build a Postgres ENUM column type whose stored labels are the enum
    *values*, not the member *names*.

    The Alembic migrations create every enum type from the lowercase values
    (e.g. ``'admin'``, ``'engineer'``). Without ``values_callable`` SQLAlchemy
    persists the member *name* instead (``'ADMIN'``), which the database enum
    does not contain — producing
    ``invalid input value for enum <type>: "ADMIN"`` on insert. Forcing the
    values here keeps the ORM and the database labels in exact agreement in
    both directions (write and read).
    """
    return Enum(enum_cls, name=name, values_callable=lambda cls: [m.value for m in cls])


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

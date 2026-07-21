"""widen ecrs.estimated_cost_impact from Integer to Float

Revision ID: 0002_ecr_cost_impact_to_float
Revises: 0001_initial_schema
Create Date: 2026-01-02 00:00:00

The ECR schema (ECRCreate/ECRRead) and the sibling ECO field both model
``estimated_cost_impact`` as a float, but the initial ECR column was created
as Integer. That silently truncated fractional cost estimates on write
(e.g. 1234.56 -> 1234). Widen the column to double precision so the stored
value matches what the API accepts and returns. Widening Integer -> Float is
a lossless, non-destructive change.
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_ecr_cost_impact_to_float"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "ecrs",
        "estimated_cost_impact",
        existing_type=sa.Integer(),
        type_=sa.Float(),
        existing_nullable=True,
        postgresql_using="estimated_cost_impact::double precision",
    )


def downgrade() -> None:
    op.alter_column(
        "ecrs",
        "estimated_cost_impact",
        existing_type=sa.Float(),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using="estimated_cost_impact::integer",
    )

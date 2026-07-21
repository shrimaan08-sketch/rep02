"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-01-01 00:00:00

Hand-authored initial migration that creates the full Revion schema. It is
kept deterministic and driver-agnostic (uses sa.Enum with explicit names so
Postgres enum types are created exactly once). Table creation is ordered to
satisfy foreign-key dependencies; the handful of cross-cyclic FKs
(part_revisions -> ecos/documents, which in turn reference back toward
parts) are added with ALTER TABLE after both tables exist.
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


# --- Enum type definitions (created once, reused across tables) ---
user_role = sa.Enum(
    "admin", "engineer", "quality", "manufacturing", "procurement", "approver", "viewer",
    name="user_role",
)
part_type = sa.Enum(
    "raw_material", "component", "subassembly", "assembly", "finished_good", name="part_type",
)
part_status = sa.Enum("in_design", "active", "obsolete", "pending_change", name="part_status")
ecr_status = sa.Enum(
    "draft", "submitted", "under_review", "approved", "rejected", "converted", "cancelled",
    name="ecr_status",
)
ecr_priority = sa.Enum("low", "medium", "high", "critical", name="ecr_priority")
ecr_reason_code = sa.Enum(
    "design_improvement", "cost_reduction", "quality_issue", "supplier_change",
    "regulatory_compliance", "customer_request", "obsolescence", "safety", "other",
    name="ecr_reason_code",
)
eco_status = sa.Enum(
    "draft", "pending_approval", "in_review", "approved", "rejected", "implemented",
    "closed", "cancelled", name="eco_status",
)
eco_class = sa.Enum("minor", "major", "emergency", name="eco_class")
approval_required_role = sa.Enum(
    "admin", "engineer", "quality", "manufacturing", "procurement", "approver", "viewer",
    name="approval_required_role",
)
approval_step_status = sa.Enum(
    "pending", "active", "approved", "rejected", "skipped", name="approval_step_status",
)
document_type = sa.Enum(
    "drawing", "specification", "eco_attachment", "test_report", "other", name="document_type",
)
supplier_notification_status = sa.Enum(
    "pending", "sent", "acknowledged", "failed", name="supplier_notification_status",
)


def upgrade() -> None:
    bind = op.get_bind()

    # ---- users ----
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=True),
        sa.Column("department", sa.String(120), nullable=True),
        sa.Column("title", sa.String(120), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("signature_image_path", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ---- parts ----
    op.create_table(
        "parts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("part_number", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("part_type", part_type, nullable=True),
        sa.Column("status", part_status, nullable=True),
        sa.Column("current_revision_id", sa.Integer(), nullable=True),
        sa.Column("unit_of_measure", sa.String(20), nullable=True),
        sa.Column("standard_cost", sa.Float(), nullable=True),
        sa.Column("lifecycle_owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_parts_part_number", "parts", ["part_number"], unique=True)
    op.create_index("ix_parts_status_type", "parts", ["status", "part_type"])

    # ---- part_revisions (FKs to ecos/documents added later) ----
    op.create_table(
        "part_revisions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("part_id", sa.Integer(), sa.ForeignKey("parts.id"), nullable=False),
        sa.Column("revision_code", sa.String(10), nullable=False),
        sa.Column("is_released", sa.Boolean(), nullable=True),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("specification", sa.Text(), nullable=True),
        sa.Column("drawing_document_id", sa.Integer(), nullable=True),
        sa.Column("eco_id", sa.Integer(), nullable=True),
        sa.Column("effective_date", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("part_id", "revision_code", name="uq_part_revision_code"),
    )

    # ---- ecrs ----
    op.create_table(
        "ecrs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ecr_number", sa.String(30), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("reason_code", ecr_reason_code, nullable=True),
        sa.Column("priority", ecr_priority, nullable=True),
        sa.Column("status", ecr_status, nullable=True),
        sa.Column("requested_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("affected_part_id", sa.Integer(), sa.ForeignKey("parts.id"), nullable=True),
        sa.Column("justification", sa.Text(), nullable=True),
        sa.Column("proposed_solution", sa.Text(), nullable=True),
        sa.Column("estimated_cost_impact", sa.Integer(), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ecrs_ecr_number", "ecrs", ["ecr_number"], unique=True)
    op.create_index("ix_ecrs_status", "ecrs", ["status"])

    # ---- ecos ----
    op.create_table(
        "ecos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("eco_number", sa.String(30), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("eco_class", eco_class, nullable=True),
        sa.Column("status", eco_status, nullable=True),
        sa.Column("source_ecr_id", sa.Integer(), sa.ForeignKey("ecrs.id"), nullable=True),
        sa.Column("initiated_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("disposition_notes", sa.Text(), nullable=True),
        sa.Column("effectivity_date", sa.String(20), nullable=True),
        sa.Column("estimated_cost_impact", sa.Float(), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("qr_code_path", sa.String(500), nullable=True),
        sa.Column("barcode_path", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ecos_eco_number", "ecos", ["eco_number"], unique=True)
    op.create_index("ix_ecos_status", "ecos", ["status"])

    # ---- documents (FK to ecos) ----
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("document_group", sa.String(64), nullable=False),
        sa.Column("version", sa.Integer(), nullable=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("content_type", sa.String(120), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("document_type", document_type, nullable=True),
        sa.Column("checksum_sha256", sa.String(64), nullable=True),
        sa.Column("eco_id", sa.Integer(), sa.ForeignKey("ecos.id"), nullable=True),
        sa.Column("uploaded_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_documents_document_group", "documents", ["document_group"])

    # Now that ecos and documents exist, add the deferred FKs on part_revisions.
    op.create_foreign_key(
        "fk_part_revisions_eco_id", "part_revisions", "ecos", ["eco_id"], ["id"],
    )
    op.create_foreign_key(
        "fk_part_revisions_drawing_document_id", "part_revisions", "documents",
        ["drawing_document_id"], ["id"],
    )

    # ---- boms ----
    op.create_table(
        "boms",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("parent_part_id", sa.Integer(), sa.ForeignKey("parts.id"), nullable=False),
        sa.Column("parent_revision_id", sa.Integer(), sa.ForeignKey("part_revisions.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ---- bom_items ----
    op.create_table(
        "bom_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bom_id", sa.Integer(), sa.ForeignKey("boms.id"), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("child_part_id", sa.Integer(), sa.ForeignKey("parts.id"), nullable=False),
        sa.Column("child_revision_id", sa.Integer(), sa.ForeignKey("part_revisions.id"), nullable=True),
        sa.Column("quantity_per", sa.Float(), nullable=True),
        sa.Column("reference_designator", sa.String(120), nullable=True),
        sa.Column("find_number", sa.String(20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("bom_id", "line_number", name="uq_bom_line_number"),
    )

    # ---- eco_affected_parts ----
    op.create_table(
        "eco_affected_parts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("eco_id", sa.Integer(), sa.ForeignKey("ecos.id"), nullable=False),
        sa.Column("part_id", sa.Integer(), sa.ForeignKey("parts.id"), nullable=False),
        sa.Column("from_revision_id", sa.Integer(), sa.ForeignKey("part_revisions.id"), nullable=True),
        sa.Column("to_revision_id", sa.Integer(), sa.ForeignKey("part_revisions.id"), nullable=True),
        sa.Column("change_description", sa.Text(), nullable=True),
    )

    # ---- approval_steps ----
    op.create_table(
        "approval_steps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("eco_id", sa.Integer(), sa.ForeignKey("ecos.id"), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("required_role", approval_required_role, nullable=True),
        sa.Column("approver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", approval_step_status, nullable=True),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("signature_hash", sa.String(128), nullable=True),
        sa.Column("signed_ip_address", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ---- suppliers ----
    op.create_table(
        "suppliers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("contact_email", sa.String(255), nullable=False),
        sa.Column("contact_name", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ---- supplier_notifications ----
    op.create_table(
        "supplier_notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("eco_id", sa.Integer(), sa.ForeignKey("ecos.id"), nullable=False),
        sa.Column("supplier_id", sa.Integer(), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("status", supplier_notification_status, nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("acknowledgement_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ---- audit_logs ----
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("actor_email", sa.String(255), nullable=True),
        sa.Column("action", sa.String(120), nullable=True),
        sa.Column("entity_type", sa.String(60), nullable=True),
        sa.Column("entity_id", sa.String(60), nullable=True),
        sa.Column("before_state", sa.JSON(), nullable=True),
        sa.Column("after_state", sa.JSON(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
    )
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])


def downgrade() -> None:
    # Drop in reverse dependency order.
    op.drop_table("audit_logs")
    op.drop_table("supplier_notifications")
    op.drop_table("suppliers")
    op.drop_table("approval_steps")
    op.drop_table("eco_affected_parts")
    op.drop_table("bom_items")
    op.drop_table("boms")
    op.drop_constraint("fk_part_revisions_drawing_document_id", "part_revisions", type_="foreignkey")
    op.drop_constraint("fk_part_revisions_eco_id", "part_revisions", type_="foreignkey")
    op.drop_table("documents")
    op.drop_table("ecos")
    op.drop_table("ecrs")
    op.drop_table("part_revisions")
    op.drop_table("parts")
    op.drop_table("users")

    # Drop enum types explicitly (Postgres doesn't cascade these with tables).
    for enum_type in (
        supplier_notification_status, document_type, approval_step_status,
        approval_required_role, eco_class, eco_status, ecr_reason_code,
        ecr_priority, ecr_status, part_status, part_type, user_role,
    ):
        enum_type.drop(op.get_bind(), checkfirst=True)

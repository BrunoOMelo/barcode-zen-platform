"""Create audit_logs table for observability and governance

Revision ID: 20260426_0007
Revises: 20260331_0006
Create Date: 2026-04-26 19:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260426_0007"
down_revision: Union[str, Sequence[str], None] = "20260331_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("request_id", sa.String(length=120), nullable=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("method", sa.String(length=10), nullable=True),
        sa.Column("path", sa.String(length=255), nullable=True),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("outcome", sa.String(length=32), nullable=True),
        sa.Column("error_code", sa.String(length=80), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_tenant_id"), "audit_logs", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_user_id"), "audit_logs", ["user_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_request_id"), "audit_logs", ["request_id"], unique=False)
    op.execute("CREATE INDEX ix_audit_logs_tenant_id_created_at_desc ON audit_logs (tenant_id, created_at DESC)")
    op.execute("CREATE INDEX ix_audit_logs_user_id_created_at_desc ON audit_logs (user_id, created_at DESC)")
    op.execute("CREATE INDEX ix_audit_logs_event_type_created_at_desc ON audit_logs (event_type, created_at DESC)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_event_type_created_at_desc")
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_user_id_created_at_desc")
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_tenant_id_created_at_desc")
    op.drop_index(op.f("ix_audit_logs_request_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_user_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_tenant_id"), table_name="audit_logs")
    op.drop_table("audit_logs")

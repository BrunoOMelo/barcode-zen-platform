"""Create tenants and user tenant memberships

Revision ID: 20260308_0002
Revises: 20260307_0001
Create Date: 2026-03-08 10:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260308_0002"
down_revision: Union[str, Sequence[str], None] = "20260307_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("legal_name", sa.String(length=180), nullable=True),
        sa.Column("tax_id", sa.String(length=32), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_tenants_slug"), "tenants", ["slug"], unique=False)

    op.create_table(
        "user_tenant_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False, server_default="member"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.CheckConstraint(
            "role IN ('owner','admin','manager','member','viewer')",
            name="ck_user_tenant_memberships_role",
        ),
        sa.CheckConstraint(
            "status IN ('active','invited','suspended','removed')",
            name="ck_user_tenant_memberships_status",
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "tenant_id", name="uq_user_tenant_membership_user_tenant"),
    )
    op.create_index(op.f("ix_user_tenant_memberships_user_id"), "user_tenant_memberships", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_user_tenant_memberships_tenant_id"),
        "user_tenant_memberships",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        "uq_user_default_tenant_membership",
        "user_tenant_memberships",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("is_default = true"),
    )


def downgrade() -> None:
    op.drop_index("uq_user_default_tenant_membership", table_name="user_tenant_memberships")
    op.drop_index(op.f("ix_user_tenant_memberships_tenant_id"), table_name="user_tenant_memberships")
    op.drop_index(op.f("ix_user_tenant_memberships_user_id"), table_name="user_tenant_memberships")
    op.drop_table("user_tenant_memberships")

    op.drop_index(op.f("ix_tenants_slug"), table_name="tenants")
    op.drop_table("tenants")

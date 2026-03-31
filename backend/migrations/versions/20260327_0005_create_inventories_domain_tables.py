"""Create inventories domain tables

Revision ID: 20260327_0005
Revises: 20260327_0004
Create Date: 2026-03-27 15:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260327_0005"
down_revision: Union[str, Sequence[str], None] = "20260327_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "inventories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="created"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('created', 'counting', 'recounting', 'review', 'finished')",
            name="ck_inventories_status",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inventories_tenant_id", "inventories", ["tenant_id"], unique=False)
    op.create_index("ix_inventories_created_by", "inventories", ["created_by"], unique=False)
    op.create_index("ix_inventories_tenant_id_status", "inventories", ["tenant_id", "status"], unique=False)
    op.execute(
        "CREATE INDEX ix_inventories_tenant_id_created_at_desc ON inventories (tenant_id, created_at DESC)"
    )

    op.create_table(
        "inventory_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inventory_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("system_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("counted_quantity", sa.Integer(), nullable=True),
        sa.Column("difference", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("counted_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("counted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.CheckConstraint("system_quantity >= 0", name="ck_inventory_items_system_quantity_non_negative"),
        sa.CheckConstraint(
            "(counted_quantity IS NULL) OR (counted_quantity >= 0)",
            name="ck_inventory_items_counted_quantity_non_negative",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'counted', 'divergent')",
            name="ck_inventory_items_status",
        ),
        sa.ForeignKeyConstraint(
            ["inventory_id"],
            ["inventories.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "inventory_id",
            "product_id",
            name="uq_inventory_items_inventory_product",
        ),
    )
    op.create_index("ix_inventory_items_inventory_id", "inventory_items", ["inventory_id"], unique=False)
    op.create_index("ix_inventory_items_tenant_id", "inventory_items", ["tenant_id"], unique=False)
    op.create_index("ix_inventory_items_product_id", "inventory_items", ["product_id"], unique=False)
    op.create_index("ix_inventory_items_tenant_id_status", "inventory_items", ["tenant_id", "status"], unique=False)

    op.create_table(
        "inventory_counts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inventory_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inventory_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("counted_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("count_type", sa.String(length=20), nullable=False, server_default="first"),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.CheckConstraint("quantity >= 0", name="ck_inventory_counts_quantity_non_negative"),
        sa.CheckConstraint(
            "count_type IN ('first', 'recount')",
            name="ck_inventory_counts_count_type",
        ),
        sa.ForeignKeyConstraint(
            ["inventory_id"],
            ["inventories.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["inventory_item_id"],
            ["inventory_items.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inventory_counts_inventory_id", "inventory_counts", ["inventory_id"], unique=False)
    op.create_index("ix_inventory_counts_inventory_item_id", "inventory_counts", ["inventory_item_id"], unique=False)
    op.create_index("ix_inventory_counts_tenant_id", "inventory_counts", ["tenant_id"], unique=False)
    op.create_index("ix_inventory_counts_product_id", "inventory_counts", ["product_id"], unique=False)
    op.create_index("ix_inventory_counts_counted_by", "inventory_counts", ["counted_by"], unique=False)
    op.create_index(
        "ix_inventory_counts_tenant_id_inventory_id",
        "inventory_counts",
        ["tenant_id", "inventory_id"],
        unique=False,
    )
    op.execute(
        "CREATE INDEX ix_inventory_counts_inventory_id_created_at_desc ON inventory_counts (inventory_id, created_at DESC)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_inventory_counts_inventory_id_created_at_desc")
    op.drop_index("ix_inventory_counts_tenant_id_inventory_id", table_name="inventory_counts")
    op.drop_index("ix_inventory_counts_counted_by", table_name="inventory_counts")
    op.drop_index("ix_inventory_counts_product_id", table_name="inventory_counts")
    op.drop_index("ix_inventory_counts_tenant_id", table_name="inventory_counts")
    op.drop_index("ix_inventory_counts_inventory_item_id", table_name="inventory_counts")
    op.drop_index("ix_inventory_counts_inventory_id", table_name="inventory_counts")
    op.drop_table("inventory_counts")

    op.drop_index("ix_inventory_items_tenant_id_status", table_name="inventory_items")
    op.drop_index("ix_inventory_items_product_id", table_name="inventory_items")
    op.drop_index("ix_inventory_items_tenant_id", table_name="inventory_items")
    op.drop_index("ix_inventory_items_inventory_id", table_name="inventory_items")
    op.drop_table("inventory_items")

    op.execute("DROP INDEX IF EXISTS ix_inventories_tenant_id_created_at_desc")
    op.drop_index("ix_inventories_tenant_id_status", table_name="inventories")
    op.drop_index("ix_inventories_created_by", table_name="inventories")
    op.drop_index("ix_inventories_tenant_id", table_name="inventories")
    op.drop_table("inventories")

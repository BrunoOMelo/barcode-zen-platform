"""Expand products domain fields

Revision ID: 20260327_0004
Revises: 20260327_0003
Create Date: 2026-03-27 12:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260327_0004"
down_revision: Union[str, Sequence[str], None] = "20260327_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("sku", sa.String(length=64), nullable=True))
    op.add_column("products", sa.Column("category", sa.String(length=80), nullable=True))
    op.add_column(
        "products",
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column("products", sa.Column("cost", sa.Numeric(precision=10, scale=2), nullable=True))

    op.execute("UPDATE products SET sku = UPPER(TRIM(barcode)) WHERE sku IS NULL")
    op.alter_column("products", "sku", nullable=False)

    op.create_unique_constraint("uq_products_tenant_sku", "products", ["tenant_id", "sku"])
    op.create_index("ix_products_tenant_id_active", "products", ["tenant_id", "active"], unique=False)
    op.create_index("ix_products_tenant_id_category", "products", ["tenant_id", "category"], unique=False)
    op.execute(
        "CREATE INDEX ix_products_tenant_id_created_at_desc ON products (tenant_id, created_at DESC)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_products_tenant_id_created_at_desc")
    op.drop_index("ix_products_tenant_id_category", table_name="products")
    op.drop_index("ix_products_tenant_id_active", table_name="products")
    op.drop_constraint("uq_products_tenant_sku", "products", type_="unique")
    op.drop_column("products", "cost")
    op.drop_column("products", "active")
    op.drop_column("products", "category")
    op.drop_column("products", "sku")

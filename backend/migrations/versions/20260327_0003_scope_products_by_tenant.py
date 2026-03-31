"""Scope products by tenant

Revision ID: 20260327_0003
Revises: 20260308_0002
Create Date: 2026-03-27 10:00:00
"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260327_0003"
down_revision: Union[str, Sequence[str], None] = "20260308_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _find_global_barcode_unique_constraints(connection: sa.Connection) -> list[str]:
    inspector = sa.inspect(connection)
    constraint_names: list[str] = []

    for constraint in inspector.get_unique_constraints("products"):
        columns = constraint.get("column_names") or []
        name = constraint.get("name")
        if name and len(columns) == 1 and columns[0] == "barcode":
            constraint_names.append(name)

    return constraint_names


def upgrade() -> None:
    op.add_column("products", sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_products_tenant_id",
        "products",
        "tenants",
        ["tenant_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    connection = op.get_bind()
    products_without_tenant = connection.execute(
        sa.text("SELECT COUNT(*) FROM products WHERE tenant_id IS NULL")
    ).scalar_one()

    if products_without_tenant > 0:
        tenant_id = connection.execute(sa.text("SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1")).scalar()

        if tenant_id is None:
            tenant_id = uuid.uuid4()
            connection.execute(
                sa.text(
                    """
                    INSERT INTO tenants (id, name, slug, legal_name, tax_id, is_active, created_at, updated_at)
                    VALUES (:id, :name, :slug, :legal_name, :tax_id, true, NOW(), NOW())
                    """
                ),
                {
                    "id": tenant_id,
                    "name": "Tenant legado",
                    "slug": "tenant-legado",
                    "legal_name": "Tenant legado",
                    "tax_id": None,
                },
            )

        connection.execute(
            sa.text("UPDATE products SET tenant_id = :tenant_id WHERE tenant_id IS NULL"),
            {"tenant_id": tenant_id},
        )

    op.alter_column("products", "tenant_id", nullable=False)

    inspector = sa.inspect(connection)
    index_names = {index["name"] for index in inspector.get_indexes("products")}
    if "ix_products_name" in index_names:
        op.drop_index("ix_products_name", table_name="products")
    if "ix_products_barcode" in index_names:
        op.drop_index("ix_products_barcode", table_name="products")

    for constraint_name in _find_global_barcode_unique_constraints(connection):
        op.drop_constraint(constraint_name, "products", type_="unique")

    op.create_index("ix_products_tenant_id", "products", ["tenant_id"], unique=False)
    op.create_index("ix_products_tenant_id_name", "products", ["tenant_id", "name"], unique=False)
    op.create_unique_constraint("uq_products_tenant_barcode", "products", ["tenant_id", "barcode"])


def downgrade() -> None:
    op.drop_constraint("uq_products_tenant_barcode", "products", type_="unique")
    op.drop_index("ix_products_tenant_id_name", table_name="products")
    op.drop_index("ix_products_tenant_id", table_name="products")
    op.drop_constraint("fk_products_tenant_id", "products", type_="foreignkey")
    op.drop_column("products", "tenant_id")

    op.create_unique_constraint("uq_products_barcode", "products", ["barcode"])
    op.create_index(op.f("ix_products_name"), "products", ["name"], unique=False)
    op.create_index(op.f("ix_products_barcode"), "products", ["barcode"], unique=False)

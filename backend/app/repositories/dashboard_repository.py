import uuid

from sqlalchemy import case, func, literal, select
from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.inventory_item import InventoryItem
from app.models.product import Product


class DashboardRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def count_inventories_by_status(self, *, tenant_id: uuid.UUID, status: str) -> int:
        stmt = (
            select(func.count(Inventory.id))
            .where(
                Inventory.tenant_id == tenant_id,
                Inventory.status == status,
            )
        )
        return int(self.db.scalar(stmt) or 0)

    def count_active_inventories(self, *, tenant_id: uuid.UUID) -> int:
        stmt = (
            select(func.count(Inventory.id))
            .where(
                Inventory.tenant_id == tenant_id,
                Inventory.status != "finished",
            )
        )
        return int(self.db.scalar(stmt) or 0)

    def count_active_products(self, *, tenant_id: uuid.UUID) -> int:
        stmt = (
            select(func.count(Product.id))
            .where(
                Product.tenant_id == tenant_id,
                Product.active.is_(True),
            )
        )
        return int(self.db.scalar(stmt) or 0)

    def count_counted_products_from_open_inventories(self, *, tenant_id: uuid.UUID) -> int:
        stmt = (
            select(func.count(InventoryItem.id))
            .join(Inventory, Inventory.id == InventoryItem.inventory_id)
            .where(
                InventoryItem.tenant_id == tenant_id,
                Inventory.tenant_id == tenant_id,
                Inventory.status != "finished",
                InventoryItem.counted_quantity.is_not(None),
            )
        )
        return int(self.db.scalar(stmt) or 0)

    def count_divergent_items_from_open_inventories(self, *, tenant_id: uuid.UUID) -> int:
        stmt = (
            select(func.count(InventoryItem.id))
            .join(Inventory, Inventory.id == InventoryItem.inventory_id)
            .where(
                InventoryItem.tenant_id == tenant_id,
                Inventory.tenant_id == tenant_id,
                Inventory.status != "finished",
                InventoryItem.status == "divergent",
            )
        )
        return int(self.db.scalar(stmt) or 0)

    def list_recent_inventories(self, *, tenant_id: uuid.UUID, limit: int) -> list[Inventory]:
        stmt = (
            select(Inventory)
            .where(Inventory.tenant_id == tenant_id)
            .order_by(Inventory.created_at.desc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def list_category_distribution(self, *, tenant_id: uuid.UUID, limit: int) -> list[tuple[str, int]]:
        normalized_category = func.coalesce(func.nullif(func.btrim(Product.category), ""), literal("Sem categoria"))
        stmt = (
            select(
                normalized_category.label("category"),
                func.count(Product.id).label("quantity"),
            )
            .where(
                Product.tenant_id == tenant_id,
                Product.active.is_(True),
            )
            .group_by(normalized_category)
            .order_by(func.count(Product.id).desc(), normalized_category.asc())
            .limit(limit)
        )
        rows = self.db.execute(stmt).all()
        return [(str(category), int(quantity)) for category, quantity in rows]

    def get_inventory_item_aggregate(
        self,
        *,
        tenant_id: uuid.UUID,
        inventory_ids: list[uuid.UUID],
    ) -> dict[uuid.UUID, dict[str, int]]:
        if not inventory_ids:
            return {}

        counted_case = case((InventoryItem.counted_quantity.is_not(None), 1), else_=0)
        ok_case = case((InventoryItem.status == "counted", 1), else_=0)
        divergent_case = case((InventoryItem.status == "divergent", 1), else_=0)

        stmt = (
            select(
                InventoryItem.inventory_id.label("inventory_id"),
                func.count(InventoryItem.id).label("total"),
                func.sum(counted_case).label("counted"),
                func.sum(ok_case).label("ok"),
                func.sum(divergent_case).label("divergent"),
            )
            .join(Inventory, Inventory.id == InventoryItem.inventory_id)
            .where(
                InventoryItem.tenant_id == tenant_id,
                Inventory.tenant_id == tenant_id,
                InventoryItem.inventory_id.in_(inventory_ids),
            )
            .group_by(InventoryItem.inventory_id)
        )
        rows = self.db.execute(stmt).all()
        return {
            inventory_id: {
                "total": int(total or 0),
                "counted": int(counted or 0),
                "ok": int(ok or 0),
                "divergent": int(divergent or 0),
            }
            for inventory_id, total, counted, ok, divergent in rows
        }

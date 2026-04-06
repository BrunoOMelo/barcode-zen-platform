import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.inventory_count import InventoryCount
from app.models.inventory_item import InventoryItem
from app.models.product import Product


class InventoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_inventories(
        self,
        *,
        tenant_id: uuid.UUID,
        page: int,
        page_size: int,
        status: str | None,
        search: str | None,
    ) -> tuple[list[Inventory], int]:
        filters = [Inventory.tenant_id == tenant_id]
        if status is not None:
            filters.append(Inventory.status == status)
        if search is not None:
            pattern = f"%{search}%"
            filters.append(Inventory.name.ilike(pattern))

        total_stmt = select(func.count()).select_from(Inventory).where(*filters)
        total = int(self.db.scalar(total_stmt) or 0)

        offset = (page - 1) * page_size
        stmt = (
            select(Inventory)
            .where(*filters)
            .order_by(Inventory.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        inventories = list(self.db.scalars(stmt).all())
        return inventories, total

    def get_inventory_by_id(self, *, inventory_id: uuid.UUID, tenant_id: uuid.UUID) -> Inventory | None:
        stmt = select(Inventory).where(Inventory.id == inventory_id, Inventory.tenant_id == tenant_id)
        return self.db.scalar(stmt)

    def create_inventory(self, *, tenant_id: uuid.UUID, created_by: uuid.UUID, name: str) -> Inventory:
        inventory = Inventory(
            tenant_id=tenant_id,
            created_by=created_by,
            name=name,
            status="created",
        )
        self.db.add(inventory)
        self.db.flush()
        self.db.refresh(inventory)
        return inventory

    def update_inventory_status(
        self,
        *,
        inventory: Inventory,
        status: str,
        started_at: datetime | None,
        finished_at: datetime | None,
    ) -> Inventory:
        inventory.status = status
        inventory.started_at = started_at
        inventory.finished_at = finished_at
        self.db.flush()
        self.db.refresh(inventory)
        return inventory

    def list_items_by_inventory(
        self,
        *,
        inventory_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> list[tuple[InventoryItem, Product]]:
        stmt = (
            select(InventoryItem, Product)
            .join(Product, Product.id == InventoryItem.product_id)
            .where(
                InventoryItem.inventory_id == inventory_id,
                InventoryItem.tenant_id == tenant_id,
                Product.tenant_id == tenant_id,
            )
            .order_by(Product.name.asc())
        )
        rows = self.db.execute(stmt).all()
        return [(item, product) for item, product in rows]

    def get_item_by_product(
        self,
        *,
        inventory_id: uuid.UUID,
        tenant_id: uuid.UUID,
        product_id: uuid.UUID,
        for_update: bool = False,
    ) -> InventoryItem | None:
        stmt = select(InventoryItem).where(
            InventoryItem.inventory_id == inventory_id,
            InventoryItem.tenant_id == tenant_id,
            InventoryItem.product_id == product_id,
        )
        if for_update:
            stmt = stmt.with_for_update()
        return self.db.scalar(stmt)

    def create_inventory_item(
        self,
        *,
        tenant_id: uuid.UUID,
        inventory_id: uuid.UUID,
        product: Product,
        system_quantity: int | None = None,
        counted_quantity: int | None = None,
        counted_by: uuid.UUID | None = None,
        counted_at: datetime | None = None,
    ) -> InventoryItem:
        resolved_system_quantity = product.quantity if system_quantity is None else system_quantity
        difference = None if counted_quantity is None else counted_quantity - resolved_system_quantity
        status = "pending" if counted_quantity is None else ("counted" if difference == 0 else "divergent")

        item = InventoryItem(
            tenant_id=tenant_id,
            inventory_id=inventory_id,
            product_id=product.id,
            system_quantity=resolved_system_quantity,
            counted_quantity=counted_quantity,
            difference=difference,
            status=status,
            counted_by=counted_by,
            counted_at=counted_at,
        )
        self.db.add(item)
        self.db.flush()
        self.db.refresh(item)
        return item

    def update_inventory_item_count(
        self,
        *,
        item: InventoryItem,
        quantity: int,
        counted_by: uuid.UUID,
        counted_at: datetime,
    ) -> InventoryItem:
        difference = quantity - item.system_quantity
        item.counted_quantity = quantity
        item.difference = difference
        item.counted_by = counted_by
        item.counted_at = counted_at
        item.status = "counted" if difference == 0 else "divergent"
        self.db.flush()
        self.db.refresh(item)
        return item

    def create_inventory_count(
        self,
        *,
        tenant_id: uuid.UUID,
        inventory_id: uuid.UUID,
        inventory_item_id: uuid.UUID,
        product_id: uuid.UUID,
        counted_by: uuid.UUID,
        count_type: str,
        quantity: int,
    ) -> InventoryCount:
        count = InventoryCount(
            tenant_id=tenant_id,
            inventory_id=inventory_id,
            inventory_item_id=inventory_item_id,
            product_id=product_id,
            counted_by=counted_by,
            count_type=count_type,
            quantity=quantity,
        )
        self.db.add(count)
        self.db.flush()
        self.db.refresh(count)
        return count

    def list_counts(
        self,
        *,
        inventory_id: uuid.UUID,
        tenant_id: uuid.UUID,
        page: int,
        page_size: int,
        product_id: uuid.UUID | None,
    ) -> tuple[list[tuple[InventoryCount, Product]], int]:
        filters = [
            InventoryCount.inventory_id == inventory_id,
            InventoryCount.tenant_id == tenant_id,
            Product.id == InventoryCount.product_id,
            Product.tenant_id == tenant_id,
        ]
        if product_id is not None:
            filters.append(InventoryCount.product_id == product_id)

        total_stmt = select(func.count()).select_from(InventoryCount).join(
            Product,
            Product.id == InventoryCount.product_id,
        )
        total_stmt = total_stmt.where(*filters)
        total = int(self.db.scalar(total_stmt) or 0)

        offset = (page - 1) * page_size
        stmt = (
            select(InventoryCount, Product)
            .join(Product, Product.id == InventoryCount.product_id)
            .where(*filters)
            .order_by(InventoryCount.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        rows = self.db.execute(stmt).all()
        return [(count, product) for count, product in rows], total

    def get_product_in_tenant(self, *, product_id: uuid.UUID, tenant_id: uuid.UUID) -> Product | None:
        stmt = select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
        return self.db.scalar(stmt)

    def list_products_by_identifiers(
        self,
        *,
        tenant_id: uuid.UUID,
        skus: set[str],
        barcodes: set[str],
    ) -> list[Product]:
        identifier_filters = []
        if skus:
            identifier_filters.append(Product.sku.in_(skus))
        if barcodes:
            identifier_filters.append(Product.barcode.in_(barcodes))
        if not identifier_filters:
            return []

        stmt = select(Product).where(
            Product.tenant_id == tenant_id,
            or_(*identifier_filters),
        )
        return list(self.db.scalars(stmt).all())

    def create_product_for_import(
        self,
        *,
        tenant_id: uuid.UUID,
        name: str,
        sku: str,
        barcode: str,
        category: str | None,
        cost: Decimal | None,
        quantity: int,
    ) -> Product:
        product = Product(
            tenant_id=tenant_id,
            name=name,
            sku=sku,
            barcode=barcode,
            category=category,
            active=True,
            cost=cost,
            price=None,
            quantity=quantity,
        )
        self.db.add(product)
        self.db.flush()
        self.db.refresh(product)
        return product

import uuid
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.exceptions.inventory_exceptions import (
    InventoryCountNotAllowedException,
    InventoryCountTypeInvalidException,
    InventoryInvalidStatusTransitionException,
    InventoryItemAlreadyExistsException,
    InventoryItemNotFoundException,
    InventoryItemsMutationNotAllowedException,
    InventoryNotFoundException,
    ProductNotInTenantException,
)
from app.models.inventory import Inventory
from app.models.inventory_count import InventoryCount
from app.models.inventory_item import InventoryItem
from app.models.product import Product
from app.repositories.inventory_repository import InventoryRepository
from app.schemas.inventory_schema import (
    CountType,
    InventoryCountCreate,
    InventoryStatus,
)


class InventoryService:
    _TRANSITIONS: dict[str, set[str]] = {
        "created": {"counting"},
        "counting": {"recounting", "review"},
        "recounting": {"review"},
        "review": {"recounting", "finished"},
        "finished": set(),
    }
    _COUNTING_ALLOWED_STATUSES = {"counting", "recounting"}
    _MUTABLE_ITEM_STATUSES = {"created", "counting"}

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = InventoryRepository(db)

    def list_inventories(
        self,
        *,
        tenant_id: uuid.UUID,
        page: int,
        page_size: int,
        status: InventoryStatus | None,
        search: str | None,
    ) -> tuple[list[Inventory], int]:
        normalized_search = search.strip() if search else None
        return self.repository.list_inventories(
            tenant_id=tenant_id,
            page=page,
            page_size=page_size,
            status=status,
            search=normalized_search,
        )

    def get_inventory(self, *, tenant_id: uuid.UUID, inventory_id: uuid.UUID) -> Inventory:
        inventory = self.repository.get_inventory_by_id(inventory_id=inventory_id, tenant_id=tenant_id)
        if inventory is None:
            raise InventoryNotFoundException()
        return inventory

    def create_inventory(self, *, tenant_id: uuid.UUID, created_by: uuid.UUID, name: str) -> Inventory:
        inventory = self.repository.create_inventory(
            tenant_id=tenant_id,
            created_by=created_by,
            name=name.strip(),
        )
        self.db.commit()
        return inventory

    def change_status(
        self,
        *,
        tenant_id: uuid.UUID,
        inventory_id: uuid.UUID,
        target_status: InventoryStatus,
    ) -> Inventory:
        inventory = self.get_inventory(tenant_id=tenant_id, inventory_id=inventory_id)
        current_status = inventory.status
        if current_status == target_status:
            return inventory

        allowed_statuses = self._TRANSITIONS.get(current_status, set())
        if target_status not in allowed_statuses:
            raise InventoryInvalidStatusTransitionException()

        now = datetime.now(UTC)
        started_at = inventory.started_at
        finished_at = inventory.finished_at

        if target_status in {"counting", "recounting"} and started_at is None:
            started_at = now

        if target_status == "finished":
            finished_at = now
        elif current_status == "finished":
            finished_at = None

        inventory = self.repository.update_inventory_status(
            inventory=inventory,
            status=target_status,
            started_at=started_at,
            finished_at=finished_at,
        )
        self.db.commit()
        return inventory

    def list_items(self, *, tenant_id: uuid.UUID, inventory_id: uuid.UUID) -> list[tuple[InventoryItem, Product]]:
        self.get_inventory(tenant_id=tenant_id, inventory_id=inventory_id)
        return self.repository.list_items_by_inventory(inventory_id=inventory_id, tenant_id=tenant_id)

    def add_items(
        self,
        *,
        tenant_id: uuid.UUID,
        inventory_id: uuid.UUID,
        product_ids: list[uuid.UUID],
    ) -> list[tuple[InventoryItem, Product]]:
        inventory = self.get_inventory(tenant_id=tenant_id, inventory_id=inventory_id)
        if inventory.status not in self._MUTABLE_ITEM_STATUSES:
            raise InventoryItemsMutationNotAllowedException()

        unique_product_ids = list(dict.fromkeys(product_ids))

        try:
            for product_id in unique_product_ids:
                product = self.repository.get_product_in_tenant(product_id=product_id, tenant_id=tenant_id)
                if product is None:
                    raise ProductNotInTenantException()
                self.repository.create_inventory_item(
                    tenant_id=tenant_id,
                    inventory_id=inventory_id,
                    product=product,
                )
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            if "uq_inventory_items_inventory_product" in str(exc.orig).lower():
                raise InventoryItemAlreadyExistsException() from exc
            raise InventoryItemAlreadyExistsException() from exc

        return self.repository.list_items_by_inventory(inventory_id=inventory_id, tenant_id=tenant_id)

    def register_count(
        self,
        *,
        tenant_id: uuid.UUID,
        inventory_id: uuid.UUID,
        counted_by: uuid.UUID,
        payload: InventoryCountCreate,
    ) -> tuple[InventoryCount, Product, InventoryItem]:
        inventory = self.get_inventory(tenant_id=tenant_id, inventory_id=inventory_id)
        if inventory.status not in self._COUNTING_ALLOWED_STATUSES:
            raise InventoryCountNotAllowedException()

        product = self.repository.get_product_in_tenant(product_id=payload.product_id, tenant_id=tenant_id)
        if product is None:
            raise ProductNotInTenantException()

        item = self.repository.get_item_by_product(
            inventory_id=inventory_id,
            tenant_id=tenant_id,
            product_id=payload.product_id,
            for_update=True,
        )
        if item is None:
            raise InventoryItemNotFoundException()

        count_type = self._resolve_count_type(inventory_status=inventory.status, payload_count_type=payload.count_type)

        now = datetime.now(UTC)
        count = self.repository.create_inventory_count(
            tenant_id=tenant_id,
            inventory_id=inventory_id,
            inventory_item_id=item.id,
            product_id=payload.product_id,
            counted_by=counted_by,
            count_type=count_type,
            quantity=payload.quantity,
        )
        item = self.repository.update_inventory_item_count(
            item=item,
            quantity=payload.quantity,
            counted_by=counted_by,
            counted_at=now,
        )
        self.db.commit()
        return count, product, item

    def list_counts(
        self,
        *,
        tenant_id: uuid.UUID,
        inventory_id: uuid.UUID,
        page: int,
        page_size: int,
        product_id: uuid.UUID | None,
    ) -> tuple[list[tuple[InventoryCount, Product]], int]:
        self.get_inventory(tenant_id=tenant_id, inventory_id=inventory_id)
        return self.repository.list_counts(
            inventory_id=inventory_id,
            tenant_id=tenant_id,
            page=page,
            page_size=page_size,
            product_id=product_id,
        )

    @staticmethod
    def _resolve_count_type(
        *,
        inventory_status: str,
        payload_count_type: CountType | None,
    ) -> CountType:
        expected_by_status: dict[str, CountType] = {
            "counting": "first",
            "recounting": "recount",
        }
        expected = expected_by_status.get(inventory_status)
        if expected is None:
            raise InventoryCountNotAllowedException()

        if payload_count_type is not None and payload_count_type != expected:
            raise InventoryCountTypeInvalidException()

        return payload_count_type or expected

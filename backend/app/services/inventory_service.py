import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.exceptions.inventory_exceptions import (
    InventoryCountNotAllowedException,
    InventoryCountTypeInvalidException,
    InventoryImportFailedException,
    InventoryImportNoValidRowsException,
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
    InventoryImportErrorRow,
    InventoryImportRequest,
    InventoryItemUpsertPayload,
    InventoryItemsUpsertRequest,
    InventoryStatus,
)


@dataclass(slots=True)
class _PreparedNewProduct:
    name: str
    sku: str
    barcode: str
    category: str | None
    cost: Decimal | None
    quantity: int


@dataclass(slots=True)
class _PreparedImportRow:
    source_row: int | None
    identifier: str | None
    system_quantity: int
    existing_product: Product | None = None
    new_product: _PreparedNewProduct | None = None


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

    def import_inventory_from_rows(
        self,
        *,
        tenant_id: uuid.UUID,
        created_by: uuid.UUID,
        payload: InventoryImportRequest,
    ) -> tuple[Inventory, dict[str, int], list[InventoryImportErrorRow]]:
        prepared_rows, errors = self._prepare_import_rows(tenant_id=tenant_id, payload=payload)
        if not prepared_rows:
            raise InventoryImportNoValidRowsException()

        total_rows = len(payload.rows)
        created_products = 0
        linked_existing_products = 0
        inventory_items_created = 0

        try:
            inventory = self.repository.create_inventory(
                tenant_id=tenant_id,
                created_by=created_by,
                name=payload.name.strip(),
            )

            for row in prepared_rows:
                if row.existing_product is not None:
                    product = row.existing_product
                    linked_existing_products += 1
                elif row.new_product is not None:
                    product = self.repository.create_product_for_import(
                        tenant_id=tenant_id,
                        name=row.new_product.name,
                        sku=row.new_product.sku,
                        barcode=row.new_product.barcode,
                        category=row.new_product.category,
                        cost=row.new_product.cost,
                        quantity=row.new_product.quantity,
                    )
                    created_products += 1
                else:  # pragma: no cover
                    continue

                self.repository.create_inventory_item(
                    tenant_id=tenant_id,
                    inventory_id=inventory.id,
                    product=product,
                    system_quantity=row.system_quantity,
                )
                inventory_items_created += 1

            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise InventoryImportFailedException() from exc

        summary = {
            "total_rows": total_rows,
            "processed_rows": len(prepared_rows),
            "created_products": created_products,
            "linked_existing_products": linked_existing_products,
            "inventory_items_created": inventory_items_created,
            "skipped_rows": len(errors),
        }
        return inventory, summary, errors

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
        payload: InventoryItemsUpsertRequest,
        actor_user_id: uuid.UUID | None = None,
    ) -> list[tuple[InventoryItem, Product]]:
        inventory = self.get_inventory(tenant_id=tenant_id, inventory_id=inventory_id)
        if inventory.status not in self._MUTABLE_ITEM_STATUSES:
            raise InventoryItemsMutationNotAllowedException()

        items_payload = payload.items
        if items_payload is None:
            items_payload = [InventoryItemUpsertPayload(product_id=product_id) for product_id in payload.product_ids or []]

        unique_items_by_product: dict[uuid.UUID, InventoryItemUpsertPayload] = {}
        for item_payload in items_payload:
            unique_items_by_product[item_payload.product_id] = item_payload

        try:
            for item_payload in unique_items_by_product.values():
                product = self.repository.get_product_in_tenant(product_id=item_payload.product_id, tenant_id=tenant_id)
                if product is None:
                    raise ProductNotInTenantException()
                should_mark_counted = item_payload.counted_quantity is not None
                self.repository.create_inventory_item(
                    tenant_id=tenant_id,
                    inventory_id=inventory_id,
                    product=product,
                    system_quantity=item_payload.system_quantity,
                    counted_quantity=item_payload.counted_quantity,
                    counted_by=actor_user_id if should_mark_counted else None,
                    counted_at=datetime.now(UTC) if should_mark_counted else None,
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

    def _prepare_import_rows(
        self,
        *,
        tenant_id: uuid.UUID,
        payload: InventoryImportRequest,
    ) -> tuple[list[_PreparedImportRow], list[InventoryImportErrorRow]]:
        skus: set[str] = set()
        barcodes: set[str] = set()
        for row in payload.rows:
            normalized_sku = self._normalize_identifier(row.sku)
            normalized_barcode = self._normalize_identifier(row.barcode)
            if normalized_sku:
                skus.add(normalized_sku)
            if normalized_barcode:
                barcodes.add(normalized_barcode)

        existing_products = self.repository.list_products_by_identifiers(
            tenant_id=tenant_id,
            skus=skus,
            barcodes=barcodes,
        )
        existing_by_sku = {product.sku: product for product in existing_products}
        existing_by_barcode = {product.barcode: product for product in existing_products}

        prepared_rows: list[_PreparedImportRow] = []
        errors: list[InventoryImportErrorRow] = []
        seen_existing_product_ids: set[uuid.UUID] = set()
        seen_new_skus: set[str] = set()
        seen_new_barcodes: set[str] = set()

        for row in payload.rows:
            source_row = row.source_row
            name = row.name.strip()
            sku = self._normalize_identifier(row.sku)
            barcode = self._normalize_identifier(row.barcode)
            identifier = barcode or sku

            if not name:
                errors.append(
                    self._build_import_error(
                        source_row=source_row,
                        identifier=identifier,
                        message="Linha sem descricao de produto.",
                    )
                )
                continue

            if sku is None and barcode is None:
                errors.append(
                    self._build_import_error(
                        source_row=source_row,
                        identifier=None,
                        message="Informe SKU ou codigo de barras.",
                    )
                )
                continue

            product_from_sku = existing_by_sku.get(sku) if sku else None
            product_from_barcode = existing_by_barcode.get(barcode) if barcode else None
            if (
                product_from_sku is not None
                and product_from_barcode is not None
                and product_from_sku.id != product_from_barcode.id
            ):
                errors.append(
                    self._build_import_error(
                        source_row=source_row,
                        identifier=identifier,
                        message="SKU e codigo de barras apontam para produtos diferentes.",
                    )
                )
                continue

            existing_product = product_from_barcode or product_from_sku
            if existing_product is not None:
                if existing_product.id in seen_existing_product_ids:
                    errors.append(
                        self._build_import_error(
                            source_row=source_row,
                            identifier=identifier,
                            message="Produto repetido na planilha para este inventario.",
                        )
                    )
                    continue

                seen_existing_product_ids.add(existing_product.id)
                resolved_system_quantity = (
                    existing_product.quantity if row.initial_quantity is None else row.initial_quantity
                )
                prepared_rows.append(
                    _PreparedImportRow(
                        source_row=source_row,
                        identifier=identifier,
                        system_quantity=max(0, resolved_system_quantity),
                        existing_product=existing_product,
                    )
                )
                continue

            resolved_sku = sku or barcode
            resolved_barcode = barcode or sku
            if resolved_sku is None or resolved_barcode is None:
                errors.append(
                    self._build_import_error(
                        source_row=source_row,
                        identifier=identifier,
                        message="Informe SKU ou codigo de barras.",
                    )
                )
                continue

            if resolved_sku in seen_new_skus:
                errors.append(
                    self._build_import_error(
                        source_row=source_row,
                        identifier=resolved_sku,
                        message="SKU duplicado na planilha.",
                    )
                )
                continue

            if resolved_barcode in seen_new_barcodes:
                errors.append(
                    self._build_import_error(
                        source_row=source_row,
                        identifier=resolved_barcode,
                        message="Codigo de barras duplicado na planilha.",
                    )
                )
                continue

            seen_new_skus.add(resolved_sku)
            seen_new_barcodes.add(resolved_barcode)
            prepared_rows.append(
                _PreparedImportRow(
                    source_row=source_row,
                    identifier=identifier,
                    system_quantity=max(0, row.initial_quantity or 0),
                    new_product=_PreparedNewProduct(
                        name=name,
                        sku=resolved_sku,
                        barcode=resolved_barcode,
                        category=self._normalize_optional_text(row.category),
                        cost=row.cost,
                        quantity=max(0, row.initial_quantity or 0),
                    ),
                )
            )

        return prepared_rows, errors

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

    @staticmethod
    def _normalize_identifier(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        return normalized or None

    @staticmethod
    def _normalize_optional_text(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @staticmethod
    def _build_import_error(
        *,
        source_row: int | None,
        identifier: str | None,
        message: str,
    ) -> InventoryImportErrorRow:
        return InventoryImportErrorRow(
            source_row=source_row,
            identifier=identifier,
            message=message,
        )
